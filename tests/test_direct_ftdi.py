import unittest

from lighting_brain.direct_ftdi import (
  DirectFtdiOutputConfig,
  DirectFtdiProbe,
  ProtectedDirectFtdiOpenDmxAdapter,
  find_target_ftdi_device,
  parse_macos_system_profiler_usb,
)


class DirectFtdiProbeTest(unittest.TestCase):
  def test_target_cable_matches_serial_and_name(self):
    device = find_target_ftdi_device([{
      "name": "FT232R USB UART",
      "serial": "BG03EQH8",
      "vendorId": "0x0403",
      "productId": "0x6001",
    }])

    self.assertIsNotNone(device)
    self.assertEqual(device["matchReason"], "serial_and_name")

  def test_probe_reports_detected_but_not_enabled(self):
    capability = DirectFtdiProbe().from_observed_devices([{
      "name": "FT232R USB UART",
      "serial": "BG03EQH8",
      "vendorId": "0403",
      "productId": "6001",
    }], qlc_fallback_available=True)

    self.assertFalse(capability.available)
    self.assertTrue(capability.target_found)
    self.assertTrue(capability.qlc_fallback_available)
    self.assertEqual(capability.config.universe, 0)

  def test_universe_and_frequency_are_configurable(self):
    config = DirectFtdiOutputConfig(universe=2, output_frequency_hz=44)
    capability = DirectFtdiProbe(config).from_observed_devices([])

    self.assertEqual(capability.config.universe, 2)
    self.assertEqual(capability.config.output_frequency_hz, 44)

  def test_invalid_frequency_is_rejected(self):
    with self.assertRaises(ValueError):
      DirectFtdiOutputConfig(output_frequency_hz=0)

  def test_parse_macos_system_profiler_usb(self):
    devices = parse_macos_system_profiler_usb("""
        FT232R USB UART:

          Product ID: 0x6001
          Vendor ID: 0x0403  (Future Technology Devices International Limited)
          Serial Number: BG03EQH8
    """)

    self.assertEqual(devices[0]["name"], "FT232R USB UART")
    self.assertEqual(devices[0]["serial"], "BG03EQH8")
    self.assertEqual(devices[0]["vendorId"], "0403")

  def test_protected_adapter_does_not_write_hardware(self):
    adapter = ProtectedDirectFtdiOpenDmxAdapter()

    with self.assertRaises(NotImplementedError):
      adapter.connect()
    with self.assertRaises(NotImplementedError):
      adapter.write_universe([0] * 512)


if __name__ == "__main__":
  unittest.main()
