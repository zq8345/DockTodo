// DockTodo data layer: storage keys, constants, default data, factories,
// date utilities, sanitizers and persistence.
// Pure logic and constants, no DOM / render dependency. loadState and
// saveState reference app.js's toast and state at call time — those calls
// only happen after every script has loaded. Depends on i18n.js (t) and
// money.js (sanitizeCurrency), which load first.

const STORAGE_KEY_V1 = "docktodo.pro.state.v1";
const STORAGE_KEY = "docktodo.pro.state.v2";

const PRIORITY_IDS = ["none", "high", "medium", "low"];
const REPEAT_IDS = ["daily", "weekdays", "weekly", "monthly"];
const FILTER_TYPE_IDS = ["high", "reminder", "nodate", "overdue"];

let todayKey = formatDate(new Date());

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function diffDays(fromKey, toKey) {
  return Math.round((new Date(`${toKey}T00:00:00`) - new Date(`${fromKey}T00:00:00`)) / 86400000);
}

// First day of the week containing dateKey. weekStart: 1 = Monday, 0 = Sunday.
function weekStartKey(dateKey, weekStart = 1) {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  return addDays(dateKey, -((day - weekStart + 7) % 7));
}

function dateLabel(dateKey) {
  if (!dateKey) return t("date.none");
  if (dateKey === todayKey) return t("date.today");
  if (dateKey === addDays(todayKey, 1)) return t("date.tomorrow");
  return dateKey.slice(5).replace("-", "/");
}

function dateTimeLabel(value) {
  if (!value) return "";
  return value.replace("T", " ").slice(5);
}

