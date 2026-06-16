# Engineering Safety Rules

These rules capture the anti-bug discipline for Lighting Brain. They are
especially important for Electron desktop, process management, audio routing,
DMX/QLC output, and training/review code.

## 1. Default Engineering Behavior

Make small, focused changes. Before editing, identify the exact files involved.
Do not modify unrelated subsystems and do not combine visual, audio, DMX, and
process-manager changes unless the user explicitly asks for that scope.

After editing, list changed files and explain both:

- what was changed;
- what was intentionally not changed.

## 2. State-Machine Safety

Start, Stop, Open, Close, Refresh, route switching, and route restoring must be
idempotent where possible.

Required examples:

- Pressing Start System multiple times must not duplicate services or corrupt
  state.
- Pressing Stop System multiple times must not corrupt state.
- Opening a second Electron instance must not create duplicate managers,
  listeners, timers, windows, or process ownership.
- Closing and reopening must not leave stale windows, stale process references,
  stale timers, stale ports, or stale UI state.

Use explicit state names and keep transitions narrow. Common states include:

- `stopped`
- `starting`
- `running`
- `reused`
- `refreshing`
- `syncing`
- `stopping`
- `error`
- `partial failure`

## 3. Race-Condition Guards

Every unsafe operation needs defense in two places:

- Renderer/UI guard: disable or ignore unsafe buttons during transient states.
- Main/process-manager guard: reject unsafe IPC calls even if the UI guard fails.

Renderer guards alone are not enough. The main process is the source of truth for
process ownership, windows, route state, and cleanup.

Explicitly handle transient states:

- `starting`
- `stopping`
- `refreshing`
- second-instance sync
- route switching
- route restoring
- partial failure

If an unsafe action arrives during a transient state:

1. log a clear message;
2. return the current status;
3. do not spawn, stop, route, restore, or mutate ownership.

## 4. Process Ownership

Every managed service must track whether it is:

- owned by Electron;
- reused from an already-running expected service;
- external and optional;
- stopped;
- stale project service;
- conflict/error.

Stop System must stop only Electron-owned processes.

Force Cleanup Ports may be stronger, but it must be explicitly labeled
debug/recovery. It may inspect real port listeners and kill known project-port
processes only after explicit user confirmation.

Do not kill reused external services during normal Stop System.

## 5. System State Ownership

If Electron changes system state, store ownership explicitly:

- `changedByElectron`: yes/no;
- previous state saved: yes/no;
- active state;
- restored state.

Never overwrite a valid previous state with a temporary/routed state during
repeated Start calls. This matters especially for audio output routing.

## 6. Audio Routing Safety

System audio and microphone must remain strictly separate.

- `system_output_audio`: real system/app output capture.
- `app_output_audio`: selected app/process output capture where supported.
- `blackhole_legacy`: virtual loopback fallback/debug mode.
- `microphone_fallback`: microphone capture only, with explicit warning.

Microphone is fallback/debug only and must never be treated as system audio.
Do not silently fall back to microphone.

BlackHole legacy routing may switch macOS output only if dependencies are
detected. If Electron switches output to a Multi-Output device, it must restore
the previous output on:

- Stop System;
- app quit;
- window close;
- SIGINT;
- SIGTERM;
- handled setup/start errors.

Restore must be idempotent. Repeated Start System must not overwrite previous
output with the Multi-Output device.

## 7. No Duplicate Async Work

Do not allow:

- duplicate timers;
- duplicate event listeners;
- duplicate status refresh loops;
- duplicate process managers;
- duplicate dashboard window references;
- stacked second-instance refresh timers;
- overlapping start/stop operations;
- overlapping route switch/restore operations.

Use a promise lock, mutex, or explicit state flag in the owner layer, not only in
the renderer.

## 8. Cleanup

App quit, window close, SIGINT, and SIGTERM must clean up or restore anything
Electron changed.

Cleanup must be safe to run more than once. Failed setup must not leave the app
half-started without visible status.

On failed Start System:

- preserve healthy services;
- stop only newly-owned partial services when appropriate;
- preserve reused/external services;
- show visible status and logs.

## 9. Error Handling

Missing dependencies must produce clear warnings.

Do not silently fall back to another subsystem. For example, if system audio is
unavailable, do not switch to microphone without explicit user selection and a
warning.

If a service port is open but its health check fails, do not mark it healthy just
because the port is listening.

Dashboard availability must depend on confirmed frontend health.

## 10. Validation

For relevant tasks, run:

```bash
npm run desktop:check
PYTHONPATH="$PWD/src" python3 -m unittest discover -s tests
git diff --check
```

For Electron/process/audio changes, manually validate when possible:

- Start System once.
- Start System repeatedly or spam-click it.
- Stop System repeatedly.
- Open Dashboard after repeated Start.
- Close with X while running.
- Open a second Electron instance and immediately press Start.
- Stop/start again after second-instance focus.
- Confirm no stale process remains.
- Confirm no stale window reference remains.
- Confirm no stale timer remains.
- Confirm no stale UI state remains.
- Confirm output/audio/process restore if the task touches routing or system
  state.

## 11. Hard Boundaries

Unless explicitly requested, do not modify:

- audio analysis logic;
- training/review behavior;
- canonical light state;
- DMX/QLC/fixture mapping;
- webapp UI;
- CoreAudio/WASAPI/FTDI hardware layers.

When a task touches one subsystem, keep the change inside that subsystem unless
the user explicitly expands the scope.

## 12. Final Response Requirements

After every implementation, report:

- changed files;
- new guards or state-machine behavior;
- cleanup/restore behavior if relevant;
- validation results;
- confirmation that unrelated systems were not modified.
