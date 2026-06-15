import unittest

from lighting_brain.dmx import MockDmxDriver


class DmxUniverseTest(unittest.TestCase):
  def test_rgb_3ch_fixture_maps_absolute_channels(self):
    driver = MockDmxDriver(logger=None)

    driver.set_fixture_color("fixture_009", 255, 128, 0)
    serialized = driver.serialize()

    self.assertEqual(serialized["channels"]["9"], 255)
    self.assertEqual(serialized["channels"]["10"], 128)
    self.assertNotIn("11", serialized["channels"])

  def test_rgb_6ch_fixture_sets_dimmer_rgb_and_safe_channels(self):
    driver = MockDmxDriver(logger=None)

    driver.set_fixture_color("fixture_017", 255, 0, 128, intensity=0.5)
    all_channels = driver.serialize(include_zero=True)["channels"]

    self.assertEqual(all_channels["17"], 128)
    self.assertEqual(all_channels["18"], 128)
    self.assertEqual(all_channels["19"], 0)
    self.assertEqual(all_channels["20"], 64)
    self.assertEqual(all_channels["21"], 0)
    self.assertEqual(all_channels["22"], 0)

  def test_dual_rgbw_fixture_sets_both_rgb_zones_and_keeps_white_off(self):
    driver = MockDmxDriver(logger=None)

    driver.set_fixture_color("fixture_041", 255, 255, 0)
    all_channels = driver.serialize(include_zero=True)["channels"]

    self.assertEqual(all_channels["41"], 255)
    self.assertEqual(all_channels["42"], 255)
    self.assertEqual(all_channels["43"], 255)
    self.assertEqual(all_channels["44"], 0)
    self.assertEqual(all_channels["45"], 0)
    self.assertEqual(all_channels["46"], 255)
    self.assertEqual(all_channels["47"], 255)
    self.assertEqual(all_channels["48"], 0)
    self.assertEqual(all_channels["49"], 0)
    self.assertEqual(all_channels["50"], 0)
    self.assertEqual(all_channels["51"], 0)
    self.assertEqual(all_channels["52"], 0)

  def test_scene_logs_changes_across_multiple_fixtures(self):
    driver = MockDmxDriver(logger=None)

    changes = driver.set_scene({
      "fixtures": {
        "fixture_001": {"r": 255, "g": 0, "b": 0},
        "fixture_009": {"r": 12, "g": 255, "b": 0},
      }
    })

    self.assertEqual({change.channel for change in changes}, {1, 9, 10})

  def test_blackout_resets_universe(self):
    driver = MockDmxDriver(logger=None)
    driver.set_fixture_color("fixture_001", 255, 255, 255)

    driver.blackout()

    self.assertEqual(driver.serialize()["channels"], {})


if __name__ == "__main__":
  unittest.main()
