# Time

A full-screen, seven-segment digital clock that runs in the browser and installs as an app.

**Live at [time.kram.codes](https://time.kram.codes)**

I built it for myself, to sit in the frame when I record timelapse videos of my working sessions. Use it however you want. If it ends up in your videos, feel free to tag me [@kram.codes](https://instagram.com/Kram.Codes) on Instagram and [@kram.codes](https://www.tiktok.com/@kram.codes) on TikTok.

## Features

- Seven-segment display that scales to fill any screen, with a steady layout that never shifts as the digits change
- 12-hour or 24-hour time, with the date underneath
- Eight preset colours plus a custom colour picker
- Zoom in and out (kept within the window) and a fullscreen toggle
- Stopwatch mode for focused work sessions (see below)
- Settings are remembered between visits
- Installable as a PWA and works offline

## Stopwatch sessions

Switch to the stopwatch with the stopwatch icon at the top right. Its controls sit in a row of icons under the status line, and only the ones that apply right now are shown:

- **Start** asks for a to-do list of what you hope to get done in the session, then starts the stopwatch.
- While a session is on, **Pause**/**Resume** (or <kbd>Space</kbd>) and **Stop** replace Start. The **Tasks** icon opens the task list, where you can tick tasks off and add or remove them. It stays hidden until you open it.
- **Stop** freezes the time and asks for a note on the session. Any tasks still open can be ticked off then or left undone.
- Undone tasks are suggested for your next session. Untick a suggestion to leave it out this time, or **Drop** it to stop suggesting it.
- The **History** icon shows every past session with its duration, tasks and note, newest first and four to a page. Its search box filters sessions by the words in their note or tasks, and **Clear history** at the bottom deletes them all after a confirmation.

Sessions, including one in progress, are saved in the browser's local storage, so they survive reloads and work offline. They stay on that device and browser.

## Running it

It's plain HTML, CSS and JavaScript with no build step. Serve the folder with any static server, for example:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

The service worker (and so offline support and installing) only runs over HTTPS or on `localhost`, so opening `index.html` straight from disk gives you the clock without those.

## Installing

Open [time.kram.codes](https://time.kram.codes) in Chrome or Edge and use **Install** in the address bar, or on a phone choose **Add to Home Screen**. The installed app opens fullscreen.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the clock, controls, settings drawer, session panel and modals |
| `style.css` | Layout and styling; the clock is drawn on a 2166 × 1291 canvas scaled to the window |
| `script.js` | Clock and stopwatch display, settings, zoom, fullscreen, the session panel and modals, and service worker registration |
| `sessions.js` | Storage for stopwatch sessions: the one in progress, the history, and which undone tasks to suggest |
| `sw.js` | Service worker: caches the app and serves it network-first, falling back to the cache offline |
| `manifest.webmanifest` | PWA name, colours and icons |
| `icons/` | App icons |
| `fonts/` | The DS-Digital typeface |

## Credits

The clock uses [DS-Digital](http://ds-font.hypermart.net) by Dusit Supasawat. The font is shareware and is **not** covered by this project's license; see [`fonts/DIGITAL.TXT`](fonts/DIGITAL.TXT) for its terms.

## License

[MIT](LICENSE) © Mark Muthii — do what you want with it.
