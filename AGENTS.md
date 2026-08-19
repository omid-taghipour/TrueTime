# AGENTS.md

Guidance for AI coding agents working in this repository. Human setup instructions
(prerequisites, installers, Docker, release process) live in [README.md](README.md) —
this file covers the conventions and invariants that aren't obvious from any single file.

## Commands

```sh
npm test                                      # vitest, single run
npm run test:watch
npx vitest run src/lib/formatTime.test.ts     # a single file
npx vitest run -t 'mutual exclusion'          # a single test by name
npm run build                                 # tsc + vite build
cargo tauri dev                               # native app with hot reload (Vite on :1420)
```

There is no linter. `npm run build` is the only static check, and `tsconfig.json` enables
`strict` plus `noUnusedLocals`/`noUnusedParameters` — an unused import fails the build.

The version number is duplicated across `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json`. Never edit it by hand; use `npm run bump-version -- <x.y.z>`.

## Architecture

React 18 + TypeScript (Vite, Tailwind) inside a Tauri v2 shell. The same `dist/` bundle also
ships as a web app via `Dockerfile` (nginx), so **the frontend must work with no Tauri runtime
present** — guard native calls with `isTauri()` from `@tauri-apps/api/core` and provide a
browser fallback. See `handleExport` in `src/components/SettingsPanel.tsx` for the pattern.

### The core invariant: time is derived, never ticked

`src/types/stopwatch.ts` stores only `accumulatedTime` (ms banked from previous running
periods) and `lastStartedTimestamp` (epoch ms, `null` when not running). Elapsed time is
*always* recomputed as `accumulatedTime + (Date.now() - lastStartedTimestamp)` — never
incremented by a timer. This is what keeps elapsed time exact across a crash, restart, or
sleep, and it is the app's namesake guarantee.

What to preserve in any change:

- Reading elapsed time goes through `elapsedAt(stopwatch, now)` in `src/lib/elapsed.ts`;
  `useLiveElapsed` and `adjustElapsedTime` both use it. Don't inline a fourth copy.
- `src/hooks/useLiveElapsed.ts` re-renders on `requestAnimationFrame` purely to refresh
  `now`; it never accumulates.
- Every pause-like transition folds `now - lastStartedTimestamp` into `accumulatedTime` and
  nulls the timestamp. That same fold is written out in three places — `pauseStopwatch`, the
  mutual-exclusion branch of `startStopwatch`, and `serializeStopwatches` (export folds
  running → paused so a later import doesn't jump by the offline gap). Keep them consistent.
- `lastActiveAt` is bumped on create/start/pause/reset and drives most-recently-used ordering.

### State ownership

`src/hooks/useStopwatches.ts` is the single owner of the stopwatch list and of *all* time
math. It persists the whole array to `localStorage` under `stopwatches` on every change.
`src/App.tsx` destructures its actions and prop-drills them down — there is no context,
store, or reducer. New mutations belong in this hook, not in components.

**Mutual exclusion:** `startStopwatch` pauses every other running stopwatch within the same
`setStopwatches` pass. Only one stopwatch may ever be `running`.

**Rebasing elapsed time:** `setElapsedTime` and `adjustElapsedTime` both go through the
`withElapsed` helper, which clamps at zero, moves a `stopped` stopwatch to `paused` once it
holds time (and back), and — for a running stopwatch — re-stamps `lastStartedTimestamp` to
`now` so the interval already folded into the new total isn't counted twice.

Other persisted settings each own a hook and a key: `theme` (`useTheme`), `sortStrategy`
(`useSortStrategy`), `showMilliseconds` (`useShowMilliseconds`), plus `lastExportedAt`
written directly by `SettingsPanel`. The live store has **no schema version or migration** —
`loadStopwatches` only checks `Array.isArray` and casts. Any change to the `Stopwatch` shape
must stay backward-compatible with data already on disk, and `isValidStopwatch` in
`src/lib/stopwatchIO.ts` has to be updated to match.

### Import/export trust boundary

`src/lib/stopwatchIO.ts` validates every field of user-supplied JSON — `parseStopwatchImport`
throws human-readable errors and nothing is cast blindly. On desktop, export goes through the
`export_stopwatches` Rust command in `src-tauri/src/lib.rs`, which accepts only file
*contents* and a suggested filename, never a path, so the webview can't turn it into an
arbitrary-file-write primitive. Preserve that shape.

### Keyboard shortcuts

Registration is decentralized: each component adds its own `window` `keydown` listener in a
mount-only effect — `StopwatchList` (`/`, `Space`), `CreateStopwatchForm` (`N`),
`KeyboardShortcutsHelp` (`?`, `Esc`), `SettingsPanel` (`Esc`). Every global handler must bail
via `isTypingTarget(event.target)` and `isDialogOpen()` (both in `src/lib/`) so shortcuts
don't fire while typing or behind a modal; that also means a new modal needs
`role="dialog"` to get the suppression. `StopwatchList` reads live values through a
`latestRef` so its listener registers once instead of resubscribing each render. Any new
shortcut also goes in the `SHORTCUTS` array in `KeyboardShortcutsHelp.tsx`.

### UI conventions

Tailwind only, no component or icon library. Icons are local inline `<svg>` function
components at the bottom of the file that uses them. Palette: teal = primary/running,
amber = pause, red = destructive, slate for everything else, with a `dark:` variant on every
color. Destructive actions confirm inline within the card rather than in a modal (see the
delete flow in `StopwatchCard.tsx`). Inline editing follows the rename pattern in
`StopwatchCard.tsx`: a draft state, commit on Enter/blur, revert on Escape.

## Testing

Vitest + jsdom + React Testing Library. `vitest.setup.ts` registers `afterEach(cleanup)` and
stubs `window.matchMedia`. Tests are colocated as `*.test.ts(x)`; `describe`/`it`/`expect`/`vi`
are imported explicitly (no globals).

- Hooks: `renderHook` + `act`, with `vi.spyOn(Date, 'now').mockReturnValue(...)` stepped
  between `act()` blocks to drive time math deterministically. Use this rather than fake
  timers. `localStorage.clear()` in `beforeEach`, `vi.restoreAllMocks()` in `afterEach`.
- Components: a local `makeStopwatch(overrides)` factory, `vi.fn()` for every handler,
  queries by accessible name (`getByLabelText('Delete stopwatch')`), and `fireEvent` rather
  than `user-event`.
- Assertions favor `toMatchObject({...})` against the whole stopwatch shape.
