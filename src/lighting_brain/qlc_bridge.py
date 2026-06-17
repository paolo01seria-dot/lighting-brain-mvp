import argparse
import base64
import hashlib
import json
import os
import socket
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib import error, request
from urllib.parse import urlparse


DEFAULT_FIXTURES = [
  {
    "id": "fixture_001",
    "label": "RGB 3CH addr 001",
    "address": 1,
    "channels": 3,
    "map": {"ch1": 1, "ch2": 2, "ch3": 3},
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
    "map": {"ch1": 1, "ch2": 2, "ch3": 3},
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
    "map": {"dimmer": 1, "r": 2, "g": 3, "b": 4, "strobe": 5, "mode": 6},
    "rgb": {"r": 2, "g": 3, "b": 4},
    "dimmer": 1,
    "strobe": 5,
    "mode": 6,
  },
  {
    "id": "fixture_025",
    "label": "RGB 6CH addr 025",
    "address": 25,
    "channels": 6,
    "map": {"dimmer": 1, "r": 2, "g": 3, "b": 4, "strobe": 5, "mode": 6},
    "rgb": {"r": 2, "g": 3, "b": 4},
    "dimmer": 1,
    "strobe": 5,
    "mode": 6,
  },
  {
    "id": "fixture_034",
    "label": "RGB 6CH addr 034",
    "address": 34,
    "channels": 6,
    "map": {"dimmer": 1, "r": 2, "g": 3, "b": 4, "strobe": 5, "mode": 6},
    "rgb": {"r": 2, "g": 3, "b": 4},
    "dimmer": 1,
    "strobe": 5,
    "mode": 6,
    "note": "Physical test: CH33 unused/no effect; use CH34-39.",
  },
  {
    "id": "fixture_041",
    "label": "Dual RGBW 12CH addr 041",
    "address": 41,
    "channels": 12,
    "map": {
      "dimmer": 1,
      "r": 2,
      "g": 3,
      "b": 4,
      "white": 5,
      "r2": 6,
      "g2": 7,
      "b2": 8,
      "white2": 9,
      "strobe": 10,
      "mode": 11,
      "speed": 12,
    },
    "rgb": {"r": 2, "g": 3, "b": 4},
    "rgb2": {"r": 6, "g": 7, "b": 8},
    "white": 5,
    "white2": 9,
    "dimmer": 1,
    "strobe": 10,
    "mode": 11,
    "speed": 12,
  },
]

DEFAULT_ENDPOINT_TEMPLATES = [
  "/api/simpledesk/{address}/{value}",
  "/api/channel/{address}/{value}",
  "/api/setchannel?channel={address}&value={value}",
]


def clamp_dmx(value):
  return max(0, min(255, int(round(float(value)))))


def normalize_color_value(value):
  number = float(value)
  if 0 <= number <= 1:
    number *= 255
  return clamp_dmx(number)


def load_fixtures(path=None):
  if not path:
    return DEFAULT_FIXTURES
  with open(path, "r", encoding="utf-8") as handle:
    data = json.load(handle)
  if isinstance(data, list):
    return normalize_fixture_map(data)
  if not isinstance(data, dict):
    raise ValueError("fixture map must be a list or object")

  qlc_fixtures = data.get("qlcFixtures")
  if isinstance(qlc_fixtures, list) and qlc_fixtures:
    return normalize_fixture_map(qlc_fixtures)

  fixtures = data.get("fixtures")
  if isinstance(fixtures, list) and fixtures:
    if fixtures_are_normalized(fixtures):
      return normalize_fixture_map(fixtures)
    return normalize_fixture_map([fixture_from_setup_light_payload(fixture) for fixture in fixtures])

  raise ValueError("fixture map payload must contain qlcFixtures or fixtures")


def fixtures_are_normalized(fixtures):
  return all(
    isinstance(fixture, dict)
    and fixture.get("id")
    and fixture.get("address") is not None
    and fixture.get("channels") is not None
    and not isinstance(fixture.get("channels"), list)
    for fixture in fixtures
  )


