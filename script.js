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
const DEFAULT_SETTINGS = { format: "24", color: COLORS[0].value };

const root = document.documentElement;
const timeEl = document.getElementById("time");
const ampmEl = document.getElementById("ampm");
const dateEl = document.getElementById("date");

let zoom = 1;
let settings = loadSettings();

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

function tick() {
  const now = new Date();
  const hours = now.getHours();
  const is24 = settings.format === "24";
  // A single-digit 12-hour value keeps an empty leading cell so the row width never changes.
  const displayHours = is24 ? pad(hours) : String(hours % 12 || 12).padStart(2, " ");

  const time = `${displayHours}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  timeEl.innerHTML = [...time]
    .map((char) => {
      if (char === ":") return '<span class="colon">:</span>';
      if (char === " ") return '<span class="digit"></span>';
      return `<span class="digit${char === "1" ? " digit-one" : ""}">${char}</span>`;
    })
    .join("");
  ampmEl.textContent = hours < 12 ? "AM" : "PM";
  ampmEl.hidden = is24;
  dateEl.textContent = `${DAYS[now.getDay()]} - ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

}

function scheduleTick() {
  tick();
  // Re-sync to the start of the next second so the display never drifts.
  setTimeout(scheduleTick, 1000 - (Date.now() % 1000));
}

function fitToWindow() {
  const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  root.style.setProperty("--scale", scale);
}

function setZoom(value) {
  zoom = Math.min(1.5, Math.max(0.5, value));
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

// Settings drawer
const drawer = document.getElementById("settings");
const backdrop = document.getElementById("backdrop");
const openButton = document.getElementById("settings-open");
const swatchesEl = document.getElementById("swatches");
const customColorInput = document.getElementById("custom-color");

function setDrawerOpen(open) {
  drawer.classList.toggle("open", open);
  drawer.inert = !open;
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop.hidden = !open;
  openButton.setAttribute("aria-expanded", String(open));
  if (open) {
    drawer.querySelector("input:checked")?.focus();
  } else {
    openButton.focus();
  }
}

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
    tick();
  });
}

openButton.addEventListener("click", () => setDrawerOpen(true));
document.getElementById("settings-close").addEventListener("click", () => setDrawerOpen(false));
backdrop.addEventListener("click", () => setDrawerOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawer.classList.contains("open")) setDrawerOpen(false);
});

window.addEventListener("resize", fitToWindow);
applyColor(settings.color);
fitToWindow();
scheduleTick();
