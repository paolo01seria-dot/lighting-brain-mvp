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


def rms_level(samples):
  if not samples:
    return 0.0
  return (sum(sample * sample for sample in samples) / len(samples)) ** 0.5


def band_levels(samples, sample_rate, band_count=16):
  numpy = require_module("numpy")
  if len(samples) < 8:
    return [0.0] * band_count

  window = numpy.hanning(len(samples))
  spectrum = numpy.abs(numpy.fft.rfft(numpy.asarray(samples) * window))
  frequencies = numpy.fft.rfftfreq(len(samples), d=1.0 / sample_rate)
  max_frequency = min(sample_rate / 2, 12000)
  edges = numpy.geomspace(35, max_frequency, band_count + 1)
  bands = []
  peak = float(numpy.max(spectrum)) if len(spectrum) else 0.0
  for index in range(band_count):
    mask = (frequencies >= edges[index]) & (frequencies < edges[index + 1])
    value = float(numpy.mean(spectrum[mask])) if numpy.any(mask) else 0.0
    bands.append(0.0 if peak <= 0 else min(1.0, value / peak))
  return bands


def classify_live_frame(energy, previous_energy, bands):
  drop = previous_energy - energy
  low = sum(bands[:4]) / 4 if len(bands) >= 4 else 0.0
  mid = sum(bands[5:10]) / 5 if len(bands) >= 10 else 0.0
  high = sum(bands[10:]) / max(1, len(bands[10:])) if len(bands) > 10 else 0.0
  spectral_density = sum(1 for value in bands if value > 0.18) / max(1, len(bands))

  if energy < 0.035 or (previous_energy > 0.24 and drop > 0.18 and energy < 0.18):
    return "silence_or_pause"
  if drop > 0.28:
    return "stop_music_moment"
  if energy > 0.68 and spectral_density > 0.42:
    return "high_energy_drop"
  if low > 0.38 and energy > 0.22:
    return "steady_bass_pulse"
  if mid > low * 1.18 and energy > 0.16:
    return "melodic_or_arpeggio_pulse"
  if high > 0.32 and energy > 0.18:
    return "bright_percussive_texture"
  return "ambient_no_beat"
