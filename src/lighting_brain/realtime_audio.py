from .optional_deps import require_module


def list_input_devices():
  """Return input-capable devices exposed by sounddevice."""
  sounddevice = require_module("sounddevice")
  devices = sounddevice.query_devices()
  result = []
  for index, device in enumerate(devices):
    if device.get("max_input_channels", 0) <= 0:
      continue
    result.append({
      "index": index,
      "name": device.get("name", f"input {index}"),
      "channels": int(device.get("max_input_channels", 0)),
      "default_sample_rate": float(device.get("default_samplerate", 0.0)),
    })
  return result


def aubio_available():
  require_module("aubio")
  return True
