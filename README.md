# Time

A full-screen, seven-segment digital clock that runs in the browser and installs as an app.

**Live at [time.kram.codes](https://time.kram.codes)**

I built it for myself, to sit in the frame when I record timelapse videos of my working sessions. Use it however you want. If it ends up in your videos, feel free to tag me [@kram.codes](https://instagram.com/Kram.Codes) on Instagram and [@kram.codes](https://www.tiktok.com/@kram.codes) on TikTok.

## Features

- Seven-segment display that scales to fill any screen, with a steady layout that never shifts as the digits change
- 12-hour or 24-hour time, with the date underneath
- Eight preset colours plus a custom colour picker
- Zoom in and out (kept within the window) and a fullscreen toggle
- Settings are remembered between visits
- Installable as a PWA and works offline

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
| `index.html` | Markup for the clock, controls, settings drawer and about modal |
| `style.css` | Layout and styling; the clock is drawn on a 2166 × 1291 canvas scaled to the window |
| `script.js` | Clock ticking, settings, zoom, fullscreen and service worker registration |
| `sw.js` | Service worker: caches the app and serves it network-first, falling back to the cache offline |
| `manifest.webmanifest` | PWA name, colours and icons |
| `icons/` | App icons |
| `fonts/` | The DS-Digital typeface |

## Credits

The clock uses [DS-Digital](http://ds-font.hypermart.net) by Dusit Supasawat. The font is shareware and is **not** covered by this project's license; see [`fonts/DIGITAL.TXT`](fonts/DIGITAL.TXT) for its terms.

## License

[MIT](LICENSE) © Mark Muthii — do what you want with it.
