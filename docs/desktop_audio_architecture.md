# Desktop Audio Capture Architecture

This document defines the cross-platform desktop audio capture direction for
Lighting Brain. The goal is to make native system/app output capture the product
path while keeping BlackHole and microphone input as explicit fallback/debug
paths.

## Current Audio Flow

The current web app selects input in `web/index.html` via `#inputSource`:

- `system_audio`: starts `startLiveAudio()` in `web/app.js`.
- `mic_device`: starts `startDeviceInput()` in `web/app.js`.
- `file`: uses browser file playback and Web Audio analysis.

Today `system_audio` is not a native desktop capture path. It connects to the
local Python service `lighting-live-audio` on `127.0.0.1:8790`:

- `src/lighting_brain/live_audio_cli.py` opens a `sounddevice.InputStream`.
- `/devices` lists input-capable devices from `sounddevice`.
- `/events` streams Server-Sent Events to the renderer.
- Each event contains spectrum, energy, `sample_category`, component lanes, and
  review PCM fields (`audio_sample_rate`, `audio_samples`).

The Python service currently mixes input to mono float samples and analyzes each
block in `src/lighting_brain/realtime_audio.py`. The browser receives JSON
frames in `handleLiveAudioFrame()`, converts spectrum to the existing visual
frequency buffer, updates the brain, and stores `audio_samples` during training.

`mic_device` is separate: it uses browser `navigator.mediaDevices.getUserMedia`
and a Web Audio `AnalyserNode`. It captures the room, not system output.

## Hard Source Separation

System output capture and microphone capture must never be treated as equivalent
sources. The product primary source is direct output audio from the computer or
target app.

The capture layer must expose these source types:

- `system_output_audio`: real operating-system output loopback/mix capture.
- `app_output_audio`: capture of a chosen app/process output when supported.
- `blackhole_legacy`: virtual loopback device fallback/debug mode.
- `microphone_fallback`: microphone capture, with an explicit warning.

The UI must not label microphone input as system audio. The app must not
silently fall back from system output to microphone; it must show a warning and
require the user to choose microphone fallback.

## Shared Driver Interface

All capture implementations should present the same interface to Electron main:

```ts
type AudioSourceType =
  | "system_output_audio"
  | "app_output_audio"
  | "blackhole_legacy"
  | "microphone_fallback";

interface AudioCaptureDriver {
  start(config: AudioCaptureConfig): Promise<void>;
  stop(): Promise<void>;
  listDevices(): Promise<AudioCaptureDevice[]>;
  getStatus(): AudioCaptureStatus;
  onPcmFrame(callback: (frame: PcmFrame) => void): () => void;
  getLevelMeter(): AudioLevelMeter;
}
```

Common PCM frame contract:

```ts
interface PcmFrame {
  sourceType: AudioSourceType;
  sourceId: string;
  sequence: number;
  timestampSeconds: number;
  sampleRate: 44100 | 48000 | number;
  channelCount: number;
  sampleFormat: "float32";
  layout: "interleaved";
  frameCount: number;
  data: Float32Array;
  rms: number;
  peak: number;
}
```

Drivers may capture in platform-native formats internally, but they must output
normalized interleaved `float32` PCM. The first bridge to the existing brain can
downmix to mono and preserve the current `audio_samples`/`audio_sample_rate`
review fields.

## Platform Drivers

macOS preferred path:

- `MacCoreAudioTapDriver`
- Captures actual system or process output through CoreAudio tap APIs.
- Handles permissions and device changes inside the native helper layer.

macOS fallback paths:

- `MacScreenCaptureKitAudioDriver` if useful for app/system audio capture.
- `BlackHoleLegacyDriver`, backed by the current `sounddevice` style input.

Windows preferred path:

- `WindowsWasapiLoopbackDriver`
- Captures output device loopback via WASAPI.
- Supports selected output devices and device-change recovery.

Windows fallback path:

- `MicrophoneFallbackDriver`, only when explicitly selected and warned.

## Electron Integration

Electron is safe as the desktop shell if it owns UI, logs, configuration, and
process orchestration, while native capture remains behind `AudioCaptureDriver`.

Recommended process layout:

- Electron renderer: UI only. It selects source type/device and displays status.
- Electron preload: typed IPC methods for source selection and level meters.
- Electron main: owns `AudioCaptureManager`, starts/stops drivers, logs errors,
  and forwards normalized PCM frames.
- Native helper or native Node addon: platform-specific capture code.
- Python brain service: receives normalized PCM or receives the same analyzed
  frame shape it already consumes today.

Short term, Electron main can launch the existing Python `lighting-live-audio`
as `BlackHoleLegacyDriver`. Long term, native system/app output drivers feed PCM
into the same analyzer path.

## Shared Cross-Platform Parts

These should remain shared:

- Web UI and renderer state.
- Electron process manager and logging.
- PCM frame schema.
- Audio analysis/brain after PCM normalization.
- Training/review storage.
- Canonical light state.
- DMX fixture mapping and output drivers.

## Platform-Specific Parts

Only these should be platform-specific:

- Native system/app audio capture implementation.
- Permission prompts and recovery flows.
- Device enumeration details.
- Packaging, signing, entitlements, installer steps.
- Low-level resampling/channel conversion if the OS API requires it.

## Proposed File Layout

```text
desktop/
  main/
    audio/
      AudioCaptureDriver.ts
      AudioCaptureManager.ts
      PcmFrame.ts
      drivers/
        MacCoreAudioTapDriver.ts
        MacScreenCaptureKitAudioDriver.ts
        WindowsWasapiLoopbackDriver.ts
        BlackHoleLegacyDriver.ts
        MicrophoneFallbackDriver.ts
        MockAudioCaptureDriver.ts
  preload/
    audioIpc.ts
  native/
    macos-audio-helper/
    windows-audio-helper/

src/lighting_brain/audio_capture/
  pcm_frame.py
  analyzer_bridge.py
```

## First Safe Implementation Step

Do not implement native capture yet. The first safe step is:

1. Add the driver interface and PCM frame schema in the future Electron layer.
2. Wrap the current `lighting-live-audio` service as `BlackHoleLegacyDriver`.
3. Add a mock driver that emits generated PCM frames for tests.
4. Keep microphone as `microphone_fallback` and require explicit user selection.
5. Feed all sources into the same PCM-to-brain bridge.

This avoids macOS lock-in because Windows later plugs in
`WindowsWasapiLoopbackDriver` without changing the renderer, brain, training, or
DMX layers.

## Later Windows Work

Windows work is isolated to the native driver and packaging:

- Implement WASAPI loopback capture in the native helper/addon.
- Normalize WASAPI buffers to the shared `PcmFrame` contract.
- Handle output device selection, default-device changes, and sleep/resume.
- Add installer/runtime requirements and signing.
- Keep the same Electron IPC and Python brain bridge.

## BlackHole Position

BlackHole remains as `blackhole_legacy`: a developer/debug fallback and a
compatibility path for machines where native capture is unavailable. It is not
the final product path and must not be labeled as the primary system audio
solution.
