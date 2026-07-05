// The data layer (STORAGE_KEY, constants, defaultState, todayKey, factories,
// sanitizers, load / normalizeState / saveState) lives in assets/data.js,
// loaded before this file. UI strings live in assets/i18n.js. This file keeps
// UI state, DOM wiring and business logic.
let searchQuery = "";

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
  settingsView: document.querySelector("#settingsView"),
  clientsView: document.querySelector("#clientsView"),
  timesheetView: document.querySelector("#timesheetView"),
  invoiceView: document.querySelector("#invoiceView"),
  billingStrip: document.querySelector("#billingStrip"),
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
  detailClose: document.querySelector("#detailClose"),
  detailScrim: document.querySelector("#detailScrim"),
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
  detailProject: document.querySelector("#detailProject"),
  detailBillable: document.querySelector("#detailBillable"),
  detailRate: document.querySelector("#detailRate"),
  detailNotes: document.querySelector("#detailNotes"),
  addSubtask: document.querySelector("#addSubtask"),
  subtaskList: document.querySelector("#subtaskList"),
  subtaskTemplate: document.querySelector("#subtaskTemplate"),
  historyList: document.querySelector("#historyList"),
  addTimeEntry: document.querySelector("#addTimeEntry"),
  timeEntryList: document.querySelector("#timeEntryList"),
  deleteTask: document.querySelector("#deleteTask"),
  toastStack: document.querySelector("#toastStack"),
};

let state = normalizeState(loadState());
let focusSeconds = 25 * 60;
let focusTimer = null;
let focusSession = null; // { taskId, startedAt } — set when the timer starts from idle, kept across pauses
let invoicePreview = null; // invoice currently shown in the preview pane (draft or saved snapshot)

function taskDate(task) {
  return task.dueDate || task.startDate || "";
}

function selectedTask() {
  return state.tasks.find((task) => task.id === state.selectedTaskId) ?? null;
}

function smartDefinitions() {
  return [
    { id: "today", icon: "☑", title: t("view.today"), count: countTasks((task) => !task.completed && taskDate(task) === todayKey) },
    { id: "next7", icon: "▣", title: t("view.next7"), count: countTasks((task) => !task.completed && isWithinNextSevenDays(taskDate(task))) },
    { id: "calendar", icon: "▦", title: t("view.calendar"), count: countTasks((task) => !task.completed && Boolean(taskDate(task))) },
    { id: "inbox", icon: "⌂", title: t("view.inbox"), count: countTasks((task) => !task.completed && task.listId === "inbox") },
    { id: "all", icon: "≡", title: t("view.all"), count: countTasks((task) => !task.completed) },
    { id: "completed", icon: "✓", title: t("view.completed"), count: countTasks((task) => task.completed) },
  ];
}

function countTasks(predicate) {
  return state.tasks.filter(predicate).length;
}

// priorityLabel / priorityShort live in assets/i18n.js.

