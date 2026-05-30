def build_event_metadata(
  segment,
  previous_segment,
  bpm,
  genre_name,
  sample_category,
  scene,
  intent,
  scene_decision,
  differentiation,
):
  energy_trend = estimate_energy_trend(segment, previous_segment)
  duration_seconds = max(0.0, float(segment.get("end", 0)) - float(segment.get("start", 0)))
  beat_count = int(segment.get("features", {}).get("beat_count", 0))

  return {
    "time": {
      "start": round(float(segment.get("start", 0)), 4),
      "end": round(float(segment.get("end", 0)), 4),
      "duration_seconds": round(duration_seconds, 4),
      "duration_beats": beat_count,
      "phrase_position": phrase_position_for_segment(segment, sample_category),
      "change_on_downbeat": True,
    },
    "audio": {
      "bpm": bpm,
      "genre_estimate": genre_name,
      "sample_category": sample_category,
      "section_role": segment.get("label", "unknown"),
      "energy_level": audio_energy_level(segment, sample_category),
      "energy_trend": energy_trend,
      "bass_presence": bass_presence_for_category(sample_category),
      "kick_confidence": kick_confidence_for_segment(segment, sample_category),
      "vocal_presence": None,
      "melodic_presence": melodic_presence_for_segment(segment),
      "spectral_density": spectral_density_for_segment(segment),
      "transition_detected": sample_category in {"buildup", "transition"},
      "silence_or_gap": sample_category in {"ambient_no_beat", "silence_or_pause"},
    },
    "lighting": lighting_metadata(sample_category, scene, energy_trend),
    "designer_logic": designer_logic(sample_category, intent),
    "freshness": freshness_metadata(scene_decision, differentiation),
    "training_quality": generated_quality_metadata(),
  }


def estimate_energy_trend(segment, previous_segment):
  if not previous_segment:
    return "stable"
  current = float(segment.get("features", {}).get("mean_rms", 0))
  previous = float(previous_segment.get("features", {}).get("mean_rms", 0))
  if current > previous * 1.12:
    return "rising"
  if current < previous * 0.88:
    return "falling"
  return "stable"


def phrase_position_for_segment(segment, sample_category):
  label = segment.get("label", "unknown")
  if sample_category == "buildup":
    return "pre_drop_or_transition"
  if sample_category == "high_energy_drop":
    return "drop_or_peak_phrase"
  if label == "intro":
    return "intro_phrase"
  if label == "outro":
    return "outro_phrase"
  return "body_phrase"


def audio_energy_level(segment, sample_category):
  base = {
    "high_energy_drop": 0.88,
    "chaotic_dense_section": 0.84,
    "buildup": 0.72,
    "steady_bass_pulse": 0.58,
    "transition": 0.48,
    "breakdown": 0.34,
    "ambient_no_beat": 0.2,
    "silence_or_pause": 0.05,
  }.get(sample_category, 0.45)
  onset_rate = float(segment.get("features", {}).get("onset_rate", 0))
  return round(min(1.0, base + min(0.12, onset_rate * 0.025)), 3)


def bass_presence_for_category(sample_category):
  return {
    "high_energy_drop": 0.86,
    "steady_bass_pulse": 0.78,
    "chaotic_dense_section": 0.74,
    "buildup": 0.48,
    "transition": 0.4,
    "breakdown": 0.24,
    "ambient_no_beat": 0.12,
    "silence_or_pause": 0.0,
  }.get(sample_category, 0.35)


def kick_confidence_for_segment(segment, sample_category):
  beat_count = int(segment.get("features", {}).get("beat_count", 0))
  if sample_category in {"steady_bass_pulse", "high_energy_drop"} and beat_count >= 2:
    return 0.78
  if beat_count >= 2:
    return 0.52
  return 0.18


def melodic_presence_for_segment(segment):
  centroid = float(segment.get("features", {}).get("mean_centroid", 0))
  return round(min(1.0, centroid / 4500), 3)


def spectral_density_for_segment(segment):
  onset_rate = float(segment.get("features", {}).get("onset_rate", 0))
  return round(min(1.0, onset_rate / 4.5), 3)


def lighting_metadata(sample_category, scene, energy_trend):
  scene_category = scene_category_for_sample(sample_category)
  brightness = brightness_for_category(sample_category)
  return {
    "scene_category": scene_category,
    "recommended_scene": scene,
    "dominant_colors": dominant_colors_for_scene(scene, sample_category),
    "color_temperature": color_temperature_for_category(sample_category),
    "brightness_level": brightness,
    "brightness_trend": brightness_trend(sample_category, energy_trend),
    "strobe_detected": sample_category in {"high_energy_drop", "chaotic_dense_section"},
    "strobe_rate": strobe_rate_for_category(sample_category),
    "blackout_hit": sample_category in {"silence_or_pause"},
    "movement_intensity": movement_intensity_for_category(sample_category),
    "movement_type": movement_type_for_category(sample_category),
    "movement_direction": "mirrored_or_symmetric",
    "sync_to_beat": sync_to_beat_for_category(sample_category),
    "change_frequency": change_frequency_for_category(sample_category),
    "fixture_coordination": "synchronized",
    "visual_density": visual_density_for_category(sample_category),
  }


def scene_category_for_sample(sample_category):
  return {
    "high_energy_drop": "release_flash_or_burst",
    "buildup": "pre_drop_tension_sweep",
    "steady_bass_pulse": "groove_pulse_or_chase",
    "breakdown": "slow_ambient_wash",
    "ambient_no_beat": "minimal_hold",
    "transition": "scene_bridge",
    "silence_or_pause": "blackout_or_freeze",
    "chaotic_dense_section": "controlled_fast_pulse",
  }.get(sample_category, "adaptive_scene")


