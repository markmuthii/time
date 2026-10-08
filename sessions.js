// Stopwatch sessions: the session in progress and the history of finished ones, all kept in localStorage.
//
// A task is { id, text, done, doneAt }. A task carried into a later session keeps its id, so the most
// recent copy of each id is its current state; any whose latest copy is undone is still pending.
const SESSIONS_KEY = "clock-sessions";
const ACTIVE_KEY = "clock-active-session";
const DISMISSED_KEY = "clock-dismissed-tasks";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (e.g. private mode); sessions then last for this visit only.
  }
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Finished sessions, oldest first: { id, startedAt, endedAt, duration, tasks, note }.
const loadHistory = () => readJSON(SESSIONS_KEY, []);
const saveHistory = (history) => writeJSON(SESSIONS_KEY, history);

// The session in progress: { id, startedAt, elapsed, resumedAt, tasks }.
// `elapsed` is the time banked before the last pause; `resumedAt` is null while paused.
const loadActive = () => readJSON(ACTIVE_KEY, null);
const saveActive = (session) => writeJSON(ACTIVE_KEY, session);

const elapsedOf = (session) => session.elapsed + (session.resumedAt ? Date.now() - session.resumedAt : 0);

// Undone tasks from earlier sessions, oldest first, minus any the user dropped or has already carried into `active`.
function pendingTasks(active) {
  const dismissed = new Set(readJSON(DISMISSED_KEY, []));
  const inActive = new Set(active ? active.tasks.map((task) => task.id) : []);
  const latest = new Map();
  for (const session of loadHistory()) {
    for (const task of session.tasks) {
      latest.delete(task.id); // Re-insert so the order follows each task's most recent session.
      latest.set(task.id, task);
    }
  }
  return [...latest.values()].filter((task) => !task.done && !dismissed.has(task.id) && !inActive.has(task.id));
}

function dismissTask(id) {
  writeJSON(DISMISSED_KEY, [...readJSON(DISMISSED_KEY, []), id]);
}

// Wipes every finished session. Dropped suggestions only ever refer to tasks in the history, so they go too;
// the session in progress is left alone.
function clearHistory() {
  writeJSON(SESSIONS_KEY, null);
  writeJSON(DISMISSED_KEY, null);
}
