# Direct FTDI/OpenDMX Research For Beta 0.1

Target cable:

- Observed label: `FT232R USB UART (S/N: BG03EQH8)`
- Product name: `FT232R USB UART`
- Serial: `BG03EQH8`
- Expected FTDI VID/PID for FT232R: `0403:6001`

Beta 0.1 direction:

```text
Lighting Brain desktop app -> direct FTDI/OpenDMX driver -> FT232R USB UART cable -> DMX fixtures
```

Fallback/emergency direction:

```text
Lighting Brain desktop app -> QLC Bridge -> QLC+ -> USB-DMX cable -> DMX fixtures
```

QLC+ is no longer treated as the mandatory always-on path. It remains valuable as fallback, emergency, and reference.

## QLC+ Source Files Researched

Source reference: `https://github.com/mcallegari/qlcplus`, shallow clone inspected at commit `b625e9d8f7e66f31629ee47a1e8ae6abe945749f`.

Relevant files/classes:

- `plugins/dmxusb/src/dmxusb.cpp`
  - `DMXUSB`
  - plugin-level input/output enumeration, `openOutput()`, `writeUniverse()`, output list.
- `plugins/dmxusb/src/dmxusbwidget.cpp`
  - `DMXUSBWidget::widgets()`
  - protocol selection and fallback to `EnttecDMXUSBOpen` for unknown FTDI-ish devices.
  - configurable output frequency per serial.
- `plugins/dmxusb/src/dmxusbwidget.h`
  - `DMXUSBWidget::OpenTX`
  - default DMX channel count and default output frequency constants.
- `plugins/dmxusb/src/dmxinterface.cpp`
  - `DMXInterface::validInterface()`
  - FTDI VID/PID validation.
- `plugins/dmxusb/src/dmxinterface.h`
  - `FTDIVID = 0x0403`
  - `FTDIPID = 0x6001`
  - settings maps for forced protocol and output frequency.
- `plugins/dmxusb/src/libftdi-interface.cpp`
  - `LibFTDIInterface`
  - libusb/libftdi enumeration, serial/name/vendor extraction, open by serial/name, 250000 baud, 8N2, no flow control, RTS clear, break toggling, writes.
- `plugins/dmxusb/src/ftd2xx-interface.cpp`
  - `FTD2XXInterface`
  - D2XX equivalent operations, mostly relevant for Windows/later packaging.
- `plugins/dmxusb/src/qtserial-interface.cpp`
  - `QtSerialInterface`
  - useful as conceptual fallback, but QLC+ explicitly avoids FTDI VCP for FTDI devices and OpenDMX on macOS.
- `plugins/dmxusb/src/enttecdmxusbopen.cpp`
  - `EnttecDMXUSBOpen`
  - OpenDMX/OpenTX thread, break/MAB timing, channel buffer copy, repeated frame loop.
- `plugins/dmxusb/src/dmxusbconfig.cpp`
  - UI/config approach for forced mode and output frequency.
- `resources/docs/html_en_EN/dmxusbplugin.html`
  - user-facing QLC+ notes for supported FTDI-based devices and macOS driver warnings.
- `resources/docs/html_en_EN/disable_apple_ftdi_driver.html`
  - macOS FTDI driver conflict background.

## License Notes

QLC+ is Apache License 2.0 in the inspected repository. We can study behavior and reimplement cleanly, but we should not paste large QLC+ code blocks into this project. If code is copied later, attribution and license handling must be explicit.

For beta 0.1 we only use QLC+ as a behavioral reference:

- device identity fields;
- protocol choice;
- timing model;
- dependency choices;
- safety warnings.

We should implement our own adapter boundary and tests.

## What QLC+ Does For This Cable Class

The target cable presents as a generic FT232R USB UART. In QLC+ this fits the FTDI/OpenTX/OpenDMX style path:

1. Enumerate USB devices through libftdi/libusb on Unix/macOS.
2. Filter valid FTDI VID/PID values.
3. Read manufacturer, product name, and serial.
4. If no forced protocol map exists and the product is not recognized as Pro/Mk2/DMXKing/other special devices, default to `EnttecDMXUSBOpen`.
5. For OpenDMX:
   - configure 250000 baud;
   - 8 data bits;
   - 2 stop bits;
   - no parity;
   - no flow control;
   - clear RTS;
   - repeatedly transmit frames.
