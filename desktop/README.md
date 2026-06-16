# Lighting Brain Desktop Scaffold

This folder contains the optional Electron desktop layer. It does not replace
the current browser webapp yet.

## Run

Install desktop dependencies once:

```bash
npm install
```

Start Electron:

```bash
npm run desktop:dev
```

The Electron window opens a small launcher panel. Press **Start System** to
start or reuse the local web frontend on `127.0.0.1:8788` and the Python live
audio service on `127.0.0.1:8790`. Press **Open Dashboard** to open the webapp
inside Electron:

```text
http://127.0.0.1:8788/web/?v=desktop
```

Use **Audio Setup** inside Electron to inspect the legacy macOS route. This is
the current beta path for system audio:

- Electron checks for `SwitchAudioSource`.
- Electron checks for `BlackHole 2ch`.
- Electron checks for an output named exactly `DMX Multi-Output`.
- On **Start System**, Electron automatically switches macOS output to
  `DMX Multi-Output` when setup is complete.
- On **Stop System** or app quit, Electron restores the previous output if it
  changed it.

## Check

```bash
npm run desktop:check
```

The check performs syntax validation on the desktop JavaScript scaffold. It does
not launch Electron and does not touch audio devices.

## What Exists Now

- Minimal Electron main process.
- Safe preload IPC surface under `window.lightingBrainDesktop`.
- Minimal desktop launcher renderer with Start System, Stop System, service
  status, logs, and dashboard open action.
- `DesktopProcessManager` for local process lifecycle and logs.
- Port probing before spawn:
  - `8788`: web frontend.
  - `8790`: Python live audio.
  - `8791`: optional QLC+ bridge.
  - `9999`: external QLC+ Web Interface status only.
- Process ownership tracking:
  - `owned`: started by Electron and stopped by Electron.
  - `reused`: already running and not killed by Electron.
  - `external`: reported only, such as QLC+ itself.
  - `stopped` / `error`.
- Debug/emergency force cleanup for known project ports. This is not the normal
  shutdown path.
- Guided macOS **Audio Setup** panel for `BlackHole Legacy / Beta audio route`.
- Automatic legacy route activation/restoration during Start/Stop on macOS.
- Audio capture skeleton:
  - `AudioCaptureDriver`
  - `PcmFrame`
  - `AudioCaptureManager`
  - `MockAudioCaptureDriver`
  - `BlackHoleLegacyDriver`
  - `MacCoreAudioTapDriver`
  - `WindowsWasapiLoopbackDriver`
  - `MicrophoneFallbackDriver`

## What Is Intentionally Not Implemented Yet

- Native CoreAudio capture.
- Native WASAPI loopback capture.
- FTDI/USB-DMX hardware access.
- Automatic microphone fallback.
- Automatic QLC+ startup. The QLC bridge remains optional because QLC+ must be
  running separately on `127.0.0.1:9999`.
- Automatic creation/deletion of Multi-Output Devices. The first-time manual step
  is still creating `DMX Multi-Output` in Audio MIDI Setup.
- Any rewrite of the current web UI, training, review, canonical light state, or
  DMX/QLC behavior.

Microphone fallback is separate from system output audio and requires explicit
user consent before it can ever start. BlackHole remains a legacy/beta fallback
and is not the future native CoreAudio Tap path.

## Process Management Rules

Electron owns only the child processes it starts. On **Stop System**, app quit,
window close, or `Ctrl+C` during `npm run desktop:dev`, it sends shutdown signals
to owned child processes and does not intentionally leave them running.

If a port already has the expected service, Electron marks it as `reused` and
does not start a duplicate. Reused/external processes are not killed
automatically because they may have been started by the user or another tool.

If a port is occupied by an unknown process, Electron shows a clear service
error instead of letting Python print an address-in-use traceback.

Manual `lsof` / `kill` cleanup is an emergency/debug tool only. The launcher has
a **Force Cleanup Ports** action for that case, and it asks for confirmation.

The shutdown actions are intentionally different:

- `Stop System`: normal path. Stops only Electron-owned child processes.
- `Clean Stale Project Services`: debug helper. Stops only listeners that look
  like stale Lighting Brain project services.
- `Force Cleanup Ports`: debug/emergency path. Scans real `LISTEN` processes on
  known project ports and kills them after confirmation, even if they are marked
  reused, stale, conflict, error, or owned.

For `Force Cleanup Ports`, port `9999` is excluded by default and is only
included when you explicitly confirm you also want to stop the external QLC+
Web Interface.

For the BlackHole legacy route, the normal workflow is automatic:

- Start System: route activation is attempted automatically.
- Stop System / app quit / window close / `Ctrl+C`: previous output restore is
  attempted automatically.

The manual buttons in the Audio Setup panel:

- `Refresh Audio Devices`
- `Force Enable Legacy Routing`
- `Restore Previous Output`

are debug/recovery actions only. They are there for unusual cases, not for the
normal product flow.

If setup is incomplete, Electron shows guided instructions. The only intended
first-time manual step is creating `DMX Multi-Output` in Audio MIDI Setup and
including `BlackHole 2ch` plus the real output device.

The current local-server model is transitional. The long-term direction is to
move services behind app-managed helpers or embedded modules where possible, so
users do not experience the product as several terminal processes.
