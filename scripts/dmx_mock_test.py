#!/usr/bin/env python3
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from lighting_brain.dmx import MockDmxDriver, factory_default_fixture_map  # noqa: E402


def print_step(title, driver):
  print(f"\n== {title} ==")
  print(driver.active_channel_table())


def main():
  driver = MockDmxDriver(fixtures=factory_default_fixture_map())

  driver.blackout()
  print_step("blackout", driver)

  driver.set_fixture_color("fixture_001", 255, 0, 0)
  print_step("Light 1 red", driver)

  driver.set_fixture_color("fixture_009", 0, 255, 0)
  print_step("Light 2 green", driver)

  driver.set_fixture_color("fixture_017", 0, 0, 255, intensity=1.0)
  print_step("Light 3 blue, dimmer full", driver)

  driver.set_fixture_dual_rgb("fixture_041", (255, 0, 0), (0, 0, 255), intensity=1.0)
  print_step("Light 6 zone1 red, zone2 blue", driver)

  print("\nChanged channels from current step:")
  for change in driver.serialize()["changed"]:
    print(f"CH{change['channel']:03d}: {change['old']} -> {change['new']}")

  driver.blackout()
  print_step("blackout end", driver)


if __name__ == "__main__":
  main()
