const STORAGE_KEY = "docktodo.pro.state.v1";
let todayKey = formatDate(new Date());
let searchQuery = "";

const REPEAT_LABELS = { "": "不重复", daily: "每天", weekdays: "工作日", weekly: "每周", monthly: "每月" };
const FILTER_TYPES = [
  ["high", "高优先级"],
  ["reminder", "有提醒"],
  ["nodate", "无日期"],
  ["overdue", "已逾期"],
];

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

const els = {
  body: document.body,
  railButtons: [...document.querySelectorAll(".rail-btn[data-mode]")],
  smartLists: document.querySelector("#smartLists"),
  projectList: document.querySelector("#projectList"),
  filterList: document.querySelector("#filterList"),
  tagSection: document.querySelector("#tagSection"),
  tagList: document.querySelector("#tagList"),
  searchInput: document.querySelector("#searchInput"),
  addList: document.querySelector("#addList"),
  addFilter: document.querySelector("#addFilter"),
  quickAdd: document.querySelector("#quickAdd"),
  quickAddTop: document.querySelector("#quickAddTop"),
  clearDone: document.querySelector("#clearDone"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  importFile: document.querySelector("#importFile"),
  themeToggle: document.querySelector("#themeToggle"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskStart: document.querySelector("#taskStart"),
  taskDue: document.querySelector("#taskDue"),
  taskPriority: document.querySelector("#taskPriority"),
  taskView: document.querySelector("#taskView"),
  calendarView: document.querySelector("#calendarView"),
  focusView: document.querySelector("#focusView"),
  statsView: document.querySelector("#statsView"),
  taskList: document.querySelector("#taskList"),
  taskTemplate: document.querySelector("#taskTemplate"),
  emptyState: document.querySelector("#emptyState"),
  statsLine: document.querySelector("#statsLine"),
  viewTitle: document.querySelector("#viewTitle"),
  viewMeta: document.querySelector("#viewMeta"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  focusTime: document.querySelector("#focusTime"),
  focusTask: document.querySelector("#focusTask"),
  startFocus: document.querySelector("#startFocus"),
  resetFocus: document.querySelector("#resetFocus"),
  completePomo: document.querySelector("#completePomo"),
  detailEmpty: document.querySelector("#detailEmpty"),
  detailForm: document.querySelector("#detailForm"),
  detailCompleted: document.querySelector("#detailCompleted"),
  detailTitle: document.querySelector("#detailTitle"),
  detailList: document.querySelector("#detailList"),
  detailStart: document.querySelector("#detailStart"),
  detailDue: document.querySelector("#detailDue"),
  detailReminder: document.querySelector("#detailReminder"),
  detailPriority: document.querySelector("#detailPriority"),
  detailRepeat: document.querySelector("#detailRepeat"),
  detailEstimate: document.querySelector("#detailEstimate"),
  detailTags: document.querySelector("#detailTags"),
  detailNotes: document.querySelector("#detailNotes"),
  addSubtask: document.querySelector("#addSubtask"),
  subtaskList: document.querySelector("#subtaskList"),
  subtaskTemplate: document.querySelector("#subtaskTemplate"),
  historyList: document.querySelector("#historyList"),
  deleteTask: document.querySelector("#deleteTask"),
  toastStack: document.querySelector("#toastStack"),
};

let state = normalizeState(loadState());
let focusSeconds = 25 * 60;
let focusTimer = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.tasks && saved?.lists) {
      return saved;
    }
  } catch {
    return structuredClone(defaultState);
  }

  return structuredClone(defaultState);
}

