import unittest

from lighting_brain.timeline import build_timeline


class TimelineTest(unittest.TestCase):
  def test_build_timeline_uses_genre_profile(self):
    analysis = {
      "path": "track.mp3",
      "bpm": 128,
      "segments": [
        {"start": 0.0, "end": 8.0, "label": "intro"},
        {"start": 8.0, "end": 32.0, "label": "chorus"},
      ],
    }
    scene_map = {
      "name": "base",
      "default_scene": "fallback",
      "segment_scenes": {"intro": "base_intro", "chorus": "base_chorus"},
      "bpm_rules": [{"min_bpm": 0, "max_bpm": 999, "energy": "medium"}],
    }
    genre_profile = {
      "name": "techno",
      "energy_bias": "hypnotic",
      "segment_scenes": {"chorus": "techno_peak_white_drive"},
    }

    timeline = build_timeline(analysis, scene_map, genre_profile)

    self.assertEqual(timeline["genre"], "techno")
    self.assertEqual(timeline["energy"], "hypnotic")
    self.assertEqual(timeline["events"][0]["scene"], "base_intro")
    self.assertEqual(timeline["events"][1]["scene"], "techno_peak_white_drive")
    self.assertEqual(timeline["events"][1]["intent"], "peak_energy")

  def test_scene_freshness_rotates_repeated_category(self):
    analysis = {
      "path": "track.mp3",
      "bpm": 128,
      "segments": [
        {"start": 0.0, "end": 8.0, "label": "verse"},
        {"start": 8.0, "end": 16.0, "label": "verse"},
        {"start": 16.0, "end": 24.0, "label": "verse"},
      ],
    }
    scene_map = {
      "name": "base",
      "default_scene": "fallback",
      "bpm_rules": [{"min_bpm": 0, "max_bpm": 999, "energy": "medium"}],
      "sample_category_scene_pools": {
        "steady_bass_pulse": ["pulse_a", "pulse_b"]
      },
    }

    timeline = build_timeline(analysis, scene_map, differentiation=2)

    self.assertEqual(
      [event["scene"] for event in timeline["events"]],
      ["pulse_a", "pulse_a", "pulse_b"],
    )
    self.assertEqual(
      [event["sample_category"] for event in timeline["events"]],
      ["steady_bass_pulse", "steady_bass_pulse", "steady_bass_pulse"],
    )
    self.assertEqual(timeline["events"][0]["category_repeat_count"], 1)
    self.assertFalse(timeline["events"][1]["scene_changed"])
    self.assertTrue(timeline["events"][2]["scene_changed"])
    self.assertIn("dimmer_pulse", timeline["events"][0]["rhythmic_actions"])

  def test_timeline_adds_beat_level_rhythm_events_from_analysis(self):
    analysis = {
      "path": "track.mp3",
      "bpm": 120,
      "beat_times": [0.0, 0.5, 1.0, 1.5, 8.0],
      "onset_times": [0.25, 0.32, 8.25],
      "segments": [
        {"start": 0.0, "end": 8.0, "label": "verse"},
        {"start": 8.0, "end": 16.0, "label": "chorus"},
      ],
    }
    scene_map = {
      "name": "base",
      "default_scene": "fallback",
      "segment_scenes": {"verse": "pulse_scene", "chorus": "drop_scene"},
      "bpm_rules": [{"min_bpm": 0, "max_bpm": 999, "energy": "medium"}],
    }

    timeline = build_timeline(analysis, scene_map)

    self.assertEqual(len(timeline["rhythm_events"]), 7)
    self.assertEqual(timeline["rhythm_events"][0]["source"], "analysis_beat")
    self.assertEqual(timeline["rhythm_events"][0]["pulse"], "downbeat")
    self.assertEqual(timeline["rhythm_events"][1]["source"], "analysis_onset")
    self.assertEqual(timeline["rhythm_events"][1]["pulse"], "accent")
    self.assertEqual(timeline["rhythm_events"][1]["gesture"], "accent_pair")
    self.assertEqual(timeline["rhythm_events"][-1]["scene"], "drop_scene")
    self.assertIn("symmetry", timeline["rhythm_events"][-1])

  def test_timeline_events_include_training_metadata_shell(self):
    analysis = {
      "path": "track.mp3",
      "bpm": 128,
      "segments": [
        {
          "start": 0.0,
          "end": 8.0,
          "label": "verse",
          "features": {
            "mean_rms": 0.02,
            "mean_centroid": 2500,
            "beat_count": 16,
            "onset_rate": 2.0,
          },
        },
        {
          "start": 8.0,
          "end": 16.0,
          "label": "chorus",
          "features": {
            "mean_rms": 0.04,
            "mean_centroid": 3300,
            "beat_count": 16,
            "onset_rate": 3.0,
          },
        },
      ],
    }
    scene_map = {
      "name": "base",
      "default_scene": "fallback",
      "bpm_rules": [{"min_bpm": 0, "max_bpm": 999, "energy": "medium"}],
      "sample_category_scene_pools": {
        "steady_bass_pulse": ["pulse_scene"],
        "high_energy_drop": ["drop_scene"],
      },
    }

    timeline = build_timeline(analysis, scene_map)
    metadata = timeline["events"][1]["metadata"]

    self.assertEqual(metadata["time"]["duration_beats"], 16)
    self.assertEqual(metadata["audio"]["energy_trend"], "rising")
    self.assertEqual(metadata["lighting"]["fixture_coordination"], "synchronized")
    self.assertIn("lighting_intent", metadata["designer_logic"])
    self.assertIn("scene_freshness_score", metadata["freshness"])
    self.assertFalse(metadata["training_quality"]["usable_for_training"])


if __name__ == "__main__":
  unittest.main()
