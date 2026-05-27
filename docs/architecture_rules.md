# Architecture Rules

## Core philosophy

This project is not simple sound-reactive lighting. The goal is music structure
driving intelligent visual behavior.

The system should evolve from amplitude reaction toward semantic music
understanding:

```text
audio/player input
-> musical features
-> sample-category
-> scene pool / freshness
-> fixture/light events
-> QLC+ / FreeStyler / DMX output
```

## Responsibilities

### AudioAnalyzer

Responsible for BPM, beat confidence, onset detection, bass energy, spectral
features, section detection and sample-category classification.

### SceneManager

Responsible for scene pools, scene sequencing, fixture grouping and selecting
scenes based on category.

### RepetitionTracker

Responsible for counting repeated sample-categories and exposing fatigue.

### VariationController

Responsible for deciding when to switch scenes using Scene Freshness.

### DMXOutput

Responsible only for final output values and communication timing.

DMXOutput must not contain musical decision logic.

## Sample-category

A sample-category is a detected musical state, such as:

- steady_bass_pulse
- high_energy_drop
- buildup
- breakdown
- chaotic_dense_section
- ambient_no_beat
- transition
- silence_or_pause

Each category owns a pool of candidate scenes/sequences.

## Scene Freshness

Differenziazione, previously described as Scene Freshness, controls how often
repeated sample-categories rotate to another scene.

- Lower value: changes more often, more dynamic.
- Higher value: the same category remains stable longer, more coherent.

This must be deterministic and musically intentional, not random.

## Priority logic

1. BPM / beat / bass pulse controls timing.
2. Special transitions can temporarily override normal behavior.
3. Sample-category controls visual language.
4. Ambient fallback handles unclear/no-BPM sections.

Loudness spikes alone must not be treated as rhythmic structure.

If BPM, beat or bass pulse is reliable, something must visibly evolve even when
the selected scene does not change. The evolution can be dimmer pulses, chase
progression, movement, strobe modulation or color step progression.
