# Training Metadata

The project should not learn only direct pairs such as:

```text
sample_category -> scene_category
```

That pair is too poor. The useful training object is:

```text
musical state
+ audio features
+ temporal / phrase role
+ lighting behavior
+ designer intent
+ scene freshness
+ training quality
```

The goal is to teach the system why a lighting choice works in a moment, not
only which scene happened to be used.

## Current MVP schema

Each timeline scene event now contains a `metadata` object with:

- `time`: start/end, duration in seconds and beats, phrase position.
- `audio`: BPM, genre estimate, sample-category, energy, trend, beat/kick
  confidence and rough density features.
- `lighting`: recommended scene-category, colors, brightness, movement,
  strobe behavior, sync-to-beat and visual density.
- `designer_logic`: intent, visual role, expected crowd effect and energy
  relationship.
- `freshness`: repetition count, freshness score, variation need and allowed
  variation types.
- `training_quality`: placeholder quality fields for future real video
  annotation.

Generated timelines use `training_quality.usable_for_training = false` because
they are predictions, not observed ground truth from real videos.

## Scene Pools And Genre Probability

Scene pools are shared across genres. A genre should not remove useful lighting
ideas from another genre; it should only change ordering and probability.

Current MVP behavior:

- every genre loads the same combined scene pool
- scenes native to the selected genre are ordered first
- every known scene starts with probability `0.9`
- probability `0` means the scene is excluded for that genre

Training will later edit these probabilities per genre and per scene, so the
brain can prefer genre-appropriate scenes without losing access to the broader
lighting vocabulary.

## Future video dataset schema

When analyzing real party videos, each labeled segment should add:

- dominant colors
- brightness trend
- strobe and blackout detection
- movement type / direction / intensity
- fixture coordination
- camera confidence
- visual clarity
- audio-lighting match score
- beat-sync score

Only high quality clips should become training data. Bad camera angles, random
lights or unclear beat-sync should be stored as references, not as strong
training examples.

## Designer logic examples

```text
build_up_snare_roll + increase_tension -> pre_drop_tension_sweep
heavy_drop + release_energy -> white_strobe_beam_explosion
breakdown_vocal + create_space -> slow_ambient_wash
silence_hit + emphasize_stop -> blackout_or_freeze
steady_bass_pulse + maintain_groove -> groove_pulse_or_chase
```

This lets the app reduce a professional setup to a smaller real fixture setup:

```text
12 moving heads + strobe in video
-> same visual intent
-> 3 or 4 available DMX lights
```

The mapping target is parameterized intent, not a copied scene.
