"use strict";

const { AudioCaptureDriver } = require("../AudioCaptureDriver");
const { AUDIO_SOURCE_TYPES } = require("../sourceTypes");

class WindowsWasapiLoopbackDriver extends AudioCaptureDriver {
  constructor() {
    super({
      sourceType: AUDIO_SOURCE_TYPES.SYSTEM_OUTPUT_AUDIO,
      label: "Windows WASAPI Loopback",
    });
  }

  getStatus() {
    return {
      sourceType: this.sourceType,
      label: this.label,
      state: "placeholder",
      warning: "WASAPI loopback capture is planned but not implemented.",
    };
  }
}

module.exports = {
  WindowsWasapiLoopbackDriver,
};