function normalizeState(nextState) {
  nextState.activeMode ??= "tasks";
  nextState.activeView ??= "today";
  nextState.theme ??= "light";
  nextState.calendarMonth ??= todayKey.slice(0, 7);
  nextState.notified ??= {};
  nextState.filters ??= structuredClone(defaultState.filters);
  nextState.tasks = nextState.tasks.map((task) => ({
    startDate: "",
    dueDate: "",
    reminder: "",
    estimatePomos: 0,
    actualPomos: 0,
    notes: "",
    repeat: "",
    tags: [],
    history: [],
    subtasks: [],
    ...task,
  }));
  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function taskDate(task) {
  return task.dueDate || task.startDate || "";
}

function selectedTask() {
  return state.tasks.find((task) => task.id === state.selectedTaskId) ?? null;
}

function smartDefinitions() {
  return [
    { id: "today", icon: "☑", title: "今天", count: countTasks((task) => !task.completed && taskDate(task) === todayKey) },
    { id: "next7", icon: "▣", title: "最近 7 天", count: countTasks((task) => !task.completed && isWithinNextSevenDays(taskDate(task))) },
    { id: "calendar", icon: "▦", title: "日历", count: countTasks((task) => !task.completed && Boolean(taskDate(task))) },
    { id: "inbox", icon: "⌂", title: "收集箱", count: countTasks((task) => !task.completed && task.listId === "inbox") },
    { id: "all", icon: "≡", title: "全部", count: countTasks((task) => !task.completed) },
    { id: "completed", icon: "✓", title: "已完成", count: countTasks((task) => task.completed) },
  ];
}

function countTasks(predicate) {
  return state.tasks.filter(predicate).length;
}

function priorityLabel(priority) {
  return { high: "高优先级", medium: "中优先级", low: "低优先级", none: "无优先级" }[priority] ?? "无优先级";
}

function getActiveTitle() {
  if (state.activeView.startsWith("tag:")) return `#${state.activeView.slice(4)}`;
  const smart = smartDefinitions().find((item) => item.id === state.activeView);
  if (smart) return smart.title;
  const list = state.lists.find((item) => item.id === state.activeView);
  if (list) return list.name;
  const filter = state.filters.find((item) => item.id === state.activeView);
  return filter?.name ?? "任务";
}

function getViewType(view = state.activeView) {
  if (view.startsWith("tag:")) return "tag";
  if (state.lists.some((item) => item.id === view)) return "list";
  if (state.filters.some((item) => item.id === view)) return "filter";
  return "smart";
}

function visibleTasks() {
  if (searchQuery) return searchResults();
  const view = state.activeView;
  return state.tasks
    .filter((task) => {
      const date = taskDate(task);
      if (view.startsWith("tag:")) return !task.completed && task.tags.includes(view.slice(4));
      if (view === "today") return date === todayKey && !task.completed;
      if (view === "next7") return isWithinNextSevenDays(date) && !task.completed;
      if (view === "calendar") return Boolean(date) && !task.completed;
      if (view === "all") return !task.completed;
      if (view === "completed") return task.completed;
      if (view === "inbox") return task.listId === "inbox" && !task.completed;
      if (state.lists.some((list) => list.id === view)) return task.listId === view && !task.completed;
      return matchesFilter(task, state.filters.find((item) => item.id === view));
    })
    .sort(sortTasks);
}

function searchResults() {
  const query = searchQuery.toLowerCase();
  return state.tasks
    .filter((task) => {
      const listName = state.lists.find((list) => list.id === task.listId)?.name ?? "";
      return (
        task.title.toLowerCase().includes(query) ||
        (task.notes || "").toLowerCase().includes(query) ||
        task.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        task.subtasks.some((subtask) => subtask.title.toLowerCase().includes(query)) ||
        listName.toLowerCase().includes(query)
      );
    })
    .sort(sortTasks);
}

function matchesFilter(task, filter) {
  if (!filter) return false;
  if (filter.type === "high") return !task.completed && task.priority === "high";
  if (filter.type === "reminder") return !task.completed && Boolean(task.reminder || task.subtasks.some((item) => item.reminder));
  if (filter.type === "nodate") return !task.completed && !taskDate(task);
  if (filter.type === "overdue") return !task.completed && taskDate(task) && taskDate(task) < todayKey;
  return false;
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  const priorityRank = { high: 0, medium: 1, low: 2, none: 3 };
  const dateCompare = (taskDate(a) || "9999").localeCompare(taskDate(b) || "9999");
  if (dateCompare !== 0) return dateCompare;
  return priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt - a.createdAt;
}

function groupedTasks(tasks) {
  return tasks.reduce((groups, task) => {
    const key = groupName(task);
    groups[key] ??= [];
    groups[key].push(task);
    return groups;
  }, {});
}

function groupName(task) {
  if (task.completed) return "已完成";
  const date = taskDate(task);
  if (!date) return "无日期";
  if (date < todayKey) return "已逾期";
  if (date === todayKey) return "今天";
  if (date === addDays(todayKey, 1)) return "明天";
  return "之后";
}

function currentDefaultListId() {
  return getViewType() === "list" ? state.activeView : "inbox";
}

function currentDefaultDate() {
  return state.activeView === "today" || state.activeView === "next7" ? todayKey : "";
}

function addHistory(task, text) {
  task.history.unshift({ at: Date.now(), text });
  task.history = task.history.slice(0, 30);
  task.updatedAt = Date.now();
}

function setMode(mode) {
  state.activeMode = mode;
  if (mode === "calendar") state.activeView = "calendar";
  saveState();
  render();
}

function setView(view) {
  searchQuery = "";
  els.searchInput.value = "";
  state.activeView = view;
  if (view === "calendar") state.activeMode = "calendar";
  if (state.activeMode === "calendar" && view !== "calendar") state.activeMode = "tasks";
  state.selectedTaskId = visibleTasks()[0]?.id ?? null;
  saveState();
  render();
}

function parseTags(rawTitle) {
  const tags = [];
  const title = rawTitle
    .replace(/#([^\s#，,]+)/g, (_, tag) => {
      tags.push(tag);
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
  return { title: title || rawTitle.trim(), tags: [...new Set(tags)] };
}

function addTask(title, startDate, dueDate, priority) {
  const parsed = parseTags(title);
  if (getViewType() === "tag") {
    const activeTag = state.activeView.slice(4);
    if (!parsed.tags.includes(activeTag)) parsed.tags.push(activeTag);
  }
  const task = makeTask(parsed.title, currentDefaultListId(), startDate, dueDate, priority, { tags: parsed.tags });
  state.tasks.unshift(task);
  state.selectedTaskId = task.id;
  saveState();
  render();
}

function updateTask(id, patch, historyText) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  Object.assign(task, patch);
  if (historyText) addHistory(task, historyText);
  saveState();
  render();
}

function nextOccurrence(dateKey, repeat) {
  if (repeat === "daily") return addDays(dateKey, 1);
  if (repeat === "weekly") return addDays(dateKey, 7);
  if (repeat === "weekdays") {
    let next = addDays(dateKey, 1);
    while ([0, 6].includes(new Date(`${next}T00:00:00`).getDay())) next = addDays(next, 1);
    return next;
  }
  if (repeat === "monthly") {
    const [year, month, day] = dateKey.split("-").map(Number);
    const lastDay = new Date(year, month + 1, 0).getDate();
    return formatDate(new Date(year, month, Math.min(day, lastDay)));
  }
  return addDays(dateKey, 1);
}

function shiftDateTime(value, days) {
  if (!value) return value;
  return addDays(value.slice(0, 10), days) + value.slice(10);
}

function setTaskCompleted(task, completed) {
  if (!task) return;
  if (completed && task.repeat) {
    const snapshot = structuredClone(task);
    snapshot.id = createId();
    snapshot.repeat = "";
    snapshot.completed = true;
    snapshot.updatedAt = Date.now();
    snapshot.history = [{ at: Date.now(), text: "完成循环任务" }, ...snapshot.history].slice(0, 30);
    state.tasks.push(snapshot);

    const base = task.dueDate || task.startDate || todayKey;
    const days = diffDays(base, nextOccurrence(base, task.repeat));
    if (task.startDate) task.startDate = addDays(task.startDate, days);
    if (task.dueDate) task.dueDate = addDays(task.dueDate, days);
    task.reminder = shiftDateTime(task.reminder, days);
    task.subtasks.forEach((subtask) => {
      subtask.completed = false;
      subtask.reminder = shiftDateTime(subtask.reminder, days);
    });
    addHistory(task, `完成一次循环，顺延至 ${dateLabel(taskDate(task))}`);
    toast(`已记录完成，下次：${dateLabel(taskDate(task))}`);
  } else {
    task.completed = completed;
    addHistory(task, completed ? "完成任务" : "重新打开任务");
  }
  saveState();
  render();
}

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  els.toastStack.append(item);
  setTimeout(() => {
    item.classList.add("leaving");
    setTimeout(() => item.remove(), 300);
  }, 3200);
}

