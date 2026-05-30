DEFAULT_SCENE_POOLS = {
  "steady_bass_pulse": [
    "pulse_chase_primary",
    "alternating_wash_groove",
    "low_strobe_side_hits",
  ],
  "high_energy_drop": [
    "drop_white_hit",
    "drop_red_chase",
    "drop_full_stage_flash",
  ],
  "buildup": [
    "buildup_riser_sweep",
    "buildup_tightening_chase",
  ],
  "breakdown": [
    "breakdown_dark_hold",
    "breakdown_single_blue",
  ],
  "chaotic_dense_section": [
    "dense_fast_hits",
    "dense_cross_chase",
  ],
  "ambient_no_beat": [
    "ambient_slow_blue",
    "ambient_warm_low",
  ],
  "transition": [
    "transition_blackout_snap",
    "transition_color_flip",
  ],
  "silence_or_pause": [
    "blackout_ready",
    "blackout_end",
  ],
}


class RepetitionTracker:
  def __init__(self):
    self._counts = {}

  def observe(self, category):
    self._counts[category] = self._counts.get(category, 0) + 1
    return self._counts[category]


class SceneManager:
  def __init__(self, scene_pools=None, scene_probabilities=None, differentiation=2):
    self.scene_pools = scene_pools or {}
    self.scene_probabilities = scene_probabilities or {}
    self.differentiation = max(1, int(differentiation))
    self.tracker = RepetitionTracker()
    self._selected_indexes = {}

  def pick_scene(self, category, fallback_scene):
    pool = self._usable_pool(category, fallback_scene)
    repeat_count = self.tracker.observe(category)
    current_index = self._selected_indexes.get(category, 0)
    changed = False

    if repeat_count > 1 and (repeat_count - 1) % self.differentiation == 0:
      current_index = (current_index + 1) % len(pool)
      self._selected_indexes[category] = current_index
      changed = True
    else:
      self._selected_indexes.setdefault(category, current_index)

    return {
      "scene": pool[current_index],
      "scene_probability": self.scene_probabilities.get(pool[current_index], 1.0),
      "category_repeat_count": repeat_count,
      "scene_changed": changed,
      "scene_pool_size": len(pool),
      "scene_pool_index": current_index,
    }

  def _usable_pool(self, category, fallback_scene):
    raw_pool = self.scene_pools.get(category) or [fallback_scene]
    normalized = [self._scene_name(scene) for scene in raw_pool]
    unique = list(dict.fromkeys(normalized))
    weighted = [
      scene for scene in unique
      if self.scene_probabilities.get(scene, 1.0) > 0
    ]
    weighted.sort(key=lambda scene: self.scene_probabilities.get(scene, 1.0), reverse=True)
    return weighted or [fallback_scene]

  @staticmethod
  def _scene_name(scene):
    if isinstance(scene, dict):
      return scene.get("scene") or scene.get("name")
    return scene
