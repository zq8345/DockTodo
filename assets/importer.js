// DockTodo CSV importers (S3-1). All parsing is local — files never leave the
// browser. Loads after billing.js, before app.js. This file holds the shared
// parsing primitives; per-tool column mapping (Toggl/Clockify/Harvest/generic)
// builds on top of these.

// RFC 4180-ish CSV parser: quoted fields, escaped "" quotes, commas/newlines
// inside quotes, CRLF, and a leading BOM. Returns an array of string[] rows.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = String(text ?? "").replace(/^﻿/, "");
  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i += 1;
      pushRow();
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) pushRow();
  return rows;
}

// Turn header + data rows into objects keyed by (trimmed, lower-cased) header.
function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

// "hh:mm:ss" / "mm:ss" / decimal hours ("1.5") / "90m" → seconds.
function parseDurationSeconds(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  if (text.includes(":")) {
    const parts = text.split(":").map((p) => Number(p) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }
  const hours = Number(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(hours) ? Math.round(hours * 3600) : 0;
}

// Strip currency symbols and thousands separators → integer minor units.
// Targets the common en format ("$1,234.56"); other locales handled later.
function parseMoneyCents(value) {
  const text = String(value ?? "").replace(/[^0-9.-]/g, "");
  const num = Number(text);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

// Statistical mode of a numeric array — used to suggest a client's default
// rate from per-entry Amount/Duration when a rate column is missing.
function modeOf(numbers) {
  const counts = new Map();
  let best = null;
  let bestCount = 0;
  numbers.forEach((n) => {
    const next = (counts.get(n) || 0) + 1;
    counts.set(n, next);
    if (next > bestCount) {
      bestCount = next;
      best = n;
    }
  });
  return best;
}

// Parse a date-ish string to a local-day epoch ms.
function parseEpochMs(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  // Date.parse treats a bare ISO date ("2026-06-01") as UTC midnight, which
  // lands on the previous day in western timezones (and mis-buckets the week).
  // Build date-only strings in local time instead. Strings with a time part
  // (Toggl/Clockify start date + time) keep normal parsing.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : 0;
}

// ---- Per-tool column mapping ----
// Header names are matched case-insensitively; each field lists candidate
// column names to tolerate minor version differences. `signature` is the set
// of columns whose presence identifies the tool.
const IMPORT_FORMATS = {
  clockify: {
    label: "Clockify",
    signature: ["duration (decimal)"],
    fields: {
      client: ["client"],
      project: ["project"],
      task: ["description", "task"],
      billable: ["billable"],
      duration: ["duration (h)", "duration"],
      durationDecimal: ["duration (decimal)"],
      start: ["start date"],
      startTime: ["start time"],
      rate: ["billable rate (usd)", "billable rate"],
      amount: ["billable amount (usd)", "billable amount", "amount (usd)"],
      tags: ["tags"],
      currency: ["currency"],
    },
  },
  harvest: {
    label: "Harvest",
    signature: ["hours", "billable?"],
    fields: {
      client: ["client"],
      project: ["project"],
      task: ["task", "notes"],
      billable: ["billable?", "billable"],
      durationDecimal: ["hours"],
      start: ["date"],
      rate: ["billable rate", "rate"],
      amount: ["billable amount", "amount"],
      tags: [],
      currency: ["currency"],
    },
  },
  toggl: {
    label: "Toggl Track",
    signature: ["start date", "start time", "duration"],
    fields: {
      client: ["client"],
      project: ["project"],
      task: ["description", "task"],
      billable: ["billable"],
      duration: ["duration"],
      start: ["start date"],
      startTime: ["start time"],
      rate: ["billable rate", "rate"],
      amount: ["amount", "amount (usd)", "amount ()"],
      tags: ["tags"],
      currency: ["currency"],
    },
  },
};

function detectFormat(headers) {
  const present = new Set(headers.map((h) => h.trim().toLowerCase()));
  for (const [id, fmt] of Object.entries(IMPORT_FORMATS)) {
    if (fmt.signature.every((col) => present.has(col))) return id;
  }
  return "generic";
}

function pickField(obj, candidates) {
  for (const key of candidates || []) {
    if (obj[key] != null && obj[key] !== "") return obj[key];
  }
  return "";
}

const BILLABLE_TRUE = new Set(["yes", "true", "1", "billable", "y"]);

// One CSV row (as a keyed object) → a normalized intermediate record.
function mapRecord(obj, fields) {
  const durationText = pickField(obj, fields.duration);
  const decimalText = pickField(obj, fields.durationDecimal);
  let seconds = 0;
  if (durationText && durationText.includes(":")) seconds = parseDurationSeconds(durationText);
  else if (decimalText) seconds = Math.round((Number(String(decimalText).replace(/[^0-9.]/g, "")) || 0) * 3600);
  else if (durationText) seconds = parseDurationSeconds(durationText);

  const startDate = pickField(obj, fields.start);
  const startTime = pickField(obj, fields.startTime);
  const startMs = parseEpochMs(startTime ? `${startDate} ${startTime}` : startDate);
  const tagsText = pickField(obj, fields.tags);
  const tags = tagsText ? tagsText.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [];

  return {
    client: String(pickField(obj, fields.client)).trim(),
    project: String(pickField(obj, fields.project)).trim(),
    task: String(pickField(obj, fields.task)).trim() || "Imported time",
    billable: BILLABLE_TRUE.has(String(pickField(obj, fields.billable)).trim().toLowerCase()),
    seconds,
    rateCents: parseMoneyCents(pickField(obj, fields.rate)),
    amountCents: parseMoneyCents(pickField(obj, fields.amount)),
    currency: String(pickField(obj, fields.currency)).trim().toUpperCase() || "USD",
    tags,
    startMs,
  };
}

// Parse a CSV file into normalized records. `genericMapping` (optional) is a
// {field: headerName} map for the generic/manual path.
function parseImport(text, genericMapping) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { format: "generic", label: "CSV", records: [], headers: rows[0] || [] };
  const headers = rows[0].map((h) => h.trim());
  const objects = rowsToObjects(rows);
  const format = genericMapping ? "generic" : detectFormat(headers);
  const fields =
    format === "generic"
      ? Object.fromEntries(Object.entries(genericMapping || {}).map(([k, v]) => [k, [String(v).trim().toLowerCase()]]))
      : IMPORT_FORMATS[format].fields;
  const records = objects.map((obj) => mapRecord(obj, fields)).filter((r) => r.seconds > 0 || r.amountCents > 0);
  return {
    format,
    label: format === "generic" ? "CSV" : IMPORT_FORMATS[format].label,
    headers,
    records,
  };
}

// When a rate column is missing, suggest each client's default rate as the mode
// of per-entry Amount ÷ hours (rounded to whole cents/hour).
function suggestRates(records) {
  const byClient = new Map();
  records.forEach((r) => {
    if (r.rateCents || !r.amountCents || !r.seconds) return;
    const perHour = Math.round(r.amountCents / (r.seconds / 3600));
    if (!byClient.has(r.client)) byClient.set(r.client, []);
    byClient.get(r.client).push(perHour);
  });
  const out = {};
  byClient.forEach((rates, client) => {
    const m = modeOf(rates);
    if (m) out[client] = m;
  });
  return out;
}

// Summary stats for the preview page.
function importStats(parsed) {
  const { records } = parsed;
  const clients = new Set();
  const projects = new Set();
  const currencies = new Set();
  let dateFrom = Infinity;
  let dateTo = -Infinity;
  records.forEach((r) => {
    if (r.client) clients.add(r.client);
    if (r.project) projects.add(`${r.client}/${r.project}`);
    currencies.add(r.currency);
    if (r.startMs) {
      dateFrom = Math.min(dateFrom, r.startMs);
      dateTo = Math.max(dateTo, r.startMs);
    }
  });
  return {
    clientCount: clients.size,
    projectCount: projects.size,
    entryCount: records.length,
    currencies: [...currencies],
    dateFrom: Number.isFinite(dateFrom) ? dateFrom : 0,
    dateTo: Number.isFinite(dateTo) ? dateTo : 0,
    rateSuggestions: suggestRates(records),
    sample: records.slice(0, 10),
  };
}

// Turn records into a v2 increment: new clients/projects/tasks (deduped against
// existing state by name) plus one TimeEntry per record. Pure — builds arrays,
// mutates nothing, so the preview can show counts before the user commits.
// Uses name-keyed maps so 10k rows stay O(n), not O(n²).
function buildImportPlan(parsed, rates) {
  const acceptedRates = rates || {};
  const newClients = [];
  const newProjects = [];
  const newTasks = [];
  const newEntries = [];
  const clientByName = new Map(state.clients.map((c) => [String(c.name).toLowerCase(), c]));
  const projectByKey = new Map(state.projects.map((p) => [`${p.clientId}::${String(p.name).toLowerCase()}`, p]));
  const taskByKey = new Map(state.tasks.map((tk) => [`${tk.projectId ?? ""}::${String(tk.title).toLowerCase()}`, tk]));
  // Entry-level dedupe so re-importing the same file doesn't double up hours.
  // Fingerprint = start + seconds + task title + rate (title, not id, so it
  // matches across the import that created the task).
  const titleById = new Map(state.tasks.map((tk) => [tk.id, String(tk.title).toLowerCase()]));
  const seenEntries = new Set(
    state.timeEntries.map((e) => `${e.start}|${e.seconds}|${titleById.get(e.taskId) || ""}|${e.rateSnapshotCents}`)
  );
  let skipped = 0;

  parsed.records.forEach((r) => {
    let client = r.client ? clientByName.get(r.client.toLowerCase()) : null;
    if (r.client && !client) {
      client = {
        id: createId(),
        name: r.client,
        currency: r.currency || "USD",
        hourlyRateCents: acceptedRates[r.client] || 0,
        billingInfo: "",
        note: "",
      };
      clientByName.set(r.client.toLowerCase(), client);
      newClients.push(client);
    }

    let project = null;
    if (r.project && client) {
      const key = `${client.id}::${r.project.toLowerCase()}`;
      project = projectByKey.get(key);
      if (!project) {
        project = { id: createId(), name: r.project, clientId: client.id, rateOverrideCents: null };
        projectByKey.set(key, project);
        newProjects.push(project);
      }
    }

    const taskKey = `${project?.id ?? ""}::${r.task.toLowerCase()}`;
    let task = taskByKey.get(taskKey);
    if (!task) {
      task = makeTask(r.task, "inbox", "", "", "none", { projectId: project?.id ?? null, billable: r.billable, tags: r.tags });
      taskByKey.set(taskKey, task);
      newTasks.push(task);
    }

    const rateCents = r.rateCents || (client ? acceptedRates[client.name] || client.hourlyRateCents : 0) || 0;
    const start = r.startMs || Date.now();
    const fingerprint = `${start}|${r.seconds}|${r.task.toLowerCase()}|${rateCents}`;
    if (seenEntries.has(fingerprint)) {
      skipped += 1;
      return;
    }
    seenEntries.add(fingerprint);
    newEntries.push({
      id: createId(),
      taskId: task.id,
      start,
      end: start + r.seconds * 1000,
      seconds: r.seconds,
      billable: r.billable,
      rateSnapshotCents: rateCents,
      currency: r.currency || "USD",
      note: "",
    });
  });

  return { newClients, newProjects, newTasks, newEntries, skipped };
}

// Commit a plan, snapshotting the whole state to a .pre-import key first so the
// import can be undone in one click.
function applyImportPlan(plan) {
  try {
    localStorage.setItem(`${STORAGE_KEY}.pre-import`, JSON.stringify(state));
  } catch {
    /* best-effort backup */
  }
  state.clients.push(...plan.newClients);
  state.projects.push(...plan.newProjects);
  state.tasks.push(...plan.newTasks);
  state.timeEntries.push(...plan.newEntries);
  saveState();
  render();
}

function rollbackImport() {
  const raw = localStorage.getItem(`${STORAGE_KEY}.pre-import`);
  if (!raw) return false;
  try {
    state = normalizeState(JSON.parse(raw));
  } catch {
    return false;
  }
  localStorage.removeItem(`${STORAGE_KEY}.pre-import`);
  saveState();
  render();
  return true;
}
