# Current Product State

## Current product

This repository is no longer only an offline lighting timeline MVP.

It includes a local application with:

- launcher;
- system-audio capture;
- live analysis;
- browser dashboard;
- training and review;
- Setup Light;
- fixture setup persistence;
- QLC/DMX output work.

## Immediate beta priority

1. launcher and process ownership;
2. QLC Bridge controls;
3. FT232R BG03EQH8 support/probe;
4. saved setup selection;
5. real DMX verification;
6. canonical state stability.

## Non-negotiable rules

- System Audio is primary; microphone is fallback/debug.
- Training and Setup Light remain separate.
- Off-glass rendering must not regress.
- No duplicate processes, managers, listeners or timers.
- No playback event without an editable canonical representation.
- QLC+ is supported as bridge/fallback.
- Direct output is adapter-based and device-specific.
- FTDI target work belongs to beta 0.1, not a distant roadmap.