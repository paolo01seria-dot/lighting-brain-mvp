from .sample_categories import classify_sample_category
from .scene_manager import SceneManager


def pick_energy(bpm, bpm_rules):
  if bpm is None:
    return "unknown"

  for rule in bpm_rules:
    if rule["min_bpm"] <= bpm <= rule["max_bpm"]:
      return rule["energy"]

  return "unknown"


def resolve_segment_scenes(scene_map, genre_profile=None):
  scenes = {}
  scenes.update(scene_map.get("segment_scenes", {}))

  if genre_profile:
    scenes.update(genre_profile.get("segment_scenes", {}))

  return scenes


def build_timeline(
  analysis,
  scene_map,
  genre_profile=None,
  scene_freshness=2,
  differentiation=None,
):
  bpm = analysis.get("bpm")
  energy = pick_energy(bpm, scene_map.get("bpm_rules", []))
  differentiation = scene_freshness if differentiation is None else differentiation
  segment_scenes = resolve_segment_scenes(scene_map, genre_profile)
  default_scene = scene_map.get("default_scene", "default_scene")
  genre_name = None
  scene_manager = SceneManager(
    scene_pools=resolve_scene_pools(scene_map, genre_profile),
    differentiation=differentiation,
  )

  if genre_profile:
    genre_name = genre_profile.get("name")
    energy = genre_profile.get("energy_bias", energy)

  events = []
  for segment in analysis.get("segments", []):
    label = segment["label"]
    fallback_scene = segment_scenes.get(label, default_scene)
    sample_category = classify_sample_category(segment, bpm=bpm, energy=energy)
    scene_decision = scene_manager.pick_scene(sample_category, fallback_scene)
    scene = scene_decision["scene"]
    intent = intent_for_segment(label)
    rhythmic_actions = rhythmic_actions_for_category(sample_category, bpm)
    events.append({
      "time": segment["start"],
      "scene": scene,
      "intent": intent,
      "sample_category": sample_category,
      "category_repeat_count": scene_decision["category_repeat_count"],
      "scene_changed": scene_decision["scene_changed"],
      "scene_pool_index": scene_decision["scene_pool_index"],
      "scene_pool_size": scene_decision["scene_pool_size"],
      "rhythmic_actions": rhythmic_actions,
      "reason": f"segment: {label}",
      "segment": {
        "label": label,
        "start": segment["start"],
        "end": segment["end"]
      },
      "track_bpm": bpm,
      "track_energy": energy,
      "genre": genre_name
    })

  return {
    "source_track": analysis.get("path"),
    "scene_map": scene_map.get("name", "unnamed_scene_map"),
    "genre": genre_name,
    "bpm": bpm,
    "energy": energy,
    "differentiation": differentiation,
    "scene_freshness": differentiation,
    "events": events,
    "rhythm_events": build_rhythm_events(analysis, events, bpm),
  }


def resolve_scene_pools(scene_map, genre_profile=None):
  pools = {}
  pools.update(scene_map.get("sample_category_scene_pools", {}))

  if genre_profile:
    pools.update(genre_profile.get("sample_category_scene_pools", {}))

  return pools or None


def intent_for_segment(label):
  intents = {
    "start": "prepare",
    "intro": "low_energy_intro",
    "verse": "main_groove",
    "chorus": "peak_energy",
    "bridge": "transition_or_breakdown",
    "outro": "release",
    "end": "blackout"
  }
  return intents.get(label, "maintain")


def rhythmic_actions_for_category(sample_category, bpm):
  if not bpm or sample_category in {"ambient_no_beat", "silence_or_pause"}:
    return []

  base_actions = ["dimmer_pulse", "scene_step_progression"]

  if sample_category == "steady_bass_pulse":
    return base_actions + ["chase_on_downbeat"]
  if sample_category == "high_energy_drop":
    return base_actions + ["hit_flash", "strobe_modulation"]
  if sample_category == "buildup":
    return base_actions + ["intensity_ramp"]
  if sample_category == "breakdown":
    return ["sparse_pulse", "dark_hold_variation"]
  if sample_category == "chaotic_dense_section":
    return base_actions + ["fast_cut_variation"]

  return base_actions


def build_rhythm_events(analysis, scene_events, bpm):
  beat_times = analysis.get("beat_times") or []
  if beat_times:
    return [
      make_rhythm_event(float(beat_time), beat_index, scene_events, "analysis_beat")
      for beat_index, beat_time in enumerate(beat_times)
    ]

  duration = analysis.get("duration")
  if not bpm or not duration:
    return []

  interval = 60 / bpm
  beat_times = []
  current = 0.0
  while current <= duration:
    beat_times.append(current)
    current += interval
  return [
    make_rhythm_event(float(beat_time), beat_index, scene_events, "tempo_grid")
    for beat_index, beat_time in enumerate(beat_times)
  ]


def make_rhythm_event(time, beat_index, scene_events, source):
  scene_event = scene_event_at(time, scene_events)
  sample_category = scene_event.get("sample_category", "ambient_no_beat")
  pulse = "downbeat" if beat_index % 4 == 0 else "beat"
  intensity = rhythm_intensity(sample_category, pulse)
  return {
    "time": round(time, 4),
    "beat_index": beat_index,
    "pulse": pulse,
    "source": source,
    "scene": scene_event.get("scene"),
    "intent": scene_event.get("intent"),
    "sample_category": sample_category,
    "intensity": intensity,
  }


def scene_event_at(time, scene_events):
  if not scene_events:
    return {}

  current = scene_events[0]
  for event in scene_events:
    if event["time"] > time:
      break
    current = event
  return current


def rhythm_intensity(sample_category, pulse):
  base = {
    "high_energy_drop": 0.92,
    "buildup": 0.74,
    "steady_bass_pulse": 0.62,
    "breakdown": 0.34,
    "ambient_no_beat": 0.24,
  }.get(sample_category, 0.48)
  if pulse == "downbeat":
    return round(min(1.0, base * 1.12), 3)
  return round(base, 3)
