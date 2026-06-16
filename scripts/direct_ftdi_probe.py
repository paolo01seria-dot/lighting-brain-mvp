#!/usr/bin/env python3
from __future__ import annotations

import json

from lighting_brain.direct_ftdi import DirectFtdiProbe


def main() -> int:
  capability = DirectFtdiProbe().probe_macos_system_profiler()
  print(json.dumps(capability.serialize(), indent=2, sort_keys=True))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
