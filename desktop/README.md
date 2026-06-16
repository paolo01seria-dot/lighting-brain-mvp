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

By default the Electron window loads `web/index.html` from this repository. To
load an already-running local web server instead:

```bash
LIGHTING_BRAIN_DESKTOP_URL="http://127.0.0.1:8788/web/?v=desktop" npm run desktop:dev
```

## Check

```bash
npm run desktop:check
```

The check performs syntax validation on the desktop JavaScript scaffold. It does
not launch Electron and does not touch audio devices.

## What Exists Now

- Minimal Electron main process.
- Safe preload IPC surface under `window.lightingBrainDesktop`.
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
- Any rewrite of the current web UI, training, review, canonical light state, or
  DMX/QLC behavior.

Microphone fallback is separate from system output audio and requires explicit
user consent before it can ever start. BlackHole remains a legacy/debug fallback.
