// DockTodo money layer: integer-minor-unit (cents) math and rate resolution.
// All stored and computed amounts are integers in the currency's minor unit;
// floats appear only at the display edge (moneyFormat). Loads after i18n.js,
// before data.js. Functions reference app.js's `state` at call time only.

const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY", "KRW", "VND", "CLP", "ISK", "XOF", "XAF", "PYG",
  "RWF", "UGX", "BIF", "DJF", "GNF", "KMF", "VUV", "XPF",
]);

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "CHF", "SEK", "SGD", "INR", "BRL"];

function currencyDecimals(currency) {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
}

function sanitizeCurrency(currency) {
  return typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

// cents (integer minor units) -> localized currency string
function moneyFormat(cents, currency = "USD") {
  const decimals = currencyDecimals(currency);
  const amount = cents / 10 ** decimals;
  try {
    return new Intl.NumberFormat(currentLang() === "zh" ? "zh-CN" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(decimals)} ${currency}`;
  }
}

// Parse a user-typed major-unit amount ("85", "85.50") into integer cents.
function centsFromMajor(value, currency = "USD") {
  const decimals = currencyDecimals(currency);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10 ** decimals);
}

// Integer cents -> plain major-unit string for editing (no currency symbol).
function centsToMajor(cents, currency = "USD") {
  const decimals = currencyDecimals(currency);
  return (cents / 10 ** decimals).toFixed(decimals);
}

function resolveProject(task) {
  return task.projectId ? state.projects.find((p) => p.id === task.projectId) ?? null : null;
}

function resolveClient(task) {
  const project = resolveProject(task);
  return project ? state.clients.find((c) => c.id === project.clientId) ?? null : null;
}

// Rate snapshot resolution order: task override -> project override -> client rate.
// `!= null` matters: an explicit 0 override means "free", not "fall through".
function resolveRateCents(task) {
  if (task.rateOverrideCents != null) return task.rateOverrideCents;
  const project = resolveProject(task);
  if (project?.rateOverrideCents != null) return project.rateOverrideCents;
  return resolveClient(task)?.hourlyRateCents ?? 0;
}

function resolveCurrency(task) {
  return resolveClient(task)?.currency ?? "USD";
}

// The single rounding point for money in the app: every other figure
// (day cells, group totals, week totals, invoice lines/subtotals) is an
// integer sum of these per-entry values, so timesheet total === invoice total.
function entryAmountCents(entry) {
  return entry.billable ? Math.round((entry.seconds * entry.rateSnapshotCents) / 3600) : 0;
}
