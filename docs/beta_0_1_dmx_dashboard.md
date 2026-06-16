# Beta 0.1 DMX Dashboard

The Electron launcher includes a **DMX Dashboard** for output verification before real FTDI/USB-DMX hardware support is added.

## What It Shows

- DMX universe 0, channels 1-512.
- Current channel values from the Electron mock DMX output state.
- Fixture labels for the current six-light test preset.
- Recent channel changes, highlighted in the channel grid.
- Last 50 output events with source, timestamp, driver, and changed channels.
- Fixture map diagnostics:
  - out-of-range mapped channels;
  - overlapping mapped channels;
  - unused/unknown mapped fixture channels;
  - current fixture map source.

## Manual DMX Test

Manual faders are disabled by default. The user must press **Arm Manual DMX Test** before faders can write values.

When armed:

- fader changes are written through the same Electron DMX output state;
- events are logged with `source: manual_dmx_dashboard`;
- **Blackout All** clears mapped controllable channels and logs a blackout event.

When disarmed:

- faders are read-only;
- manual writes are rejected by the renderer and by the Electron main process.

## Current Source Of Truth

For beta 0.1 the dashboard reads the Electron mock DMX universe state. It does not animate fake values and it does not access hardware.

The Python DMX layer also exposes a matching serializable mirror for readiness checks and tests. Future QLC and FTDI drivers should consume the same fixture map and publish their output events into this state boundary.

## Output Direction

Primary beta 0.1 direction:

```text
Lighting Brain desktop app -> direct FTDI/OpenDMX driver -> FT232R USB UART cable -> fixtures
```

Fallback/debug/emergency direction:

```text
Lighting Brain desktop app -> QLC Bridge -> QLC+ -> USB-DMX cable -> fixtures
```

The dashboard exists to verify this boundary before real FTDI/OpenDMX hardware access is implemented.
The immediate target cable is `FT232R USB UART (S/N: BG03EQH8)`. Universe and output frequency must remain configurable.

## Fixture Map

The dashboard uses the setup selected in the Electron launcher's **Light Setup** section.

Saved setup files are read from:

```text
configs/light-setups/
```

The current/default setup selection is persisted in:

```text
configs/light_setup_selection.json
```

If no valid saved setup is selected, the dashboard clearly falls back to the tested six-light preset. Setup Light remains the source of truth for real saved fixture configuration.

Known tested fixtures:

- `fixture_001`: address 1, RGB 3CH.
- `fixture_009`: address 9, RGB 3CH.
- `fixture_017`: address 17, dimmer/R/G/B/strobe/mode.
- `fixture_025`: address 25, dimmer/R/G/B/strobe/mode.
- `fixture_034`: address 34, dimmer/R/G/B/strobe/mode. CH33 is ignored.
- `fixture_041`: address 41, dimmer/R1/G1/B1/W1/R2/G2/B2/W2/strobe/mode/speed. CH53 is ignored.

## Safety Boundaries

The dashboard does not implement:

- FTDI/USB hardware access;
- CoreAudio Tap;
- WASAPI loopback;
- audio analysis changes;
- training/review changes;
- canonical light state rewrites.

## Validation

Run:

```bash
npm run desktop:check
PYTHONPATH="$PWD/src" python3 -m unittest discover -s tests
PYTHONPATH="$PWD/src" python3 scripts/output_readiness_check.py
git diff --check
```