function notify(title, body) {
  toast(body ? `${title}：${body}` : title);
  if (window.Notification?.permission === "granted") {
    const notice = new Notification(title, { body });
    notice.addEventListener("click", () => window.focus());
  }
}

function ensureNotifyPermission() {
  if (!window.Notification || Notification.permission !== "default") return;
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") toast("已开启系统通知，提醒会准时弹出");
    if (permission === "denied") toast("浏览器通知被拒绝，提醒将只在页面内显示");
  });
}

function reminderId(itemId, reminder) {
  return `${itemId}@${reminder}`;
}

function checkReminders() {
  refreshToday();
  const nowValue = nowValueString();
  let fired = false;
  state.tasks.forEach((task) => {
    if (task.completed) return;
    if (task.reminder && task.reminder <= nowValue) {
      fired = fireReminder(reminderId(task.id, task.reminder), "任务提醒", task.title) || fired;
    }
    task.subtasks.forEach((subtask) => {
      if (!subtask.completed && subtask.reminder && subtask.reminder <= nowValue) {
        fired = fireReminder(reminderId(subtask.id, subtask.reminder), "检查项提醒", `${task.title} · ${subtask.title}`) || fired;
      }
    });
  });
  if (fired) saveState();
}

function fireReminder(key, kind, text) {
  if (state.notified[key]) return false;
  state.notified[key] = Date.now();
  notify(`⏰ ${kind}`, text);
  return true;
}

function muteStaleReminders() {
  const cutoff = nowValueString(-10 * 60 * 1000);
  state.tasks.forEach((task) => {
    if (task.completed) return;
    if (task.reminder && task.reminder < cutoff) {
      state.notified[reminderId(task.id, task.reminder)] ??= Date.now();
    }
    task.subtasks.forEach((subtask) => {
      if (!subtask.completed && subtask.reminder && subtask.reminder < cutoff) {
        state.notified[reminderId(subtask.id, subtask.reminder)] ??= Date.now();
      }
    });
  });
}

