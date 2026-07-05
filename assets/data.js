// DockTodo 数据层：存储键、常量、默认数据、工厂、日期工具、消毒与持久化。
// 纯逻辑与常量，无 DOM / render 依赖。loadState / saveState 在运行时引用
// app.js 的 toast 与 state —— 这些调用只发生在全部脚本加载完成之后。

const STORAGE_KEY = "docktodo.pro.state.v1";

const REPEAT_LABELS = { "": "不重复", daily: "每天", weekdays: "工作日", weekly: "每周", monthly: "每月" };
const FILTER_TYPES = [
  ["high", "高优先级"],
  ["reminder", "有提醒"],
  ["nodate", "无日期"],
  ["overdue", "已逾期"],
];
const PRIORITY_IDS = ["none", "high", "medium", "low"];
const REPEAT_IDS = ["daily", "weekdays", "weekly", "monthly"];
const FILTER_TYPE_IDS = FILTER_TYPES.map(([value]) => value);

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
  if (!dateKey) return "无日期";
  if (dateKey === todayKey) return "今天";
  if (dateKey === addDays(todayKey, 1)) return "明天";
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
    history: [{ at: now, text: "创建任务" }],
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
    { id: "inbox", name: "收集箱", color: "#4778ff" },
    { id: "work", name: "认真工作", color: "#d94d4d" },
    { id: "life", name: "生活备忘", color: "#25a769" },
    { id: "plan", name: "九月计划", color: "#e49a2f" },
  ],
  filters: [
    { id: "filter-high", name: "高优先级", type: "high" },
    { id: "filter-reminder", name: "有提醒", type: "reminder" },
    { id: "filter-nodate", name: "无日期", type: "nodate" },
  ],
  tasks: [
    makeTask("整理 DockTodo 高级版", "work", todayKey, addDays(todayKey, 1), "high", {
      reminder: `${todayKey}T09:30`,
      estimatePomos: 3,
      actualPomos: 1,
      notes: "覆盖日历、筛选、统计、历史、检查项提醒和番茄预估。",
      tags: ["产品"],
      subtasks: [
        makeSubtask("完成三栏任务工作台", true, ""),
        makeSubtask("补齐高级版详情字段", false, `${todayKey}T16:00`),
      ],
    }),
    makeTask("买牛奶和面包", "life", todayKey, todayKey, "medium", {
      estimatePomos: 1,
      tags: ["购物"],
      subtasks: [makeSubtask("牛奶", false, ""), makeSubtask("面包", false, "")],
    }),
    makeTask("主持项目会议", "work", addDays(todayKey, 1), addDays(todayKey, 1), "none", {
      reminder: `${addDays(todayKey, 1)}T08:45`,
      notes: "会前确认议程和待决事项。",
    }),
    makeTask("复盘本周任务", "plan", addDays(todayKey, -2), addDays(todayKey, -1), "low", {
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
    name: sanitizeText(raw.name, "未命名清单"),
    color: sanitizeColor(raw.color),
  };
}

function sanitizeFilter(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    name: sanitizeText(raw.name, "未命名筛选"),
    type: FILTER_TYPE_IDS.includes(raw.type) ? raw.type : "overdue",
  };
}

function sanitizeSubtask(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    id: sanitizeText(raw.id, "") || createId(),
    title: sanitizeText(raw.title, "未命名检查项"),
    completed: Boolean(raw.completed),
    reminder: typeof raw.reminder === "string" ? raw.reminder : "",
  };
}

function sanitizeTask(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const now = Date.now();
  return {
    id: sanitizeText(raw.id, "") || createId(),
    title: sanitizeText(raw.title, "未命名任务"),
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
  nextState.notified =
    nextState.notified && typeof nextState.notified === "object" && !Array.isArray(nextState.notified)
      ? nextState.notified
      : {};
  nextState.lists = (Array.isArray(nextState.lists) ? nextState.lists : []).map(sanitizeList).filter(Boolean);
  if (!nextState.lists.some((list) => list.id === "inbox")) {
    nextState.lists.unshift({ id: "inbox", name: "收集箱", color: "#4778ff" });
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
    toast("检测到本地数据损坏，原始内容已备份到浏览器存储，应用已重置");
  } catch {
    toast("检测到本地数据损坏且无法备份，应用已重置");
  }
  return structuredClone(defaultState);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast("保存失败：浏览器存储空间不足，请导出数据后清理");
  }
}
