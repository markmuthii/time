const DESIGN_WIDTH = 2166;
const DESIGN_HEIGHT = 1291;
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const COLORS = [
  { name: "Orange", value: "#ff9500" },
  { name: "Red", value: "#ff3b30" },
  { name: "Yellow", value: "#ffd60a" },
  { name: "Green", value: "#30d158" },
  { name: "Cyan", value: "#00e5ff" },
  { name: "Blue", value: "#4d8dff" },
  { name: "Pink", value: "#ff4fd8" },
  { name: "White", value: "#f2f2f2" },
];
const STORAGE_KEY = "clock-settings";
const DEFAULT_SETTINGS = { format: "24", color: COLORS[0].value, mode: "clock" };

const root = document.documentElement;
const clockEl = document.getElementById("clock");
const timeEl = document.getElementById("time");
const ampmEl = document.getElementById("ampm");
const dateEl = document.getElementById("date");

let zoom = 1;
let settings = loadSettings();
let active = loadActive();
let tickTimer;

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (e.g. private mode); settings then last for this visit only.
  }
}

const pad = (n) => String(n).padStart(2, "0");

const isStopwatch = () => settings.mode === "stopwatch";

function renderDigits(time) {
  timeEl.innerHTML = [...time]
    .map((char) => {
      if (char === ":") return '<span class="colon">:</span>';
      if (char === " ") return '<span class="digit"></span>';
      return `<span class="digit${char === "1" ? " digit-one" : ""}">${char}</span>`;
    })
    .join("");
}

function renderClock() {
  const now = new Date();
  const hours = now.getHours();
  const is24 = settings.format === "24";
  // A single-digit 12-hour value keeps an empty leading cell so the row width never changes.
  const displayHours = is24 ? pad(hours) : String(hours % 12 || 12).padStart(2, " ");

  renderDigits(`${displayHours}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  ampmEl.textContent = hours < 12 ? "AM" : "PM";
  ampmEl.hidden = is24;
  dateEl.textContent = `${DAYS[now.getDay()]} - ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function renderStopwatch() {
  const seconds = Math.floor((active ? elapsedOf(active) : 0) / 1000);
  renderDigits(`${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`);
  ampmEl.hidden = true;
  if (active) {
    const done = active.tasks.filter((task) => task.done).length;
    dateEl.textContent = `${active.resumedAt ? "RUNNING" : "PAUSED"} - ${done}/${active.tasks.length} DONE`;
  } else {
    dateEl.textContent = "READY";
  }
}

function render() {
  clockEl.classList.toggle("is-paused", isStopwatch() && Boolean(active) && !active.resumedAt);
  if (isStopwatch()) renderStopwatch();
  else renderClock();
}

function scheduleTick() {
  clearTimeout(tickTimer);
  render();
  // Re-sync to the start of the next second (of the clock, or of the running stopwatch) so the display never drifts.
  const ms = isStopwatch() && active?.resumedAt ? elapsedOf(active) : Date.now();
  tickTimer = setTimeout(scheduleTick, 1000 - (ms % 1000));
}

function fitToWindow() {
  const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  root.style.setProperty("--scale", scale);
  setZoom(zoom);
}

// The largest zoom at which the time row (including AM/PM), the date and the stopwatch actions still fit the window.
// Rendered sizes grow linearly with zoom, so measuring at the current zoom and dividing it out gives the size at 1x.
function maxZoom() {
  const rows = [document.querySelector(".time"), dateEl, document.getElementById("sw-actions")];
  const rects = rows.filter((el) => !el.hidden).map((el) => el.getBoundingClientRect());
  const width = Math.max(...rects.map((r) => r.width)) / zoom;
  const height = (Math.max(...rects.map((r) => r.bottom)) - Math.min(...rects.map((r) => r.top))) / zoom;
  // Leave a little room for the italic glyphs, which lean past their layout boxes.
  return Math.min(1.5, (window.innerWidth * 0.95) / width, (window.innerHeight * 0.95) / height);
}

function setZoom(value) {
  zoom = Math.max(0.5, Math.min(value, maxZoom()));
  root.style.setProperty("--zoom", zoom);
}

document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + 0.1));
document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - 0.1));
const fullscreenButton = document.getElementById("fullscreen");