function getActiveTitle() {
  if (state.activeView.startsWith("tag:")) return `#${state.activeView.slice(4)}`;
  const smart = smartDefinitions().find((item) => item.id === state.activeView);
  if (smart) return smart.title;
  const list = state.lists.find((item) => item.id === state.activeView);
  if (list) return list.name;
  const filter = state.filters.find((item) => item.id === state.activeView);
  return filter?.name ?? t("view.tasks");
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
  if (task.completed) return t("group.completed");
  const date = taskDate(task);
  if (!date) return t("group.nodate");
  if (date < todayKey) return t("group.overdue");
  if (date === todayKey) return t("group.today");
  if (date === addDays(todayKey, 1)) return t("group.tomorrow");
  return t("group.later");
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

function closeDetail() {
  state.selectedTaskId = null;
  saveState();
  render();
}

function setMode(mode) {
  state.activeMode = mode;
  if (mode === "calendar") state.activeView = "calendar";
  // Leaving calendar via the rail must drop the calendar-only view, otherwise
  // the header title ("Calendar") and the task list content desync.
  else if (state.activeView === "calendar") state.activeView = "today";
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
  // Only treat "#tag" as a tag at a word boundary, so a URL fragment like
  // example.com/page#section is left untouched.
  const title = rawTitle
    .replace(/(^|\s)#([^\s#，,]+)/g, (_, pre, tag) => {
      tags.push(tag);
      return pre;
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

function nextOccurrence(dateKey, repeat, anchorDay = 0) {
  if (repeat === "daily") return addDays(dateKey, 1);
  if (repeat === "weekly") return addDays(dateKey, 7);
  if (repeat === "weekdays") {
    let next = addDays(dateKey, 1);
    while ([0, 6].includes(new Date(`${next}T00:00:00`).getDay())) next = addDays(next, 1);
    return next;
  }
  if (repeat === "monthly") {
    const [year, month] = dateKey.split("-").map(Number);
    // Anchor to the original day-of-month so a short month (e.g. Feb) never
    // permanently pulls the series back to the 28th.
    const day = anchorDay || Number(dateKey.slice(8, 10));
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
    snapshot.history = [{ at: Date.now(), text: t("history.repeatDone") }, ...snapshot.history].slice(0, 30);
    state.tasks.push(snapshot);

    // Advance from today when the task is already overdue, so completing a
    // stale recurring task schedules the next occurrence into the future
    // rather than one cycle past the missed date.
    const anchor = task.dueDate || task.startDate || todayKey;
    const from = anchor < todayKey ? todayKey : anchor;
    const days = diffDays(anchor, nextOccurrence(from, task.repeat, task.repeatAnchorDay));
    if (task.startDate) task.startDate = addDays(task.startDate, days);
    if (task.dueDate) task.dueDate = addDays(task.dueDate, days);
    task.reminder = shiftDateTime(task.reminder, days);
    task.subtasks.forEach((subtask) => {
      subtask.completed = false;
      subtask.reminder = shiftDateTime(subtask.reminder, days);
    });
    addHistory(task, t("history.repeatAdvanced", { date: dateLabel(taskDate(task)) }));
    toast(t("toast.repeatNext", { date: dateLabel(taskDate(task)) }));
  } else {
    task.completed = completed;
    addHistory(task, completed ? t("history.completed") : t("history.reopened"));
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
    try {
      const notice = new Notification(title, { body });
      notice.addEventListener("click", () => window.focus());
    } catch {
      // Some environments (e.g. Android Chrome) throw on the page-level
      // Notification constructor; the in-page toast already covers us.
    }
  }
}

function ensureNotifyPermission() {
  if (!window.Notification || Notification.permission !== "default") return;
  let reported = false;
  const report = (permission) => {
    if (reported) return;
    reported = true;
    if (permission === "granted") toast(t("notify.granted"));
    if (permission === "denied") toast(t("notify.denied"));
  };
  try {
    const result = Notification.requestPermission(report);
    if (result?.then) result.then(report).catch(() => {});
  } catch {
    // Safari <=15 only accepts the callback form (already passed above); if we
    // land here even that is unavailable.
  }
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
      fired = fireReminder(reminderId(task.id, task.reminder), t("reminder.task"), task.title) || fired;
    }
    task.subtasks.forEach((subtask) => {
      if (!subtask.completed && subtask.reminder && subtask.reminder <= nowValue) {
        fired = fireReminder(reminderId(subtask.id, subtask.reminder), t("reminder.subtask"), `${task.title} · ${subtask.title}`) || fired;
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
  openModal(t("modal.confirm"), (modal) => {
    modal.append(
      modalText(message),
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("action.ok"), "primary-btn", () => {
          closeModal();
          onConfirm();
        })
      )
    );
  });
}

function openListModal(list) {
  openModal(list ? t("list.edit") : t("list.new"), (modal) => {
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 30;
    nameInput.placeholder = t("list.namePlaceholder");
    nameInput.value = list?.name ?? "";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = list?.color ?? "#4778ff";
    modal.append(modalField(t("field.name"), nameInput), modalField(t("field.color"), colorInput));

    if (list && list.id !== "inbox") {
      modal.append(
        modalButton(t("list.deleteBtn"), "danger-btn", () => {
          confirmModal(t("confirm.deleteList", { name: list.name }), () => {
            state.tasks.forEach((task) => {
              if (task.listId === list.id) task.listId = "inbox";
            });
            state.lists = state.lists.filter((item) => item.id !== list.id);
            if (state.activeView === list.id) state.activeView = "today";
            saveState();
            render();
            toast(t("toast.listDeleted", { name: list.name }));
          });
        })
      );
    }

    modal.append(
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("form.save"), "primary-btn", () => {
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
  openModal(filter ? t("filter.edit") : t("filter.new"), (modal) => {
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 30;
    nameInput.placeholder = t("filter.namePlaceholder");
    nameInput.value = filter?.name ?? "";
    const typeSelect = document.createElement("select");
    FILTER_TYPE_IDS.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = filterTypeLabel(value);
      typeSelect.append(option);
    });
    typeSelect.value = filter?.type ?? "overdue";
    modal.append(modalField(t("field.name"), nameInput), modalField(t("field.condition"), typeSelect));

    if (filter) {
      modal.append(
        modalButton(t("filter.deleteBtn"), "danger-btn", () => {
          state.filters = state.filters.filter((item) => item.id !== filter.id);
          if (state.activeView === filter.id) state.activeView = "today";
          closeModal();
          saveState();
          render();
          toast(t("toast.filterDeleted", { name: filter.name }));
        })
      );
    }

    modal.append(
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("form.save"), "primary-btn", () => {
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
  openModal(t("import.title"), (modal) => {
    modal.append(
      modalText(t("import.summary", { tasks: raw.tasks.length, lists: raw.lists.length })),
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("import.replaceAll"), "danger-btn", () => {
          confirmModal(t("confirm.replaceAll"), () => replaceImport(raw));
        }),
        modalButton(t("import.merge"), "primary-btn", () => mergeImport(raw))
      )
    );
  });
}

function openClientModal(client) {
  openModal(client ? t("client.edit") : t("client.new"), (modal) => {
    const nameInput = inputEl("text", client?.name ?? "", t("client.namePlaceholder"));
    nameInput.maxLength = 60;
    const currencySelect = document.createElement("select");
    COMMON_CURRENCIES.forEach((cur) => {
      const option = document.createElement("option");
      option.value = cur;
      option.textContent = cur;
      currencySelect.append(option);
    });
    currencySelect.value = client?.currency ?? "USD";
    const rateInput = inputEl("number", client ? centsToMajor(client.hourlyRateCents, client.currency) : "", "0.00");
    rateInput.min = "0";
    rateInput.step = "0.01";
    const billingInput = document.createElement("textarea");
    billingInput.rows = 3;
    billingInput.value = client?.billingInfo ?? "";
    billingInput.placeholder = t("client.billingPlaceholder");
    modal.append(
      modalField(t("field.name"), nameInput),
      modalField(t("client.currency"), currencySelect),
      modalField(t("client.hourlyRate"), rateInput),
      modalField(t("client.billingInfo"), billingInput)
    );

    if (client) {
      modal.append(
        modalButton(t("client.deleteBtn"), "danger-btn", () => {
          confirmModal(t("confirm.deleteClient", { name: client.name }), () => {
            const projectIds = new Set(state.projects.filter((project) => project.clientId === client.id).map((project) => project.id));
            state.tasks.forEach((task) => {
              if (projectIds.has(task.projectId)) {
                task.projectId = null;
                task.billable = false;
              }
            });
            state.projects = state.projects.filter((project) => project.clientId !== client.id);
            state.clients = state.clients.filter((item) => item.id !== client.id);
            closeModal();
            saveState();
            render();
            toast(t("toast.clientDeleted", { name: client.name }));
          });
        })
      );
    }

    modal.append(
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("form.save"), "primary-btn", () => {
          const name = nameInput.value.trim();
          if (!name) {
            nameInput.focus();
            return;
          }
          const currency = currencySelect.value;
          const hourlyRateCents = centsFromMajor(rateInput.value, currency);
          if (client) {
            Object.assign(client, { name, currency, hourlyRateCents, billingInfo: billingInput.value });
          } else {
            state.clients.push({ id: createId(), name, currency, hourlyRateCents, billingInfo: billingInput.value, note: "" });
          }
          closeModal();
          saveState();
          render();
        })
      )
    );
  });
}

function openProjectModal(project, presetClientId) {
  if (!project && !state.clients.length) return;
  openModal(project ? t("project.edit") : t("project.new"), (modal) => {
    const nameInput = inputEl("text", project?.name ?? "", t("project.namePlaceholder"));
    nameInput.maxLength = 60;
    const clientSelect = document.createElement("select");
    state.clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client.id;
      option.textContent = client.name;
      clientSelect.append(option);
    });
    clientSelect.value = project?.clientId ?? presetClientId ?? state.clients[0]?.id ?? "";
    const rateInput = inputEl(
      "number",
      project?.rateOverrideCents != null ? centsToMajor(project.rateOverrideCents) : "",
      t("project.ratePlaceholder")
    );
    rateInput.min = "0";
    rateInput.step = "0.01";
    modal.append(
      modalField(t("field.name"), nameInput),
      modalField(t("project.client"), clientSelect),
      modalField(t("project.rateOverride"), rateInput)
    );

    if (project) {
      modal.append(
        modalButton(t("project.deleteBtn"), "danger-btn", () => {
          confirmModal(t("confirm.deleteProject", { name: project.name }), () => {
            state.tasks.forEach((task) => {
              if (task.projectId === project.id) {
                task.projectId = null;
                task.billable = false;
              }
            });
            state.projects = state.projects.filter((item) => item.id !== project.id);
            closeModal();
            saveState();
            render();
            toast(t("toast.projectDeleted", { name: project.name }));
          });
        })
      );
    }

    modal.append(
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("form.save"), "primary-btn", () => {
          const name = nameInput.value.trim();
          if (!name) {
            nameInput.focus();
            return;
          }
          const rateOverrideCents = rateInput.value.trim() === "" ? null : centsFromMajor(rateInput.value);
          if (project) {
            Object.assign(project, { name, clientId: clientSelect.value, rateOverrideCents });
          } else {
            state.projects.push({ id: createId(), name, clientId: clientSelect.value, rateOverrideCents });
          }
          closeModal();
          saveState();
          render();
        })
      )
    );
  });
}

function mergeImport(raw) {
  let incoming;
  try {
    incoming = normalizeState(structuredClone(raw));
  } catch {
    closeModal();
    toast(t("toast.importInvalid"));
    return;
  }
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
  ["clients", "projects", "timeEntries", "invoices"].forEach((key) => {
    const existing = new Set(state[key].map((item) => item.id));
    incoming[key].forEach((item) => {
      if (!existing.has(item.id)) state[key].push(item);
    });
  });
  state.settings.invoiceCounter = Math.max(state.settings.invoiceCounter, incoming.settings.invoiceCounter);
  closeModal();
  muteStaleReminders();
  saveState();
  render();
  toast(t("toast.merged", { n: added }));
}

function replaceImport(raw) {
  let next;
  try {
    next = structuredClone(raw);
    delete next.version;
    delete next.exportedAt;
    next = normalizeState(next);
  } catch {
    closeModal();
    toast(t("toast.importInvalid"));
    return;
  }
  next.activeMode = "tasks";
  next.activeView = "today";
  next.selectedTaskId = null;
  state = next;
  closeModal();
  muteStaleReminders();
  saveState();
  render();
  toast(t("toast.imported", { n: state.tasks.length }));
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
  renderSettings();
  renderClients();
  renderTimesheet();
  renderInvoices();
  renderBillingStrip();
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
  els.settingsView.classList.toggle("hidden", state.activeMode !== "settings");
  els.clientsView.classList.toggle("hidden", state.activeMode !== "clients");
  els.timesheetView.classList.toggle("hidden", state.activeMode !== "timesheet");
  els.invoiceView.classList.toggle("hidden", state.activeMode !== "invoices");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function inputEl(type, value, placeholder) {
  const el = document.createElement("input");
  el.type = type;
  el.value = value;
  if (placeholder) el.placeholder = placeholder;
  return el;
}

function renderClients() {
  if (state.activeMode !== "clients") return;
  const cards = state.clients
    .map((client) => {
      const projects = state.projects.filter((project) => project.clientId === client.id);
      const projectRows = projects.length
        ? projects
            .map(
              (project) =>
                `<div class="cp-project"><span>${escapeHtml(project.name)}${
                  project.rateOverrideCents != null ? ` · ${escapeHtml(moneyFormat(project.rateOverrideCents, client.currency))}` : ""
                }</span><button class="cp-edit" type="button" data-edit-project="${project.id}">✎</button></div>`
            )
            .join("")
        : `<div class="cp-empty">${t("clients.noProjects")}</div>`;
      return `
        <div class="cp-card">
          <div class="cp-head">
            <div>
              <strong>${escapeHtml(client.name)}</strong>
              <small>${escapeHtml(t("clients.rate", { rate: moneyFormat(client.hourlyRateCents, client.currency) }))} · ${client.currency}</small>
            </div>
            <button class="cp-edit" type="button" data-edit-client="${client.id}">✎</button>
          </div>
          <div class="cp-projects">${projectRows}</div>
          <button class="plain-btn" type="button" data-add-project="${client.id}">+ ${t("clients.addProject")}</button>
        </div>`;
    })
    .join("");
  els.clientsView.innerHTML = `
    <div class="clients-board">
      <div class="clients-head">
        <h2>${t("clients.title")}</h2>
        <button class="primary-btn" type="button" id="addClientBtn">${t("clients.addClient")}</button>
      </div>
      ${state.clients.length ? cards : `<p class="cp-empty">${t("clients.empty")}</p>`}
    </div>
  `;
  els.clientsView.querySelector("#addClientBtn").addEventListener("click", () => openClientModal(null));
  els.clientsView.querySelectorAll("[data-edit-client]").forEach((el) =>
    el.addEventListener("click", () => openClientModal(state.clients.find((client) => client.id === el.dataset.editClient)))
  );
  els.clientsView.querySelectorAll("[data-add-project]").forEach((el) =>
    el.addEventListener("click", () => openProjectModal(null, el.dataset.addProject))
  );
  els.clientsView.querySelectorAll("[data-edit-project]").forEach((el) =>
    el.addEventListener("click", () => openProjectModal(state.projects.find((project) => project.id === el.dataset.editProject)))
  );
}

function renderTimesheet() {
  if (state.activeMode !== "timesheet") return;
  const weekStart = state.timesheetWeek;
  const weekEnd = addDays(weekStart, 6);
  const data = timesheetData(weekStart);
  const dayHeaders = data.days
    .map(
      (day) =>
        `<th class="ts-num"><span class="ts-dow">${weekdayNames()[new Date(`${day}T00:00:00`).getDay()]}</span><span class="ts-dom">${day.slice(8)}</span></th>`
    )
    .join("");
  const rows = data.groups
    .map((group) => {
      const cells = group.perDaySecs
        .map((secs) => `<td class="ts-num">${secs ? formatHours(secs) : '<span class="ts-zero">·</span>'}</td>`)
        .join("");
      return `<tr>
        <td class="ts-label"><strong>${escapeHtml(group.clientName)}</strong><span>${escapeHtml(group.projectName)}</span></td>
        ${cells}
        <td class="ts-num ts-total">${formatHours(group.totalSecs)}</td>
        <td class="ts-num ts-amount">${escapeHtml(moneyFormat(group.amountCents, group.currency))}</td>
      </tr>`;
    })
    .join("");
  const totalRows = Object.entries(data.totalsByCurrency)
    .map(
      ([currency, totals]) =>
        `<tr class="ts-totalrow"><td class="ts-label">${t("timesheet.weekTotal")}</td><td class="ts-num" colspan="7"></td><td class="ts-num ts-total">${formatHours(
          totals.secs
        )}</td><td class="ts-num ts-amount">${escapeHtml(moneyFormat(totals.cents, currency))}</td></tr>`
    )
    .join("");
  const hasData = data.groups.length > 0;
  const unrated = data.unratedBillable ? `<p class="ts-warn">${escapeHtml(t("timesheet.unrated", { n: data.unratedBillable }))}</p>` : "";
  els.timesheetView.innerHTML = `
    <div class="ts-board">
      <div class="ts-toolbar">
        <button class="soft-btn" type="button" id="tsPrev">‹</button>
        <strong class="ts-range">${weekStart.slice(5)} – ${weekEnd.slice(5)}</strong>
        <button class="soft-btn" type="button" id="tsNext">›</button>
        <button class="soft-btn" type="button" id="tsToday">${t("timesheet.thisWeek")}</button>
        <button class="soft-btn" type="button" id="tsCsv">${t("timesheet.exportCsv")}</button>
      </div>
      ${unrated}
      ${
        hasData
          ? `<div class="ts-scroll"><table class="ts-table">
              <thead><tr><th class="ts-label"></th>${dayHeaders}<th class="ts-num">${t("timesheet.total")}</th><th class="ts-num">${t("timesheet.amount")}</th></tr></thead>
              <tbody>${rows}${totalRows}</tbody></table></div>`
          : `<p class="ts-empty">${t("timesheet.empty")}</p>`
      }
    </div>
  `;
  const setWeek = (key) => {
    state.timesheetWeek = key;
    saveState();
    render();
  };
  els.timesheetView.querySelector("#tsPrev").addEventListener("click", () => setWeek(addDays(weekStart, -7)));
  els.timesheetView.querySelector("#tsNext").addEventListener("click", () => setWeek(addDays(weekStart, 7)));
  els.timesheetView.querySelector("#tsToday").addEventListener("click", () => setWeek(weekStartKey(todayKey, state.settings.weekStart)));
  els.timesheetView.querySelector("#tsCsv").addEventListener("click", () => downloadFile(`timesheet-${weekStart}.csv`, "text/csv", timesheetCsv(weekStart)));
}

function renderBillingStrip() {
  const data = timesheetData(weekStartKey(todayKey, state.settings.weekStart));
  const parts = Object.entries(data.totalsByCurrency).map(
    ([currency, totals]) => `${formatHours(totals.secs)}h · ${moneyFormat(totals.cents, currency)}`
  );
  const summary = parts.length ? parts.join("   ·   ") : t("billing.none");
  let timerChip = "";
  if (focusTimer && focusSession) {
    const task = state.tasks.find((item) => item.id === focusSession.taskId);
    timerChip = `<span class="bs-timer">◉ ${els.focusTime.textContent}${task ? ` · ${escapeHtml(task.title)}` : ""}</span>`;
  }
  els.billingStrip.innerHTML = `<span class="bs-week"><em>${t("billing.thisWeek")}</em> ${escapeHtml(summary)}</span>${timerChip}`;
}

function renderInvoices() {
  if (state.activeMode !== "invoices") return;
  const clientOptions = state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join("");
  const defaultNumber = `INV-${String(state.settings.invoiceCounter).padStart(4, "0")}`;
  const savedRows = state.invoices.length
    ? state.invoices
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((inv) => {
          const client = state.clients.find((item) => item.id === inv.clientId);
          return `<div class="inv-saved-row"><button class="inv-open" type="button" data-open="${inv.id}"><strong>${escapeHtml(inv.number)}</strong><span>${escapeHtml(client?.name ?? "—")} · ${escapeHtml(moneyFormat(inv.totalCents, inv.currency))}</span></button><button class="cp-edit" type="button" data-del-invoice="${inv.id}">×</button></div>`;
        })
        .join("")
    : `<p class="cp-empty">${t("invoice.noSaved")}</p>`;
  els.invoiceView.innerHTML = `
    <div class="inv-board">
      <div class="inv-generator no-print">
        <h2>${t("invoice.title")}</h2>
        <div class="inv-form">
          <label class="modal-field"><span>${t("invoice.client")}</span><select id="invClient">${clientOptions}</select></label>
          <label class="modal-field"><span>${t("invoice.from")}</span><input id="invFrom" type="date" value="${addDays(todayKey, -30)}" /></label>
          <label class="modal-field"><span>${t("invoice.to")}</span><input id="invTo" type="date" value="${todayKey}" /></label>
          <label class="modal-field"><span>${t("invoice.groupBy")}</span><select id="invGroupBy"><option value="project">${t("invoice.byProject")}</option><option value="task">${t("invoice.byTask")}</option></select></label>
          <label class="modal-field"><span>${t("invoice.tax")}</span><input id="invTax" type="number" min="0" step="0.01" value="${state.settings.taxRateBp / 100}" /></label>
          <label class="modal-field"><span>${t("invoice.number")}</span><input id="invNumber" type="text" value="${escapeHtml(defaultNumber)}" /></label>
          <label class="modal-field inv-wide"><span>${t("invoice.sender")}</span><textarea id="invSender" rows="2" placeholder="${escapeHtml(t("invoice.senderPlaceholder"))}">${escapeHtml(state.settings.senderInfo)}</textarea></label>
          <label class="modal-field inv-wide"><span>${t("invoice.note")}</span><input id="invNote" type="text" /></label>
        </div>
        <button class="primary-btn" type="button" id="invGenerate">${t("invoice.generate")}</button>
      </div>
      <div class="inv-preview">${invoicePreview ? invoiceDocHtml(invoicePreview) : ""}</div>
      <div class="inv-saved no-print">
        <h3>${t("invoice.saved")}</h3>
        ${savedRows}
      </div>
    </div>
  `;
  els.invoiceView.querySelector("#invGenerate").addEventListener("click", () => {
    const view = els.invoiceView;
    invoicePreview = buildInvoice({
      clientId: view.querySelector("#invClient").value,
      dateFrom: view.querySelector("#invFrom").value,
      dateTo: view.querySelector("#invTo").value,
      groupBy: view.querySelector("#invGroupBy").value,
      taxRateBp: Math.round((Number(view.querySelector("#invTax").value) || 0) * 100),
      number: view.querySelector("#invNumber").value.trim() || defaultNumber,
      senderInfo: view.querySelector("#invSender").value,
      note: view.querySelector("#invNote").value,
    });
    render();
  });
  const preview = els.invoiceView.querySelector(".inv-preview");
  preview.querySelector("#invIssue")?.addEventListener("click", () => issueInvoice(invoicePreview));
  preview.querySelector("#invPrint")?.addEventListener("click", printInvoice);
  preview.querySelector("#invCsv")?.addEventListener("click", () => downloadFile(`${invoicePreview.number}.csv`, "text/csv", invoiceCsv(invoicePreview)));
  els.invoiceView.querySelectorAll("[data-open]").forEach((el) =>
    el.addEventListener("click", () => {
      invoicePreview = state.invoices.find((inv) => inv.id === el.dataset.open);
      render();
    })
  );
  els.invoiceView.querySelectorAll("[data-del-invoice]").forEach((el) =>
    el.addEventListener("click", () => {
      const inv = state.invoices.find((item) => item.id === el.dataset.delInvoice);
      confirmModal(t("confirm.deleteInvoice", { number: inv.number }), () => {
        state.invoices = state.invoices.filter((item) => item.id !== inv.id);
        if (invoicePreview?.id === inv.id) invoicePreview = null;
        saveState();
        render();
        toast(t("toast.invoiceDeleted"));
      });
    })
  );
}

function invoiceDocHtml(inv) {
  const client = state.clients.find((item) => item.id === inv.clientId);
  const isSaved = state.invoices.some((item) => item.id === inv.id);
  const rows = inv.lines.length
    ? inv.lines
        .map(
          (line) =>
            `<tr><td>${escapeHtml(line.desc)}</td><td class="ts-num">${formatHours(line.seconds)}</td><td class="ts-num">${
              line.rateCents != null ? escapeHtml(moneyFormat(line.rateCents, inv.currency)) : t("invoice.mixed")
            }</td><td class="ts-num">${escapeHtml(moneyFormat(line.amountCents, inv.currency))}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="cp-empty">${t("invoice.noLines")}</td></tr>`;
  const excluded = inv.excludedCurrency
    ? `<p class="ts-warn no-print">${escapeHtml(t("invoice.excluded", { n: inv.excludedCurrency }))}</p>`
    : "";
  const taxRow = inv.taxRateBp
    ? `<tr><td colspan="3" class="ts-num">${t("invoice.taxLine")} ${inv.taxRateBp / 100}%</td><td class="ts-num">${escapeHtml(moneyFormat(inv.taxCents, inv.currency))}</td></tr>`
    : "";
  return `
    ${excluded}
    <div class="invoice-doc">
      <div class="inv-doc-head">
        <h1>${escapeHtml(inv.number)}</h1>
        <p>${t("invoice.date")}: ${inv.issueDate}<br />${t("invoice.period")}: ${inv.dateFrom} – ${inv.dateTo}</p>
      </div>
      <div class="inv-parties">
        <div><h4>${t("invoice.fromLabel")}</h4><pre>${escapeHtml(inv.senderInfo || "—")}</pre></div>
        <div><h4>${t("invoice.billTo")}</h4><pre>${escapeHtml(inv.billingInfo || client?.name || "—")}</pre></div>
      </div>
      <table class="inv-table">
        <thead><tr><th>${t("invoice.description")}</th><th class="ts-num">${t("invoice.hours")}</th><th class="ts-num">${t("invoice.rate")}</th><th class="ts-num">${t("invoice.amount")}</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" class="ts-num">${t("invoice.subtotal")}</td><td class="ts-num">${escapeHtml(moneyFormat(inv.subtotalCents, inv.currency))}</td></tr>
          ${taxRow}
          <tr class="inv-total"><td colspan="3" class="ts-num">${t("invoice.total")}</td><td class="ts-num">${escapeHtml(moneyFormat(inv.totalCents, inv.currency))}</td></tr>
        </tfoot>
      </table>
      ${inv.note ? `<p class="inv-note">${escapeHtml(inv.note)}</p>` : ""}
    </div>
    <div class="inv-actions no-print">
      ${isSaved ? "" : `<button class="primary-btn" type="button" id="invIssue">${t("invoice.issue")}</button>`}
      <button class="soft-btn" type="button" id="invPrint">${t("invoice.print")}</button>
      <button class="soft-btn" type="button" id="invCsv">${t("invoice.exportCsv")}</button>
    </div>
  `;
}

function issueInvoice(inv) {
  if (!inv) return;
  const snapshot = structuredClone(inv);
  delete snapshot.excludedCurrency;
  state.invoices.push(snapshot);
  const match = /^INV-(\d+)$/.exec(snapshot.number);
  if (match) state.settings.invoiceCounter = Math.max(state.settings.invoiceCounter, Number(match[1]) + 1);
  invoicePreview = snapshot;
  saveState();
  render();
  toast(t("toast.invoiceSaved", { number: snapshot.number }));
}

function printInvoice() {
  document.body.classList.add("print-invoice");
  window.print();
  document.body.classList.remove("print-invoice");
}

function renderSettings() {
  if (state.activeMode !== "settings") return;
  const languageOptions = Object.keys(STRINGS)
    .map((code) => `<option value="${code}"${code === currentLang() ? " selected" : ""}>${t(`lang.${code}`)}</option>`)
    .join("");
  const themeOptions = ["light", "dark"]
    .map((th) => `<option value="${th}"${th === state.theme ? " selected" : ""}>${t(`theme.${th}`)}</option>`)
    .join("");
  els.settingsView.innerHTML = `
    <div class="settings-card">
      <h3>${t("settings.title")}</h3>
      <label class="settings-field">
        <span>${t("settings.language")}</span>
        <select id="settingsLanguage">${languageOptions}</select>
      </label>
      <p class="settings-hint">${t("settings.languageHint")}</p>
      <label class="settings-field">
        <span>${t("settings.theme")}</span>
        <select id="settingsTheme">${themeOptions}</select>
      </label>
    </div>
  `;
  els.settingsView.querySelector("#settingsLanguage").addEventListener("change", (event) => {
    state.settings.language = event.target.value;
    setLanguage(event.target.value);
    saveState();
    applyStaticI18n();
    buildRepeatOptions();
    render();
  });
  els.settingsView.querySelector("#settingsTheme").addEventListener("change", (event) => {
    state.theme = event.target.value;
    saveState();
    render();
  });
}

function buildRepeatOptions() {
  els.detailRepeat.replaceChildren();
  ["", ...REPEAT_IDS].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = repeatLabel(value);
    els.detailRepeat.append(option);
  });
}

function renderHeader() {
  const open = countTasks((task) => !task.completed);
  const todayOpen = countTasks((task) => !task.completed && taskDate(task) === todayKey);
  const reminders = countTasks((task) => !task.completed && Boolean(task.reminder));
  const modeTitle = {
    tasks: getActiveTitle(),
    calendar: t("rail.calendar"),
    focus: t("rail.focus"),
    stats: t("rail.stats"),
    settings: t("rail.settings"),
  }[state.activeMode];
  els.viewTitle.textContent = searchQuery ? t("header.search", { q: searchQuery }) : modeTitle;
  els.viewMeta.textContent = t("header.meta", { todayOpen, open, reminders });
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
    edit.title = t("title.edit");
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
  els.statsLine.textContent = t("stats.line", { n: tasks.length, done, actual, estimate });
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
  const subText = task.subtasks.length ? ` · ${t("meta.checklist", { done: subDone, total: task.subtasks.length })}` : "";
  const reminderText = task.reminder ? ` · ${t("meta.reminder", { time: dateTimeLabel(task.reminder) })}` : "";
  const pomoText = task.estimatePomos ? ` · ${t("meta.pomo", { actual: task.actualPomos, estimate: task.estimatePomos })}` : "";
  const repeatText = task.repeat ? ` · ↻ ${repeatLabel(task.repeat)}` : "";
  const tagText = task.tags.length ? ` · ${task.tags.map((tag) => `#${tag}`).join(" ")}` : "";

  row.classList.toggle("selected", state.selectedTaskId === task.id);
  row.classList.toggle("done", task.completed);
  row.addEventListener("click", () => {
    state.selectedTaskId = task.id;
    saveState();
    render();
  });

  title.textContent = task.title;
  row.classList.add(`pri-${task.priority}`);
  meta.textContent = `${list?.name ?? t("meta.listFallback")} · ${priorityLabel(task.priority)}${tagText}${repeatText}${subText}${reminderText}${pomoText}`;
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
  els.calendarTitle.textContent = monthTitle(year, month);
  els.calendarGrid.replaceChildren();
  weekdayNames().forEach((weekday) => {
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
      ${statCard(t("stats.rate"), `${rate}%`, rate)}
      ${statCard(t("stats.open"), `${open}`, Math.min(open * 12, 100))}
      ${statCard(t("stats.overdue"), `${overdue}`, Math.min(overdue * 20, 100))}
      ${statCard(t("stats.pomo"), `${actual}/${estimate}`, estimate ? Math.round((actual / estimate) * 100) : 0)}
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
  // Narrow layouts show the detail pane as a slide-over; this class drives it.
  document.body.classList.toggle("detail-visible", Boolean(task));
  els.detailList.replaceChildren();
  els.subtaskList.replaceChildren();
  els.timeEntryList.replaceChildren();
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
  els.detailProject.replaceChildren();
  const noProjectOption = document.createElement("option");
  noProjectOption.value = "";
  noProjectOption.textContent = t("detail.noProject");
  els.detailProject.append(noProjectOption);
  state.projects.forEach((project) => {
    const client = state.clients.find((item) => item.id === project.clientId);
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = client ? `${client.name} / ${project.name}` : project.name;
    els.detailProject.append(option);
  });
  els.detailProject.value = task.projectId ?? "";
  els.detailBillable.checked = task.billable;
  els.detailRate.value = task.rateOverrideCents != null ? centsToMajor(task.rateOverrideCents, resolveCurrency(task)) : "";
  task.subtasks.forEach((subtask) => els.subtaskList.append(subtaskRow(task, subtask)));
  renderTimeEntries(task);
  task.history.slice(0, 8).forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.textContent = `${fmtDateTime(item.at)} · ${item.text}`;
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
    addHistory(task, done.checked ? t("history.subDone", { title: subtask.title }) : t("history.subReopen", { title: subtask.title }));
    saveState();
    render();
  });
  title.addEventListener("change", () => {
    subtask.title = title.value.trim() || subtask.title;
    addHistory(task, t("history.subUpdate"));
    saveState();
    render();
  });
  reminder.addEventListener("change", () => {
    subtask.reminder = reminder.value;
    addHistory(task, t("history.subReminder"));
    if (reminder.value) ensureNotifyPermission();
    saveState();
    render();
  });
  remove.addEventListener("click", () => {
    task.subtasks = task.subtasks.filter((item) => item.id !== subtask.id);
    addHistory(task, t("history.subDelete", { title: subtask.title }));
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
    toast(t("toast.clearNone"));
    return;
  }
  confirmModal(t("confirm.clearDone", { done }), () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.selectedTaskId = visibleTasks()[0]?.id ?? null;
    saveState();
    render();
    toast(t("toast.cleared", { done }));
  });
});

