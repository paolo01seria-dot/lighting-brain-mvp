import unittest

from lighting_brain.dmx import DmxUniverse, MockDmxDriver


class DmxUniverseTest(unittest.TestCase):
  def test_channel_values_are_clamped(self):
    universe = DmxUniverse(logger=None)

    universe.setChannel(1, -20)
    universe.setChannel(2, 999)

    self.assertEqual(universe.getChannel(1), 0)
    self.assertEqual(universe.getChannel(2), 255)

  def test_invalid_channel_is_rejected(self):
    universe = DmxUniverse(logger=None)

    with self.assertRaises(ValueError):
      universe.setChannel(0, 255)
    with self.assertRaises(ValueError):
      universe.getChannel(513)

  def test_snapshot_and_changed_channels(self):
    universe = DmxUniverse(logger=None)
    before = universe.snapshot()

    universe.setChannel(1, 12)
    universe.setChannel(512, 255)
    changes = universe.getChangedChannels(before)

    self.assertEqual([(change.channel, change.old, change.new) for change in changes], [(1, 0, 12), (512, 0, 255)])

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

  def test_dual_rgbw_fixture_can_drive_two_zones_separately(self):
    driver = MockDmxDriver(logger=None)

    driver.setFixtureDualRgb("fixture_041", (255, 0, 0), (0, 0, 255))
    all_channels = driver.serialize(include_zero=True)["channels"]

    self.assertEqual(all_channels["41"], 255)
    self.assertEqual(all_channels["42"], 255)
    self.assertEqual(all_channels["43"], 0)
    self.assertEqual(all_channels["44"], 0)
    self.assertEqual(all_channels["46"], 0)
    self.assertEqual(all_channels["47"], 0)
    self.assertEqual(all_channels["48"], 255)

  def test_fixture_blackout_clears_only_fixture_channels(self):
    driver = MockDmxDriver(logger=None)
    driver.set_fixture_color("fixture_001", 255, 255, 255)
    driver.set_fixture_color("fixture_009", 0, 255, 0)

    driver.setFixtureBlackout("fixture_001")
    serialized = driver.serialize()

    self.assertNotIn("1", serialized["channels"])
    self.assertEqual(serialized["channels"]["10"], 255)

  def test_fixture_strobe_sets_supported_strobe_channel(self):
    driver = MockDmxDriver(logger=None)

    driver.setFixtureStrobe("fixture_017", 300)
    serialized = driver.serialize()

    self.assertEqual(serialized["channels"]["21"], 255)

  def test_apply_simple_light_state_blackout_and_rgb(self):
    driver = MockDmxDriver(logger=None)

    driver.applySimpleLightState("fixture_001", {"rgb": [1, 0, 0], "intensity": 0.5})
    self.assertEqual(driver.serialize()["channels"]["1"], 128)
    driver.applySimpleLightState("fixture_001", {"phaseMode": "off"})

    self.assertEqual(driver.serialize()["channels"], {})

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
