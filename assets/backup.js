// DockTodo data safety belt (S3-0): automatic local-file backup via the
// File System Access API. The invoice ledger is the one place users cannot
// afford to lose to Safari ITP / cache clears / device changes, so after
// every save we throttle-write the whole state to a user-chosen file.
//
// Loads after data.js, before app.js. Only function/const definitions here —
// initBackup() runs from app.js boot once everything is ready. References to
// state / toast / t / render / renderBillingStrip resolve at call time.

const FSA_SUPPORTED = typeof window.showSaveFilePicker === "function";
const BACKUP_META_KEY = "docktodo.backup.meta";
const BACKUP_WRITE_DEBOUNCE_MS = 4000;
const EXPORT_REMINDER_MS = 7 * 24 * 60 * 60 * 1000; // Safari fallback: nudge weekly

// perm: "unsupported" | "none" | "granted" | "prompt" | "denied"
const backup = { handle: null, perm: FSA_SUPPORTED ? "none" : "unsupported", lastAt: 0, dirty: false, timer: null, writing: false };

// ---- IndexedDB: persist the FileSystemFileHandle across reloads ----
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("docktodo-backup", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction("kv", "readonly").objectStore("kv").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadBackupMeta() {
  try {
    const meta = JSON.parse(localStorage.getItem(BACKUP_META_KEY));
    if (meta && typeof meta === "object") {
      backup.lastAt = Number(meta.lastAt) || 0;
      backup.lastExportAt = Number(meta.lastExportAt) || 0;
    }
  } catch {
    /* ignore */
  }
}

function saveBackupMeta() {
  try {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ lastAt: backup.lastAt, lastExportAt: backup.lastExportAt || 0 }));
  } catch {
    /* ignore */
  }
}

function backupPayload() {
  return JSON.stringify({ version: 2, exportedAt: Date.now(), ...state }, null, 2);
}

// ---- Enable / disable ----
async function enableBackup() {
  if (!FSA_SUPPORTED) return;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "docktodo-backup.json",
      types: [{ description: "DockTodo backup", accept: { "application/json": [".json"] } }],
    });
    backup.handle = handle;
    backup.perm = "granted";
    await idbSet("handle", handle);
    await writeBackupNow();
    toast(t("backup.enabled"));
    render();
  } catch (err) {
    if (err && err.name !== "AbortError") toast(t("backup.failed"));
  }
}

async function disableBackup() {
  backup.handle = null;
  backup.perm = "none";
  clearTimeout(backup.timer);
  try {
    await idbDel("handle");
  } catch {
    /* ignore */
  }
  render();
}

// ---- Write (throttled) ----
async function writeBackupNow() {
  if (!backup.handle || backup.writing) return;
  backup.writing = true;
  try {
    const writable = await backup.handle.createWritable();
    await writable.write(backupPayload());
    await writable.close();
    backup.lastAt = Date.now();
    backup.dirty = false;
    backup.perm = "granted";
    saveBackupMeta();
  } catch {
    // Permission likely lapsed (handles need re-grant after a session).
    // Never pop a dialog here — flag it so the header can offer a click.
    backup.perm = "prompt";
    backup.dirty = true;
  } finally {
    backup.writing = false;
    renderBackupStatus();
  }
}

// Called from saveState after every mutation.
function scheduleBackup() {
  if (!backup.handle) return;
  backup.dirty = true;
  if (backup.perm !== "granted") {
    renderBackupStatus();
    return;
  }
  clearTimeout(backup.timer);
  backup.timer = setTimeout(writeBackupNow, BACKUP_WRITE_DEBOUNCE_MS);
}

// User-gesture re-grant when a stored handle's permission has lapsed.
async function reauthorizeBackup() {
  if (!backup.handle) return;
  try {
    const perm = await backup.handle.requestPermission({ mode: "readwrite" });
    backup.perm = perm;
    if (perm === "granted") await writeBackupNow();
  } catch {
    backup.perm = "denied";
  }
  render();
}

// ---- Boot: reattach handle, offer restore when state is empty ----
async function initBackup() {
  loadBackupMeta();
  if (!FSA_SUPPORTED) {
    backup.perm = "unsupported";
    maybeRemindExport();
    renderBackupStatus();
    return;
  }
  try {
    const handle = await idbGet("handle");
    if (handle) {
      backup.handle = handle;
      backup.perm = await handle.queryPermission({ mode: "readwrite" });
    }
  } catch {
    backup.handle = null;
  }
  renderBackupStatus();
}