def fixture_from_setup_light_payload(fixture):
  converted = {
    "id": fixture["id"],
    "label": fixture.get("label", fixture["id"]),
    "address": fixture.get("startChannel", fixture.get("address")),
    "channels": fixture.get("channelCount", fixture.get("channels")),
    "map": {},
    "rgb": {},
  }
  role_counts = {}
  channels = fixture.get("channels", [])
  if not isinstance(channels, list):
    raise ValueError("setup-light fixture channels must be a list when address/channels are not normalized")
  for channel in sorted(channels, key=lambda item: int(item.get("local", 0))):
    role = channel.get("role")
    local = int(channel.get("local", 0))
    if not role or role in {"unknown", "off"} or local <= 0:
      continue
    role_counts[role] = role_counts.get(role, 0) + 1
    occurrence = role_counts[role]
    if role in {"red", "green", "blue"}:
      key = {"red": "r", "green": "g", "blue": "b"}[role]
      if occurrence == 1:
        converted["rgb"][key] = local
        converted["map"][key] = local
      elif occurrence == 2:
        converted.setdefault("rgb2", {})[key] = local
        converted["map"][f"{key}2"] = local
    elif role == "white":
      key = "white" if occurrence == 1 else "white2"
      converted[key] = local
      converted["map"][key] = local
    else:
      converted[role] = local
      converted["map"][role] = local
  if not converted["rgb"]:
    converted.pop("rgb")
  return converted


def normalize_fixture_map(fixtures):
  normalized = []
  for fixture in fixtures:
    normalized.append({
      **fixture,
      "address": int(fixture["address"]),
      "channels": int(fixture["channels"]),
      "rgb": dict(fixture["rgb"]) if fixture.get("rgb") else fixture.get("rgb"),
      "rgb2": dict(fixture["rgb2"]) if fixture.get("rgb2") else fixture.get("rgb2"),
      "map": dict(fixture["map"]) if fixture.get("map") else fixture.get("map"),
    })
  return normalized