def brightness_for_category(sample_category):
  return {
    "high_energy_drop": 0.86,
    "chaotic_dense_section": 0.8,
    "buildup": 0.62,
    "steady_bass_pulse": 0.52,
    "transition": 0.46,
    "breakdown": 0.34,
    "ambient_no_beat": 0.22,
    "silence_or_pause": 0.03,
  }.get(sample_category, 0.42)


def dominant_colors_for_scene(scene, sample_category):
  scene = (scene or "").lower()
  if "white" in scene or "strobe" in scene or sample_category == "high_energy_drop":
    return ["white", "blue"]
  if "red" in scene:
    return ["red", "white"]
  if "amber" in scene or "warm" in scene:
    return ["amber", "white"]
  if "blue" in scene or "cold" in scene:
    return ["blue", "white"]
  if sample_category == "steady_bass_pulse":
    return ["blue", "green"]
  return ["blue", "white"]


def color_temperature_for_category(sample_category):
  if sample_category in {"high_energy_drop", "chaotic_dense_section"}:
    return "cold_bright"
  if sample_category in {"breakdown", "ambient_no_beat"}:
    return "cool_low"
  if sample_category == "steady_bass_pulse":
    return "balanced"
  return "warm_to_cool"


def brightness_trend(sample_category, energy_trend):
  if sample_category == "buildup":
    return "rising"
  if sample_category in {"breakdown", "ambient_no_beat"}:
    return "falling_or_low"
  return energy_trend


def strobe_rate_for_category(sample_category):
  if sample_category == "chaotic_dense_section":
    return "fast"
  if sample_category == "high_energy_drop":
    return "medium_fast"
  return "none"


def movement_intensity_for_category(sample_category):
  return {
    "high_energy_drop": 0.78,
    "chaotic_dense_section": 0.82,
    "buildup": 0.7,
    "steady_bass_pulse": 0.55,
    "transition": 0.5,
    "breakdown": 0.28,
    "ambient_no_beat": 0.12,
  }.get(sample_category, 0.4)


def movement_type_for_category(sample_category):
  if sample_category == "buildup":
    return "tension_sweep"
  if sample_category == "high_energy_drop":
    return "burst_or_chase"
  if sample_category == "steady_bass_pulse":
    return "beat_chase"
  if sample_category in {"breakdown", "ambient_no_beat"}:
    return "slow_hold"
  return "adaptive"


def sync_to_beat_for_category(sample_category):
  if sample_category in {"steady_bass_pulse", "high_energy_drop", "chaotic_dense_section"}:
    return "strong"
  if sample_category == "buildup":
    return "medium"
  return "weak_or_sparse"


def change_frequency_for_category(sample_category):
  if sample_category == "high_energy_drop":
    return "every_beat_or_downbeat"
  if sample_category == "buildup":
    return "every_2_or_4_beats"
  if sample_category == "steady_bass_pulse":
    return "every_beat"
  return "phrase_level"


def visual_density_for_category(sample_category):
  return {
    "high_energy_drop": 0.86,
    "chaotic_dense_section": 0.9,
    "buildup": 0.64,
    "steady_bass_pulse": 0.52,
    "transition": 0.46,
    "breakdown": 0.28,
    "ambient_no_beat": 0.16,
  }.get(sample_category, 0.4)


def designer_logic(sample_category, intent):
  logic = {
    "buildup": ("increase_tension", "prepare_drop", "anticipation", "slightly_below_audio_energy"),
    "high_energy_drop": ("release_energy", "drop_release", "impact", "matches_or_exceeds_audio_energy"),
    "steady_bass_pulse": ("maintain_groove", "body_motion", "movement", "matched_to_audio_energy"),
    "breakdown": ("create_space", "breathing_room", "contrast", "below_audio_energy"),
    "ambient_no_beat": ("hold_space", "minimal_focus", "reset", "below_audio_energy"),
    "silence_or_pause": ("emphasize_stop", "blackout_or_freeze", "surprise", "intentional_contrast"),
  }.get(sample_category, ("adapt_to_music", "support_section", "continuity", "matched_to_audio_energy"))
  return {
    "lighting_intent": logic[0],
    "visual_role": logic[1],
    "crowd_effect": logic[2],
    "scene_energy_match": logic[3],
    "timeline_intent": intent,
    "contrast_with_previous_scene": "derived_later",
    "contrast_with_next_scene": "derived_later",
  }


def freshness_metadata(scene_decision, differentiation):
  repeat_count = int(scene_decision.get("category_repeat_count", 1))
  threshold = max(1, int(differentiation or 1))
  freshness_score = max(0.0, 1.0 - ((repeat_count - 1) / threshold))
  return {
    "sample_category_repetition_count": repeat_count,
    "same_scene_recently_used": repeat_count > 1 and not scene_decision.get("scene_changed"),
    "scene_freshness_score": round(freshness_score, 3),
    "scene_probability": scene_decision.get("scene_probability"),
    "variation_needed": bool(scene_decision.get("scene_changed")),
    "variation_type": "scene_pool_rotation" if scene_decision.get("scene_changed") else "hold_current_scene",
    "allowed_variations": [
      "color_palette_shift",
      "movement_direction_change",
      "strobe_rate_change",
      "fixture_group_swap",
      "blackout_insert",
    ],
  }


def generated_quality_metadata():
  return {
    "source_type": "generated_recommendation",
    "audio_lighting_match_score": None,
    "beat_sync_score": None,
    "energy_match_score": None,
    "transition_quality_score": None,
    "visual_clarity_score": None,
    "camera_confidence": None,
    "usable_for_training": False,
  }
