"use strict";

const { AudioCaptureDriver } = require("../AudioCaptureDriver");
const { AUDIO_SOURCE_TYPES, USER_VISIBLE_SOURCE_LABELS } = require("../sourceTypes");

class BlackHoleLegacyDriver extends AudioCaptureDriver {
  constructor() {
    super({
      sourceType: AUDIO_SOURCE_TYPES.BLACKHOLE_LEGACY,
      label: USER_VISIBLE_SOURCE_LABELS[AUDIO_SOURCE_TYPES.BLACKHOLE_LEGACY],
    });
  }

  getStatus() {
    return {
      sourceType: this.sourceType,
      label: this.label,
      state: "placeholder",
      warning: "BlackHole is a legacy/debug fallback, not the final system audio path.",
    };
  }
}

module.exports = {
  BlackHoleLegacyDriver,
};
