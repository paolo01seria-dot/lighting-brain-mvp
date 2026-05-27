from .io import load_json


def load_genre_profile(path, genre):
  profiles = load_json(path)
  if genre not in profiles:
    available = ", ".join(sorted(profiles))
    raise ValueError(f"Unknown genre '{genre}'. Available genres: {available}")

  profile = dict(profiles[genre])
  profile["name"] = genre
  return profile