class QLCWebClient:
  def __init__(
    self,
    host="127.0.0.1",
    port=9999,
    fixtures=None,
    endpoint_templates=None,
    dry_run=False,
    timeout=2.0,
  ):
    self.host = host
    self.port = port
    self.fixtures = fixtures or DEFAULT_FIXTURES
    self.endpoint_templates = endpoint_templates or DEFAULT_ENDPOINT_TEMPLATES
    self.dry_run = dry_run
    self.timeout = timeout
    self.fixture_by_id = {fixture["id"]: fixture for fixture in self.fixtures}
    self.state_lock = Lock()
    self.channels = [0] * 512
    self.events = []
    self.fixture_map_source = "qlc_bridge_default"
    self.bridge_status = "dry-run diagnostics active; QLC+ web interface not required" if dry_run else "bridge active; QLC+ delivery not yet verified"

  def set_fixtures(self, fixtures):
    if not isinstance(fixtures, list) or not fixtures:
      raise ValueError("fixture map must contain a non-empty fixtures list")
    for fixture in fixtures:
      if "id" not in fixture or "address" not in fixture or "channels" not in fixture:
        raise ValueError("each fixture needs id, address and channels")
    self.fixtures = fixtures
    self.fixture_by_id = {fixture["id"]: fixture for fixture in self.fixtures}
    self.fixture_map_source = "qlc_bridge_runtime_fixture_map"
    self.record_event("fixture_map_updated", [])
    print(f"[qlc] fixture map updated fixtures={len(self.fixtures)}")
    return True

  def url_for(self, template, address, value):
    path = template.format(address=address, value=value)
    if path.startswith("http://") or path.startswith("https://"):
      return path
    return f"http://{self.host}:{self.port}{path}"

  def set_channel(self, address, value, source="channel"):
    address = int(address)
    value = clamp_dmx(value)
    print(f"[qlc] set channel {address} = {value}")
    if self.dry_run:
      self.apply_channel_state(address, value, source)
      return True

    if self.send_websocket_command(f"CH|{address}|{value}"):
      self.apply_channel_state(address, value, source)
      return True

    failures = []
    for template in self.endpoint_templates:
      url = self.url_for(template, address, value)
      print(f"[qlc] GET {url}")
      try:
        with request.urlopen(url, timeout=self.timeout) as response:
          status = response.getcode()
          if 200 <= status < 300:
            self.apply_channel_state(address, value, source)
            return True
          message = f"status={status}"
          print(f"[qlc] failed {message} url={url}")
          failures.append((url, message))
      except error.HTTPError as exc:
        message = f"status={exc.code} error={exc.reason}"
        print(f"[qlc] failed {message} url={url}")
        failures.append((url, message))
      except error.URLError as exc:
        message = f"error={exc.reason}"
        print(f"[qlc] failed {message} url={url}")
        failures.append((url, message))

    print("[qlc] all endpoint templates failed")
    for url, message in failures:
      print(f"[qlc] attempted {url} {message}")
    return False

  def websocket_url(self):
    return f"ws://{self.host}:{self.port}/qlcplusWS"

  def send_websocket_command(self, command):
    url = self.websocket_url()
    print(f"[qlc] WS {url} {command}")
    try:
      with socket.create_connection((self.host, self.port), timeout=self.timeout) as sock:
        sock.settimeout(self.timeout)
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        handshake = (
          "GET /qlcplusWS HTTP/1.1\r\n"
          f"Host: {self.host}:{self.port}\r\n"
          "Upgrade: websocket\r\n"
          "Connection: Upgrade\r\n"
          f"Sec-WebSocket-Key: {key}\r\n"
          "Sec-WebSocket-Version: 13\r\n"
          "\r\n"
        )
        sock.sendall(handshake.encode("ascii"))
        response = sock.recv(4096)
        expected_accept = base64.b64encode(
          hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()
        ).decode("ascii")
        if b" 101 " not in response or expected_accept.encode("ascii") not in response:
          status_line = response.splitlines()[0].decode("utf-8", "replace") if response else "no response"
          print(f"[qlc] failed websocket handshake status={status_line}")
          return False
        sock.sendall(websocket_text_frame(command))
        return True
    except OSError as exc:
      print(f"[qlc] failed websocket error={exc}")
      return False

  def set_channels(self, mapping, source="channels"):
    ok = True
    for address in sorted(mapping, key=lambda item: int(item)):
      ok = self.set_channel(address, mapping[address], source=source) and ok
    return ok

  def blackout(self):
    mapping = {}
    for fixture in self.fixtures:
      for local_channel in range(1, int(fixture["channels"]) + 1):
        mapping[absolute_channel(fixture, local_channel)] = 0
    print("[qlc] blackout")
    return self.set_channels(mapping, source="blackout")

  def fixture(self, fixture_id):
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    return fixture

  def set_fixture_channel(self, fixture_id, local_channel, value):
    fixture = self.fixture(fixture_id)
    address = absolute_channel(fixture, resolve_local_channel(fixture, local_channel))
    print(f"[qlc] fixture {fixture_id} channel {local_channel} -> address {address} = {clamp_dmx(value)}")
    return self.set_channel(address, value, source=f"fixture_channel:{fixture_id}:{local_channel}")

  def set_fixture_rgb(self, fixture_id, r, g, b, intensity=1.0):
    fixture = self.fixture(fixture_id)
    intensity = max(0.0, min(1.0, float(intensity)))
    red = clamp_dmx(normalize_color_value(r) * intensity)
    green = clamp_dmx(normalize_color_value(g) * intensity)
    blue = clamp_dmx(normalize_color_value(b) * intensity)
    print(f"[qlc] fixture {fixture_id} rgb=({red},{green},{blue})")
    mapping = {}
    rgb_map = fixture.get("rgb") or {}
    if rgb_map.get("r") is not None:
      mapping[absolute_channel(fixture, rgb_map["r"])] = red
    if rgb_map.get("g") is not None:
      mapping[absolute_channel(fixture, rgb_map["g"])] = green
    if rgb_map.get("b") is not None:
      mapping[absolute_channel(fixture, rgb_map["b"])] = blue
    rgb2_map = fixture.get("rgb2") or {}
    if rgb2_map.get("r") is not None:
      mapping[absolute_channel(fixture, rgb2_map["r"])] = red
    if rgb2_map.get("g") is not None:
      mapping[absolute_channel(fixture, rgb2_map["g"])] = green
    if rgb2_map.get("b") is not None:
      mapping[absolute_channel(fixture, rgb2_map["b"])] = blue
    white = fixture.get("white")
    if white is not None:
      mapping[absolute_channel(fixture, white)] = 0
    white2 = fixture.get("white2")
    if white2 is not None:
      mapping[absolute_channel(fixture, white2)] = 0
    dimmer = fixture.get("dimmer")
    if dimmer is not None:
      mapping[absolute_channel(fixture, dimmer)] = clamp_dmx(255 * intensity)
    for safe_channel in ("strobe", "mode", "speed"):
      local_channel = fixture.get(safe_channel)
      if local_channel is not None:
        mapping[absolute_channel(fixture, local_channel)] = 0
    return self.set_channels(mapping, source=f"fixture_rgb:{fixture_id}")

  def set_fixture_raw(self, fixture_id, values):
    fixture = self.fixture(fixture_id)
    values = [clamp_dmx(value) for value in values]
    print(f"[qlc] fixture {fixture_id} raw={values}")
    mapping = {}
    for index, value in enumerate(values[: int(fixture["channels"])], start=1):
      mapping[absolute_channel(fixture, index)] = value
    return self.set_channels(mapping, source=f"fixture_raw:{fixture_id}")

  def set_scene(self, scene):
    fixtures = scene.get("fixtures", scene) if isinstance(scene, dict) else {}
    ok = True
    for fixture_id, command in fixtures.items():
      if "raw" in command:
        ok = self.set_fixture_raw(fixture_id, command["raw"]) and ok
      elif "values" in command:
        ok = self.set_fixture_raw(fixture_id, command["values"]) and ok
      else:
        ok = self.set_fixture_rgb(
          fixture_id,
          command.get("r", 0),
          command.get("g", 0),
          command.get("b", 0),
          command.get("intensity", 1.0),
        ) and ok
    return ok

  def apply_channel_state(self, address, value, source):
    if address < 1 or address > 512:
      return
    with self.state_lock:
      old = self.channels[address - 1]
      if old == value:
        return
      self.channels[address - 1] = value
      self.record_event(source, [{"channel": address, "old": old, "new": value}], locked=True)

  def record_event(self, source, changes, locked=False):
    if locked:
      self.events.append({
        "timestamp": time.time(),
        "source": source,
        "emitted": True,
        "changedChannels": changes,
      })
      self.events = self.events[-50:]
      return
    with self.state_lock:
      self.record_event(source, changes, locked=True)

  def dmx_state(self):
    with self.state_lock:
      labels = fixture_channel_labels(self.fixtures)
      now = time.time()
      events = list(self.events[-50:])
      channels = [
        {
          "channel": index + 1,
          "value": value,
          "mapped": index + 1 in labels,
          "recentlyChanged": recently_changed(index + 1, events, now),
          **labels.get(index + 1, {}),
        }
        for index, value in enumerate(self.channels)
      ]
    return {
      "universe": 0,
      "size": 512,
      "outputMode": "qlc_bridge",
      "driver": "QLCWebBridge",
      "driverStatus": self.bridge_status,
      "qlcBridgeStatus": self.bridge_status,
      "fixtureMapSource": self.fixture_map_source,
      "fixtures": len(self.fixtures),
      "channels": channels,
      "events": events,
    }