function pruneNotified() {
  const valid = new Set();
  state.tasks.forEach((task) => {
    if (task.reminder) valid.add(reminderId(task.id, task.reminder));
    task.subtasks.forEach((subtask) => {
      if (subtask.reminder) valid.add(reminderId(subtask.id, subtask.reminder));
    });
  });
  Object.keys(state.notified).forEach((key) => {
    if (!valid.has(key)) delete state.notified[key];
  });
}

function refreshToday() {
  const current = formatDate(new Date());
  if (current !== todayKey) {
    todayKey = current;
    render();
  }
}

function openModal(title, build) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modalOverlay";
  const modal = document.createElement("div");
  modal.className = "modal";
  const heading = document.createElement("h3");
  heading.textContent = title;
  modal.append(heading);
  build(modal);
  overlay.append(modal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  document.body.append(overlay);
  overlay.querySelector("input, select")?.focus();
}

function closeModal() {
  document.querySelector("#modalOverlay")?.remove();
}

function modalField(labelText, input) {
  const label = document.createElement("label");
  label.className = "modal-field";
  const caption = document.createElement("span");
  caption.textContent = labelText;
  label.append(caption, input);
  return label;
}

function modalButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function modalActions(...buttons) {
  const row = document.createElement("div");
  row.className = "modal-actions";
  row.append(...buttons);
  return row;
}

function modalText(message) {
  const text = document.createElement("p");
  text.className = "modal-text";
  text.textContent = message;
  return text;
}

function confirmModal(message, onConfirm) {
  openModal("确认操作", (modal) => {
    modal.append(
      modalText(message),
      modalActions(
        modalButton("取消", "soft-btn", closeModal),
        modalButton("确定", "primary-btn", () => {
          closeModal();
          onConfirm();
        })
      )
    );
  });
}

function openListModal(list) {
  openModal(list ? "编辑清单" : "新建清单", (modal) => {
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 30;
    nameInput.placeholder = "清单名称";
    nameInput.value = list?.name ?? "";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = list?.color ?? "#4778ff";
    modal.append(modalField("名称", nameInput), modalField("颜色", colorInput));

    if (list && list.id !== "inbox") {
      modal.append(
        modalButton("删除清单（任务移回收集箱）", "danger-btn", () => {
          confirmModal(`删除清单「${list.name}」？其中的任务会移回收集箱。`, () => {
            state.tasks.forEach((task) => {
              if (task.listId === list.id) task.listId = "inbox";
            });
            state.lists = state.lists.filter((item) => item.id !== list.id);
            if (state.activeView === list.id) state.activeView = "today";
            saveState();
            render();
            toast(`已删除清单「${list.name}」`);
          });
        })
      );
    }

    modal.append(
      modalActions(
        modalButton("取消", "soft-btn", closeModal),
        modalButton("保存", "primary-btn", () => {
          const name = nameInput.value.trim();
          if (!name) {
            nameInput.focus();
            return;
          }
          if (list) {
            list.name = name;
            list.color = colorInput.value;
          } else {
            const id = createId();
            state.lists.push({ id, name, color: colorInput.value });
            state.activeView = id;
          }
          closeModal();
          saveState();
          render();
        })
      )
    );
  });
}

function openFilterModal(filter) {
  openModal(filter ? "编辑筛选器" : "新建筛选器", (modal) => {
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 30;
    nameInput.placeholder = "筛选器名称";
    nameInput.value = filter?.name ?? "";
    const typeSelect = document.createElement("select");
    FILTER_TYPES.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      typeSelect.append(option);
    });
    typeSelect.value = filter?.type ?? "overdue";
    modal.append(modalField("名称", nameInput), modalField("条件", typeSelect));

    if (filter) {
      modal.append(
        modalButton("删除筛选器", "danger-btn", () => {
          state.filters = state.filters.filter((item) => item.id !== filter.id);
          if (state.activeView === filter.id) state.activeView = "today";
          closeModal();
          saveState();
          render();
          toast(`已删除筛选器「${filter.name}」`);
        })
      );
    }

    modal.append(
      modalActions(
        modalButton("取消", "soft-btn", closeModal),
        modalButton("保存", "primary-btn", () => {
          const name = nameInput.value.trim();
          if (!name) {
            nameInput.focus();
            return;
          }
          if (filter) {
            filter.name = name;
            filter.type = typeSelect.value;
          } else {
            state.filters.push({ id: createId(), name, type: typeSelect.value });
          }
          closeModal();
          saveState();
          render();
        })
      )
    );
  });
}

