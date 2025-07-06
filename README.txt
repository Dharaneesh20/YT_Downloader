---

# 📥 YouTube Downloader Application

A modern and feature-rich web-based YouTube Downloader built with Node.js. Supports 8K/4K/HDR, audio-only, and merged downloads with a sleek dark UI!

---

## 🚀 Quick Start Guide

### ✅ First Time Setup

1. 📦 **Install Node.js**
   Download and install from 👉 [https://nodejs.org](https://nodejs.org)
   (Required to run this app)

2. 🧬 **Clone the Repository**

   ```bash
   git clone https://github.com/Dharaneesh20/YT_Downloader.git
   cd YT_Downloader
   ```

3. 🏁 **Run Setup Script**

   * Double-click: `Setup-and-Run.bat`
     *(Sets up everything automatically — dependencies, yt-dlp, ffmpeg check, and launches the app)*

---

## 🔁 Daily Use (After First Setup)

* Double-click: `Quick-Start.bat`
  *(Quick launch with no setup delay)*

---

## 📂 Folder Structure

| Folder / File             | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `downloads/`              | Downloaded videos will appear here             |
| `node_modules/`           | Node.js dependencies                           |
| `public/` or `src/`       | HTML, CSS, JS, frontend files                  |
| `server.js`               | Backend Node.js server logic                   |
| `Setup-and-Run.bat`       | First-time setup script                        |
| `Quick-Start.bat`         | One-click daily launcher                       |
| `Run.bat`                 | Original CLI runner                            |
| `Update-Dependencies.bat` | Downloads the latest `yt-dlp` and dependencies |

---

## 🌟 Features

* ✅ One-click setup & launch
* 🌐 Automatically opens in your browser
* 🎞️ 8K / 4K / FHD / HD / SD / HDR / SDR video support
* 🎵 Audio-only downloads
* 🔀 Video + Audio merging via **ffmpeg**
* 🕹️ Command-line & GUI support
* 💾 Download history
* 🌑 Dark theme with Red/Blue accent
* ⚙️ Auto-install & update of all dependencies

---

## 🛠️ Troubleshooting

| Issue                   | Solution                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| ❌ `node` not recognized | Install Node.js 👉 [https://nodejs.org](https://nodejs.org)      |
| ❌ `yt-dlp` not found    | Script will auto-download the latest `yt-dlp`                    |
| ❌ `ffmpeg` missing      | Download it manually 👉 [https://ffmpeg.org](https://ffmpeg.org) |
| 🔁 Port 3000 in use     | Script will auto-kill conflicting processes                      |

---

## 🔄 Updating the App

To update yt-dlp and dependencies:

```bash
Double-click: Update-Dependencies.bat
```

---

## 💬 Coming Soon (Optional Ideas)

* ✅ Cross-platform support (Linux/Mac via `.sh` script)
* 📁 Drag & drop video links
* 🧠 AI-powered filename suggestions
* 📱 Mobile-friendly interface

---

## 🧠 Developer Notes

This app uses:

* `express` for the backend
* `yt-dlp` for downloading
* `ffmpeg` for merging streams
* `open` to auto-launch the browser
* Static frontend with dark-mode styling

---

## 🙌 Credits

Made with ❤️ by **[Dharaneesh R.S](https://github.com/Dharaneesh20)**
Licensed under MIT.

---