def resolve_local_channel(fixture, local_channel):
  if isinstance(local_channel, str) and not local_channel.isdigit():
    mapped = fixture.get("map", {}).get(local_channel)
    if mapped is None:
      raise KeyError(f"Unknown local channel {local_channel} for {fixture['id']}")
    return int(mapped)
  return int(local_channel)


def absolute_channel(fixture, local_channel):
  return int(fixture["address"]) + int(local_channel) - 1


def fixture_channel_labels(fixtures):
  labels = {}
  for fixture in fixtures:
    fixture_id = fixture.get("id", "")
    fixture_label = fixture.get("label") or fixture_id
    for local_channel in range(1, int(fixture["channels"]) + 1):
      address = absolute_channel(fixture, local_channel)
      labels[address] = {
        "fixtureId": fixture_id,
        "fixtureLabel": fixture_label,
        "localChannel": local_channel,
        "role": "unused",
        "label": f"{fixture_label} CH{local_channel}",
        "controllable": True,
      }
    assign_role_label(labels, fixture, fixture.get("dimmer"), "DIMMER")
    assign_role_label(labels, fixture, fixture.get("white"), "W1")
    assign_role_label(labels, fixture, fixture.get("white2"), "W2")
    assign_role_label(labels, fixture, fixture.get("strobe"), "STROBE")
    assign_role_label(labels, fixture, fixture.get("mode"), "MODE")
    assign_role_label(labels, fixture, fixture.get("speed"), "SPEED")
    assign_rgb_labels(labels, fixture, fixture.get("rgb"), {"r": "R", "g": "G", "b": "B"})
    assign_rgb_labels(labels, fixture, fixture.get("rgb2"), {"r": "R2", "g": "G2", "b": "B2"})
  return labels