fullscreenButton.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// The icon always shows the action the button will take next (also covers leaving with Esc).
function updateFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.classList.toggle("is-fullscreen", isFullscreen);
  fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
}

document.addEventListener("fullscreenchange", updateFullscreenButton);

// Side drawers (settings and tasks) share one backdrop; only one is open at a time.
const backdrop = document.getElementById("backdrop");
let openDrawer = null;

// `focusEl` is what gets focus on opening; on closing, focus returns to the button that controls the drawer.
function setDrawerOpen(drawer, open, focusEl) {
  const trigger = document.querySelector(`[aria-controls="${drawer.id}"]`);
  drawer.classList.toggle("open", open);
  drawer.inert = !open;
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  openDrawer = open ? drawer : null;
  if (open) {
    focusEl?.focus();
  } else {
    trigger.focus();
  }
}

backdrop.addEventListener("click", () => setDrawerOpen(openDrawer, false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openDrawer) setDrawerOpen(openDrawer, false);
});

// Settings drawer
const settingsDrawer = document.getElementById("settings");
const swatchesEl = document.getElementById("swatches");
const customColorInput = document.getElementById("custom-color");

function applyColor(color) {
  settings.color = color;
  root.style.setProperty("--clock-color", color);
  customColorInput.value = color;
  for (const input of swatchesEl.querySelectorAll("input")) {
    input.checked = input.value === color;
  }
  saveSettings();
}

for (const { name, value } of COLORS) {
  const label = document.createElement("label");
  label.className = "swatch";
  label.title = name;
  label.innerHTML = `<input type="radio" name="color" value="${value}" aria-label="${name}"><span style="--swatch: ${value}"></span>`;
  swatchesEl.append(label);
}

swatchesEl.addEventListener("change", (event) => applyColor(event.target.value));
customColorInput.addEventListener("input", (event) => applyColor(event.target.value));

for (const input of document.querySelectorAll('input[name="format"]')) {
  input.checked = input.value === settings.format;
  input.addEventListener("change", () => {
    settings.format = input.value;
    saveSettings();
    render();
    // AM/PM makes the 12-hour row wider, so the current zoom may no longer fit.
    setZoom(zoom);
  });
}

document
  .getElementById("settings-open")
  .addEventListener("click", () => setDrawerOpen(settingsDrawer, true, settingsDrawer.querySelector("input:checked")));
document.getElementById("settings-close").addEventListener("click", () => setDrawerOpen(settingsDrawer, false));

// Modals: <dialog> handles centring, focus trapping and closing with Esc.
const aboutDialog = document.getElementById("about");

document.getElementById("info-open").addEventListener("click", () => aboutDialog.showModal());
document.getElementById("about-close").addEventListener("click", () => aboutDialog.close());
for (const dialog of document.querySelectorAll("dialog.modal")) {
  // Clicks on the backdrop land on the dialog itself; clicks on the content land on its children.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
  });
}

// Stopwatch sessions
const modeButton = document.getElementById("mode-toggle");
const tasksDrawer = document.getElementById("tasks-drawer");
const tasksCount = document.getElementById("tasks-count");
const sessionTasksEl = document.getElementById("session-tasks");
const swActions = document.getElementById("sw-actions");
const swButtons = Object.fromEntries(
  ["start", "pause", "resume", "stop", "tasks"].map((name) => [name, document.getElementById(`sw-${name}`)]),
);

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatWhen(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: settings.format === "12",
  });
}

// One row of a task list: a checkbox (when `onToggle` is given) and an optional trailing button.
// Ticking crosses the task out, unless `crossOut` is false (e.g. when the tick means "include").
function taskItem(task, { checked = task.done, crossOut = true, onToggle, action } = {}) {
  const li = document.createElement("li");
  li.className = "task";
  li.classList.toggle("done", crossOut && checked);
  const label = document.createElement("label");
  if (onToggle) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = checked;
    box.addEventListener("change", () => {
      li.classList.toggle("done", crossOut && box.checked);
      onToggle(box.checked);
    });
    label.append(box);
  }
  const text = document.createElement("span");
  text.textContent = task.text;
  label.append(text);
  li.append(label);
  if (action) {
    const button = document.createElement("button");
    button.className = "task-action";
    button.textContent = action.label;
    button.setAttribute("aria-label", `${action.label}: ${task.text}`);
    button.addEventListener("click", action.onClick);
    li.append(button);
  }
  return li;
}

