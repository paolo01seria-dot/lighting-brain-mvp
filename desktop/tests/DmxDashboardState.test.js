"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { DmxDashboardState } = require("../main/DmxDashboardState");

test("setup-style previous-channel reset leaves only the selected channel active", () => {
  const state = new DmxDashboardState();

  state.applyQlcWebCommand({ path: "/channel", payload: { address: 5, value: 180 } });
  state.applyQlcWebCommand({ path: "/channel", payload: { address: 5, value: 0 } });
  state.applyQlcWebCommand({ path: "/channel", payload: { address: 12, value: 200 } });

  const snapshot = state.snapshot();
  const activeChannels = snapshot.channels.filter((channel) => channel.value > 0);

  assert.deepEqual(activeChannels.map((channel) => ({ channel: channel.channel, value: channel.value })), [
    { channel: 12, value: 200 },
  ]);
  assert.equal(snapshot.outputMode, "desktop_direct");
  assert.equal(snapshot.driver, "ElectronDmxDashboardMirror");
});