els.exportData.addEventListener("click", async () => {
  const data = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), ...state }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `docktodo-${todayKey}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  try {
    await navigator.clipboard.writeText(data);
    toast(t("toast.exportedBoth"));
  } catch {
    toast(t("toast.exported"));
  }
});

function isImportShape(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.lists)) return false;
  if (parsed.filters !== undefined && !Array.isArray(parsed.filters)) return false;
  if (parsed.notified !== undefined && (typeof parsed.notified !== "object" || Array.isArray(parsed.notified))) return false;
  return true;
}

els.importData.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files[0];
  els.importFile.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!isImportShape(parsed)) throw new Error("invalid");
    openImportModal(parsed);
  } catch {
    toast(t("toast.importBadFile"));
  }
});

els.addList.addEventListener("click", () => openListModal(null));
els.addFilter.addEventListener("click", () => openFilterModal(null));

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
    if (focusSession) focusSession.pauseStart = Date.now();
    els.startFocus.textContent = t("focus.resume");
    return;
  }
  if (!focusSession) {
    focusSession = { taskId: els.focusTask.value || state.selectedTaskId, startedAt: Date.now(), pausedMs: 0, pauseStart: null };
  } else if (focusSession.pauseStart) {
    focusSession.pausedMs += Date.now() - focusSession.pauseStart;
    focusSession.pauseStart = null;
  }
  els.startFocus.textContent = t("focus.pause");
  focusTimer = setInterval(() => {
    focusSeconds -= 1;
    renderFocusTime();
    renderBillingStrip();
    if (focusSeconds <= 0) {
      clearInterval(focusTimer);
      focusTimer = null;
      focusSeconds = 25 * 60;
      els.startFocus.textContent = t("focus.start");
      // Wall-clock elapsed minus paused time is authoritative: background
      // throttling can stretch a "25 min" countdown well past 1500s, and we
      // must bill the real focused time, not the nominal count.
      const workedSeconds = focusSession
        ? Math.max(1, Math.round((Date.now() - focusSession.startedAt - focusSession.pausedMs) / 1000))
        : 25 * 60;
      recordPomo(workedSeconds);
      notify(t("focus.doneTitle"), t("focus.doneBody"));
    }
  }, 1000);
});

els.resetFocus.addEventListener("click", () => {
  clearInterval(focusTimer);
  focusTimer = null;
  focusSession = null; // abandon: no time entry recorded
  focusSeconds = 25 * 60;
  els.startFocus.textContent = t("focus.start");
  renderFocusTime();
});

els.completePomo.addEventListener("click", () => recordPomo());
els.addTimeEntry.addEventListener("click", () => {
  const task = selectedTask();
  if (task) openTimeEntryModal(null, task);
});
els.focusTask.addEventListener("change", () => {
  state.selectedTaskId = els.focusTask.value;
  saveState();
  render();
});

// seconds defaults to a nominal pomodoro (manual "log 1 pomodoro" — the user
// asserts 25 min, editable later); the countdown path passes measured seconds.
function recordPomo(seconds = 25 * 60) {
  const id = els.focusTask.value || state.selectedTaskId;
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.actualPomos = Number(task.actualPomos || 0) + 1;
  createPomoEntry(task, seconds);
  addHistory(task, t("history.pomoDone"));
  state.selectedTaskId = task.id;
  saveState();
  render();
}

// A completed pomodoro (timer or manual "log 1 pomodoro") becomes a billable
// TimeEntry — the pomodoro clock is the source of billable time. `seconds` is
// authoritative for billing; start/end are wall-clock and may span pauses.
function createPomoEntry(task, seconds) {
  const end = Date.now();
  // start/end/seconds stay self-consistent: end - start === seconds * 1000.
  // seconds is the authority (measured wall-clock or nominal); start is derived.
  state.timeEntries.push({
    id: createId(),
    taskId: task.id,
    start: end - seconds * 1000,
    end,
    seconds,
    billable: task.billable === true,
    rateSnapshotCents: resolveRateCents(task),
    currency: resolveCurrency(task),
    note: "",
  });
  focusSession = null;
}

function renderTimeEntries(task) {
  const entries = state.timeEntries.filter((entry) => entry.taskId === task.id).sort((a, b) => b.start - a.start);
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "te-empty";
    empty.textContent = t("entry.none");
    els.timeEntryList.append(empty);
    return;
  }
  entries.forEach((entry) => els.timeEntryList.append(timeEntryRow(task, entry)));
}

function timeEntryRow(task, entry) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "te-row";
  const mins = Math.round(entry.seconds / 60);
  const label = document.createElement("span");
  label.textContent = `${dateLabel(formatDate(new Date(entry.start)))} · ${mins}m`;
  const amount = document.createElement("span");
  amount.className = "te-amount";
  amount.textContent = entry.billable ? moneyFormat(entryAmountCents(entry), entry.currency) : "—";
  row.append(label, amount);
  row.addEventListener("click", () => openTimeEntryModal(entry, task));
  return row;
}

function openTimeEntryModal(entry, task) {
  openModal(entry ? t("entry.edit") : t("entry.new"), (modal) => {
    const currency = entry ? entry.currency : resolveCurrency(task);
    const dateInput = inputEl("date", entry ? formatDate(new Date(entry.start)) : todayKey);
    const timeInput = inputEl("time", entry ? new Date(entry.start).toTimeString().slice(0, 5) : "09:00");
    const durInput = inputEl("number", entry ? String(Math.round(entry.seconds / 60)) : "25");
    durInput.min = "0";
    const billableCheck = document.createElement("input");
    billableCheck.type = "checkbox";
    billableCheck.checked = entry ? entry.billable : task.billable;
    const rateInput = inputEl("number", centsToMajor(entry ? entry.rateSnapshotCents : resolveRateCents(task), currency));
    rateInput.min = "0";
    rateInput.step = "0.01";
    const noteInput = inputEl("text", entry?.note ?? "");
    modal.append(
      modalField(t("entry.date"), dateInput),
      modalField(t("entry.start"), timeInput),
      modalField(t("entry.duration"), durInput),
      modalField(t("entry.rate"), rateInput),
      modalField(t("entry.billable"), billableCheck),
      modalField(t("entry.note"), noteInput)
    );

    if (entry) {
      modal.append(
        modalButton(t("entry.delete"), "danger-btn", () => {
          state.timeEntries = state.timeEntries.filter((item) => item.id !== entry.id);
          addHistory(task, t("history.entryDelete"));
          closeModal();
          saveState();
          render();
          toast(t("toast.entryDeleted"));
        })
      );
    }

    modal.append(
      modalActions(
        modalButton(t("action.cancel"), "soft-btn", closeModal),
        modalButton(t("form.save"), "primary-btn", () => {
          const start = new Date(`${dateInput.value || todayKey}T${timeInput.value || "00:00"}`).getTime();
          const seconds = Math.max(0, Math.round((Number(durInput.value) || 0) * 60));
          const patch = {
            start,
            end: start + seconds * 1000,
            seconds,
            billable: billableCheck.checked,
            rateSnapshotCents: centsFromMajor(rateInput.value, currency),
            currency,
            note: noteInput.value,
          };
          if (entry) {
            Object.assign(entry, patch);
            addHistory(task, t("history.entryEdit"));
          } else {
            state.timeEntries.push({ id: createId(), taskId: task.id, ...patch });
            addHistory(task, t("history.entryAdd"));
          }
          closeModal();
          saveState();
          render();
        })
      )
    );
  });
}

els.detailCompleted.addEventListener("change", () => setTaskCompleted(selectedTask(), els.detailCompleted.checked));
els.detailTitle.addEventListener("change", () => {
  const title = els.detailTitle.value.trim();
  if (title) updateTask(state.selectedTaskId, { title }, t("history.titleUpdate"));
});
els.detailList.addEventListener("change", () => updateTask(state.selectedTaskId, { listId: els.detailList.value }, t("history.listMove")));
els.detailStart.addEventListener("change", () => updateTask(state.selectedTaskId, { startDate: els.detailStart.value }, t("history.startUpdate")));
els.detailDue.addEventListener("change", () => updateTask(state.selectedTaskId, { dueDate: els.detailDue.value }, t("history.dueUpdate")));
els.detailReminder.addEventListener("change", () => {
  if (els.detailReminder.value) ensureNotifyPermission();
  updateTask(state.selectedTaskId, { reminder: els.detailReminder.value }, t("history.reminderSet"));
});
els.detailPriority.addEventListener("change", () => updateTask(state.selectedTaskId, { priority: els.detailPriority.value }, t("history.priorityUpdate")));
els.detailRepeat.addEventListener("change", () => updateTask(state.selectedTaskId, { repeat: els.detailRepeat.value }, t("history.repeatUpdate")));
els.detailEstimate.addEventListener("change", () => updateTask(state.selectedTaskId, { estimatePomos: Number(els.detailEstimate.value || 0) }, t("history.estimateUpdate")));
els.detailTags.addEventListener("change", () => {
  const tags = [...new Set(els.detailTags.value.split(/[\s,，#]+/).map((tag) => tag.trim()).filter(Boolean))];
  updateTask(state.selectedTaskId, { tags }, t("history.tagsUpdate"));
});
els.detailNotes.addEventListener("change", () => updateTask(state.selectedTaskId, { notes: els.detailNotes.value }, t("history.notesUpdate")));
els.detailProject.addEventListener("change", () => {
  const projectId = els.detailProject.value || null;
  updateTask(state.selectedTaskId, { projectId, billable: Boolean(projectId) }, t("history.projectUpdate"));
});
els.detailBillable.addEventListener("change", () => updateTask(state.selectedTaskId, { billable: els.detailBillable.checked }, t("history.billableUpdate")));
els.detailRate.addEventListener("change", () => {
  const raw = els.detailRate.value.trim();
  const task = selectedTask();
  updateTask(state.selectedTaskId, { rateOverrideCents: raw === "" ? null : centsFromMajor(raw, resolveCurrency(task)) }, t("history.rateUpdate"));
});

els.addSubtask.addEventListener("click", () => {
  const task = selectedTask();
  if (!task) return;
  task.subtasks.push(makeSubtask(t("subtask.new"), false, ""));
  addHistory(task, t("history.subAdd"));
  saveState();
  render();
});

els.deleteTask.addEventListener("click", () => {
  const task = selectedTask();
  if (!task) return;
  confirmModal(t("confirm.deleteTask", { title: task.title }), () => {
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    state.selectedTaskId = visibleTasks()[0]?.id ?? null;
    saveState();
    render();
    toast(t("toast.taskDeleted"));
  });
});

els.detailClose.addEventListener("click", closeDetail);
els.detailScrim.addEventListener("click", closeDetail);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (document.querySelector("#modalOverlay")) closeModal();
  else if (document.body.classList.contains("detail-visible")) closeDetail();
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || typeof event.newValue !== "string") return;
  try {
    const incoming = JSON.parse(event.newValue);
    if (!Array.isArray(incoming?.tasks) || !Array.isArray(incoming?.lists)) return;
    state = normalizeState(incoming);
  } catch {
    return;
  }
  closeModal();
  render();
});

setLanguage(state.settings.language);
checkStringParity();
buildRepeatOptions();
applyStaticI18n();

pruneNotified();
muteStaleReminders();
saveState();
render();
checkReminders();
setInterval(checkReminders, 20000);
