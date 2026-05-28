import argparse
from pathlib import Path

from .audio_analysis import analyze_audio_file
from .io import write_json


def make_parser():
  parser = argparse.ArgumentParser()
  parser.add_argument("audio_file", type=Path)
  parser.add_argument("--out", type=Path, required=True)
  parser.add_argument("--sr", type=int, default=22050)
  parser.add_argument("--hop-length", type=int, default=512)
  parser.add_argument("--segment-beats", type=int, default=16)
  return parser


def main():
  args = make_parser().parse_args()
  analysis = analyze_audio_file(
    args.audio_file,
    sr=args.sr,
    hop_length=args.hop_length,
    segment_beats=args.segment_beats,
  )
  write_json(args.out, analysis)
  print(
    f"Wrote analysis for {args.audio_file} "
    f"({len(analysis['segments'])} segments) to {args.out}"
  )


if __name__ == "__main__":
  main()