function openImportModal(raw) {
  openModal("导入数据", (modal) => {
    modal.append(
      modalText(`文件包含 ${raw.tasks.length} 个任务、${raw.lists.length} 个清单。选择导入方式：`),
      modalActions(
        modalButton("取消", "soft-btn", closeModal),
        modalButton("替换全部", "danger-btn", () => {
          confirmModal("替换会覆盖当前所有数据，确定继续？", () => replaceImport(raw));
        }),
        modalButton("合并导入", "primary-btn", () => mergeImport(raw))
      )
    );
  });
}

function mergeImport(raw) {
  const incoming = normalizeState(raw);
  const listIds = new Set(state.lists.map((item) => item.id));
  incoming.lists.forEach((list) => {
    if (!listIds.has(list.id)) state.lists.push(list);
  });
  const filterIds = new Set(state.filters.map((item) => item.id));
  incoming.filters.forEach((filter) => {
    if (!filterIds.has(filter.id)) state.filters.push(filter);
  });
  const taskIds = new Set(state.tasks.map((item) => item.id));
  let added = 0;
  incoming.tasks.forEach((task) => {
    if (!taskIds.has(task.id)) {
      state.tasks.push(task);
      added += 1;
    }
  });
  closeModal();
  saveState();
  render();
  toast(`合并完成：新增 ${added} 个任务`);
}

function replaceImport(raw) {
  state = normalizeState(raw);
  if (!state.lists.some((list) => list.id === "inbox")) {
    state.lists.unshift({ id: "inbox", name: "收集箱", color: "#4778ff" });
  }
  state.activeMode = "tasks";
  state.activeView = "today";
  state.selectedTaskId = null;
  closeModal();
  saveState();
  render();
  toast(`已导入 ${state.tasks.length} 个任务`);
}

function render() {
  renderTheme();
  renderModes();
  renderNav();
  renderHeader();
  renderTasks();
  renderCalendar();
  renderFocus();
  renderStats();
  renderDetail();
}

function renderTheme() {
  els.body.className = "";
  if (state.theme !== "light") els.body.classList.add(`theme-${state.theme}`);
}

function renderModes() {
  els.railButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.activeMode));
  els.taskView.classList.toggle("hidden", state.activeMode !== "tasks");
  els.calendarView.classList.toggle("hidden", state.activeMode !== "calendar");
  els.focusView.classList.toggle("hidden", state.activeMode !== "focus");
  els.statsView.classList.toggle("hidden", state.activeMode !== "stats");
}

function renderHeader() {
  const open = countTasks((task) => !task.completed);
  const todayOpen = countTasks((task) => !task.completed && taskDate(task) === todayKey);
  const reminders = countTasks((task) => !task.completed && Boolean(task.reminder));
  const modeTitle = { tasks: getActiveTitle(), calendar: "日历", focus: "专注", stats: "统计" }[state.activeMode];
  els.viewTitle.textContent = searchQuery ? `搜索“${searchQuery}”` : modeTitle;
  els.viewMeta.textContent = `${todayOpen} 个今天待办 · ${open} 个未完成 · ${reminders} 个提醒`;
  els.taskStart.value = currentDefaultDate();
  els.taskDue.value = currentDefaultDate();
}

function renderNav() {
  els.smartLists.replaceChildren();
  els.projectList.replaceChildren();
  els.filterList.replaceChildren();
  els.tagList.replaceChildren();
  smartDefinitions().forEach((item) => els.smartLists.append(navButton(item.id, item.icon, item.title, item.count)));
  state.lists.forEach((list) => {
    const count = countTasks((task) => task.listId === list.id && !task.completed);
    const onEdit = list.id === "inbox" ? null : () => openListModal(list);
    els.projectList.append(navButton(list.id, "●", list.name, count, list.color, onEdit));
  });
  state.filters.forEach((filter) => {
    const count = countTasks((task) => matchesFilter(task, filter));
    els.filterList.append(navButton(filter.id, "◇", filter.name, count, null, () => openFilterModal(filter)));
  });
  const tags = [...new Set(state.tasks.flatMap((task) => task.tags))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  els.tagSection.classList.toggle("hidden", tags.length === 0);
  tags.forEach((tag) => {
    const count = countTasks((task) => !task.completed && task.tags.includes(tag));
    els.tagList.append(navButton(`tag:${tag}`, "#", tag, count));
  });
}

function navButton(id, icon, title, count, color, onEdit) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-item";
  button.classList.toggle("active", state.activeView === id);
  const iconEl = document.createElement("span");
  iconEl.style.color = color ?? "currentColor";
  iconEl.textContent = icon;
  const titleEl = document.createElement("span");
  titleEl.textContent = title;
  const countEl = document.createElement("span");
  countEl.className = "nav-count";
  countEl.textContent = count;
  button.append(iconEl, titleEl, countEl);
  if (onEdit) {
    const edit = document.createElement("span");
    edit.className = "nav-edit";
    edit.textContent = "✎";
    edit.title = "编辑";
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      onEdit();
    });
    button.append(edit);
  }
  button.addEventListener("click", () => setView(id));
  return button;
}