// Calls `onAdd` with the trimmed text when an add-task form is submitted.
function onAddTask(form, onAdd) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (text) onAdd(text);
    input.value = "";
    input.focus();
  });
}

const makeTask = (text) => ({ id: newId(), text, done: false, doneAt: null });

function saveSession() {
  saveActive(active);
  renderSession();
  scheduleTick();
}

function renderSession() {
  const running = Boolean(active?.resumedAt);
  modeButton.classList.toggle("is-stopwatch", isStopwatch());
  modeButton.classList.toggle("has-badge", Boolean(active) && !isStopwatch());
  modeButton.setAttribute("aria-label", isStopwatch() ? "Switch to clock" : "Switch to stopwatch");

  // Only the actions that make sense right now: start when idle, pause or resume and stop once started.
  swActions.hidden = !isStopwatch();
  swButtons.start.hidden = Boolean(active);
  swButtons.pause.hidden = !running;
  swButtons.resume.hidden = !active || running;
  swButtons.stop.hidden = !active;
  swButtons.tasks.hidden = !active;

  if (!active) return;

  const done = active.tasks.filter((task) => task.done).length;
  tasksCount.textContent = `${done}/${active.tasks.length}`;
  sessionTasksEl.replaceChildren(
    ...active.tasks.map((task) =>
      taskItem(task, {
        onToggle: (checked) => {
          task.done = checked;
          task.doneAt = checked ? Date.now() : null;
          saveSession();
        },
        action: {
          label: "Remove",
          onClick: () => {
            active.tasks = active.tasks.filter((t) => t !== task);
            saveSession();
          },
        },
      }),
    ),
  );
}

function setMode(mode) {
  settings.mode = mode;
  saveSettings();
  renderSession();
  scheduleTick();
  // The stopwatch has no AM/PM but has its action row, so the clock's size changes and the current zoom may no longer fit.
  setZoom(zoom);
}

modeButton.addEventListener("click", () => setMode(isStopwatch() ? "clock" : "stopwatch"));

swButtons.tasks.addEventListener("click", () =>
  setDrawerOpen(tasksDrawer, true, tasksDrawer.querySelector("#session-add input")),
);
document.getElementById("tasks-close").addEventListener("click", () => setDrawerOpen(tasksDrawer, false));

// Start: build the to-do list, suggesting whatever was left undone last time.
const startDialog = document.getElementById("start-dialog");
const startSubmit = document.getElementById("start-submit");
let draft;

function renderDraft() {
  document.getElementById("start-pending").hidden = !draft.pending.length;
  document.getElementById("start-pending-list").replaceChildren(
    ...draft.pending.map((item) =>
      taskItem(item.task, {
        checked: item.include,
        crossOut: false,
        onToggle: (checked) => {
          item.include = checked;
          renderDraft();
        },
        action: {
          label: "Drop",
          onClick: () => {
            dismissTask(item.task.id);
            draft.pending = draft.pending.filter((p) => p !== item);
            renderDraft();
          },
        },
      }),
    ),
  );
  document.getElementById("start-new-list").replaceChildren(
    ...draft.tasks.map((task) =>
      taskItem(task, {
        action: {
          label: "Remove",
          onClick: () => {
            draft.tasks = draft.tasks.filter((t) => t !== task);
            renderDraft();
          },
        },
      }),
    ),
  );
  startSubmit.disabled = !draft.tasks.length && !draft.pending.some((item) => item.include);
}

function openStartDialog() {
  draft = { pending: pendingTasks(null).map((task) => ({ task, include: true })), tasks: [] };
  renderDraft();
  startDialog.showModal();
  document.querySelector("#start-add input").focus();
}

onAddTask(document.getElementById("start-add"), (text) => {
  draft.tasks.push(makeTask(text));
  renderDraft();
});

