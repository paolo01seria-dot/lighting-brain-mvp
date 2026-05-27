import unittest

from lighting_brain.adapters import render_adapter_events


class AdaptersTest(unittest.TestCase):
  def test_render_qlcplus_osc_events(self):
    timeline = {
      "events": [
        {"time": 1.0, "scene": "house_hook_color_lift", "intent": "peak_energy"}
      ]
    }

    rendered = render_adapter_events(timeline, "qlcplus_osc")

    self.assertEqual(rendered["adapter"], "qlcplus_osc")
    self.assertEqual(rendered["events"][0]["address"], "/lighting/scene")
    self.assertEqual(
      rendered["events"][0]["args"],
      ["house_hook_color_lift", "peak_energy", "unknown", 0],
    )


if __name__ == "__main__":
  unittest.main()
