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

1. BPM / beat / repeated musical pulse controls timing.
2. Special transitions can temporarily override normal behavior.
3. Sample-category controls visual language.
4. Ambient fallback handles unclear/no-BPM sections.

Loudness spikes alone must not be treated as rhythmic structure.

If BPM, beat or any reliable repeated pulse is detected, something must visibly
evolve even when the selected scene does not change. The pulse may come from
bass, drums, guitar arpeggio, synth pattern, hi-hat or another predictable
repeated instrument. The evolution can be dimmer pulses, chase progression,
movement, strobe modulation or color step progression.

The system must not assume BPM only comes from bass. In sparse intros, a stable
mid/high arpeggio can be the primary musical clock until the bass enters.

Input sources must stay semantically clear. Mic Device means microphone or
physical input capture. System Audio means capturing the audio stream generated
by Rekordbox, Spotify or another player, even if the speakers are muted or low.
Those two paths should share the same analyzer after capture, but they are not
the same adapter.

Offline file analysis can expose a waveform/spectrogram-style overview before
playback. That visual map is useful for labeling intros, buildups, drops and
sparse arpeggiated sections, then later feeding better section detection.
