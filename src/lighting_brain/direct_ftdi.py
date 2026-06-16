from __future__ import annotations

from dataclasses import dataclass
import platform
import subprocess
from typing import Any


TARGET_FTDI_SERIAL = "BG03EQH8"
TARGET_FTDI_NAME = "FT232R USB UART"
TARGET_FTDI_OBSERVED_LABEL = "FT232R USB UART (S/N: BG03EQH8)"
FTDI_VENDOR_ID = "0403"
FT232R_PRODUCT_ID = "6001"


@dataclass(frozen=True)
class DirectFtdiOutputConfig:
  universe: int = 0
  output_frequency_hz: int = 30
  target_serial: str = TARGET_FTDI_SERIAL
  target_name: str = TARGET_FTDI_NAME

  def __post_init__(self):
    if self.universe < 0:
      raise ValueError("DMX universe must be >= 0")
    if self.output_frequency_hz < 1 or self.output_frequency_hz > 60:
      raise ValueError("DMX output frequency must be in 1..60 Hz")


@dataclass(frozen=True)
class DirectFtdiCapability:
  available: bool
  target_found: bool
  qlc_fallback_available: bool
  backend: str
  reason: str
  matched_device: dict[str, Any] | None = None
  config: DirectFtdiOutputConfig = DirectFtdiOutputConfig()

  def serialize(self) -> dict[str, Any]:
    return {
      "available": self.available,
      "targetFound": self.target_found,
      "qlcFallbackAvailable": self.qlc_fallback_available,
      "backend": self.backend,
      "reason": self.reason,
      "matchedDevice": self.matched_device,
      "config": {
        "universe": self.config.universe,
        "outputFrequencyHz": self.config.output_frequency_hz,
        "targetSerial": self.config.target_serial,
        "targetName": self.config.target_name,
      },
    }


class DirectFtdiProbe:
  def __init__(self, config: DirectFtdiOutputConfig | None = None):
    self.config = config or DirectFtdiOutputConfig()

  def from_observed_devices(self, devices: list[dict[str, Any]], qlc_fallback_available: bool = False) -> DirectFtdiCapability:
    matched = find_target_ftdi_device(devices, self.config.target_serial, self.config.target_name)
    if not matched:
      return DirectFtdiCapability(
        available=False,
        target_found=False,
        qlc_fallback_available=qlc_fallback_available,
        backend="libftdi-planned",
        reason=f"Target FT232R cable serial {self.config.target_serial} not found.",
        config=self.config,
      )
    return DirectFtdiCapability(
      available=False,
      target_found=True,
      qlc_fallback_available=qlc_fallback_available,
      backend="libftdi-planned",
      reason="Target cable detected. Direct output is scaffolded but hardware writes are still disabled.",
      matched_device=matched,
      config=self.config,
    )

  def probe_macos_system_profiler(self, qlc_fallback_available: bool = False) -> DirectFtdiCapability:
    if platform.system() != "Darwin":
      return DirectFtdiCapability(
        available=False,
        target_found=False,
        qlc_fallback_available=qlc_fallback_available,
        backend="libftdi-planned",
        reason="macOS system_profiler probe is only available on Darwin.",
        config=self.config,
      )
    try:
      result = subprocess.run(
        ["system_profiler", "SPUSBDataType"],
        check=False,
        capture_output=True,
        text=True,
        timeout=8,
      )
    except (OSError, subprocess.TimeoutExpired) as error:
      return DirectFtdiCapability(
        available=False,
        target_found=False,
        qlc_fallback_available=qlc_fallback_available,
        backend="libftdi-planned",
        reason=f"Unable to run system_profiler safely: {error}",
        config=self.config,
      )
    devices = parse_macos_system_profiler_usb(result.stdout)
    return self.from_observed_devices(devices, qlc_fallback_available=qlc_fallback_available)


class ProtectedDirectFtdiOpenDmxAdapter:
  def __init__(self, config: DirectFtdiOutputConfig | None = None):
    self.config = config or DirectFtdiOutputConfig()
    self.connected = False

  def probe(self, devices: list[dict[str, Any]]) -> DirectFtdiCapability:
    return DirectFtdiProbe(self.config).from_observed_devices(devices)

  def connect(self):
    raise NotImplementedError(
      "Direct FTDI/OpenDMX hardware access is intentionally disabled in beta 0.1 scaffold."
    )

  def write_universe(self, channels):
    raise NotImplementedError(
      "Direct FTDI/OpenDMX universe writes require the protected native/libftdi backend."
    )

  def blackout(self):
    raise NotImplementedError(
      "Direct FTDI/OpenDMX blackout is not enabled until real hardware writes are explicitly implemented."
    )


def find_target_ftdi_device(devices: list[dict[str, Any]], target_serial: str = TARGET_FTDI_SERIAL, target_name: str = TARGET_FTDI_NAME) -> dict[str, Any] | None:
  target_serial = target_serial.upper()
  target_name_upper = target_name.upper()
  for device in devices:
    serial = str(device.get("serial", device.get("serialNumber", ""))).upper()
    name = str(device.get("name", device.get("product", device.get("label", "")))).upper()
    vendor_id = normalize_usb_id(device.get("vendorId", device.get("vendorID", device.get("vid", ""))))
    product_id = normalize_usb_id(device.get("productId", device.get("productID", device.get("pid", ""))))
    if serial == target_serial and target_name_upper in name:
      return {**device, "matchReason": "serial_and_name"}
    if serial == target_serial and vendor_id == FTDI_VENDOR_ID and product_id == FT232R_PRODUCT_ID:
      return {**device, "matchReason": "serial_vid_pid"}
  return None


def parse_macos_system_profiler_usb(text: str) -> list[dict[str, Any]]:
  devices: list[dict[str, Any]] = []
  current: dict[str, Any] | None = None
  for raw_line in text.splitlines():
    line = raw_line.strip()
    if not line:
      continue
    if line.endswith(":") and not line.startswith(("Product ID:", "Vendor ID:", "Serial Number:")):
      if current:
        devices.append(current)
      current = {"name": line[:-1]}
      continue
    if current is None:
      continue
    if line.startswith("Product ID:"):
      current["productId"] = normalize_usb_id(line.split(":", 1)[1])
    elif line.startswith("Vendor ID:"):
      current["vendorId"] = normalize_usb_id(line.split(":", 1)[1])
    elif line.startswith("Serial Number:"):
      current["serial"] = line.split(":", 1)[1].strip()
  if current:
    devices.append(current)
  return devices


def normalize_usb_id(value: Any) -> str:
  text = str(value or "").strip().lower()
  if "0x" in text:
    text = text.split("0x", 1)[1]
  text = text.split()[0] if text else ""
  return text.zfill(4)[-4:]
