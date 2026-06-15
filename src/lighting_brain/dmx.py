from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Protocol


DMX_UNIVERSE_SIZE = 512


DEFAULT_DMX_FIXTURES = [
  {
    "id": "fixture_001",
    "label": "RGB 3CH addr 001",
    "address": 1,
    "channels": 3,
    "rgb": {"r": 1, "g": 2, "b": 3},
    "dimmer": None,
    "strobe": None,
    "mode": None,
  },
  {
    "id": "fixture_009",
    "label": "RGB 3CH addr 009",
    "address": 9,
    "channels": 3,
    "rgb": {"r": 1, "g": 2, "b": 3},
    "dimmer": None,
    "strobe": None,
    "mode": None,
  },
  {
    "id": "fixture_017",
    "label": "RGB 6CH addr 017",
    "address": 17,
    "channels": 6,
    "dimmer": 1,
    "rgb": {"r": 2, "g": 3, "b": 4},
    "strobe": 5,
    "mode": 6,
  },
  {
    "id": "fixture_025",
    "label": "RGB 6CH addr 025",
    "address": 25,
    "channels": 6,
    "dimmer": 1,
    "rgb": {"r": 2, "g": 3, "b": 4},
    "strobe": 5,
    "mode": 6,
  },
  {
    "id": "fixture_034",
    "label": "RGB 6CH addr 034",
    "address": 34,
    "channels": 6,
    "dimmer": 1,
    "rgb": {"r": 2, "g": 3, "b": 4},
    "strobe": 5,
    "mode": 6,
    "note": "Physical test: CH33 unused/no effect; use CH34-39.",
  },
  {
    "id": "fixture_041",
    "label": "Dual RGBW 12CH addr 041",
    "address": 41,
    "channels": 12,
    "dimmer": 1,
    "rgb": {"r": 2, "g": 3, "b": 4},
    "white": 5,
    "rgb2": {"r": 6, "g": 7, "b": 8},
    "white2": 9,
    "strobe": 10,
    "mode": 11,
    "speed": 12,
  },
]


def clamp_dmx(value: float | int) -> int:
  return max(0, min(255, int(round(float(value)))))


def normalize_color_value(value: float | int) -> int:
  number = float(value)
  if 0 <= number <= 1:
    number *= 255
  return clamp_dmx(number)


def absolute_channel(fixture: dict[str, Any], local_channel: int | str) -> int:
  return int(fixture["address"]) + int(local_channel) - 1


