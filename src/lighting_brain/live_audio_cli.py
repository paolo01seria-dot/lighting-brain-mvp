import argparse
import json
import queue
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .optional_deps import require_module
from .realtime_audio import band_levels, classify_live_frame, list_input_devices, rms_level


def main():
  parser = argparse.ArgumentParser(description="Serve realtime audio frames from a local sounddevice input.")
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=8790)
  parser.add_argument("--device", type=int, default=None)
  parser.add_argument("--samplerate", type=int, default=None)
  parser.add_argument("--blocksize", type=int, default=1024)
  parser.add_argument("--gain", type=float, default=8.0)
  parser.add_argument("--list-devices", action="store_true")
  args = parser.parse_args()

  if args.list_devices:
    print(json.dumps(list_input_devices(), indent=2))
    return

  server = make_server(args)
  print(f"Lighting live audio server on http://{args.host}:{args.port}")
  print("Open the web app and choose System Audio / Python Live Audio.")
  server.serve_forever()


def make_server(args):
  class LiveAudioHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
      self.send_response(204)
      self.send_cors_headers()
      self.end_headers()

    def do_GET(self):
      parsed = urlparse(self.path)
      if parsed.path == "/devices":
        self.write_json(list_input_devices())
        return
      if parsed.path == "/events":
        query = parse_qs(parsed.query)
        device = query.get("device", [None])[0]
        device_index = int(device) if device not in (None, "", "default") else args.device
        self.stream_events(device_index)
        return
      self.send_response(404)
      self.send_cors_headers()
      self.end_headers()

    def stream_events(self, device_index):
      sounddevice = require_module("sounddevice")
      numpy = require_module("numpy")
      samplerate = selected_samplerate(sounddevice, device_index, args.samplerate)
      frames = queue.Queue(maxsize=8)
      stop_event = threading.Event()
      previous_energy = 0.0
      previous_bands = [0.0] * 16
      started_at = time.monotonic()

      def callback(indata, _frames, _time_info, status):
        if status:
          return
        mono = numpy.mean(indata, axis=1).astype(float)
        try:
          frames.put_nowait(mono.tolist())
        except queue.Full:
          try:
            frames.get_nowait()
            frames.put_nowait(mono.tolist())
          except queue.Empty:
            pass

      self.send_response(200)
      self.send_cors_headers()
      self.send_header("Content-Type", "text/event-stream")
      self.send_header("Cache-Control", "no-cache")
      self.send_header("Connection", "keep-alive")
      self.end_headers()

      try:
        with sounddevice.InputStream(
          device=device_index,
          channels=1,
          samplerate=samplerate,
          blocksize=args.blocksize,
          callback=callback,
        ):
          while not stop_event.is_set():
            samples = frames.get(timeout=1.0)
            energy = min(1.0, rms_level(samples) * args.gain)
            bands = band_levels(samples, samplerate, 16)
            flux = sum(max(0.0, band - previous_bands[index]) for index, band in enumerate(bands)) / len(bands)
            category = classify_live_frame(energy, previous_energy, bands)
            event = {
              "time": round(time.monotonic() - started_at, 4),
              "energy": round(energy, 4),
              "previous_energy": round(previous_energy, 4),
              "energy_delta": round(energy - previous_energy, 4),
              "energy_drop": round(max(0.0, previous_energy - energy), 4),
              "sample_category": category,
              "spectrum": [round(value, 4) for value in bands],
              "spectral_flux": round(flux, 4),
              "source": "sounddevice",
            }
            self.write_sse(event)
            previous_energy = energy
            previous_bands = bands
      except (BrokenPipeError, ConnectionResetError):
        stop_event.set()
      except Exception as error:
        self.write_sse({"error": str(error), "source": "sounddevice"})

    def write_json(self, payload):
      data = json.dumps(payload).encode("utf-8")
      self.send_response(200)
      self.send_cors_headers()
      self.send_header("Content-Type", "application/json")
      self.send_header("Content-Length", str(len(data)))
      self.end_headers()
      self.wfile.write(data)

    def write_sse(self, payload):
      data = f"data: {json.dumps(payload)}\n\n".encode("utf-8")
      self.wfile.write(data)
      self.wfile.flush()

    def send_cors_headers(self):
      self.send_header("Access-Control-Allow-Origin", "*")
      self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
      self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, _format, *_args):
      return

  return ThreadingHTTPServer((args.host, args.port), LiveAudioHandler)


def selected_samplerate(sounddevice, device_index, requested_samplerate):
  if requested_samplerate:
    return requested_samplerate
  try:
    device = sounddevice.query_devices(device_index, "input")
    return int(device.get("default_samplerate") or 44100)
  except Exception:
    return 44100


if __name__ == "__main__":
  main()
