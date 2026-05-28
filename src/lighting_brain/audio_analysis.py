from pathlib import Path

from .optional_deps import require_module


def analyze_audio_file(path, sr=22050, hop_length=512, segment_beats=16):
  """Analyze an audio file with librosa and return Lighting Brain analysis JSON."""
  path = Path(path)
  librosa = require_module("librosa")
  numpy = require_module("numpy")

  samples, sample_rate = librosa.load(path, sr=sr, mono=True)
  duration = float(librosa.get_duration(y=samples, sr=sample_rate))
  tempo, beat_frames = librosa.beat.beat_track(
    y=samples,
    sr=sample_rate,
    hop_length=hop_length,
  )
  tempo = float(numpy.asarray(tempo).reshape(-1)[0]) if numpy.size(tempo) else None
  beat_times = librosa.frames_to_time(beat_frames, sr=sample_rate, hop_length=hop_length)
  onset_frames = librosa.onset.onset_detect(
    y=samples,
    sr=sample_rate,
    hop_length=hop_length,
    backtrack=False,
  )
  onset_times = librosa.frames_to_time(onset_frames, sr=sample_rate, hop_length=hop_length)
  rms = librosa.feature.rms(y=samples, hop_length=hop_length)[0]
  centroid = librosa.feature.spectral_centroid(
    y=samples,
    sr=sample_rate,
    hop_length=hop_length,
  )[0]
  times = librosa.frames_to_time(
    numpy.arange(len(rms)),
    sr=sample_rate,
    hop_length=hop_length,
  )

  segments = build_segments(
    duration=duration,
    beat_times=beat_times,
    onset_times=onset_times,
    rms=rms,
    centroid=centroid,
    times=times,
    numpy=numpy,
    segment_beats=segment_beats,
  )

  return {
    "path": str(path),
    "bpm": tempo,
    "duration": duration,
    "analysis_engine": "librosa",
    "features": {
      "sample_rate": sample_rate,
      "hop_length": hop_length,
      "beat_count": int(len(beat_times)),
      "onset_count": int(len(onset_times)),
      "beat_confidence": estimate_beat_confidence(beat_times, numpy),
    },
    "beat_times": [round(float(value), 4) for value in beat_times],
    "onset_times": [round(float(value), 4) for value in onset_times],
    "segments": segments,
  }


def build_segments(
  duration,
  beat_times,
  onset_times,
  rms,
  centroid,
  times,
  numpy,
  segment_beats=16,
):
  boundaries = segment_boundaries(duration, beat_times, segment_beats)
  if len(boundaries) < 2:
    boundaries = [0.0, duration]

  energy_high = float(numpy.percentile(rms, 72)) if len(rms) else 0.0
  energy_low = float(numpy.percentile(rms, 28)) if len(rms) else 0.0
  brightness_high = float(numpy.percentile(centroid, 65)) if len(centroid) else 0.0
  segments = []

  for index, (start, end) in enumerate(zip(boundaries, boundaries[1:])):
    mask = (times >= start) & (times < end)
    energy = float(numpy.mean(rms[mask])) if numpy.any(mask) else 0.0
    brightness = float(numpy.mean(centroid[mask])) if numpy.any(mask) else 0.0
    onset_count = count_between(onset_times, start, end)
    beat_count = count_between(beat_times, start, end)
    onset_rate = onset_count / max(0.001, end - start)
    label = label_segment(
      index=index,
      total=max(1, len(boundaries) - 1),
      energy=energy,
      energy_low=energy_low,
      energy_high=energy_high,
      brightness=brightness,
      brightness_high=brightness_high,
      beat_count=beat_count,
      onset_rate=onset_rate,
    )
    segments.append({
      "start": round(float(start), 4),
      "end": round(float(end), 4),
      "label": label,
      "sample_category": sample_category_for_features(
        label=label,
        energy=energy,
        energy_low=energy_low,
        energy_high=energy_high,
        beat_count=beat_count,
        onset_rate=onset_rate,
      ),
      "features": {
        "mean_rms": round(energy, 6),
        "mean_centroid": round(brightness, 3),
        "onset_count": int(onset_count),
        "beat_count": int(beat_count),
        "onset_rate": round(float(onset_rate), 4),
      },
    })

  return segments


def segment_boundaries(duration, beat_times, segment_beats):
  if len(beat_times) >= segment_beats:
    boundaries = [0.0]
    for index in range(segment_beats, len(beat_times), segment_beats):
      boundaries.append(float(beat_times[index]))
    if boundaries[-1] < duration:
      boundaries.append(float(duration))
    return dedupe_boundaries(boundaries, duration)

  step = 8.0
  boundaries = [0.0]
  current = step
  while current < duration:
    boundaries.append(current)
    current += step
  boundaries.append(float(duration))
  return dedupe_boundaries(boundaries, duration)


def dedupe_boundaries(boundaries, duration):
  result = []
  for value in boundaries:
    value = max(0.0, min(float(duration), float(value)))
    if not result or value - result[-1] > 0.25:
      result.append(value)
  if result[-1] < duration:
    result.append(float(duration))
  return result


def label_segment(
  index,
  total,
  energy,
  energy_low,
  energy_high,
  brightness,
  brightness_high,
  beat_count,
  onset_rate,
):
  if index == 0 and energy <= energy_high:
    return "intro"
  if index >= total - 1 and energy <= energy_high:
    return "outro"
  if beat_count <= 1 and energy <= energy_low:
    return "breakdown"
  if energy >= energy_high and onset_rate >= 1.2:
    return "chorus"
  if brightness >= brightness_high and onset_rate >= 1.8:
    return "buildup"
  return "verse"


def sample_category_for_features(
  label,
  energy,
  energy_low,
  energy_high,
  beat_count,
  onset_rate,
):
  if energy <= energy_low and beat_count <= 1:
    return "ambient_no_beat"
  if label == "buildup":
    return "buildup"
  if label == "breakdown":
    return "breakdown"
  if energy >= energy_high and onset_rate >= 1.6:
    return "high_energy_drop"
  if beat_count >= 2:
    return "steady_bass_pulse"
  return "transition"


def count_between(values, start, end):
  return sum(1 for value in values if start <= value < end)


def estimate_beat_confidence(beat_times, numpy):
  if len(beat_times) < 3:
    return 0.0
  intervals = numpy.diff(beat_times)
  mean_interval = float(numpy.mean(intervals))
  if mean_interval <= 0:
    return 0.0
  variation = float(numpy.std(intervals) / mean_interval)
  return round(max(0.0, min(1.0, 1.0 - variation * 2.5)), 4)
