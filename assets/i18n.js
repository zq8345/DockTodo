// DockTodo 国际化层。英文是唯一标准（source of truth），中文逐 key 对照。
// 本文件最先加载，只提供纯 UI 文案与格式化，不依赖数据层。
// 加新语言：在 STRINGS 里加一门，并补齐与 en 相同的 key 即可。

const STRINGS = {
  en: {
    // rail / modes
    "rail.tasks": "Tasks",
    "rail.calendar": "Calendar",
    "rail.focus": "Focus",
    "rail.stats": "Stats",
    "rail.settings": "Settings",
    // smart views
    "view.today": "Today",
    "view.next7": "Next 7 days",
    "view.calendar": "Calendar",
    "view.inbox": "Inbox",
    "view.all": "All",
    "view.completed": "Completed",
    "view.tasks": "Tasks",
    // sidebar
    "sidebar.kicker": "DockTodo Pro",
    "sidebar.title": "Task workbench",
    "sidebar.newNote": "Add task",
    "search.placeholder": "Search tasks, notes or tags",
    "section.lists": "Lists",
    "section.filters": "Custom filters",
    "section.tags": "Tags",
    "action.new": "New",
    // header
    "action.import": "Import",
    "action.export": "Export",
    "action.clearDone": "Clear completed",
    "action.addTask": "Add task",
    "header.search": "Search “{q}”",
    "header.meta": "{todayOpen} due today · {open} open · {reminders} reminders",
    // quick form
    "form.placeholder": "Add a task, press Enter to save",
    "form.startDate": "Start date",
    "form.dueDate": "Due date",
    "form.priority": "Priority",
    "form.save": "Save",
    // priority (long / short)
    "priority.none": "No priority",
    "priority.high": "High priority",
    "priority.medium": "Medium priority",
    "priority.low": "Low priority",
    "priority.short.none": "None",
    "priority.short.high": "High",
    "priority.short.medium": "Medium",
    "priority.short.low": "Low",
    // repeat
    "repeat.none": "No repeat",
    "repeat.daily": "Daily",
    "repeat.weekdays": "Weekdays",
    "repeat.weekly": "Weekly",
    "repeat.monthly": "Monthly",
    "repeat.fallback": "Repeat",
    // filter types
    "filterType.high": "High priority",
    "filterType.reminder": "Has reminder",
    "filterType.nodate": "No date",
    "filterType.overdue": "Overdue",
    // groups
    "group.completed": "Completed",
    "group.nodate": "No date",
    "group.overdue": "Overdue",
    "group.today": "Today",
    "group.tomorrow": "Tomorrow",
    "group.later": "Later",
    // date labels
    "date.none": "No date",
    "date.today": "Today",
    "date.tomorrow": "Tomorrow",
    // task row meta
    "meta.listFallback": "List",
    "meta.checklist": "checklist {done}/{total}",
    "meta.reminder": "reminder {time}",
    "meta.pomo": "pomodoro {actual}/{estimate}",
    // stats line + cards
    "stats.line": "{n} current · {done} done · pomodoro {actual}/{estimate}",
    "stats.rate": "Completion rate",
    "stats.open": "Open",
    "stats.overdue": "Overdue",
    "stats.pomo": "Pomodoro progress",
    // calendar
    "calendar.prev": "Prev",
    "calendar.next": "Next",
    "calendar.title": "{month} {year}",
    // focus
    "focus.timer": "Focus timer",
    "focus.start": "Start",
    "focus.pause": "Pause",
    "focus.resume": "Resume",
    "focus.reset": "Reset",
    "focus.logPomo": "Log 1 pomodoro",
    "focus.doneTitle": "🍅 Pomodoro done",
    "focus.doneBody": "Logged 1 pomodoro automatically",
    // detail pane
    "detail.empty": "Select a task",
    "detail.emptyHint": "View notes, dates, reminders, priority, pomodoro and history.",
    "detail.complete": "Complete task",
    "detail.title": "Task title",
    "detail.list": "List",
    "detail.start": "Start date",
    "detail.due": "Due date",
    "detail.reminder": "Reminder",
    "detail.priority": "Priority",
    "detail.estimate": "Estimated pomodoro",
    "detail.repeat": "Repeat",
    "detail.tags": "Tags",
    "detail.tagsPlaceholder": "Separate with spaces",
    "detail.notes": "Notes",
    "detail.notesPlaceholder": "Jot down context, links or next steps",
    "detail.subtasks": "Checklist",
    "detail.add": "Add",
    "detail.history": "History",
    "detail.delete": "Delete task",
    "detail.subtaskReminder": "Checklist reminder",
    "detail.subtaskDelete": "Delete checklist item",
    // empty state
    "empty.title": "No tasks here",
    "empty.hint": "Add something to move forward — DockTodo will hold on to it.",
    // aria / titles
    "title.addTask": "Add task",
    "title.toggleTheme": "Toggle theme",
    "title.edit": "Edit",
    // modals / actions
    "modal.confirm": "Confirm",
    "action.cancel": "Cancel",
    "action.ok": "OK",
    "field.name": "Name",
    "field.color": "Color",
    "field.condition": "Condition",
    "list.new": "New list",
    "list.edit": "Edit list",
    "list.namePlaceholder": "List name",
    "list.deleteBtn": "Delete list (tasks move to Inbox)",
    "list.untitled": "Untitled list",
    "filter.new": "New filter",
    "filter.edit": "Edit filter",
    "filter.namePlaceholder": "Filter name",
    "filter.deleteBtn": "Delete filter",
    "filter.untitled": "Untitled filter",
    "import.title": "Import data",
    "import.summary": "The file has {tasks} tasks and {lists} lists. Choose how to import:",
    "import.replaceAll": "Replace all",
    "import.merge": "Merge",
    // confirms
    "confirm.deleteList": "Delete list “{name}”? Its tasks will move to Inbox.",
    "confirm.deleteFilter": "Delete filter “{name}”?",
    "confirm.replaceAll": "Replacing overwrites all current data. Continue?",
    "confirm.clearDone": "Clear {done} completed tasks? This cannot be undone.",
    "confirm.deleteTask": "Delete task “{title}”? This cannot be undone.",
    // toasts
    "toast.listDeleted": "List “{name}” deleted",
    "toast.filterDeleted": "Filter “{name}” deleted",
    "toast.importInvalid": "Import failed: the file could not be parsed as valid data",
    "toast.merged": "Merged: {n} tasks added",
    "toast.imported": "Imported {n} tasks",
    "toast.importBadFile": "Import failed: not a valid DockTodo data file",
    "toast.clearNone": "No completed tasks to clear",
    "toast.cleared": "Cleared {done} completed tasks",
    "toast.exportedBoth": "Exported a JSON file and copied it to the clipboard",
    "toast.exported": "Exported a JSON file",
    "toast.taskDeleted": "Task deleted",
    "toast.repeatNext": "Marked done — next: {date}",
    "toast.storageFull": "Save failed: browser storage is full. Export your data and free up space.",
    "toast.corruptBackedUp": "Local data was corrupted; the original was backed up in browser storage and the app was reset",
    "toast.corruptNoBackup": "Local data was corrupted and could not be backed up; the app was reset",
    // notifications
    "notify.granted": "System notifications are on — reminders will pop on time",
    "notify.denied": "Browser notifications were blocked — reminders will show in-page only",
    "reminder.task": "Task reminder",
    "reminder.subtask": "Checklist reminder",
    // history log
    "history.created": "Created task",
    "history.repeatDone": "Completed a recurring task",
    "history.repeatAdvanced": "Completed one cycle, moved to {date}",
    "history.completed": "Completed task",
    "history.reopened": "Reopened task",
    "history.subDone": "Checked: {title}",
    "history.subReopen": "Unchecked: {title}",
    "history.subUpdate": "Updated a checklist item",
    "history.subReminder": "Set a checklist reminder",
    "history.subDelete": "Deleted checklist item: {title}",
    "history.subAdd": "Added a checklist item",
    "history.pomoDone": "Completed 1 pomodoro",
    "history.titleUpdate": "Updated the title",
    "history.listMove": "Moved to another list",
    "history.startUpdate": "Updated the start date",
    "history.dueUpdate": "Updated the due date",
    "history.reminderSet": "Set a task reminder",
    "history.priorityUpdate": "Updated the priority",
    "history.repeatUpdate": "Updated the repeat rule",
    "history.estimateUpdate": "Updated the estimated pomodoro",
    "history.tagsUpdate": "Updated tags",
    "history.notesUpdate": "Updated notes",
    "history.projectUpdate": "Updated the project",
    "history.billableUpdate": "Toggled billable",
    "history.rateUpdate": "Updated the rate override",
    "subtask.new": "New item",
    // settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.languageHint": "English is the source of truth; 中文 is provided for reference.",
    "settings.theme": "Theme",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "lang.en": "English",
    "lang.zh": "中文",
    // clients & projects
    "rail.clients": "Clients",
    "clients.title": "Clients & projects",
    "clients.addClient": "Add client",
    "clients.addProject": "Add project",
    "clients.empty": "No clients yet. Add one to start tracking billable work.",
    "clients.noProjects": "No projects",
    "clients.rate": "{rate}/h",
    "client.new": "New client",
    "client.edit": "Edit client",
    "client.namePlaceholder": "Client name",
    "client.deleteBtn": "Delete client",
    "client.currency": "Currency",
    "client.hourlyRate": "Hourly rate",
    "client.billingInfo": "Billing info",
    "client.billingPlaceholder": "Name, address, tax id — shown on invoices",
    "client.note": "Note",
    "project.new": "New project",
    "project.edit": "Edit project",
    "project.namePlaceholder": "Project name",
    "project.deleteBtn": "Delete project",
    "project.client": "Client",
    "project.rateOverride": "Rate override (optional)",
    "project.ratePlaceholder": "Blank = use client rate",
    "confirm.deleteClient": "Delete client “{name}”? Its projects are removed and their tasks become personal.",
    "confirm.deleteProject": "Delete project “{name}”? Its tasks become personal.",
    "toast.clientDeleted": "Client “{name}” deleted",
    "toast.projectDeleted": "Project “{name}” deleted",
    "detail.project": "Project",
    "detail.noProject": "No project (personal)",
    "detail.billable": "Billable",
    "detail.rateOverride": "Rate override",
    "detail.ratePlaceholder": "Inherit",
  },
  zh: {
    "rail.tasks": "任务",
    "rail.calendar": "日历",
    "rail.focus": "专注",
    "rail.stats": "统计",
    "rail.settings": "设置",
    "view.today": "今天",
    "view.next7": "最近 7 天",
    "view.calendar": "日历",
    "view.inbox": "收集箱",
    "view.all": "全部",
    "view.completed": "已完成",
    "view.tasks": "任务",
    "sidebar.kicker": "DockTodo Pro",
    "sidebar.title": "任务工作台",
    "sidebar.newNote": "添加任务",
    "search.placeholder": "搜索任务、备注或标签",
    "section.lists": "清单",
    "section.filters": "自定义筛选",
    "section.tags": "标签",
    "action.new": "新建",
    "action.import": "导入",
    "action.export": "导出",
    "action.clearDone": "清理完成",
    "action.addTask": "添加任务",
    "header.search": "搜索“{q}”",
    "header.meta": "{todayOpen} 个今天待办 · {open} 个未完成 · {reminders} 个提醒",
    "form.placeholder": "添加任务，按 Enter 保存",
    "form.startDate": "开始日期",
    "form.dueDate": "截止日期",
    "form.priority": "优先级",
    "form.save": "保存",
    "priority.none": "无优先级",
    "priority.high": "高优先级",
    "priority.medium": "中优先级",
    "priority.low": "低优先级",
    "priority.short.none": "无",
    "priority.short.high": "高",
    "priority.short.medium": "中",
    "priority.short.low": "低",
    "repeat.none": "不重复",
    "repeat.daily": "每天",
    "repeat.weekdays": "工作日",
    "repeat.weekly": "每周",
    "repeat.monthly": "每月",
    "repeat.fallback": "重复",
    "filterType.high": "高优先级",
    "filterType.reminder": "有提醒",
    "filterType.nodate": "无日期",
    "filterType.overdue": "已逾期",
    "group.completed": "已完成",
    "group.nodate": "无日期",
    "group.overdue": "已逾期",
    "group.today": "今天",
    "group.tomorrow": "明天",
    "group.later": "之后",
    "date.none": "无日期",
    "date.today": "今天",
    "date.tomorrow": "明天",
    "meta.listFallback": "清单",
    "meta.checklist": "检查项 {done}/{total}",
    "meta.reminder": "提醒 {time}",
    "meta.pomo": "番茄 {actual}/{estimate}",
    "stats.line": "{n} 个当前任务 · {done} 个已完成 · 番茄 {actual}/{estimate}",
    "stats.rate": "完成率",
    "stats.open": "未完成",
    "stats.overdue": "已逾期",
    "stats.pomo": "番茄进度",
    "calendar.prev": "上月",
    "calendar.next": "下月",
    "calendar.title": "{year} 年 {month} 月",
    "focus.timer": "专注计时",
    "focus.start": "开始",
    "focus.pause": "暂停",
    "focus.resume": "继续",
    "focus.reset": "重置",
    "focus.logPomo": "记 1 个番茄",
    "focus.doneTitle": "🍅 番茄完成",
    "focus.doneBody": "已自动记录 1 个番茄",
    "detail.empty": "选择一个任务",
    "detail.emptyHint": "查看备注、日期、提醒、优先级、番茄和历史记录。",
    "detail.complete": "完成任务",
    "detail.title": "任务标题",
    "detail.list": "清单",
    "detail.start": "开始日期",
    "detail.due": "截止日期",
    "detail.reminder": "提醒",
    "detail.priority": "优先级",
    "detail.estimate": "预计番茄",
    "detail.repeat": "重复",
    "detail.tags": "标签",
    "detail.tagsPlaceholder": "用空格分隔",
    "detail.notes": "备注",
    "detail.notesPlaceholder": "记录背景、链接或下一步",
    "detail.subtasks": "检查项提醒",
    "detail.add": "添加",
    "detail.history": "历史记录",
    "detail.delete": "删除任务",
    "detail.subtaskReminder": "检查项提醒",
    "detail.subtaskDelete": "删除检查项",
    "empty.title": "这里没有任务",
    "empty.hint": "添加一件要推进的事，DockTodo 会帮你留住它。",
    "title.addTask": "添加任务",
    "title.toggleTheme": "切换主题",
    "title.edit": "编辑",
    "modal.confirm": "确认操作",
    "action.cancel": "取消",
    "action.ok": "确定",
    "field.name": "名称",
    "field.color": "颜色",
    "field.condition": "条件",
    "list.new": "新建清单",
    "list.edit": "编辑清单",
    "list.namePlaceholder": "清单名称",
    "list.deleteBtn": "删除清单（任务移回收集箱）",
    "list.untitled": "未命名清单",
    "filter.new": "新建筛选器",
    "filter.edit": "编辑筛选器",
    "filter.namePlaceholder": "筛选器名称",
    "filter.deleteBtn": "删除筛选器",
    "filter.untitled": "未命名筛选",
    "import.title": "导入数据",
    "import.summary": "文件包含 {tasks} 个任务、{lists} 个清单。选择导入方式：",
    "import.replaceAll": "替换全部",
    "import.merge": "合并导入",
    "confirm.deleteList": "删除清单「{name}」？其中的任务会移回收集箱。",
    "confirm.deleteFilter": "删除筛选器「{name}」？",
    "confirm.replaceAll": "替换会覆盖当前所有数据，确定继续？",
    "confirm.clearDone": "清理 {done} 个已完成任务？该操作不可撤销。",
    "confirm.deleteTask": "删除任务「{title}」？该操作不可撤销。",
    "toast.listDeleted": "已删除清单「{name}」",
    "toast.filterDeleted": "已删除筛选器「{name}」",
    "toast.importInvalid": "导入失败：文件内容无法解析为有效数据",
    "toast.merged": "合并完成：新增 {n} 个任务",
    "toast.imported": "已导入 {n} 个任务",
    "toast.importBadFile": "导入失败：不是有效的 DockTodo 数据文件",
    "toast.clearNone": "没有已完成任务需要清理",
    "toast.cleared": "已清理 {done} 个已完成任务",
    "toast.exportedBoth": "已导出 JSON 文件，并复制到剪贴板",
    "toast.exported": "已导出 JSON 文件",
    "toast.taskDeleted": "任务已删除",
    "toast.repeatNext": "已记录完成，下次：{date}",
    "toast.storageFull": "保存失败：浏览器存储空间不足，请导出数据后清理",
    "toast.corruptBackedUp": "检测到本地数据损坏，原始内容已备份到浏览器存储，应用已重置",
    "toast.corruptNoBackup": "检测到本地数据损坏且无法备份，应用已重置",
    "notify.granted": "已开启系统通知，提醒会准时弹出",
    "notify.denied": "浏览器通知被拒绝，提醒将只在页面内显示",
    "reminder.task": "任务提醒",
    "reminder.subtask": "检查项提醒",
    "history.created": "创建任务",
    "history.repeatDone": "完成循环任务",
    "history.repeatAdvanced": "完成一次循环，顺延至 {date}",
    "history.completed": "完成任务",
    "history.reopened": "重新打开任务",
    "history.subDone": "完成检查项：{title}",
    "history.subReopen": "重新打开检查项：{title}",
    "history.subUpdate": "更新检查项",
    "history.subReminder": "设置检查项提醒",
    "history.subDelete": "删除检查项：{title}",
    "history.subAdd": "添加检查项",
    "history.pomoDone": "完成 1 个番茄",
    "history.titleUpdate": "更新标题",
    "history.listMove": "移动到其他清单",
    "history.startUpdate": "更新开始日期",
    "history.dueUpdate": "更新截止日期",
    "history.reminderSet": "设置任务提醒",
    "history.priorityUpdate": "更新优先级",
    "history.repeatUpdate": "更新重复规则",
    "history.estimateUpdate": "更新预计番茄",
    "history.tagsUpdate": "更新标签",
    "history.notesUpdate": "更新备注",
    "history.projectUpdate": "更新项目",
    "history.billableUpdate": "切换计费",
    "history.rateUpdate": "更新费率覆盖",
    "subtask.new": "新检查项",
    "settings.title": "设置",
    "settings.language": "语言",
    "settings.languageHint": "英文是唯一标准，中文仅供对照。",
    "settings.theme": "主题",
    "theme.light": "明亮",
    "theme.dark": "暗色",
    "lang.en": "English",
    "lang.zh": "中文",
    "rail.clients": "客户",
    "clients.title": "客户与项目",
    "clients.addClient": "新建客户",
    "clients.addProject": "新建项目",
    "clients.empty": "还没有客户。新建一个即可开始记录计费工作。",
    "clients.noProjects": "暂无项目",
    "clients.rate": "{rate}/小时",
    "client.new": "新建客户",
    "client.edit": "编辑客户",
    "client.namePlaceholder": "客户名称",
    "client.deleteBtn": "删除客户",
    "client.currency": "货币",
    "client.hourlyRate": "时薪",
    "client.billingInfo": "开票信息",
    "client.billingPlaceholder": "名称、地址、税号——会显示在发票上",
    "client.note": "备注",
    "project.new": "新建项目",
    "project.edit": "编辑项目",
    "project.namePlaceholder": "项目名称",
    "project.deleteBtn": "删除项目",
    "project.client": "客户",
    "project.rateOverride": "费率覆盖（可选）",
    "project.ratePlaceholder": "留空 = 用客户费率",
    "confirm.deleteClient": "删除客户「{name}」？其项目会一并删除，相关任务变为个人任务。",
    "confirm.deleteProject": "删除项目「{name}」？其任务变为个人任务。",
    "toast.clientDeleted": "已删除客户「{name}」",
    "toast.projectDeleted": "已删除项目「{name}」",
    "detail.project": "项目",
    "detail.noProject": "无项目（个人）",
    "detail.billable": "计费",
    "detail.rateOverride": "费率覆盖",
    "detail.ratePlaceholder": "继承",
  },
};

