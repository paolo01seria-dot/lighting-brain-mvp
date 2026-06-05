import argparse
import base64
import hashlib
import json
import os
import socket
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, request
from urllib.parse import urlparse


DEFAULT_FIXTURES = [
  {
    "id": "fixture_001",
    "label": "DMX 001 unknown 3ch",
    "address": 1,
    "channels": 3,
    "map": {"ch1": 1, "ch2": 2, "ch3": 3},
    "rgb": {"r": 1, "g": 2, "b": 3},
    "dimmer": None,
    "shutter": None,
    "mode": "rgb_guess",
  },
  {
    "id": "fixture_009",
    "label": "DMX 009 unknown 6ch",
    "address": 9,
    "channels": 6,
    "map": {"ch1": 1, "ch2": 2, "ch3": 3, "ch4": 4, "ch5": 5, "ch6": 6},
    "rgb": {"r": 1, "g": 2, "b": 3},
    "dimmer": None,
    "shutter": None,
    "mode": "unknown_6ch",
  },
  {
    "id": "fixture_017",
    "label": "DMX 017 unknown 3ch",
    "address": 17,
    "channels": 3,
    "map": {"ch1": 1, "ch2": 2, "ch3": 3},
    "rgb": {"r": 1, "g": 2, "b": 3},
    "dimmer": None,
    "shutter": None,
    "mode": "rgb_guess",
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
  return data.get("fixtures", data) if isinstance(data, dict) else data


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

  def url_for(self, template, address, value):
    path = template.format(address=address, value=value)
    if path.startswith("http://") or path.startswith("https://"):
      return path
    return f"http://{self.host}:{self.port}{path}"

  def set_channel(self, address, value):
    address = int(address)
    value = clamp_dmx(value)
    print(f"[qlc] set channel {address} = {value}")
    if self.dry_run:
      return True

    if self.send_websocket_command(f"CH|{address}|{value}"):
      return True

    failures = []
    for template in self.endpoint_templates:
      url = self.url_for(template, address, value)
      print(f"[qlc] GET {url}")
      try:
        with request.urlopen(url, timeout=self.timeout) as response:
          status = response.getcode()
          if 200 <= status < 300:
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

  def set_channels(self, mapping):
    ok = True
    for address in sorted(mapping, key=lambda item: int(item)):
      ok = self.set_channel(address, mapping[address]) and ok
    return ok

  def blackout(self):
    mapping = {}
    for fixture in self.fixtures:
      for local_channel in range(1, int(fixture["channels"]) + 1):
        mapping[absolute_channel(fixture, local_channel)] = 0
    print("[qlc] blackout")
    return self.set_channels(mapping)

  def fixture(self, fixture_id):
    fixture = self.fixture_by_id.get(fixture_id)
    if not fixture:
      raise KeyError(f"Unknown fixture: {fixture_id}")
    return fixture

  def set_fixture_channel(self, fixture_id, local_channel, value):
    fixture = self.fixture(fixture_id)
    address = absolute_channel(fixture, resolve_local_channel(fixture, local_channel))
    print(f"[qlc] fixture {fixture_id} channel {local_channel} -> address {address} = {clamp_dmx(value)}")
    return self.set_channel(address, value)

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
    dimmer = fixture.get("dimmer")
    if dimmer is not None:
      mapping[absolute_channel(fixture, dimmer)] = clamp_dmx(255 * intensity)
    shutter = fixture.get("shutter")
    if shutter is not None and intensity > 0:
      mapping[absolute_channel(fixture, shutter)] = 255
    return self.set_channels(mapping)

  def set_fixture_raw(self, fixture_id, values):
    fixture = self.fixture(fixture_id)
    values = [clamp_dmx(value) for value in values]
    print(f"[qlc] fixture {fixture_id} raw={values}")
    mapping = {}
    for index, value in enumerate(values[: int(fixture["channels"])], start=1):
      mapping[absolute_channel(fixture, index)] = value
    return self.set_channels(mapping)

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


def resolve_local_channel(fixture, local_channel):
  if isinstance(local_channel, str) and not local_channel.isdigit():
    mapped = fixture.get("map", {}).get(local_channel)
    if mapped is None:
      raise KeyError(f"Unknown local channel {local_channel} for {fixture['id']}")
    return int(mapped)
  return int(local_channel)


def absolute_channel(fixture, local_channel):
  return int(fixture["address"]) + int(local_channel) - 1


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
        self.write_json({"ok": True, "fixtures": len(client.fixtures), "dry_run": client.dry_run})
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
  parser = argparse.ArgumentParser(description="Minimal QLC+ Web Interface bridge for DMX testing.")
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
