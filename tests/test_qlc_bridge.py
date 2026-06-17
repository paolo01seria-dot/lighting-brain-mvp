import json
from pathlib import Path
import unittest
from tempfile import NamedTemporaryFile

from lighting_brain.qlc_bridge import load_fixtures


class QlcBridgeFixtureLoadingTest(unittest.TestCase):
  def write_payload(self, payload):
    handle = NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False)
    self.addCleanup(lambda: Path(handle.name).unlink(missing_ok=True))
    json.dump(payload, handle)
    handle.flush()
    handle.close()
    return handle.name

  def test_prefers_qlc_fixtures_from_full_setup_light_payload(self):
    path = self.write_payload({
      "fixtures": [{
        "id": "setup_fixture_should_not_win",
        "label": "Setup Fixture",
        "startChannel": 201,
        "channelCount": 6,
        "channels": [
          {"local": 1, "absolute": 201, "role": "dimmer"},
          {"local": 2, "absolute": 202, "role": "red"},
          {"local": 3, "absolute": 203, "role": "green"},
          {"local": 4, "absolute": 204, "role": "blue"},
        ],
      }],
      "qlcFixtures": [{
        "id": "qlc_fixture_wins",
        "label": "QLC Fixture",
        "address": 77,
        "channels": 3,
        "rgb": {"r": 1, "g": 2, "b": 3},
      }],
    })

    fixtures = load_fixtures(path)

    self.assertEqual(len(fixtures), 1)
    self.assertEqual(fixtures[0]["id"], "qlc_fixture_wins")
    self.assertEqual(fixtures[0]["address"], 77)

  def test_converts_fixtures_only_setup_light_payload(self):
    path = self.write_payload({
      "fixtures": [{
        "id": "setup_fixture_1",
        "label": "Setup fixture 1",
        "channelCount": 6,
        "startChannel": 201,
        "channels": [
          {"local": 1, "absolute": 201, "role": "dimmer"},
          {"local": 2, "absolute": 202, "role": "red"},
          {"local": 3, "absolute": 203, "role": "green"},
          {"local": 4, "absolute": 204, "role": "blue"},
          {"local": 5, "absolute": 205, "role": "strobe"},
          {"local": 6, "absolute": 206, "role": "mode"},
        ],
      }],
    })

    fixtures = load_fixtures(path)

    self.assertEqual(fixtures[0]["address"], 201)
    self.assertEqual(fixtures[0]["channels"], 6)
    self.assertEqual(fixtures[0]["dimmer"], 1)
    self.assertEqual(fixtures[0]["rgb"], {"r": 2, "g": 3, "b": 4})
    self.assertEqual(fixtures[0]["strobe"], 5)
    self.assertEqual(fixtures[0]["mode"], 6)
