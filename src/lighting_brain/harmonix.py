from pathlib import Path

from .io import load_json


SECTION_CATEGORY_MAP = {
  "intro": "ambient_no_beat",
  "verse": "steady_bass_pulse",
  "chorus": "high_energy_drop",
  "refrain": "high_energy_drop",
  "bridge": "breakdown",
  "break": "breakdown",
  "solo": "buildup",
  "outro": "ambient_no_beat",
  "end": "silence_or_pause",
}


def load_harmonix_jams(path, audio_path=None, segment_beats=16):
  """Convert a Harmonix Set JAMS annotation into Lighting Brain analysis JSON."""
  path = Path(path)
  data = load_json(path)
  duration = float(data.get("file_metadata", {}).get("duration") or 0.0)
  annotations = data.get("annotations", [])
  beats = extract_times(annotations, {"beat"})
  downbeats = extract_times(annotations, {"downbeat"})
  if not downbeats:
    downbeats = extract_downbeats_from_beat_positions(annotations)
  segments = extract_segments(annotations, duration)
  if not segments:
    segments = build_beat_segments(duration, beats, segment_beats)

  return {
    "path": str(audio_path or path),
    "annotation_path": str(path),
    "duration": duration,
    "bpm": estimate_bpm(beats),
    "analysis_engine": "harmonixset_jams",
    "features": {
      "beat_count": len(beats),
      "downbeat_count": len(downbeats),
      "segment_count": len(segments),
      "beat_confidence": 1.0 if beats else 0.0,
      "human_annotated": True,
    },
    "beat_times": [round(value, 4) for value in beats],
    "downbeat_times": [round(value, 4) for value in downbeats],
    "segments": segments,
  }


def extract_times(annotations, namespaces):
  times = []
  for annotation in annotations:
    namespace = annotation.get("namespace")
    if namespace not in namespaces:
      continue
    for observation in annotation.get("data", []):
      times.append(float(observation.get("time", 0.0)))
  return sorted(set(round(time, 4) for time in times))


def extract_downbeats_from_beat_positions(annotations):
  downbeats = []
  for annotation in annotations:
    if annotation.get("namespace") != "beat":
      continue
    for observation in annotation.get("data", []):
      value = observation.get("value")
      if value in (1, "1", "downbeat"):
        downbeats.append(float(observation.get("time", 0.0)))
  return sorted(set(round(time, 4) for time in downbeats))


def extract_segments(annotations, duration):
  candidates = []
  for annotation in annotations:
    namespace = annotation.get("namespace", "")
    if not namespace.startswith("segment"):
      continue
    for observation in annotation.get("data", []):
      start = float(observation.get("time", 0.0))
      end = start + float(observation.get("duration") or 0.0)
      if end <= start:
        end = duration
      label = normalize_section_label(observation.get("value"))
      candidates.append(make_segment(start, min(end, duration or end), label))
  return sorted(candidates, key=lambda segment: segment["start"])


def build_beat_segments(duration, beat_times, segment_beats):
  if not duration:
    return []
  boundaries = [0.0]
  if len(beat_times) >= segment_beats:
    boundaries.extend(float(beat_times[index]) for index in range(segment_beats, len(beat_times), segment_beats))
  boundaries.append(duration)
  deduped = []
  for value in boundaries:
    if not deduped or value - deduped[-1] > 0.25:
      deduped.append(value)
  return [
    make_segment(start, end, label_for_position(index, len(deduped) - 1))
    for index, (start, end) in enumerate(zip(deduped, deduped[1:]))
  ]


def make_segment(start, end, label):
  return {
    "start": round(float(start), 4),
    "end": round(float(end), 4),
    "label": label,
    "sample_category": SECTION_CATEGORY_MAP.get(label, "transition"),
    "features": {
      "human_section_label": True,
      "duration": round(float(end) - float(start), 4),
    },
  }


def normalize_section_label(value):
  text = str(value or "section").lower()
  for label in SECTION_CATEGORY_MAP:
    if label in text:
      return label
  if "pre" in text and "chorus" in text:
    return "buildup"
  return "section"


def label_for_position(index, total):
  if index == 0:
    return "intro"
  if index >= total - 1:
    return "outro"
  return "verse"


def estimate_bpm(beat_times):
  if len(beat_times) < 2:
    return None
  intervals = [
    beat_times[index + 1] - beat_times[index]
    for index in range(len(beat_times) - 1)
    if beat_times[index + 1] > beat_times[index]
  ]
  if not intervals:
    return None
  mean_interval = sum(intervals) / len(intervals)
  if mean_interval <= 0:
    return None
  return round(60.0 / mean_interval, 3)
