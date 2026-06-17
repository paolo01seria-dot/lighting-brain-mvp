# Lighting Brain

Local music-intelligent lighting system for real-time DMX shows.

## Product flow

audio system capture
-> musical analysis
-> lighting brain
-> canonical light state
-> fixture mapping
-> QLC Bridge or direct output
-> DMX lighting rig

## Current areas

- system-audio capture;
- live musical analysis;
- lighting scene generation;
- training and review;
- canonical light state;
- Setup Light;
- saved fixture setups;
- launcher and process management;
- QLC+ integration;
- DMX output;
- FTDI target support.

## Audio sources

System Audio is the primary product source.

Microphone input is fallback/debug only.

Offline files remain available for deterministic analysis and testing.

## Output paths

The project supports:

- browser simulator;
- debug/timeline export;
- QLC Bridge;
- direct hardware adapters.

QLC+ is a supported bridge and fallback, not the only possible output architecture.

## Current hardware target

FT232R USB UART
Serial number: BG03EQH8

Support for this device is part of beta 0.1.

## Architecture

See:

- `docs/current_product_state.md`
- `docs/project_direction.md`
- `docs/architecture_rules.md`
- `docs/output_architecture.md`
- `docs/launcher_bridge_architecture.md`
- `docs/dmx_output_and_ftdi.md`