const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  zh: ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"],
};

const WEEKDAY_NAMES = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  zh: ["日", "一", "二", "三", "四", "五", "六"],
};

let lang = "en";

function t(key, params) {
  const table = STRINGS[lang] ?? STRINGS.en;
  const template = table[key] ?? STRINGS.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? `{${name}}`));
}

function setLanguage(next) {
  lang = STRINGS[next] ? next : "en";
}

function currentLang() {
  return lang;
}

function priorityLabel(priority) {
  return t(`priority.${priority}`);
}

function priorityShort(priority) {
  return t(`priority.short.${priority}`);
}

function repeatLabel(value) {
  return t(`repeat.${value || "none"}`);
}

function filterTypeLabel(type) {
  return t(`filterType.${type}`);
}

function monthTitle(year, month) {
  return t("calendar.title", { year, month: MONTH_NAMES[lang]?.[month - 1] ?? month });
}

function weekdayNames() {
  return WEEKDAY_NAMES[lang] ?? WEEKDAY_NAMES.en;
}

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
}

function applyStaticI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
}

function checkStringParity() {
  const enKeys = Object.keys(STRINGS.en);
  Object.keys(STRINGS).forEach((code) => {
    if (code === "en") return;
    const keys = new Set(Object.keys(STRINGS[code]));
    const missing = enKeys.filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !STRINGS.en[key]);
    if (missing.length) console.warn(`[i18n] ${code} missing keys:`, missing);
    if (extra.length) console.warn(`[i18n] ${code} extra keys:`, extra);
  });
}
