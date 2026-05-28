SEGMENT_CATEGORY_MAP = {
  "start": "silence_or_pause",
  "intro": "ambient_no_beat",
  "verse": "steady_bass_pulse",
  "chorus": "high_energy_drop",
  "bridge": "breakdown",
  "outro": "transition",
  "end": "silence_or_pause",
}


def classify_sample_category(segment, bpm=None, energy=None):
  if segment.get("sample_category"):
    return segment["sample_category"]

  label = segment.get("label", "unknown")
  duration = segment.get("end", 0) - segment.get("start", 0)

  if duration <= 1.0:
    return "transition"

  if label in SEGMENT_CATEGORY_MAP:
    return SEGMENT_CATEGORY_MAP[label]

  if bpm and bpm >= 130:
    return "steady_bass_pulse"

  if energy in {"aggressive", "high", "hypnotic"}:
    return "chaotic_dense_section"

  return "ambient_no_beat"