def fixture_by_id(fixtures: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
  return {fixture["id"]: fixture for fixture in fixtures}


def validate_fixture_map(fixtures: list[dict[str, Any]]) -> list[dict[str, Any]]:
  if not isinstance(fixtures, list) or not fixtures:
    raise ValueError("fixture map must contain a non-empty fixtures list")
  normalized = deepcopy(fixtures)
  for fixture in normalized:
    if "id" not in fixture or "address" not in fixture or "channels" not in fixture:
      raise ValueError("each fixture needs id, address and channels")
    address = int(fixture["address"])
    channels = int(fixture["channels"])
    if address < 1 or address > DMX_UNIVERSE_SIZE:
      raise ValueError(f"fixture {fixture['id']} address out of range: {address}")
    if channels < 1 or address + channels - 1 > DMX_UNIVERSE_SIZE:
      raise ValueError(f"fixture {fixture['id']} channels exceed DMX universe")
  return normalized


@dataclass(frozen=True)
class ChannelChange:
  channel: int
  old: int
  new: int


class DmxUniverse:
  def __init__(self, size: int = DMX_UNIVERSE_SIZE, logger=print):
    self.size = size
    self.channels = [0] * size
    self.logger = logger
    self.last_changes: list[ChannelChange] = []

  def set_channel(self, channel: int, value: float | int) -> bool:
    channel = int(channel)
    if channel < 1 or channel > self.size:
      raise ValueError(f"DMX channel out of range: {channel}")
    value = clamp_dmx(value)
    index = channel - 1
    old = self.channels[index]
    if old == value:
      return False
    self.channels[index] = value
    change = ChannelChange(channel=channel, old=old, new=value)
    self.last_changes.append(change)
    if self.logger:
      self.logger(f"[dmx] CH{channel:03d} {old} -> {value}")
    return True

  def set_channels(self, mapping: dict[int, float | int]) -> list[ChannelChange]:
    self.last_changes = []
    for channel in sorted(mapping):
      self.set_channel(channel, mapping[channel])
    return list(self.last_changes)

  def blackout(self) -> list[ChannelChange]:
    return self.set_channels({channel: 0 for channel in range(1, self.size + 1)})

  def serialize(self, include_zero: bool = False) -> dict[str, Any]:
    values = {
      str(index + 1): value
      for index, value in enumerate(self.channels)
      if include_zero or value != 0
    }
    return {
      "universe": 0,
      "size": self.size,
      "channels": values,
      "changed": [
        {"channel": change.channel, "old": change.old, "new": change.new}
        for change in self.last_changes
      ],
    }


class OutputDriver(Protocol):
  def set_channel(self, channel: int, value: float | int) -> Any:
    ...

  def set_fixture_color(self, fixture_id: str, r: float, g: float, b: float, intensity: float = 1.0) -> Any:
    ...

  def set_scene(self, scene: dict[str, Any]) -> Any:
    ...

  def blackout(self) -> Any:
    ...


class MockDmxDriver:
  def __init__(self, fixtures: list[dict[str, Any]] | None = None, logger=print):
    self.fixtures = validate_fixture_map(fixtures or DEFAULT_DMX_FIXTURES)
    self.fixture_by_id = fixture_by_id(self.fixtures)
    self.universe = DmxUniverse(logger=logger)

  def set_channel(self, channel: int, value: float | int) -> list[ChannelChange]:
    return self.universe.set_channels({int(channel): value})

  def set_fixture_color(
    self,
    fixture_id: str,
    r: float,
    g: float,
    b: float,
    intensity: float = 1.0,
  ) -> list[ChannelChange]:
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    mapping = fixture_rgb_mapping(fixture, r, g, b, intensity)
    return self.universe.set_channels(mapping)

  def setFixtureColor(self, fixture_id: str, color: dict[str, Any]) -> list[ChannelChange]:
    return self.set_fixture_color(
      fixture_id,
      color.get("r", 0),
      color.get("g", 0),
      color.get("b", 0),
      color.get("intensity", 1.0),
    )

  def blackout(self) -> list[ChannelChange]:
    return self.universe.blackout()

  def set_scene(self, scene: dict[str, Any]) -> list[ChannelChange]:
    changes: list[ChannelChange] = []
    fixtures = scene.get("fixtures", scene)
    for fixture_id, command in fixtures.items():
      if "raw" in command or "values" in command:
        changes.extend(self.set_fixture_raw(fixture_id, command.get("raw", command.get("values", []))))
      else:
        changes.extend(self.set_fixture_color(
          fixture_id,
          command.get("r", 0),
          command.get("g", 0),
          command.get("b", 0),
          command.get("intensity", 1.0),
        ))
    self.universe.last_changes = changes
    return changes

  def set_fixture_raw(self, fixture_id: str, values: list[float | int]) -> list[ChannelChange]:
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    mapping = {
      absolute_channel(fixture, local): value
      for local, value in enumerate(values[: int(fixture["channels"])], start=1)
    }
    return self.universe.set_channels(mapping)

  def serialize(self, include_zero: bool = False) -> dict[str, Any]:
    return self.universe.serialize(include_zero=include_zero)


class QlcOutputDriver:
  def __init__(self, qlc_client):
    self.qlc_client = qlc_client

  def set_channel(self, channel: int, value: float | int):
    return self.qlc_client.set_channel(channel, value)

  def set_fixture_color(self, fixture_id: str, r: float, g: float, b: float, intensity: float = 1.0):
    return self.qlc_client.set_fixture_rgb(fixture_id, r, g, b, intensity)

  def set_scene(self, scene: dict[str, Any]):
    return self.qlc_client.set_scene(scene)

  def blackout(self):
    return self.qlc_client.blackout()


class InternalFtdiDmxDriver(MockDmxDriver):
  def __init__(self, fixtures: list[dict[str, Any]] | None = None, logger=print):
    super().__init__(fixtures=fixtures, logger=logger)
    self.connected = False

  def connect(self):
    raise NotImplementedError("FTDI USB-DMX hardware access is intentionally not implemented yet")

  def flush(self):
    raise NotImplementedError("DMX frame flush will be implemented with a vetted FTDI dependency")


def fixture_rgb_mapping(
  fixture: dict[str, Any],
  r: float,
  g: float,
  b: float,
  intensity: float = 1.0,
) -> dict[int, int]:
  intensity = max(0.0, min(1.0, float(intensity)))
  red = clamp_dmx(normalize_color_value(r) * intensity)
  green = clamp_dmx(normalize_color_value(g) * intensity)
  blue = clamp_dmx(normalize_color_value(b) * intensity)
  mapping: dict[int, int] = {}
  rgb = fixture.get("rgb") or {}
  if rgb.get("r") is not None:
    mapping[absolute_channel(fixture, rgb["r"])] = red
  if rgb.get("g") is not None:
    mapping[absolute_channel(fixture, rgb["g"])] = green
  if rgb.get("b") is not None:
    mapping[absolute_channel(fixture, rgb["b"])] = blue
  rgb2 = fixture.get("rgb2") or {}
  if rgb2.get("r") is not None:
    mapping[absolute_channel(fixture, rgb2["r"])] = red
  if rgb2.get("g") is not None:
    mapping[absolute_channel(fixture, rgb2["g"])] = green
  if rgb2.get("b") is not None:
    mapping[absolute_channel(fixture, rgb2["b"])] = blue
  for white_channel in ("white", "white2"):
    local = fixture.get(white_channel)
    if local is not None:
      mapping[absolute_channel(fixture, local)] = 0
  dimmer = fixture.get("dimmer")
  if dimmer is not None:
    mapping[absolute_channel(fixture, dimmer)] = clamp_dmx(255 * intensity)
  for safe_channel in ("strobe", "mode", "speed"):
    local = fixture.get(safe_channel)
    if local is not None:
      mapping[absolute_channel(fixture, local)] = 0
  return mapping