6. Each OpenDMX frame:
   - assert BREAK;
   - wait approximately DMX break time;
   - release BREAK;
   - wait mark-after-break;
   - write start code `0x00` plus DMX channel bytes;
   - sleep until next configured frame interval.

QLC+ default for OpenDMX is 30 Hz, but QLC+ also has a per-device frequency map and UI spinbox. We must keep frequency configurable and not hardcode 30 Hz.

## Immediate Beta 0.1 Design

Add a protected direct-output scaffold for only this target cable:

- target name: `FT232R USB UART`
- target serial: `BG03EQH8`
- expected VID/PID: `0403:6001`
- protocol: `OpenTX` / OpenDMX style
- preferred backend on macOS: `libftdi1`/`libusb`
- QLC fallback remains available.

Configuration must include:

- `universe`: integer, default `0`, configurable later.
- `output_frequency_hz`: integer, default can be `30`, configurable later.
- `target_serial`: default `BG03EQH8`.
- `target_name`: default `FT232R USB UART`.

The current scaffold lives in:

- `src/lighting_brain/direct_ftdi.py`

It provides:

- `DirectFtdiOutputConfig`
- `DirectFtdiProbe`
- `DirectFtdiCapability`
- `ProtectedDirectFtdiOpenDmxAdapter`

The adapter is intentionally protected:

- it can probe/detect the exact target;
- it does not open the device;
- it does not write to the device;
- `connect()` and `write_universe()` raise `NotImplementedError`.

This gives the app a real structural target for beta 0.1 without risking accidental hardware writes.

## macOS Library Choice

For this cable, QLC+ points us toward libftdi/libusb rather than a generic serial-port path:

- QLC+ docs warn against FTDI VCP drivers for the DMX USB plugin.
- QLC+ code skips FTDI devices in `QtSerialInterface::interfaces()`.
- `EnttecDMXUSBOpen` has a macOS special case forcing libftdi when OpenDMX would otherwise be QtSerial.

Recommended beta path:

1. Probe safely via system information / USB metadata.
2. Implement native helper around libftdi1/libusb for real output.
3. Keep QLC+ Bridge fallback until the direct path is stable.

Node/Electron alone is not ideal for precise OpenDMX timing unless we use a native module/helper. Python can model state and run tests, but real OpenDMX timing should likely be a small native helper process.

## Risk Notes

- OpenDMX timing is host-driven. If the app stalls, DMX output can flicker.
- macOS driver ownership can prevent libftdi from claiming the interface.
- VCP/D2XX/libusb conflicts need a clear user-facing status panel later.
- Writing a break/MAB/frame loop from high-level JS is risky.
- Direct output must be owned by the Electron app and cleaned up on Stop/app quit.
- The device serial must be matched so we do not accidentally grab another FTDI serial adapter.

## Capability Probe Plan

Probe should report:

- direct output status:
  - target cable detected/not detected;
  - backend available/missing;
  - hardware writes enabled/disabled;
  - selected universe;
  - configured output frequency;
- QLC fallback status:
  - bridge available;
  - QLC+ web interface available;
  - fallback usable/unusable.

The first probe implementation is safe:

- it can parse observed device dictionaries in tests;
- on macOS it can call `system_profiler SPUSBDataType`;
- it does not open USB devices.

Safe local probe:

```bash
PYTHONPATH="$PWD/src" python3 scripts/direct_ftdi_probe.py
```

This reports capability JSON only. It does not claim the FTDI device and does not write DMX.

## Immediate Next Implementation Step

Implement the native/libftdi helper behind a hard opt-in flag:

```text
Electron main process
-> DirectFtdiOutputDriver
-> native helper process
-> libftdi open serial BG03EQH8
-> protected OpenDMX refresh loop
```

Safety guards needed before any write:

- exact serial match required;
- explicit user output mode = `Direct FTDI/OpenDMX`;
- configurable universe and refresh rate;
- Stop System must stop the refresh loop and close FTDI;
- app quit/SIGINT/SIGTERM must close FTDI;
- QLC fallback must remain selectable.

## Not Implemented Yet

- No FTDI device is opened.
- No DMX frames are written.
- No driver install assistant is added.
- No generalized device support is added.
- No Setup Light UI changes are made.
- No QLC fallback behavior is removed.
