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

// Parse a date-ish string to a local-day epoch ms (falls back to Date parsing).
function parseEpochMs(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : 0;
}
