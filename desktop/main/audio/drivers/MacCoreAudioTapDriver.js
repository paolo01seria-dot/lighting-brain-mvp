"use strict";

const { AudioCaptureDriver } = require("../AudioCaptureDriver");
const { AUDIO_SOURCE_TYPES, USER_VISIBLE_SOURCE_LABELS } = require("../sourceTypes");

class MacCoreAudioTapDriver extends AudioCaptureDriver {
  constructor() {
    super({
      sourceType: AUDIO_SOURCE_TYPES.SYSTEM_OUTPUT_AUDIO,
      label: USER_VISIBLE_SOURCE_LABELS[AUDIO_SOURCE_TYPES.SYSTEM_OUTPUT_AUDIO],
    });
  }

  getStatus() {
    return {
      sourceType: this.sourceType,
      label: this.label,
      state: "placeholder",
      warning: "CoreAudio system output capture is planned but not implemented.",
    };
  }
}

module.exports = {
  MacCoreAudioTapDriver,
};