function nowValueString(offsetMs = 0) {
  const date = new Date(Date.now() + offsetMs);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(date)}T${hours}:${minutes}`;
}

function isWithinNextSevenDays(dateKey) {
  return Boolean(dateKey) && dateKey >= todayKey && dateKey <= addDays(todayKey, 6);
}

function createId() {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeSubtask(title, completed = false, reminder = "") {
  return { id: createId(), title, completed, reminder };
}

function makeTask(title, listId, startDate, dueDate, priority, options = {}) {
  const now = Date.now();
  return {
    id: createId(),
    title,
    listId,
    startDate,
    dueDate,
    priority,
    completed: Boolean(options.completed),
    reminder: options.reminder ?? "",
    estimatePomos: options.estimatePomos ?? 0,
    actualPomos: options.actualPomos ?? 0,
    notes: options.notes ?? "",
    repeat: options.repeat ?? "",
    repeatAnchorDay: options.repeatAnchorDay ?? (dueDate || startDate ? Number((dueDate || startDate).slice(8, 10)) : 0),
    projectId: options.projectId ?? null,
    billable: options.billable ?? Boolean(options.projectId),
    rateOverrideCents: options.rateOverrideCents ?? null,
    tags: options.tags ?? [],
    subtasks: options.subtasks ?? [],
    history: [{ at: now, text: t("history.created") }],
    createdAt: now,
    updatedAt: now,
  };
}

const defaultState = {
  schema: 2,
  activeMode: "tasks",
  activeView: "today",
  selectedTaskId: null,
  theme: "light",
  calendarMonth: todayKey.slice(0, 7),
  timesheetWeek: weekStartKey(todayKey, 1),
  notified: {},
  settings: { language: "en", weekStart: 1, invoiceCounter: 1, senderInfo: "", taxRateBp: 0 },
  clients: [
    { id: "client-demo", name: "Acme Co.", currency: "USD", hourlyRateCents: 8500, billingInfo: "Acme Co.\n123 Market St\nSan Francisco, CA", note: "" },
  ],
  projects: [
    { id: "project-demo", name: "Website redesign", clientId: "client-demo", rateOverrideCents: null },
  ],
  timeEntries: [],
  invoices: [],
  lists: [
    { id: "inbox", name: "Inbox", color: "#4778ff" },
    { id: "work", name: "Deep work", color: "#d94d4d" },
    { id: "life", name: "Personal", color: "#25a769" },
    { id: "plan", name: "September plan", color: "#e49a2f" },
  ],
  filters: [
    { id: "filter-high", name: "High priority", type: "high" },
    { id: "filter-reminder", name: "Has reminder", type: "reminder" },
    { id: "filter-nodate", name: "No date", type: "nodate" },
  ],
  tasks: [
    makeTask("Polish DockTodo Pro", "work", todayKey, addDays(todayKey, 1), "high", {
      reminder: `${todayKey}T09:30`,
      estimatePomos: 3,
      actualPomos: 1,
      notes: "Cover calendar, filters, stats, history, checklist reminders and pomodoro estimates.",
      tags: ["product"],
      projectId: "project-demo",
      billable: true,
      subtasks: [
        makeSubtask("Build the three-pane workbench", true, ""),
        makeSubtask("Fill in the Pro detail fields", false, `${todayKey}T16:00`),
      ],
    }),
    makeTask("Buy milk and bread", "life", todayKey, todayKey, "medium", {
      estimatePomos: 1,
      tags: ["errands"],
      subtasks: [makeSubtask("Milk", false, ""), makeSubtask("Bread", false, "")],
    }),
    makeTask("Run the project meeting", "work", addDays(todayKey, 1), addDays(todayKey, 1), "none", {
      reminder: `${addDays(todayKey, 1)}T08:45`,
      notes: "Confirm the agenda and open items beforehand.",
      projectId: "project-demo",
      billable: true,
    }),
    makeTask("Review this week", "plan", addDays(todayKey, -2), addDays(todayKey, -1), "low", {
      completed: true,
      actualPomos: 2,
      repeat: "weekly",
    }),
  ],
};

function sanitizeText(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function sanitizeColor(color) {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#4778ff";
}

function sanitizeCents(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function sanitizeList(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    name: sanitizeText(raw.name, "Untitled list"),
    color: sanitizeColor(raw.color),
  };
}

function sanitizeFilter(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    name: sanitizeText(raw.name, "Untitled filter"),
    type: FILTER_TYPE_IDS.includes(raw.type) ? raw.type : "overdue",
  };
}

function sanitizeSubtask(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    title: sanitizeText(raw.title, "Untitled item"),
    completed: Boolean(raw.completed),
    reminder: typeof raw.reminder === "string" ? raw.reminder : "",
  };
}

function sanitizeTask(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const now = Date.now();
  const startDate = typeof raw.startDate === "string" ? raw.startDate : "";
  const dueDate = typeof raw.dueDate === "string" ? raw.dueDate : "";
  const projectId = raw.projectId ? sanitizeText(raw.projectId, "") || null : null;
  const anchorRaw = Math.round(Number(raw.repeatAnchorDay) || 0);
  const anchorBase = dueDate || startDate;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    title: sanitizeText(raw.title, "Untitled task"),
    listId: sanitizeText(raw.listId, "inbox"),
    startDate,
    dueDate,
    priority: PRIORITY_IDS.includes(raw.priority) ? raw.priority : "none",
    completed: Boolean(raw.completed),
    reminder: typeof raw.reminder === "string" ? raw.reminder : "",
    estimatePomos: sanitizeCents(raw.estimatePomos),
    actualPomos: sanitizeCents(raw.actualPomos),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    repeat: REPEAT_IDS.includes(raw.repeat) ? raw.repeat : "",
    repeatAnchorDay: anchorRaw >= 1 && anchorRaw <= 31 ? anchorRaw : anchorBase ? Number(anchorBase.slice(8, 10)) : 0,
    projectId,
    billable: projectId ? raw.billable !== false : false,
    rateOverrideCents: raw.rateOverrideCents == null ? null : sanitizeCents(raw.rateOverrideCents),
    tags: Array.isArray(raw.tags)
      ? [...new Set(raw.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim()))]
      : [],
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map(sanitizeSubtask).filter(Boolean) : [],
    history: Array.isArray(raw.history)
      ? raw.history.filter((item) => item && typeof item === "object" && typeof item.text === "string").slice(0, 30)
      : [],
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt) || now,
  };
}

function sanitizeClient(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    name: sanitizeText(raw.name, "Untitled client"),
    currency: sanitizeCurrency(raw.currency),
    hourlyRateCents: sanitizeCents(raw.hourlyRateCents),
    billingInfo: typeof raw.billingInfo === "string" ? raw.billingInfo : "",
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

function sanitizeProject(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    name: sanitizeText(raw.name, "Untitled project"),
    clientId: typeof raw.clientId === "string" ? raw.clientId : "",
    rateOverrideCents: raw.rateOverrideCents == null ? null : sanitizeCents(raw.rateOverrideCents),
  };
}

function sanitizeTimeEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const taskId = sanitizeText(raw.taskId, "");
  if (!taskId) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    taskId,
    start: Number(raw.start) || 0,
    end: Number(raw.end) || 0,
    seconds: sanitizeCents(raw.seconds),
    billable: Boolean(raw.billable),
    rateSnapshotCents: sanitizeCents(raw.rateSnapshotCents),
    currency: sanitizeCurrency(raw.currency),
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

function sanitizeInvoiceLine(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    desc: typeof raw.desc === "string" ? raw.desc : "",
    seconds: sanitizeCents(raw.seconds),
    rateCents: raw.rateCents == null ? null : sanitizeCents(raw.rateCents),
    amountCents: sanitizeCents(raw.amountCents),
  };
}

function sanitizeInvoice(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    number: sanitizeText(raw.number, "INV-0000"),
    clientId: typeof raw.clientId === "string" ? raw.clientId : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    issueDate: typeof raw.issueDate === "string" ? raw.issueDate : "",
    groupBy: raw.groupBy === "task" ? "task" : "project",
    currency: sanitizeCurrency(raw.currency),
    senderInfo: typeof raw.senderInfo === "string" ? raw.senderInfo : "",
    billingInfo: typeof raw.billingInfo === "string" ? raw.billingInfo : "",
    note: typeof raw.note === "string" ? raw.note : "",
    lines: Array.isArray(raw.lines) ? raw.lines.map(sanitizeInvoiceLine).filter(Boolean) : [],
    subtotalCents: sanitizeCents(raw.subtotalCents),
    taxRateBp: sanitizeCents(raw.taxRateBp),
    taxCents: sanitizeCents(raw.taxCents),
    totalCents: sanitizeCents(raw.totalCents),
    createdAt: Number(raw.createdAt) || Date.now(),
  };
}

function sanitizeSettings(raw) {
  const s = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    language: STRINGS[s.language] ? s.language : "en",
    weekStart: s.weekStart === 0 ? 0 : 1,
    invoiceCounter: Math.max(1, Math.round(Number(s.invoiceCounter) || 1)),
    senderInfo: typeof s.senderInfo === "string" ? s.senderInfo : "",
    taxRateBp: sanitizeCents(s.taxRateBp),
  };
}

function normalizeState(nextState) {
  nextState.schema = 2;
  nextState.activeMode = sanitizeText(nextState.activeMode, "tasks");
  nextState.activeView = sanitizeText(nextState.activeView, "today");
  nextState.theme = sanitizeText(nextState.theme, "light");
  nextState.calendarMonth = sanitizeText(nextState.calendarMonth, todayKey.slice(0, 7));
  nextState.notified =
    nextState.notified && typeof nextState.notified === "object" && !Array.isArray(nextState.notified)
      ? nextState.notified
      : {};
  nextState.settings = sanitizeSettings(nextState.settings);
  nextState.timesheetWeek = sanitizeText(nextState.timesheetWeek, weekStartKey(todayKey, nextState.settings.weekStart));
  nextState.lists = (Array.isArray(nextState.lists) ? nextState.lists : []).map(sanitizeList).filter(Boolean);
  if (!nextState.lists.some((list) => list.id === "inbox")) {
    nextState.lists.unshift({ id: "inbox", name: "Inbox", color: "#4778ff" });
  }
  nextState.filters = Array.isArray(nextState.filters)
    ? nextState.filters.map(sanitizeFilter).filter(Boolean)
    : structuredClone(defaultState.filters);
  nextState.clients = (Array.isArray(nextState.clients) ? nextState.clients : []).map(sanitizeClient).filter(Boolean);
  nextState.projects = (Array.isArray(nextState.projects) ? nextState.projects : []).map(sanitizeProject).filter(Boolean);
  const clientIds = new Set(nextState.clients.map((client) => client.id));
  nextState.projects.forEach((project) => {
    if (project.clientId && !clientIds.has(project.clientId)) project.clientId = "";
  });
  nextState.timeEntries = (Array.isArray(nextState.timeEntries) ? nextState.timeEntries : []).map(sanitizeTimeEntry).filter(Boolean);
  nextState.invoices = (Array.isArray(nextState.invoices) ? nextState.invoices : []).map(sanitizeInvoice).filter(Boolean);
  nextState.tasks = (Array.isArray(nextState.tasks) ? nextState.tasks : []).map(sanitizeTask).filter(Boolean);
  const projectIds = new Set(nextState.projects.map((project) => project.id));
  nextState.tasks.forEach((task) => {
    if (task.projectId && !projectIds.has(task.projectId)) {
      task.projectId = null;
      task.billable = false;
    }
  });
  return nextState;
}

// Read v2 if present; otherwise migrate a v1 payload (normalizeState upgrades
// its shape) and leave the v1 key in place as a backup. Corrupt v2 JSON is
// backed up to a .corrupt key before falling through.
function loadState() {
  const rawV2 = localStorage.getItem(STORAGE_KEY);
  if (rawV2 != null) {
    try {
      const saved = JSON.parse(rawV2);
      if (Array.isArray(saved?.tasks) && Array.isArray(saved?.lists)) return saved;
    } catch {
      // fall through to backup + v1 + defaults
    }
    try {
      localStorage.setItem(`${STORAGE_KEY}.corrupt`, rawV2);
      toast(t("toast.corruptBackedUp"));
    } catch {
      toast(t("toast.corruptNoBackup"));
    }
  }
  const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
  if (rawV1 != null) {
    try {
      const legacy = JSON.parse(rawV1);
      if (Array.isArray(legacy?.tasks) && Array.isArray(legacy?.lists)) return legacy;
    } catch {
      // ignore a broken v1 backup
    }
  }
  return structuredClone(defaultState);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast(t("toast.storageFull"));
  }
  // S3-0 data safety belt: throttle a copy out to the user's backup file.
  if (typeof scheduleBackup === "function") scheduleBackup();
}
