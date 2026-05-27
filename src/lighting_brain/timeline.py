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
    "events": events
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