startSubmit.addEventListener("click", () => {
  const carried = draft.pending.filter((item) => item.include).map(({ task }) => ({ ...task, done: false, doneAt: null }));
  const tasks = [...carried, ...draft.tasks];
  if (!tasks.length) return;
  const now = Date.now();
  active = { id: newId(), startedAt: now, elapsed: 0, resumedAt: now, tasks };
  startDialog.close();
  saveSession();
  swButtons.pause.focus();
});

swButtons.start.addEventListener("click", openStartDialog);

onAddTask(document.getElementById("session-add"), (text) => {
  active.tasks.push(makeTask(text));
  saveSession();
});

function togglePause() {
  const now = Date.now();
  if (active.resumedAt) {
    active.elapsed += now - active.resumedAt;
    active.resumedAt = null;
  } else {
    active.resumedAt = now;
  }
  saveSession();
}

// The pressed button disappears in favour of its opposite, so keep keyboard focus on the one that replaced it.
swButtons.pause.addEventListener("click", () => {
  togglePause();
  swButtons.resume.focus();
});
swButtons.resume.addEventListener("click", () => {
  togglePause();
  swButtons.pause.focus();
});

// Space pauses and resumes, unless the keypress belongs to a control or a dialog is open.
document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.target !== document.body) return;
  if (!isStopwatch() || !active || document.querySelector("dialog[open]")) return;
  event.preventDefault();
  togglePause();
});

// Stop: the clock freezes while the user writes a note and settles any tasks still open.
const stopDialog = document.getElementById("stop-dialog");
const stopNote = document.getElementById("stop-note");
let stopState;

swButtons.stop.addEventListener("click", () => {
  stopState = { wasRunning: Boolean(active.resumedAt), finished: new Set() };
  if (stopState.wasRunning) togglePause();

  const open = active.tasks.filter((task) => !task.done);
  const done = active.tasks.length - open.length;
  document.getElementById("stop-summary").textContent =
    `${formatDuration(active.elapsed)} · ${done} of ${active.tasks.length} task${active.tasks.length === 1 ? "" : "s"} done`;
  document.getElementById("stop-remaining").hidden = !open.length;
  document.getElementById("stop-list").replaceChildren(
    ...open.map((task) =>
      taskItem(task, {
        onToggle: (checked) => {
          if (checked) stopState.finished.add(task);
          else stopState.finished.delete(task);
        },
      }),
    ),
  );
  stopNote.value = "";
  stopDialog.showModal();
  stopNote.focus();
});

document.getElementById("stop-save").addEventListener("click", () => {
  const endedAt = Date.now();
  for (const task of stopState.finished) {
    task.done = true;
    task.doneAt = endedAt;
  }
  saveHistory([
    ...loadHistory(),
    {
      id: active.id,
      startedAt: active.startedAt,
      endedAt,
      duration: active.elapsed,
      tasks: active.tasks,
      note: stopNote.value.trim(),
    },
  ]);
  active = null;
  stopDialog.close();
  saveSession();
});

// Dismissing without saving ("Keep going", Esc or the backdrop) picks the session back up where it was.
// This runs on the dismissing input itself rather than on "close", which browsers may deliver late (e.g. in background tabs).
function keepGoing() {
  if (stopState.wasRunning && !active.resumedAt) togglePause();
}
stopDialog.addEventListener("cancel", keepGoing);
stopDialog.addEventListener("click", (event) => {
  if (event.target === stopDialog || event.target.closest("[data-close]")) keepGoing();
});

// History: newest first, filtered by the search box and split into pages.
const HISTORY_PAGE_SIZE = 4;
const historyDialog = document.getElementById("history-dialog");
const historyList = document.getElementById("history-list");
const historySearch = document.getElementById("history-search");
let historyPage = 0;

