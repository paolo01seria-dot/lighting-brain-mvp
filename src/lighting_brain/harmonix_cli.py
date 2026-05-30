import argparse
from pathlib import Path

from .harmonix import load_harmonix_jams
from .io import write_json


def make_parser():
  parser = argparse.ArgumentParser()
  parser.add_argument("jams_file", type=Path)
  parser.add_argument("--audio-path", type=Path, default=None)
  parser.add_argument("--out", type=Path, required=True)
  parser.add_argument("--segment-beats", type=int, default=16)
  return parser


def main():
  args = make_parser().parse_args()
  analysis = load_harmonix_jams(
    args.jams_file,
    audio_path=args.audio_path,
    segment_beats=args.segment_beats,
  )
  write_json(args.out, analysis)
  print(
    f"Wrote Harmonix analysis for {args.jams_file} "
    f"({len(analysis['segments'])} segments) to {args.out}"
  )


if __name__ == "__main__":
  main()