def assign_rgb_labels(labels, fixture, rgb_map, role_names):
  if not rgb_map:
    return
  for key, role in role_names.items():
    local_channel = rgb_map.get(key)
    if local_channel is None:
      continue
    assign_role_label(labels, fixture, local_channel, role)


def assign_role_label(labels, fixture, local_channel, role):
  if local_channel is None:
    return
  address = absolute_channel(fixture, local_channel)
  fixture_label = fixture.get("label") or fixture.get("id", "")
  labels[address] = {
    **labels.get(address, {}),
    "fixtureId": fixture.get("id", ""),
    "fixtureLabel": fixture_label,
    "localChannel": int(local_channel),
    "role": role,
    "label": f"{fixture_label} {role}",
    "controllable": True,
  }


def recently_changed(channel, events, now):
  for event in reversed(events):
    for change in event.get("changedChannels", []):
      if change.get("channel") == channel:
        return now - float(event.get("timestamp", 0)) < 1.2
  return False


def websocket_text_frame(message):
  payload = message.encode("utf-8")
  header = bytearray([0x81])
  length = len(payload)
  if length < 126:
    header.append(0x80 | length)
  elif length < 65536:
    header.extend([0x80 | 126, (length >> 8) & 0xFF, length & 0xFF])
  else:
    header.append(0x80 | 127)
    header.extend(length.to_bytes(8, "big"))
  mask = os.urandom(4)
  masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
  return bytes(header) + mask + masked


def run_sweep(client, start, end, value=255, hold=0.7):
  step = 1 if end >= start else -1
  for address in range(start, end + step, step):
    client.set_channel(address, value)
    time.sleep(hold)
    client.set_channel(address, 0)


def run_named_test(client, name):
  if name == "blackout":
    return client.blackout()
  if name == "red":
    return all(client.set_fixture_rgb(fixture["id"], 255, 0, 0) for fixture in client.fixtures)
  if name == "green":
    return all(client.set_fixture_rgb(fixture["id"], 0, 255, 0) for fixture in client.fixtures)
  if name == "blue":
    return all(client.set_fixture_rgb(fixture["id"], 0, 0, 255) for fixture in client.fixtures)
  if name == "white":
    return all(client.set_fixture_rgb(fixture["id"], 255, 255, 255) for fixture in client.fixtures)
  if name == "chase":
    client.blackout()
    client.set_fixture_rgb("fixture_001", 255, 0, 0)
    time.sleep(0.25)
    client.blackout()
    client.set_fixture_rgb("fixture_009", 0, 255, 0)
    time.sleep(0.25)
    client.blackout()
    client.set_fixture_rgb("fixture_017", 0, 0, 255)
    time.sleep(0.25)
    return client.blackout()
  raise ValueError(f"Unknown test: {name}")


def make_bridge_server(client, host, port):
  class BridgeHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
      self.send_response(204)
      self.send_cors_headers()
      self.end_headers()

    def do_GET(self):
      parsed = urlparse(self.path)
      print(f"[qlc] GET {self.path}")
      if parsed.path == "/health":
        self.write_json({
          "ok": True,
          "fixtures": len(client.fixtures),
          "dry_run": client.dry_run,
          "qlcBridgeStatus": client.bridge_status,
        })
        return
      if parsed.path == "/dmx-state":
        self.write_json(client.dmx_state())
        return
      self.send_response(404)
      self.send_cors_headers()
      self.end_headers()

    def do_POST(self):
      parsed = urlparse(self.path)
      print(f"[qlc] POST {self.path}")
      payload = self.read_json()
      try:
        if parsed.path == "/blackout":
          ok = client.blackout()
        elif parsed.path == "/channel":
          ok = client.set_channel(payload["address"], payload["value"])
        elif parsed.path.startswith("/fixture/") and parsed.path.endswith("/raw"):
          fixture_id = parsed.path.split("/")[2]
          ok = client.set_fixture_raw(fixture_id, payload.get("values", payload.get("raw", [])))
        elif parsed.path.startswith("/fixture/") and parsed.path.endswith("/rgb"):
          fixture_id = parsed.path.split("/")[2]
          ok = client.set_fixture_rgb(
            fixture_id,
            payload.get("r", 0),
            payload.get("g", 0),
            payload.get("b", 0),
            payload.get("intensity", 1.0),
          )
        elif parsed.path == "/scene":
          ok = client.set_scene(payload)
        elif parsed.path == "/fixture-map":
          ok = client.set_fixtures(payload.get("fixtures", payload.get("qlcFixtures", [])))
        else:
          self.send_response(404)
          self.send_cors_headers()
          self.end_headers()
          return
        self.write_json({"ok": bool(ok)})
      except Exception as exc:
        self.write_json({"ok": False, "error": str(exc)}, status=400)

    def read_json(self):
      length = int(self.headers.get("Content-Length", "0") or 0)
      if not length:
        return {}
      raw = self.rfile.read(length).decode("utf-8")
      return json.loads(raw)

    def write_json(self, payload, status=200):
      body = json.dumps(payload, indent=2).encode("utf-8")
      self.send_response(status)
      self.send_cors_headers()
      self.send_header("Content-Type", "application/json")
      self.send_header("Content-Length", str(len(body)))
      self.end_headers()
      self.wfile.write(body)

    def send_cors_headers(self):
      self.send_header("Access-Control-Allow-Origin", "*")
      self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format_, *args):
      print(f"[qlc-bridge] {self.address_string()} {format_ % args}")

  return ThreadingHTTPServer((host, port), BridgeHandler)