function renderTasks() {
  const tasks = visibleTasks();
  const done = countTasks((task) => task.completed);
  const estimate = state.tasks.reduce((total, task) => total + Number(task.estimatePomos || 0), 0);
  const actual = state.tasks.reduce((total, task) => total + Number(task.actualPomos || 0), 0);
  els.statsLine.textContent = `${tasks.length} 个当前任务 · ${done} 个已完成 · 番茄 ${actual}/${estimate}`;
  els.taskList.replaceChildren();
  els.emptyState.classList.toggle("visible", tasks.length === 0);
  Object.entries(groupedTasks(tasks)).forEach(([title, items]) => {
    const heading = document.createElement("div");
    heading.className = "group-title";
    heading.textContent = `${title} ${items.length}`;
    els.taskList.append(heading);
    items.forEach((task) => els.taskList.append(taskRow(task)));
  });
}

function taskRow(task) {
  const row = els.taskTemplate.content.firstElementChild.cloneNode(true);
  const title = row.querySelector("strong");
  const meta = row.querySelector("small");
  const date = row.querySelector(".task-date");
  const list = state.lists.find((item) => item.id === task.listId);
  const subDone = task.subtasks.filter((item) => item.completed).length;
  const subText = task.subtasks.length ? ` · 检查项 ${subDone}/${task.subtasks.length}` : "";
  const reminderText = task.reminder ? ` · 提醒 ${dateTimeLabel(task.reminder)}` : "";
  const pomoText = task.estimatePomos ? ` · 番茄 ${task.actualPomos}/${task.estimatePomos}` : "";
  const repeatText = task.repeat ? ` · ↻ ${REPEAT_LABELS[task.repeat] ?? "重复"}` : "";
  const tagText = task.tags.length ? ` · ${task.tags.map((tag) => `#${tag}`).join(" ")}` : "";

  row.classList.toggle("selected", state.selectedTaskId === task.id);
  row.classList.toggle("done", task.completed);
  row.addEventListener("click", () => {
    state.selectedTaskId = task.id;
    saveState();
    render();
  });

  title.textContent = task.title;
  title.className = `priority-${task.priority}`;
  meta.textContent = `${list?.name ?? "清单"} · ${priorityLabel(task.priority)}${tagText}${repeatText}${subText}${reminderText}${pomoText}`;
  date.textContent = dateLabel(taskDate(task));

  row.querySelector(".task-check").addEventListener("click", (event) => {
    event.stopPropagation();
    setTaskCompleted(task, !task.completed);
  });

  return row;
}

function renderCalendar() {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  els.calendarTitle.textContent = `${year} 年 ${month} 月`;
  els.calendarGrid.replaceChildren();
  ["日", "一", "二", "三", "四", "五", "六"].forEach((weekday) => {
    const cell = document.createElement("div");
    cell.className = "calendar-day muted";
    cell.innerHTML = `<div class="calendar-date">${weekday}</div>`;
    els.calendarGrid.append(cell);
  });

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = formatDate(date);
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.classList.toggle("muted", date.getMonth() !== month - 1);
    cell.classList.toggle("today", key === todayKey);
    cell.innerHTML = `<div class="calendar-date"><span>${date.getDate()}</span><span>${countTasks((task) => taskDate(task) === key)}</span></div>`;
    state.tasks.filter((task) => taskDate(task) === key).slice(0, 3).forEach((task) => {
      const item = document.createElement("div");
      item.className = "calendar-task";
      item.textContent = task.title;
      item.style.background = state.lists.find((list) => list.id === task.listId)?.color ?? "var(--blue)";
      item.addEventListener("click", () => {
        state.selectedTaskId = task.id;
        state.activeMode = "tasks";
        state.activeView = "all";
        saveState();
        render();
      });
      cell.append(item);
    });
    els.calendarGrid.append(cell);
  }
}

function renderFocus() {
  const openTasks = state.tasks.filter((task) => !task.completed);
  els.focusTask.replaceChildren();
  openTasks.forEach((task) => {
    const option = document.createElement("option");
    option.value = task.id;
    option.textContent = task.title;
    els.focusTask.append(option);
  });
  if (state.selectedTaskId) els.focusTask.value = state.selectedTaskId;
  renderFocusTime();
}

function renderFocusTime() {
  const minutes = String(Math.floor(focusSeconds / 60)).padStart(2, "0");
  const seconds = String(focusSeconds % 60).padStart(2, "0");
  els.focusTime.textContent = `${minutes}:${seconds}`;
}