// A session matches when every word of the query appears in its note or in one of its tasks.
function matchesQuery(session, query) {
  const text = [session.note, ...session.tasks.map((task) => task.text)].join("\n").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

function historyItem(session) {
  const li = document.createElement("li");
  li.className = "history-item";
  const done = session.tasks.filter((task) => task.done).length;

  const head = document.createElement("div");
  head.className = "history-head";
  const when = document.createElement("time");
  when.dateTime = new Date(session.startedAt).toISOString();
  when.textContent = formatWhen(session.startedAt);
  const meta = document.createElement("span");
  meta.textContent = `${formatDuration(session.duration)} · ${done}/${session.tasks.length} done`;
  head.append(when, meta);

  const list = document.createElement("ul");
  list.className = "tasks";
  list.append(...session.tasks.map((task) => taskItem(task)));
  li.append(head, list);

  if (session.note) {
    const note = document.createElement("p");
    note.className = "history-note";
    note.textContent = session.note;
    li.append(note);
  }

  // Deleting takes a second click to confirm.
  const remove = document.createElement("button");
  remove.className = "task-action";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => {
    if (remove.textContent === "Delete") {
      remove.textContent = "Confirm delete";
      return;
    }
    saveHistory(loadHistory().filter((s) => s.id !== session.id));
    renderHistory();
    renderSession();
  });
  li.append(remove);
  return li;
}

function renderHistory() {
  const history = loadHistory().reverse();
  const tasks = history.flatMap((session) => session.tasks);
  const total = history.reduce((sum, session) => sum + session.duration, 0);
  document.getElementById("history-totals").textContent = history.length
    ? `${history.length} session${history.length === 1 ? "" : "s"} · ${formatDuration(total)} · ${tasks.filter((task) => task.done).length} of ${tasks.length} tasks done`
    : "No sessions yet. Switch to the stopwatch to start one.";
  historySearch.hidden = !history.length;
  document.getElementById("history-clear").hidden = !history.length;

  const query = historySearch.value.trim();
  const matches = query ? history.filter((session) => matchesQuery(session, query)) : history;
  const pages = Math.max(1, Math.ceil(matches.length / HISTORY_PAGE_SIZE));
  // Deleting the last session on the last page would otherwise leave an empty page.
  historyPage = Math.min(historyPage, pages - 1);

  document.getElementById("history-status").textContent = query
    ? matches.length
      ? `${matches.length} matching session${matches.length === 1 ? "" : "s"}`
      : `No sessions match "${query}".`
    : "";
  historyList.replaceChildren(
    ...matches.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE).map(historyItem),
  );

  document.getElementById("history-pager").hidden = pages < 2;
  document.getElementById("history-page").textContent = `Page ${historyPage + 1} of ${pages}`;
  document.getElementById("history-prev").disabled = historyPage === 0;
  document.getElementById("history-next").disabled = historyPage === pages - 1;
}

function showHistoryPage(page) {
  historyPage = page;
  renderHistory();
  historyDialog.scrollTop = 0;
}

historySearch.addEventListener("input", () => showHistoryPage(0));
document.getElementById("history-prev").addEventListener("click", () => showHistoryPage(historyPage - 1));
document.getElementById("history-next").addEventListener("click", () => showHistoryPage(historyPage + 1));

// Clearing everything asks for confirmation inline first.
const clearStart = document.getElementById("history-clear-start");
const clearConfirm = document.getElementById("history-confirm");

function setClearConfirming(confirming) {
  clearStart.hidden = confirming;
  clearConfirm.hidden = !confirming;
  if (confirming) {
    const count = loadHistory().length;
    document.getElementById("history-confirm-text").textContent =
      `Delete all ${count} session${count === 1 ? "" : "s"}, their notes and tasks? This can't be undone.`;
    document.getElementById("history-clear-cancel").focus();
  }
}

clearStart.addEventListener("click", () => setClearConfirming(true));
document.getElementById("history-clear-cancel").addEventListener("click", () => {
  setClearConfirming(false);
  clearStart.focus();
});
document.getElementById("history-clear-confirm").addEventListener("click", () => {
  clearHistory();
  setClearConfirming(false);
  renderHistory();
  renderSession();
});

document.getElementById("history-open").addEventListener("click", () => {
  historySearch.value = "";
  historyPage = 0;
  setClearConfirming(false);
  renderHistory();
  historyDialog.showModal();
});

window.addEventListener("resize", fitToWindow);
applyColor(settings.color);
renderSession();
scheduleTick();
fitToWindow();
// The digital font changes the clock's width once it loads, so re-check the zoom then.
document.fonts.ready.then(() => setZoom(zoom));

// Offline support and installability.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
