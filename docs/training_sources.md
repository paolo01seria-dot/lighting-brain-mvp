# Training Sources

## Harmonix Set

Source: https://github.com/urinieto/harmonixset

Harmonix Set is useful for the musical brain, not directly for lighting design.
It gives human-annotated musical structure such as:

- beat and downbeat timing
- functional sections such as verse, chorus, bridge, intro and outro
- metadata such as track identity, BPM and genre tags when available
- JAMS annotation files that can be converted into our analysis JSON

This helps the app learn where phrases, downbeats and structural changes are.
Lighting behavior still needs our training layer because Harmonix Set does not
contain DMX scenes, fixture layouts or lighting designer decisions.

## Import Flow

Convert one Harmonix `.jams` file into Lighting Brain analysis JSON:

```bash
lighting-harmonix-import path/to/track.jams --out analysis/track.harmonix.json
```

Then build a lighting timeline from that human-annotated analysis:

```bash
lighting-brain \
  analysis/track.harmonix.json \
  --scene-map scene_maps/basic_house_party.json \
  --genre-profiles scene_maps/genre_profiles.json \
  --genre house \
  --adapter debug \
  --out output/track.timeline.json
```

## Role In The System

Harmonix annotations should improve:

- phrase-aware scene changes
- downbeat-aware flashes
- section detection
- reliable training review timelines

They should not replace:

- live BlackHole/Rekordbox listening
- our scene-pool probability training
- fixture-position training
- future lighting video annotation