// If localStorage was wiped (Safari ITP / cache clear / new device import of the
// same handle) but a backup file is attached, offer a one-click restore.
async function offerRestoreIfEmpty(hadStoredState) {
  if (hadStoredState || !FSA_SUPPORTED || !backup.handle) return;
  try {
    if ((await backup.handle.queryPermission({ mode: "read" })) !== "granted") return;
    const file = await backup.handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isImportShape(parsed)) return;
    openRestoreModal(parsed);
  } catch {
    /* no usable backup */
  }
}

function openRestoreModal(parsed) {
  openModal(t("backup.restoreTitle"), (modal) => {
    modal.append(
      modalText(t("backup.restoreBody", { tasks: parsed.tasks.length })),
      modalActions(
        modalButton(t("backup.restoreDismiss"), "soft-btn", closeModal),
        modalButton(t("backup.restoreConfirm"), "primary-btn", () => {
          const next = structuredClone(parsed);
          delete next.version;
          delete next.exportedAt;
          state = normalizeState(next);
          closeModal();
          saveState();
          render();
          toast(t("backup.restored", { tasks: state.tasks.length }));
        })
      )
    );
  });
}

// ---- Safari / unsupported fallback: periodic export reminder ----
function maybeRemindExport() {
  if (FSA_SUPPORTED) return;
  const last = backup.lastExportAt || 0;
  if (Date.now() - last > EXPORT_REMINDER_MS) {
    toast(t("backup.exportReminder"));
  }
}

function markExported() {
  backup.lastExportAt = Date.now();
  saveBackupMeta();
  renderBackupStatus();
}

// ---- Status text + header chip ----
function backupAgeText() {
  if (!backup.lastAt) return t("backup.never");
  const mins = Math.floor((Date.now() - backup.lastAt) / 60000);
  if (mins < 1) return t("backup.justNow");
  if (mins < 60) return t("backup.minsAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("backup.hrsAgo", { n: hrs });
  return t("backup.daysAgo", { n: Math.floor(hrs / 24) });
}

// Returns { cls, label, action } describing the current backup state.
function backupState() {
  if (backup.perm === "unsupported") return { cls: "warn", label: t("backup.unsupported"), action: "info" };
  if (!backup.handle) return { cls: "warn", label: t("backup.off"), action: "enable" };
  if (backup.perm === "granted") return { cls: "ok", label: t("backup.on", { age: backupAgeText() }), action: "info" };
  return { cls: "warn", label: t("backup.paused"), action: "reauth" };
}

function backupChipHtml() {
  const s = backupState();
  return `<button class="bs-backup ${s.cls}" type="button" data-backup-action="${s.action}" title="${escapeHtml(s.label)}">◆ ${escapeHtml(s.label)}</button>`;
}

function renderBackupStatus() {
  // Cheap targeted refresh of the header strip; never a full render() from a
  // background write (avoids clobbering focus / edits mid-typing).
  if (typeof renderBillingStrip === "function" && els.billingStrip) renderBillingStrip();
  if (state.activeMode === "settings" && typeof renderSettings === "function") renderSettings();
}

function handleBackupAction(action) {
  if (action === "enable") enableBackup();
  else if (action === "reauth") reauthorizeBackup();
  else if (action === "info" && backup.perm === "unsupported") toast(t("backup.unsupportedHint"));
}

// Settings block markup (wired up in renderSettings).
function backupSettingsHtml() {
  const s = backupState();
  const supported = backup.perm !== "unsupported";
  const rows = [`<p class="settings-hint">${t("backup.settingsHint")}</p>`];
  rows.push(`<div class="backup-status ${s.cls}">◆ ${escapeHtml(s.label)}</div>`);
  if (!supported) {
    rows.push(`<p class="settings-hint">${t("backup.unsupportedHint")}</p>`);
  } else if (!backup.handle) {
    rows.push(`<button class="primary-btn" type="button" id="backupEnable">${t("backup.enableBtn")}</button>`);
  } else {
    if (backup.perm !== "granted") rows.push(`<button class="primary-btn" type="button" id="backupReauth">${t("backup.reauthBtn")}</button>`);
    rows.push(`<button class="soft-btn" type="button" id="backupDisable">${t("backup.disableBtn")}</button>`);
  }
  return `<div class="settings-field"><span>${t("backup.settingsLabel")}</span></div>${rows.join("")}`;
}

function wireBackupSettings(root) {
  root.querySelector("#backupEnable")?.addEventListener("click", enableBackup);
  root.querySelector("#backupReauth")?.addEventListener("click", reauthorizeBackup);
  root.querySelector("#backupDisable")?.addEventListener("click", disableBackup);
}
