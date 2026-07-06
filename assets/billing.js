// DockTodo billing layer: timesheet aggregation and CSV export.
// Loads after data.js, before app.js. References app.js's `state` at call
// time only. Every aggregate amount is Σ(entryAmountCents) — never
// "aggregate seconds × rate" — so timesheet and invoice totals always agree.

function formatHours(seconds) {
  return (seconds / 3600).toFixed(2);
}

function entryContext(entry) {
  const task = state.tasks.find((item) => item.id === entry.taskId) ?? null;
  const project = task && task.projectId ? state.projects.find((item) => item.id === task.projectId) ?? null : null;
  const client = project ? state.clients.find((item) => item.id === project.clientId) ?? null : null;
  return { task, project, client };
}

// Aggregate the week's time entries by client/project for a Mon–Sun (or
// Sun–Sat) grid. perDaySecs is indexed to `days`. Amounts sum per-entry
// rounded cents; totals never cross currencies (one row per currency).
function timesheetData(weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayIndex = new Map(days.map((day, i) => [day, i]));
  const groups = new Map();
  const totalsByCurrency = {};
  let unratedBillable = 0;

  state.timeEntries.forEach((entry) => {
    const dayKey = formatDate(new Date(entry.start));
    const idx = dayIndex.get(dayKey);
    if (idx === undefined) return;
    const { client, project } = entryContext(entry);
    const key = `${client?.id ?? ""}|${project?.id ?? ""}|${entry.currency}`;
    if (!groups.has(key)) {
      groups.set(key, {
        clientName: client?.name ?? "—",
        projectName: project?.name ?? "—",
        currency: entry.currency,
        perDaySecs: Array(7).fill(0),
        totalSecs: 0,
        amountCents: 0,
      });
    }
    const group = groups.get(key);
    const amount = entryAmountCents(entry);
    group.perDaySecs[idx] += entry.seconds;
    group.totalSecs += entry.seconds;
    group.amountCents += amount;
    if (entry.billable && entry.rateSnapshotCents === 0) unratedBillable += 1;
    const totals = (totalsByCurrency[entry.currency] ??= { secs: 0, cents: 0 });
    totals.secs += entry.seconds;
    totals.cents += amount;
  });

  return { days, groups: [...groups.values()], totalsByCurrency, unratedBillable };
}

// Every CSV write path (timesheet, invoice, and future importers' re-exports)
// goes through here, so the formula-injection guard lives in one place.
function csvCell(value) {
  let text = String(value ?? "");
  // A cell starting with = + - @ tab or CR can execute as a formula in
  // Excel/Sheets. Invoice/timesheet CSVs are sent to clients & accountants,
  // so neutralise it with a leading apostrophe before quoting.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvFromRows(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function timesheetCsv(weekStart) {
  const data = timesheetData(weekStart);
  const days = new Set(data.days);
  const rows = [["Date", "Client", "Project", "Task", "Note", "Hours", "Billable", "Rate", "Amount", "Currency"]];
  state.timeEntries
    .filter((entry) => days.has(formatDate(new Date(entry.start))))
    .sort((a, b) => a.start - b.start)
    .forEach((entry) => {
      const { task, project, client } = entryContext(entry);
      rows.push([
        formatDate(new Date(entry.start)),
        client?.name ?? "",
        project?.name ?? "",
        task?.title ?? "",
        entry.note,
        formatHours(entry.seconds),
        entry.billable ? "yes" : "no",
        entry.billable ? centsToMajor(entry.rateSnapshotCents, entry.currency) : "",
        centsToMajor(entryAmountCents(entry), entry.currency),
        entry.currency,
      ]);
    });
  Object.entries(data.totalsByCurrency).forEach(([currency, totals]) => {
    rows.push(["", "", "", "", "", formatHours(totals.secs), "", "", centsToMajor(totals.cents, currency), currency]);
  });
  return csvFromRows(rows);
}

function downloadFile(name, mime, text) {
  const blob = new Blob([text], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function invoiceEntriesInRange(client, dateFrom, dateTo) {
  const projectIds = new Set(state.projects.filter((project) => project.clientId === client.id).map((project) => project.id));
  const inRange = [];
  let excludedCurrency = 0;
  state.timeEntries.forEach((entry) => {
    if (!entry.billable) return;
    const task = state.tasks.find((item) => item.id === entry.taskId);
    if (!task || !projectIds.has(task.projectId)) return;
    const day = formatDate(new Date(entry.start));
    if (day < dateFrom || day > dateTo) return;
    if (entry.currency !== client.currency) {
      excludedCurrency += 1;
      return;
    }
    inRange.push({ entry, task });
  });
  return { inRange, excludedCurrency };
}

// Build a frozen invoice snapshot. Lines sum per-entry cents (never
// re-multiplied); tax = round(subtotal × basis points / 10000) stays integer.
function buildInvoice(opts) {
  const client = state.clients.find((item) => item.id === opts.clientId);
  if (!client) return null;
  const { inRange, excludedCurrency } = invoiceEntriesInRange(client, opts.dateFrom, opts.dateTo);
  const lineMap = new Map();
  inRange.forEach(({ entry, task }) => {
    const project = state.projects.find((item) => item.id === task.projectId);
    const key = opts.groupBy === "task" ? task.id : project?.id ?? "";
    const desc = opts.groupBy === "task" ? task.title : project?.name ?? "—";
    if (!lineMap.has(key)) lineMap.set(key, { desc, seconds: 0, amountCents: 0, rates: new Set() });
    const line = lineMap.get(key);
    line.seconds += entry.seconds;
    line.amountCents += entryAmountCents(entry);
    line.rates.add(entry.rateSnapshotCents);
  });
  const lines = [...lineMap.values()].map((line) => ({
    desc: line.desc,
    seconds: line.seconds,
    rateCents: line.rates.size === 1 ? [...line.rates][0] : null,
    amountCents: line.amountCents,
  }));
  const subtotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const taxCents = Math.round((subtotalCents * opts.taxRateBp) / 10000);
  return {
    id: createId(),
    number: opts.number,
    clientId: client.id,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
    issueDate: opts.issueDate || todayKey,
    groupBy: opts.groupBy,
    currency: client.currency,
    senderInfo: opts.senderInfo,
    billingInfo: client.billingInfo,
    note: opts.note,
    lines,
    subtotalCents,
    taxRateBp: opts.taxRateBp,
    taxCents,
    totalCents: subtotalCents + taxCents,
    createdAt: Date.now(),
    excludedCurrency,
  };
}

function invoiceCsv(invoice) {
  const rows = [["Description", "Hours", "Rate", "Amount", "Currency"]];
  invoice.lines.forEach((line) =>
    rows.push([
      line.desc,
      formatHours(line.seconds),
      line.rateCents != null ? centsToMajor(line.rateCents, invoice.currency) : "",
      centsToMajor(line.amountCents, invoice.currency),
      invoice.currency,
    ])
  );
  rows.push(["Subtotal", "", "", centsToMajor(invoice.subtotalCents, invoice.currency), invoice.currency]);
  if (invoice.taxRateBp) {
    rows.push([`Tax ${invoice.taxRateBp / 100}%`, "", "", centsToMajor(invoice.taxCents, invoice.currency), invoice.currency]);
  }
  rows.push(["Total", "", "", centsToMajor(invoice.totalCents, invoice.currency), invoice.currency]);
  return csvFromRows(rows);
}