def make_parser():
  parser = argparse.ArgumentParser(
    description="Minimal QLC+ Web Interface bridge for DMX testing.",
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="""Dry-run examples:
  PYTHONPATH="$PWD/src" python3 -m lighting_brain.qlc_bridge --dry-run --test blackout
  PYTHONPATH="$PWD/src" python3 -m lighting_brain.qlc_bridge --dry-run --fixture fixture_017 --rgb 255 0 0
  PYTHONPATH="$PWD/src" python3 -m lighting_brain.qlc_bridge --dry-run --fixture fixture_025 --rgb 0 255 0
  PYTHONPATH="$PWD/src" python3 -m lighting_brain.qlc_bridge --dry-run --fixture fixture_034 --rgb 0 0 255
  PYTHONPATH="$PWD/src" python3 -m lighting_brain.qlc_bridge --dry-run --fixture fixture_041 --rgb 255 255 0
""",
  )
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=9999)
  parser.add_argument("--fixture-map", default=None)
  parser.add_argument("--endpoint-template", action="append", default=None)
  parser.add_argument("--dry-run", action="store_true")
  parser.add_argument("--channel", type=int, default=None)
  parser.add_argument("--value", type=float, default=255)
  parser.add_argument("--sweep", nargs=2, type=int, metavar=("START", "END"))
  parser.add_argument("--hold", type=float, default=0.7)
  parser.add_argument("--fixture", default=None)
  parser.add_argument("--raw", nargs="*", type=float)
  parser.add_argument("--rgb", nargs=3, type=float, metavar=("R", "G", "B"))
  parser.add_argument("--intensity", type=float, default=1.0)
  parser.add_argument("--test", choices=["blackout", "red", "green", "blue", "white", "chase"])
  parser.add_argument("--serve", action="store_true")
  parser.add_argument("--bridge-host", default="127.0.0.1")
  parser.add_argument("--bridge-port", type=int, default=8791)
  return parser


def main():
  args = make_parser().parse_args()
  client = QLCWebClient(
    host=args.host,
    port=args.port,
    fixtures=load_fixtures(args.fixture_map),
    endpoint_templates=args.endpoint_template or DEFAULT_ENDPOINT_TEMPLATES,
    dry_run=args.dry_run,
  )

  if args.serve:
    server = make_bridge_server(client, args.bridge_host, args.bridge_port)
    print(f"[qlc] bridge server on http://{args.bridge_host}:{args.bridge_port}")
    server.serve_forever()
    return

  if args.channel is not None:
    client.set_channel(args.channel, args.value)
  if args.sweep:
    run_sweep(client, args.sweep[0], args.sweep[1], args.value, args.hold)
  if args.fixture and args.raw is not None:
    client.set_fixture_raw(args.fixture, args.raw)
  if args.fixture and args.rgb is not None:
    client.set_fixture_rgb(args.fixture, args.rgb[0], args.rgb[1], args.rgb[2], args.intensity)
  if args.test:
    run_named_test(client, args.test)


if __name__ == "__main__":
  main()