function renderStats() {
  const total = state.tasks.length;
  const done = countTasks((task) => task.completed);
  const open = total - done;
  const overdue = countTasks((task) => !task.completed && taskDate(task) && taskDate(task) < todayKey);
  const estimate = state.tasks.reduce((sum, task) => sum + Number(task.estimatePomos || 0), 0);
  const actual = state.tasks.reduce((sum, task) => sum + Number(task.actualPomos || 0), 0);
  const rate = total ? Math.round((done / total) * 100) : 0;
  els.statsView.innerHTML = `
    <div class="stats-board">
      ${statCard("完成率", `${rate}%`, rate)}
      ${statCard("未完成", `${open}`, Math.min(open * 12, 100))}
      ${statCard("已逾期", `${overdue}`, Math.min(overdue * 20, 100))}
      ${statCard("番茄进度", `${actual}/${estimate}`, estimate ? Math.round((actual / estimate) * 100) : 0)}
    </div>
  `;
}

function statCard(label, value, percent) {
  const width = Math.max(0, Math.min(100, percent));
  return `
    <div class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <div class="bar"><i style="width:${width}%"></i></div>
    </div>
  `;
}

function renderDetail() {
  const task = selectedTask();
  els.detailEmpty.classList.toggle("hidden", Boolean(task));
  els.detailForm.classList.toggle("hidden", !task);
  els.detailList.replaceChildren();
  els.subtaskList.replaceChildren();
  els.historyList.replaceChildren();
  if (!task) return;

  state.lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.name;
    els.detailList.append(option);
  });

  els.detailCompleted.checked = task.completed;
  els.detailTitle.value = task.title;
  els.detailList.value = task.listId;
  els.detailStart.value = task.startDate;
  els.detailDue.value = task.dueDate;
  els.detailReminder.value = task.reminder;
  els.detailPriority.value = task.priority;
  els.detailRepeat.value = task.repeat ?? "";
  els.detailEstimate.value = task.estimatePomos;
  els.detailTags.value = task.tags.join(" ");
  els.detailNotes.value = task.notes;
  task.subtasks.forEach((subtask) => els.subtaskList.append(subtaskRow(task, subtask)));
  task.history.slice(0, 8).forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.textContent = `${new Date(item.at).toLocaleString("zh-CN")} · ${item.text}`;
    els.historyList.append(row);
  });
}

function subtaskRow(task, subtask) {
  const row = els.subtaskTemplate.content.firstElementChild.cloneNode(true);
  const done = row.querySelector(".subtask-done");
  const title = row.querySelector(".subtask-title");
  const reminder = row.querySelector(".subtask-reminder");
  const remove = row.querySelector(".subtask-delete");
  done.checked = subtask.completed;
  title.value = subtask.title;
  reminder.value = subtask.reminder;
  done.addEventListener("change", () => {
    subtask.completed = done.checked;
    addHistory(task, done.checked ? `完成检查项：${subtask.title}` : `重新打开检查项：${subtask.title}`);
    saveState();
    render();
  });
  title.addEventListener("change", () => {
    subtask.title = title.value.trim() || subtask.title;
    addHistory(task, "更新检查项");
    saveState();
    render();
  });
  reminder.addEventListener("change", () => {
    subtask.reminder = reminder.value;
    addHistory(task, "设置检查项提醒");
    if (reminder.value) ensureNotifyPermission();
    saveState();
    render();
  });
  remove.addEventListener("click", () => {
    task.subtasks = task.subtasks.filter((item) => item.id !== subtask.id);
    addHistory(task, `删除检查项：${subtask.title}`);
    saveState();
    render();
  });
  return row;
}

els.railButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
els.quickAdd.addEventListener("click", () => {
  state.activeMode = "tasks";
  render();
  els.taskInput.focus();
});
els.quickAddTop.addEventListener("click", () => els.quickAdd.click());

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.taskInput.value.trim();
  if (!title) {
    els.taskInput.focus();
    return;
  }
  addTask(title, els.taskStart.value, els.taskDue.value, els.taskPriority.value);
  els.taskInput.value = "";
  els.taskPriority.value = "none";
});

els.searchInput.addEventListener("input", () => {
  searchQuery = els.searchInput.value.trim();
  if (searchQuery) state.activeMode = "tasks";
  render();
});
els.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    els.searchInput.value = "";
    searchQuery = "";
    render();
  }
});

els.clearDone.addEventListener("click", () => {
  const done = countTasks((task) => task.completed);
  if (!done) {
    toast("没有已完成任务需要清理");
    return;
  }
  confirmModal(`清理 ${done} 个已完成任务？该操作不可撤销。`, () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.selectedTaskId = visibleTasks()[0]?.id ?? null;
    saveState();
    render();
    toast(`已清理 ${done} 个已完成任务`);
  });
});

