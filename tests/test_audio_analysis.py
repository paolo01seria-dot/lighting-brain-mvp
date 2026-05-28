import unittest

from lighting_brain.audio_analysis import (
  dedupe_boundaries,
  estimate_beat_confidence,
  label_segment,
  sample_category_for_features,
  segment_boundaries,
)
from lighting_brain.sample_categories import classify_sample_category


class AudioAnalysisTest(unittest.TestCase):
  def test_segment_boundaries_follow_beats(self):
    beat_times = [index * 0.5 for index in range(40)]

    boundaries = segment_boundaries(24.0, beat_times, segment_beats=16)

    self.assertEqual(boundaries[0], 0.0)
    self.assertIn(8.0, boundaries)
    self.assertEqual(boundaries[-1], 24.0)

  def test_label_segment_marks_buildup_from_bright_dense_onsets(self):
    label = label_segment(
      index=2,
      total=6,
      energy=0.2,
      energy_low=0.05,
      energy_high=0.4,
      brightness=3400,
      brightness_high=3000,
      beat_count=12,
      onset_rate=2.4,
    )

    self.assertEqual(label, "buildup")

  def test_sample_category_is_preserved_when_analysis_provides_it(self):
    segment = {
      "start": 0.0,
      "end": 8.0,
      "label": "intro",
      "sample_category": "steady_bass_pulse",
    }

    self.assertEqual(
      classify_sample_category(segment, bpm=120, energy="medium"),
      "steady_bass_pulse",
    )

  def test_sample_category_from_features_detects_drop(self):
    category = sample_category_for_features(
      label="chorus",
      energy=0.8,
      energy_low=0.1,
      energy_high=0.5,
      beat_count=14,
      onset_rate=2.0,
    )

    self.assertEqual(category, "high_energy_drop")

  def test_beat_confidence_drops_when_intervals_are_unstable(self):
    class FakeNumpy:
      @staticmethod
      def diff(values):
        return [values[index + 1] - values[index] for index in range(len(values) - 1)]

      @staticmethod
      def mean(values):
        return sum(values) / len(values)

      @staticmethod
      def std(values):
        mean = FakeNumpy.mean(values)
        return (sum((value - mean) ** 2 for value in values) / len(values)) ** 0.5

    stable = estimate_beat_confidence([0.0, 0.5, 1.0, 1.5], FakeNumpy)
    unstable = estimate_beat_confidence([0.0, 0.5, 1.4, 1.7], FakeNumpy)

    self.assertGreater(stable, unstable)

  def test_dedupe_boundaries_removes_tiny_segments(self):
    self.assertEqual(
      dedupe_boundaries([0.0, 0.1, 1.0, 2.0], 2.0),
      [0.0, 1.0, 2.0],
    )


if __name__ == "__main__":
  unittest.main()
