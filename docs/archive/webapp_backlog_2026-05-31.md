# Webapp Backlog 2026-05-31

This note tracks only the main items still open after the latest training UI
work. It exists to reduce repeated explanation and keep the next sessions light.

## Running Now

- web app served on `http://127.0.0.1:8788/web/`
- live audio bridge served on `http://127.0.0.1:8790/`
- local test file `analysis/are_you_with_me.librosa.json` is intentionally not committed

## Stable Enough

- file load, timeline load and Python live audio loopback
- training on/off flow with post-capture editing gate
- shared scene pool across genres with default scene probability `0.9`
- Harmonix Set importer for human musical structure
- cue splits on the component-lane canvas with editable cue name and probability

## Still Missing Or Incomplete

- training transport UX:
  `Training -> Train time -> Play -> REC indicator -> stop/auto-stop -> editable review`
- review cursor UX:
  stronger visible playhead on both simple slider and component-lane canvas
- per-step scene visibility:
  show clearly which exact scene the brain picked at the current cursor position
- cue granularity:
  support dense review points at every BPM or fastest detected component BPM
- scene-step editing:
  edit not only cue metadata but also the actual light scene for each step/cue block
- cue segmentation logic:
  allow one cue to define a scene block lasting `n` beats until the next cue
- probability workflow:
  scene probabilities should be editable directly from review/training without JSON export
- 8-lights to 32-lights scaling:
  expand sparse patterns coherently so larger rigs are not mostly dark
- neighbor-light activation:
  probability grows from low fixture counts to denser rigs, with same/random color logic
- 10-BPM coverage rule:
  in dense rigs all fixtures should be used at least once within roughly 10 BPM when musically appropriate
- live component BPM:
  current `fastest_component_bpm` is heuristic and should become more reliable
- Rekordbox-specific input mode:
  current reliable path is still system audio / multi-output device
- Spotify / Apple Music:
  still generic system-audio sources, not app-specific integrations
- internal browser verification:
  local verification is sometimes blocked by `ERR_BLOCKED_BY_CLIENT`, so Safari remains the main visual check

## Cleanup Needed

- consolidate duplicated inline CSS in `web/index.html` and `web/styles.css`
- add focused tests for cue creation and training review state
- document exact Safari / BlackHole / multi-output setup once UI stabilizes
