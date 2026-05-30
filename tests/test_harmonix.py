import json
import tempfile
import unittest
from pathlib import Path

from lighting_brain.harmonix import load_harmonix_jams


class HarmonixImportTest(unittest.TestCase):
  def test_load_harmonix_jams_extracts_beats_downbeats_and_segments(self):
    jams = {
      "file_metadata": {"duration": 12.0},
      "annotations": [
        {
          "namespace": "beat",
          "data": [
            {"time": 0.0, "duration": 0.0, "value": 1},
            {"time": 0.5, "duration": 0.0, "value": 2},
            {"time": 1.0, "duration": 0.0, "value": 3},
            {"time": 1.5, "duration": 0.0, "value": 4},
          ],
        },
        {
          "namespace": "segment_open",
          "data": [
            {"time": 0.0, "duration": 4.0, "value": "Verse"},
            {"time": 4.0, "duration": 4.0, "value": "Chorus"},
          ],
        },
      ],
    }
    with tempfile.TemporaryDirectory() as tmpdir:
      path = Path(tmpdir) / "track.jams"
      path.write_text(json.dumps(jams), encoding="utf-8")

      analysis = load_harmonix_jams(path)

    self.assertEqual(analysis["analysis_engine"], "harmonixset_jams")
    self.assertEqual(analysis["bpm"], 120.0)
    self.assertEqual(analysis["downbeat_times"], [0.0])
    self.assertEqual(analysis["segments"][0]["label"], "verse")
    self.assertEqual(analysis["segments"][1]["sample_category"], "high_energy_drop")
    self.assertTrue(analysis["features"]["human_annotated"])


if __name__ == "__main__":
  unittest.main()
