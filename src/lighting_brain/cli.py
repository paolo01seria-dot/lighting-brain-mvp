import argparse
from pathlib import Path

from .adapters import render_adapter_events
from .genres import load_genre_profile
from .io import load_json, write_json
from .timeline import build_timeline


def make_parser():
  parser = argparse.ArgumentParser()
  parser.add_argument("analysis_json", type=Path)
  parser.add_argument("--scene-map", type=Path, required=True)
  parser.add_argument("--genre-profiles", type=Path, default=None)
  parser.add_argument("--genre", type=str, default=None)
  parser.add_argument("--adapter", type=str, default="debug")
  parser.add_argument("--differentiation", type=int, default=2)
  parser.add_argument("--scene-freshness", type=int, default=None)
  parser.add_argument("--out", type=Path, required=True)
  return parser


def main():
  args = make_parser().parse_args()
  analysis = load_json(args.analysis_json)
  scene_map = load_json(args.scene_map)
  genre_profile = None

  if args.genre:
    if not args.genre_profiles:
      raise ValueError("--genre-profiles is required when --genre is provided")
    genre_profile = load_genre_profile(args.genre_profiles, args.genre)

  timeline = build_timeline(
    analysis,
    scene_map,
    genre_profile=genre_profile,
    differentiation=args.scene_freshness or args.differentiation,
  )
  adapter_events = render_adapter_events(timeline, args.adapter)
  output = {
    "timeline": timeline,
    "adapter_output": adapter_events
  }

  write_json(args.out, output)
  print(
    f"Wrote {len(timeline['events'])} events using adapter "
    f"'{args.adapter}' to {args.out}"
  )


if __name__ == "__main__":
  main()
