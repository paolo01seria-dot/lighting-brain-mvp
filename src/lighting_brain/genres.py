from .io import load_json

DEFAULT_SCENE_PROBABILITY = 0.9


def load_genre_profile(path, genre):
  profiles = load_json(path)
  if genre not in profiles:
    available = ", ".join(sorted(profiles))
    raise ValueError(f"Unknown genre '{genre}'. Available genres: {available}")

  profile = dict(profiles[genre])
  profile["name"] = genre
  profile["sample_category_scene_pools"] = shared_scene_pools_for_genre(profiles, genre)
  profile["scene_probabilities"] = scene_probabilities_for_genre(profiles, genre)
  return profile


def shared_scene_pools_for_genre(profiles, selected_genre):
  """Build one common scene pool while keeping the selected genre first."""
  ordered_genres = [selected_genre] + [name for name in profiles if name != selected_genre]
  pools = {}
  for genre in ordered_genres:
    for category, scenes in profiles[genre].get("sample_category_scene_pools", {}).items():
      category_pool = pools.setdefault(category, [])
      for scene in scenes:
        if scene not in category_pool:
          category_pool.append(scene)
  return pools


def scene_probabilities_for_genre(profiles, selected_genre):
  """Return per-scene probabilities for the selected genre.

  The MVP default is intentionally broad: every known scene starts at 0.9 so the
  trainer can later lower unsuitable genre/scene pairings toward 0.
  """
  probabilities = {}
  for scenes in shared_scene_pools_for_genre(profiles, selected_genre).values():
    for scene in scenes:
      probabilities.setdefault(scene, DEFAULT_SCENE_PROBABILITY)
  probabilities.update(profiles[selected_genre].get("scene_probabilities", {}))
  return probabilities
