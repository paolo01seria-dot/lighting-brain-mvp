#!/usr/bin/env python3
from __future__ import annotations

from lighting_brain.dmx import (
  DmxOutputMirror,
  fixture_channel_labels,
  fixture_map_diagnostics,
  load_selected_fixture_map,
)


def main() -> int:
  fixtures, setup_info = load_selected_fixture_map()
  labels = fixture_channel_labels(fixtures)
  diagnostics = fixture_map_diagnostics(fixtures)
  mirror = DmxOutputMirror(fixtures=fixtures, logger=None)

  mirror.set_manual_armed(True)
  for channel in diagnostics["mappedChannels"][:6]:
    mirror.manual_set_channel(channel, 255 if channel % 2 else 180)
  snapshot = mirror.snapshot()

  print("DMX output readiness check")
  print(f"setup source: {setup_info['source']}")
  print(f"setup path: {setup_info.get('path') or '-'}")
  if setup_info.get("fallback"):
    print(f"setup fallback: {setup_info.get('reason', 'using built-in preset')}")
  print(f"fixtures: {len(fixtures)}")
  print(f"mapped channels: {len(diagnostics['mappedChannels'])}")
  print(f"out of range: {len(diagnostics['outOfRange'])}")
  print(f"overlaps: {len(diagnostics['overlaps'])}")
  sample_labels = " ".join(
    f"CH{channel:03d}={labels[channel]['label']}"
    for channel in diagnostics["mappedChannels"][:3]
    if channel in labels
  )
  print(f"sample labels: {sample_labels or '-'}")
  print("active channels:")
  for channel, value in snapshot["channels"].items():
    if value:
      print(f"  CH{int(channel):03d}={value}")

  mirror.blackout(source="readiness_check_blackout")
  active_after_blackout = [
    channel for channel, value in mirror.snapshot()["channels"].items()
    if value
  ]
  print(f"blackout clears active channels: {not active_after_blackout}")

  if diagnostics["outOfRange"] or diagnostics["overlaps"] or active_after_blackout:
    return 1
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
