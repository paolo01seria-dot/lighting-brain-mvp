# Codex Project Instructions

These instructions apply to every Codex task in this repository.

This project is a lighting brain plus desktop control room. Many bugs come from
state machines, process ownership, audio routing, and UI actions racing each
other. Treat every change as production-facing unless the user explicitly says it
is disposable.

For the complete safety checklist, also read:

- `docs/engineering_safety_rules.md`
- `docs/architecture_rules.md`
- `docs/desktop_audio_architecture.md`
- `docs/output_architecture.md`

## Default Engineering Behavior

- Make small, focused changes.
- Do not modify unrelated subsystems.
- Before editing, identify the exact files involved.
- Preserve existing user changes. Do not revert unrelated work.
- After editing, list changed files.
- Explain what changed and what was intentionally not changed.

## State-Machine Safety

- Start, Stop, Open, Close, Refresh, route switching, and route restoring must be
  idempotent where possible.
- Pressing Start System multiple times must not duplicate services or corrupt
  state.
- Pressing Stop System multiple times must not corrupt state.
- Opening a second Electron instance must not create duplicate managers,
  listeners, timers, windows, or process ownership.
- Closing and reopening must not leave stale windows, stale process references,
  stale timers, stale ports, or stale UI state.

## Race-Condition Guards

- Add guards both in the renderer/UI and in Electron main/process-manager code.
- Renderer guards are not enough. The main process must reject unsafe calls too.
- Explicitly handle transient states: `starting`, `stopping`, `refreshing`,
  `second-instance sync`, `route switching`, `route restoring`, and partial
  failure.
- During transient states, unsafe buttons must be disabled or ignored safely.
- If an unsafe action arrives anyway, reject it with a clear log and do not
  mutate state.

## Ownership Rules

- Track whether Electron owns a process or only reused an external one.
- Stop System must stop only Electron-owned processes.
- Force Cleanup may be stronger, but it must be explicit and clearly labeled as
  debug/recovery.
- If Electron changes system state, store ownership explicitly:
  `changedByElectron`, whether previous state was saved, active state, and
  restored state.
- Never overwrite a valid previous state with a temporary/routed state during
  repeated Start calls.

## Audio Routing Safety

- System audio and microphone must remain strictly separate.
- Microphone is fallback/debug only and must never be treated as system audio.
- BlackHole legacy routing may switch macOS output only if dependencies are
  detected.
- If Electron switches output to a Multi-Output device, it must restore the
  previous output on Stop System, app quit, window close, SIGINT, SIGTERM, and
  handled errors.
- Restore must be idempotent.
- Repeated Start System must not overwrite previous output with the Multi-Output
  device.

## No Duplicate Async Work

- No duplicate timers.
- No duplicate event listeners.
- No duplicate status refresh loops.
- No duplicate process managers.
- No duplicate dashboard window references.
- No stacked second-instance refresh timers.

## Cleanup

- App quit, window close, SIGINT, and SIGTERM must clean up or restore anything
  Electron changed.
- Cleanup must be safe to run more than once.
- Failed setup must not leave the app half-started without visible status.

## Error Handling

- Missing dependencies must produce clear warnings.
- Do not silently fall back to another subsystem.
- If a service port is open but health check fails, do not mark it healthy just
  because the port is listening.
- Dashboard availability must depend on confirmed frontend health.

## Validation

Run the appropriate checks for relevant tasks:

```bash
npm run desktop:check
PYTHONPATH="$PWD/src" python3 -m unittest discover -s tests
git diff --check
```

For Electron/process/audio changes, also manually validate when possible:

- Start System once.
- Start System repeatedly or spam-click it.
- Stop System repeatedly.
- Open Dashboard after repeated Start.
- Close with X while running.
- Open a second Electron instance and immediately press Start.
- Stop/start again after second-instance focus.
- Confirm no stale process, window, timer, port, or UI state remains.
- Confirm output/audio/process restore if the task touches routing or system
  state.

## Hard Boundaries

Unless explicitly requested, do not modify:

- audio analysis logic;
- training/review behavior;
- canonical light state;
- DMX/QLC/fixture mapping;
- webapp UI;
- CoreAudio/WASAPI/FTDI hardware layers.

## Final Response Requirements

After every implementation:

- list changed files;
- explain new guards or state-machine behavior;
- explain cleanup/restore behavior if relevant;
- report validation results;
- confirm unrelated systems were not modified.
