from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import json
from pathlib import Path
import time
from typing import Any, Protocol


DMX_UNIVERSE_SIZE = 512
DEFAULT_SETUP_LIGHT_CONFIG_PATH = Path("configs/fixture_map.json")
DEFAULT_SETUP_LIGHT_LIBRARY_DIR = Path("configs/light-setups")
DEFAULT_SETUP_LIGHT_SELECTION_PATH = Path("configs/light_setup_selection.json")


SIX_LIGHT_TEST_PRESET = [
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


def factory_default_fixture_map() -> list[dict[str, Any]]:
  return deepcopy(SIX_LIGHT_TEST_PRESET)


def setup_light_payload_to_fixture_map(payload: dict[str, Any]) -> list[dict[str, Any]]:
  if isinstance(payload.get("qlcFixtures"), list) and payload["qlcFixtures"]:
    return deepcopy(payload["qlcFixtures"])
  fixtures = payload.get("fixtures")
  if not isinstance(fixtures, list) or not fixtures:
    raise ValueError("Setup Light payload must contain qlcFixtures or fixtures")
  converted = []
  for fixture in fixtures:
    converted_fixture = {
      "id": fixture["id"],
      "label": fixture.get("label", fixture["id"]),
      "address": fixture.get("startChannel", fixture.get("address")),
      "channels": fixture.get("channelCount", fixture.get("channels")),
      "map": {},
      "rgb": {},
    }
    role_counts: dict[str, int] = {}
    for channel in sorted(fixture.get("channels", []), key=lambda item: int(item.get("local", 0))):
      role = channel.get("role")
      local = int(channel.get("local", 0))
      if not role or role in {"unknown", "off"} or local <= 0:
        continue
      role_counts[role] = role_counts.get(role, 0) + 1
      occurrence = role_counts[role]
      if role in {"red", "green", "blue"}:
        key = {"red": "r", "green": "g", "blue": "b"}[role]
        if occurrence == 1:
          converted_fixture["rgb"][key] = local
          converted_fixture["map"][key] = local
        elif occurrence == 2:
          converted_fixture.setdefault("rgb2", {})[key] = local
          converted_fixture["map"][f"{key}2"] = local
      elif role == "white":
        key = "white" if occurrence == 1 else "white2"
        converted_fixture[key] = local
        converted_fixture["map"][key] = local
      else:
        converted_fixture[role] = local
        converted_fixture["map"][role] = local
    if not converted_fixture["rgb"]:
      converted_fixture.pop("rgb")
    converted.append(converted_fixture)
  return converted


def load_fixture_map(path: str | Path | None = None, fallback_to_preset: bool = True) -> list[dict[str, Any]]:
  if path is None:
    path = DEFAULT_SETUP_LIGHT_CONFIG_PATH
  path = Path(path)
  if not path.exists():
    if fallback_to_preset:
      return factory_default_fixture_map()
    raise FileNotFoundError(path)
  with path.open("r", encoding="utf-8") as handle:
    payload = json.load(handle)
  if isinstance(payload, list):
    return deepcopy(payload)
  return setup_light_payload_to_fixture_map(payload)


def selected_fixture_setup_path(
  selection_path: str | Path = DEFAULT_SETUP_LIGHT_SELECTION_PATH,
) -> Path | None:
  selection_path = Path(selection_path)
  if not selection_path.exists():
    return None
  with selection_path.open("r", encoding="utf-8") as handle:
    payload = json.load(handle)
  selected = payload.get("selectedSetupPath")
  return Path(selected).expanduser() if selected else None


def load_selected_fixture_map(
  selection_path: str | Path = DEFAULT_SETUP_LIGHT_SELECTION_PATH,
  fallback_to_preset: bool = True,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
  setup_path = selected_fixture_setup_path(selection_path)
  if setup_path and setup_path.exists():
    fixtures = load_fixture_map(setup_path, fallback_to_preset=False)
    return fixtures, {
      "source": "selected_setup",
      "path": str(setup_path),
      "fallback": False,
    }
  if fallback_to_preset:
    return factory_default_fixture_map(), {
      "source": "built_in_six_light_test_preset",
      "path": None,
      "fallback": True,
      "reason": "No selected setup file found",
    }
  raise FileNotFoundError(setup_path or selection_path)


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


@dataclass(frozen=True)
class DmxOutputEvent:
  timestamp: float
  output_mode: str
  driver: str
  source: str
  emitted: bool
  changes: tuple[ChannelChange, ...]

  def serialize(self) -> dict[str, Any]:
    return {
      "timestamp": self.timestamp,
      "outputMode": self.output_mode,
      "driver": self.driver,
      "source": self.source,
      "emitted": self.emitted,
      "changedChannels": [
        {"channel": change.channel, "old": change.old, "new": change.new}
        for change in self.changes
      ],
    }


def fixture_channel_labels(fixtures: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
  labels: dict[int, dict[str, Any]] = {}
  role_names = {
    "dimmer": "DIMMER",
    "white": "W1",
    "white2": "W2",
    "strobe": "STROBE",
    "mode": "MODE",
    "speed": "SPEED",
  }
  for fixture in validate_fixture_map(fixtures):
    fixture_id = fixture["id"]
    fixture_label = fixture.get("label", fixture_id)
    for local in range(1, int(fixture["channels"]) + 1):
      absolute = absolute_channel(fixture, local)
      labels[absolute] = {
        "fixtureId": fixture_id,
        "fixtureLabel": fixture_label,
        "localChannel": local,
        "role": "unused",
        "label": f"{fixture_label} CH{local}",
        "controllable": True,
      }
    for color_key, role_label in (("r", "R"), ("g", "G"), ("b", "B")):
      local = (fixture.get("rgb") or {}).get(color_key)
      if local is not None:
        labels[absolute_channel(fixture, local)].update({"role": role_label, "label": f"{fixture_label} {role_label}"})
    for color_key, role_label in (("r", "R2"), ("g", "G2"), ("b", "B2")):
      local = (fixture.get("rgb2") or {}).get(color_key)
      if local is not None:
        labels[absolute_channel(fixture, local)].update({"role": role_label, "label": f"{fixture_label} {role_label}"})
    for key, role_label in role_names.items():
      local = fixture.get(key)
      if local is not None:
        labels[absolute_channel(fixture, local)].update({"role": role_label, "label": f"{fixture_label} {role_label}"})
  return labels


def fixture_map_diagnostics(fixtures: list[dict[str, Any]]) -> dict[str, Any]:
  diagnostics = {
    "outOfRange": [],
    "overlaps": [],
    "unusedChannels": [],
    "mappedChannels": [],
  }
  seen: dict[int, str] = {}
  for fixture in validate_fixture_map(fixtures):
    fixture_id = fixture["id"]
    for local in range(1, int(fixture["channels"]) + 1):
      absolute = absolute_channel(fixture, local)
      diagnostics["mappedChannels"].append(absolute)
      if absolute < 1 or absolute > DMX_UNIVERSE_SIZE:
        diagnostics["outOfRange"].append({"fixtureId": fixture_id, "channel": absolute})
      if absolute in seen:
        diagnostics["overlaps"].append({"channel": absolute, "fixtureIds": [seen[absolute], fixture_id]})
      seen[absolute] = fixture_id
  labels = fixture_channel_labels(fixtures)
  diagnostics["unusedChannels"] = sorted(channel for channel, label in labels.items() if label.get("role") == "unused")
  diagnostics["mappedChannels"] = sorted(set(diagnostics["mappedChannels"]))
  return diagnostics


class DmxOutputMirror:
  def __init__(
    self,
    fixtures: list[dict[str, Any]] | None = None,
    output_mode: str = "mock",
    driver_name: str = "MockDmxDriver",
    logger=print,
  ):
    self.driver = MockDmxDriver(fixtures=fixtures, logger=logger)
    self.output_mode = output_mode
    self.driver_name = driver_name
    self.manual_armed = False
    self.events: list[DmxOutputEvent] = []

  @property
  def fixtures(self) -> list[dict[str, Any]]:
    return self.driver.fixtures

  def set_manual_armed(self, armed: bool) -> dict[str, Any]:
    self.manual_armed = bool(armed)
    return {"manualArmed": self.manual_armed}

  def set_channel(self, channel: int, value: float | int, source: str = "dmx_output", emitted: bool = True) -> list[ChannelChange]:
    changes = self.driver.set_channel(channel, value)
    self._record_event(source=source, emitted=emitted, changes=changes)
    return changes

  def manual_set_channel(self, channel: int, value: float | int) -> dict[str, Any]:
    if not self.manual_armed:
      return {"ok": False, "reason": "manual_test_not_armed", "changes": []}
    changes = self.set_channel(channel, value, source="manual_dmx_dashboard", emitted=True)
    return {"ok": True, "changes": [{"channel": change.channel, "old": change.old, "new": change.new} for change in changes]}

  def blackout(self, source: str = "dmx_output_blackout", emitted: bool = True) -> list[ChannelChange]:
    changes = self.driver.blackout()
    self._record_event(source=source, emitted=emitted, changes=changes)
    return changes

  def snapshot(self) -> dict[str, Any]:
    serialized = self.driver.serialize(include_zero=True)
    return {
      "universe": serialized["universe"],
      "size": serialized["size"],
      "outputMode": self.output_mode,
      "driver": self.driver_name,
      "manualArmed": self.manual_armed,
      "channels": serialized["channels"],
      "labels": {str(channel): value for channel, value in fixture_channel_labels(self.fixtures).items()},
      "diagnostics": fixture_map_diagnostics(self.fixtures),
      "events": [event.serialize() for event in self.events[-50:]],
    }

  def _record_event(self, source: str, emitted: bool, changes: list[ChannelChange]) -> None:
    self.events.append(DmxOutputEvent(
      timestamp=time.time(),
      output_mode=self.output_mode,
      driver=self.driver_name,
      source=source,
      emitted=emitted,
      changes=tuple(changes),
    ))
    self.events = self.events[-50:]


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

  def setChannel(self, channel: int, value: float | int) -> bool:
    return self.set_channel(channel, value)

  def get_channel(self, channel: int) -> int:
    channel = int(channel)
    if channel < 1 or channel > self.size:
      raise ValueError(f"DMX channel out of range: {channel}")
    return self.channels[channel - 1]

  def getChannel(self, channel: int) -> int:
    return self.get_channel(channel)

  def set_channels(self, mapping: dict[int, float | int]) -> list[ChannelChange]:
    self.last_changes = []
    for channel in sorted(mapping):
      self.set_channel(channel, mapping[channel])
    return list(self.last_changes)

  def blackout(self) -> list[ChannelChange]:
    return self.set_channels({channel: 0 for channel in range(1, self.size + 1)})

  def snapshot(self) -> tuple[int, ...]:
    return tuple(self.channels)

  def get_changed_channels(self, previous_snapshot) -> list[ChannelChange]:
    previous = list(previous_snapshot)
    if len(previous) != self.size:
      raise ValueError(f"snapshot must contain {self.size} channels")
    return [
      ChannelChange(channel=index + 1, old=clamp_dmx(previous[index]), new=value)
      for index, value in enumerate(self.channels)
      if clamp_dmx(previous[index]) != value
    ]

  def getChangedChannels(self, previous_snapshot) -> list[ChannelChange]:
    return self.get_changed_channels(previous_snapshot)

  def active_channel_table(self) -> str:
    active = [
      f"CH{index + 1:03d}={value:03d}"
      for index, value in enumerate(self.channels)
      if value != 0
    ]
    return " ".join(active) if active else "(blackout)"

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

  def set_fixture_blackout(self, fixture_id: str) -> Any:
    ...

  def set_fixture_strobe(self, fixture_id: str, value: float | int) -> Any:
    ...

  def apply_simple_light_state(self, fixture_id: str, state: dict[str, Any]) -> Any:
    ...

  def set_scene(self, scene: dict[str, Any]) -> Any:
    ...

  def blackout(self) -> Any:
    ...


class MockDmxDriver:
  def __init__(self, fixtures: list[dict[str, Any]] | None = None, logger=print):
    self.fixtures = validate_fixture_map(fixtures if fixtures is not None else factory_default_fixture_map())
    self.fixture_by_id = fixture_by_id(self.fixtures)
    self.universe = DmxUniverse(logger=logger)

  def set_channel(self, channel: int, value: float | int) -> list[ChannelChange]:
    return self.universe.set_channels({int(channel): value})

  def setChannel(self, channel: int, value: float | int) -> list[ChannelChange]:
    return self.set_channel(channel, value)

  def get_channel(self, channel: int) -> int:
    return self.universe.get_channel(channel)

  def getChannel(self, channel: int) -> int:
    return self.get_channel(channel)

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

  def setFixtureRgb(
    self,
    fixture_id: str,
    r: float,
    g: float,
    b: float,
    intensity: float = 1.0,
  ) -> list[ChannelChange]:
    return self.set_fixture_color(fixture_id, r, g, b, intensity)

  def setFixtureColor(self, fixture_id: str, color: dict[str, Any]) -> list[ChannelChange]:
    return self.set_fixture_color(
      fixture_id,
      color.get("r", 0),
      color.get("g", 0),
      color.get("b", 0),
      color.get("intensity", 1.0),
    )

  def set_fixture_dual_rgb(
    self,
    fixture_id: str,
    zone1: tuple[float, float, float] | list[float],
    zone2: tuple[float, float, float] | list[float],
    intensity: float = 1.0,
  ) -> list[ChannelChange]:
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    mapping = fixture_dual_rgb_mapping(fixture, zone1, zone2, intensity)
    return self.universe.set_channels(mapping)

  def setFixtureDualRgb(
    self,
    fixture_id: str,
    zone1: tuple[float, float, float] | list[float],
    zone2: tuple[float, float, float] | list[float],
    intensity: float = 1.0,
  ) -> list[ChannelChange]:
    return self.set_fixture_dual_rgb(fixture_id, zone1, zone2, intensity)

  def set_fixture_blackout(self, fixture_id: str) -> list[ChannelChange]:
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    mapping = {
      absolute_channel(fixture, local): 0
      for local in range(1, int(fixture["channels"]) + 1)
    }
    return self.universe.set_channels(mapping)

  def setFixtureBlackout(self, fixture_id: str) -> list[ChannelChange]:
    return self.set_fixture_blackout(fixture_id)

  def set_fixture_strobe(self, fixture_id: str, value: float | int) -> list[ChannelChange]:
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    strobe = fixture.get("strobe")
    if strobe is None:
      return []
    return self.universe.set_channels({absolute_channel(fixture, strobe): clamp_dmx(value)})

  def setFixtureStrobe(self, fixture_id: str, value: float | int) -> list[ChannelChange]:
    return self.set_fixture_strobe(fixture_id, value)

  def apply_simple_light_state(self, fixture_id: str, state: dict[str, Any]) -> list[ChannelChange]:
    if state.get("blackout") or state.get("colorMode") == "off" or state.get("phaseMode") == "off":
      return self.set_fixture_blackout(fixture_id)
    rgb = state.get("rgb") or state.get("color") or [state.get("r", 0), state.get("g", 0), state.get("b", 0)]
    intensity = state.get("intensity", state.get("effectiveIntensity", 1.0))
    if isinstance(rgb, dict):
      return self.set_fixture_color(fixture_id, rgb.get("r", 0), rgb.get("g", 0), rgb.get("b", 0), intensity)
    return self.set_fixture_color(fixture_id, rgb[0], rgb[1], rgb[2], intensity)

  def applySimpleLightState(self, fixture_id: str, state: dict[str, Any]) -> list[ChannelChange]:
    return self.apply_simple_light_state(fixture_id, state)

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

  def snapshot(self) -> tuple[int, ...]:
    return self.universe.snapshot()

  def get_changed_channels(self, previous_snapshot) -> list[ChannelChange]:
    return self.universe.get_changed_channels(previous_snapshot)

  def getChangedChannels(self, previous_snapshot) -> list[ChannelChange]:
    return self.get_changed_channels(previous_snapshot)

  def active_channel_table(self) -> str:
    return self.universe.active_channel_table()

  def print_active_channels(self):
    print(self.active_channel_table())

  def run_mock_chase(self) -> list[dict[str, Any]]:
    steps = []
    self.blackout()
    steps.append({"step": "blackout", "channels": self.serialize()["channels"]})
    for fixture_id, color in [
      ("fixture_001", (255, 0, 0)),
      ("fixture_009", (0, 255, 0)),
      ("fixture_017", (0, 0, 255)),
    ]:
      self.blackout()
      self.set_fixture_color(fixture_id, *color)
      steps.append({"step": fixture_id, "channels": self.serialize()["channels"]})
    self.blackout()
    steps.append({"step": "blackout_end", "channels": self.serialize()["channels"]})
    return steps


class QlcOutputDriver:
  def __init__(self, qlc_client):
    self.qlc_client = qlc_client

  def set_channel(self, channel: int, value: float | int):
    return self.qlc_client.set_channel(channel, value)

  def set_fixture_color(self, fixture_id: str, r: float, g: float, b: float, intensity: float = 1.0):
    return self.qlc_client.set_fixture_rgb(fixture_id, r, g, b, intensity)

  def set_fixture_blackout(self, fixture_id: str):
    fixture = self.qlc_client.fixture(fixture_id)
    return self.qlc_client.set_fixture_raw(fixture_id, [0] * int(fixture["channels"]))

  def set_fixture_strobe(self, fixture_id: str, value: float | int):
    return self.qlc_client.set_fixture_channel(fixture_id, "strobe", value)

  def apply_simple_light_state(self, fixture_id: str, state: dict[str, Any]):
    if state.get("blackout") or state.get("colorMode") == "off" or state.get("phaseMode") == "off":
      return self.set_fixture_blackout(fixture_id)
    rgb = state.get("rgb") or [state.get("r", 0), state.get("g", 0), state.get("b", 0)]
    return self.set_fixture_color(fixture_id, rgb[0], rgb[1], rgb[2], state.get("intensity", 1.0))

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


def fixture_dual_rgb_mapping(
  fixture: dict[str, Any],
  zone1: tuple[float, float, float] | list[float],
  zone2: tuple[float, float, float] | list[float],
  intensity: float = 1.0,
) -> dict[int, int]:
  if not fixture.get("rgb2"):
    return fixture_rgb_mapping(fixture, zone1[0], zone1[1], zone1[2], intensity)
  intensity = max(0.0, min(1.0, float(intensity)))
  mapping: dict[int, int] = {}
  for rgb_map, values in ((fixture.get("rgb") or {}, zone1), (fixture.get("rgb2") or {}, zone2)):
    red = clamp_dmx(normalize_color_value(values[0]) * intensity)
    green = clamp_dmx(normalize_color_value(values[1]) * intensity)
    blue = clamp_dmx(normalize_color_value(values[2]) * intensity)
    if rgb_map.get("r") is not None:
      mapping[absolute_channel(fixture, rgb_map["r"])] = red
    if rgb_map.get("g") is not None:
      mapping[absolute_channel(fixture, rgb_map["g"])] = green
    if rgb_map.get("b") is not None:
      mapping[absolute_channel(fixture, rgb_map["b"])] = blue
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