els.exportData.addEventListener("click", async () => {
  const data = JSON.stringify(state, null, 2);
  try {
    await navigator.clipboard.writeText(data);
    toast("数据已复制到剪贴板");
  } catch {
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `docktodo-${todayKey}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast("已下载数据文件");
  }
});

els.importData.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files[0];
  els.importFile.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed?.tasks) || !Array.isArray(parsed?.lists)) throw new Error("invalid");
    openImportModal(parsed);
  } catch {
    toast("导入失败：不是有效的 DockTodo 数据文件");
  }
});

els.addList.addEventListener("click", () => openListModal(null));
els.addFilter.addEventListener("click", () => openFilterModal(null));

els.themeToggle.addEventListener("click", () => {
  const themes = ["light", "dark", "mint", "sunrise"];
  state.theme = themes[(themes.indexOf(state.theme) + 1) % themes.length];
  saveState();
  render();
});

els.prevMonth.addEventListener("click", () => {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  state.calendarMonth = formatDate(new Date(year, month - 2, 1)).slice(0, 7);
  saveState();
  render();
});

els.nextMonth.addEventListener("click", () => {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  state.calendarMonth = formatDate(new Date(year, month, 1)).slice(0, 7);
  saveState();
  render();
});

els.startFocus.addEventListener("click", () => {
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
    els.startFocus.textContent = "继续";
    return;
  }
  els.startFocus.textContent = "暂停";
  focusTimer = setInterval(() => {
    focusSeconds -= 1;
    renderFocusTime();
    if (focusSeconds <= 0) {
      clearInterval(focusTimer);
      focusTimer = null;
      focusSeconds = 25 * 60;
      els.startFocus.textContent = "开始";
      recordPomo();
      notify("🍅 番茄完成", "已自动记录 1 个番茄");
    }
  }, 1000);
});

els.resetFocus.addEventListener("click", () => {
  clearInterval(focusTimer);
  focusTimer = null;
  focusSeconds = 25 * 60;
  els.startFocus.textContent = "开始";
  renderFocusTime();
});

els.completePomo.addEventListener("click", recordPomo);
els.focusTask.addEventListener("change", () => {
  state.selectedTaskId = els.focusTask.value;
  saveState();
  render();
});

function recordPomo() {
  const id = els.focusTask.value || state.selectedTaskId;
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.actualPomos = Number(task.actualPomos || 0) + 1;
  addHistory(task, "完成 1 个番茄");
  state.selectedTaskId = task.id;
  saveState();
  render();
}

els.detailCompleted.addEventListener("change", () => setTaskCompleted(selectedTask(), els.detailCompleted.checked));
els.detailTitle.addEventListener("change", () => {
  const title = els.detailTitle.value.trim();
  if (title) updateTask(state.selectedTaskId, { title }, "更新标题");
});
els.detailList.addEventListener("change", () => updateTask(state.selectedTaskId, { listId: els.detailList.value }, "移动到其他清单"));
els.detailStart.addEventListener("change", () => updateTask(state.selectedTaskId, { startDate: els.detailStart.value }, "更新开始日期"));
els.detailDue.addEventListener("change", () => updateTask(state.selectedTaskId, { dueDate: els.detailDue.value }, "更新截止日期"));
els.detailReminder.addEventListener("change", () => {
  if (els.detailReminder.value) ensureNotifyPermission();
  updateTask(state.selectedTaskId, { reminder: els.detailReminder.value }, "设置任务提醒");
});
els.detailPriority.addEventListener("change", () => updateTask(state.selectedTaskId, { priority: els.detailPriority.value }, "更新优先级"));
els.detailRepeat.addEventListener("change", () => updateTask(state.selectedTaskId, { repeat: els.detailRepeat.value }, "更新重复规则"));
els.detailEstimate.addEventListener("change", () => updateTask(state.selectedTaskId, { estimatePomos: Number(els.detailEstimate.value || 0) }, "更新预计番茄"));
els.detailTags.addEventListener("change", () => {
  const tags = [...new Set(els.detailTags.value.split(/[\s,，#]+/).map((tag) => tag.trim()).filter(Boolean))];
  updateTask(state.selectedTaskId, { tags }, "更新标签");
});
els.detailNotes.addEventListener("change", () => updateTask(state.selectedTaskId, { notes: els.detailNotes.value }, "更新备注"));

els.addSubtask.addEventListener("click", () => {
  const task = selectedTask();
  if (!task) return;
  task.subtasks.push(makeSubtask("新检查项", false, ""));
  addHistory(task, "添加检查项");
  saveState();
  render();
});

els.deleteTask.addEventListener("click", () => {
  const task = selectedTask();
  if (!task) return;
  confirmModal(`删除任务「${task.title}」？该操作不可撤销。`, () => {
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    state.selectedTaskId = visibleTasks()[0]?.id ?? null;
    saveState();
    render();
    toast("任务已删除");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

Object.entries(REPEAT_LABELS).forEach(([value, label]) => {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  els.detailRepeat.append(option);
});

pruneNotified();
muteStaleReminders();
saveState();
render();
checkReminders();
setInterval(checkReminders, 20000);
