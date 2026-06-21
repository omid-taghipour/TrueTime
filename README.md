# TrueTime

A clean, fast, cross-platform desktop stopwatch app built with [Tauri](https://tauri.app), React, and TypeScript. The name reflects its core guarantee: elapsed time is always derived from real timestamps, never a drifting interval — so it's exactly correct even after a crash or restart.

- Run multiple named stopwatches — only one can run at a time. Starting one instantly pauses whichever other one is running, capturing its elapsed time to the millisecond.
- Time is displayed as `HH:MM:SS`.
- State persists across app restarts and crashes: elapsed time is computed from timestamps, not a background timer, so a running stopwatch resumes exactly where it should be when you reopen the app.
- Checks for updates on launch and offers to download, install, and restart in place.

## Download

Grab the installer for your OS from the [Releases page](https://github.com/omid-taghipour/TrueTime/releases):

- **Windows**: `.msi` or `.exe` (NSIS) installer
- **macOS**: `.dmg`
- **Linux**: `.deb`, `.rpm`, or `.AppImage`

No Node.js or Rust needed to just run the app — those are only required if you want to build it from source.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (via `rustup`)
- Platform-specific Tauri build tools — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) (on Windows this means the MSVC "Desktop development with C++" Visual Studio workload and the WebView2 runtime; on Linux, `webkit2gtk` and friends)

> [!NOTE]
> On Windows, run Rust/Cargo commands from PowerShell or cmd.exe, not Git Bash. Git Bash ships its own `link.exe` (a coreutils utility) which shadows the real MSVC linker on `PATH` and breaks the build with a confusing linker error.

### Setup

```sh
npm install
```

### Run in dev mode

```sh
npm install -g @tauri-apps/cli   # or: cargo install tauri-cli
cargo tauri dev
```

This starts the Vite dev server and opens the app in a native window with hot reload.

### Build a release installer locally

```sh
cargo tauri build
```

Output installers land in `src-tauri/target/release/bundle/`.

### Run tests

```sh
npm test          # run once
npm run test:watch
```

Covers the time-math and mutual-exclusion logic in `useStopwatches` and the `formatTime` formatter.

### Cutting a release

The version number is duplicated across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`. Don't edit them by hand — use the bump script, which updates all three plus the lockfiles:

```sh
npm run bump-version -- 1.1.0
git add -A
git commit -m "Bump version to 1.1.0"
git tag v1.1.0
git push origin <branch>   # open a PR — main is protected, no direct pushes
git push origin v1.1.0     # after the PR merges, triggers the release workflow
```

## Tech stack

- [Tauri v2](https://tauri.app) — native shell, packaging, and installers
- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vite](https://vitejs.dev) — frontend dev server / bundler

## Project structure

```
src/
  types/stopwatch.ts        Stopwatch data model
  hooks/useStopwatches.ts   persisted state + time-math + mutual exclusion
  hooks/useLiveElapsed.ts   per-card live ticking display
  lib/formatTime.ts         HH:MM:SS formatter
  components/               UI: list, card, create form
src-tauri/                  Rust/Tauri native shell
.github/workflows/          CI: cross-platform release builds
```

## Contributing

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
