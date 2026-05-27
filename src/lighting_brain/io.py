import json
from pathlib import Path


def load_json(path):
  with Path(path).open("r", encoding="utf-8") as f:
    return json.load(f)


def write_json(path, data):
  out_path = Path(path)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open("w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
