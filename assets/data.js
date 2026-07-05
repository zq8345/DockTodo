// DockTodo data layer: storage key, constants, default data, factories,
// date utilities, sanitizers and persistence.
// Pure logic and constants, no DOM / render dependency. loadState and
// saveState reference app.js's toast and state at call time — those calls
// only happen after every script has loaded. Depends on i18n.js (t), which
// loads first.

const STORAGE_KEY = "docktodo.pro.state.v1";

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
    tags: options.tags ?? [],
    subtasks: options.subtasks ?? [],
    history: [{ at: now, text: t("history.created") }],
    createdAt: now,
    updatedAt: now,
  };
}

const defaultState = {
  activeMode: "tasks",
  activeView: "today",
  selectedTaskId: null,
  theme: "light",
  calendarMonth: todayKey.slice(0, 7),
  notified: {},
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
  return {
    id: sanitizeText(raw.id, "") || createId(),
    title: sanitizeText(raw.title, "Untitled task"),
    listId: sanitizeText(raw.listId, "inbox"),
    startDate: typeof raw.startDate === "string" ? raw.startDate : "",
    dueDate: typeof raw.dueDate === "string" ? raw.dueDate : "",
    priority: PRIORITY_IDS.includes(raw.priority) ? raw.priority : "none",
    completed: Boolean(raw.completed),
    reminder: typeof raw.reminder === "string" ? raw.reminder : "",
    estimatePomos: Math.max(0, Math.round(Number(raw.estimatePomos) || 0)),
    actualPomos: Math.max(0, Math.round(Number(raw.actualPomos) || 0)),
    notes: typeof raw.notes === "string" ? raw.notes : "",
    repeat: REPEAT_IDS.includes(raw.repeat) ? raw.repeat : "",
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

function normalizeState(nextState) {
  nextState.activeMode = sanitizeText(nextState.activeMode, "tasks");
  nextState.activeView = sanitizeText(nextState.activeView, "today");
  nextState.theme = sanitizeText(nextState.theme, "light");
  nextState.calendarMonth = sanitizeText(nextState.calendarMonth, todayKey.slice(0, 7));
  nextState.settings =
    nextState.settings && typeof nextState.settings === "object" && !Array.isArray(nextState.settings)
      ? nextState.settings
      : {};
  nextState.settings.language = STRINGS[nextState.settings.language] ? nextState.settings.language : "en";
  nextState.notified =
    nextState.notified && typeof nextState.notified === "object" && !Array.isArray(nextState.notified)
      ? nextState.notified
      : {};
  nextState.lists = (Array.isArray(nextState.lists) ? nextState.lists : []).map(sanitizeList).filter(Boolean);
  if (!nextState.lists.some((list) => list.id === "inbox")) {
    nextState.lists.unshift({ id: "inbox", name: "Inbox", color: "#4778ff" });
  }
  nextState.filters = Array.isArray(nextState.filters)
    ? nextState.filters.map(sanitizeFilter).filter(Boolean)
    : structuredClone(defaultState.filters);
  nextState.tasks = (Array.isArray(nextState.tasks) ? nextState.tasks : []).map(sanitizeTask).filter(Boolean);
  return nextState;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return structuredClone(defaultState);
  try {
    const saved = JSON.parse(raw);
    if (Array.isArray(saved?.tasks) && Array.isArray(saved?.lists)) {
      return saved;
    }
  } catch {
    // fall through to backup + defaults
  }
  try {
    localStorage.setItem(`${STORAGE_KEY}.corrupt`, raw);
    toast(t("toast.corruptBackedUp"));
  } catch {
    toast(t("toast.corruptNoBackup"));
  }
  return structuredClone(defaultState);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast(t("toast.storageFull"));
  }
}
