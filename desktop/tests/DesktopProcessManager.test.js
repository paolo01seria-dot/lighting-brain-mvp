"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DesktopProcessManager,
  DEFAULT_QLC_FIXTURE_MAP_PATH,
  SERVICE_OWNERSHIP,
  SERVICE_STATES,
} = require("../main/DesktopProcessManager");

test("qlc bridge default command uses diagnostic dry-run fixture map", () => {
  const manager = new DesktopProcessManager({
    projectRoot: process.cwd(),
  });

  const args = manager.requireService("qlcBridge").args;

  assert.deepEqual(args, [
    "-m", "lighting_brain.qlc_bridge",
    "--serve",
    "--dry-run",
    "--bridge-host", "127.0.0.1",
    "--bridge-port", "8791",
    "--fixture-map", DEFAULT_QLC_FIXTURE_MAP_PATH,
  ]);
});

test("ensureQlcBridgeStarted is idempotent across repeated calls", async () => {
  const manager = new DesktopProcessManager({
    projectRoot: process.cwd(),
  });
  const qlcBridge = manager.requireService("qlcBridge");

  manager.refreshServiceStatuses = async () => {};
  manager.refreshExternalService = async () => {};

  let startCalls = 0;
  manager.ensureServiceStarted = async (serviceId) => {
    assert.equal(serviceId, "qlcBridge");
    startCalls += 1;
    qlcBridge.state = SERVICE_STATES.STARTING;
    await new Promise((resolve) => setTimeout(resolve, 10));
    qlcBridge.state = SERVICE_STATES.RUNNING;
    qlcBridge.ownership = SERVICE_OWNERSHIP.OWNED;
  };

  const [firstStatus, secondStatus] = await Promise.all([
    manager.ensureQlcBridgeStarted(),
    manager.ensureQlcBridgeStarted(),
  ]);

  assert.equal(startCalls, 1);
  assert.equal(firstStatus.services.qlcBridge.healthy, true);
  assert.equal(secondStatus.services.qlcBridge.healthy, true);
});

test("ensureQlcBridgeStarted does not spawn while stop is in progress", async () => {
  const manager = new DesktopProcessManager({
    projectRoot: process.cwd(),
  });

  let started = false;
  manager.ensureServiceStarted = async () => {
    started = true;
  };
  manager.stopPromise = Promise.resolve(manager.getSystemStatus());

  const status = await manager.ensureQlcBridgeStarted();

  assert.equal(started, false);
  assert.equal(status.services.qlcBridge.state, SERVICE_STATES.STOPPED);
});

test("waitForServiceReadiness fails when health never comes up", async () => {
  const manager = new DesktopProcessManager({
    projectRoot: process.cwd(),
  });
  const qlcBridge = manager.requireService("qlcBridge");
  qlcBridge.startupTimeoutMs = 5;
  manager.probeService = async () => ({ occupied: false, expected: false, detail: "connection refused" });

  const result = await manager.waitForServiceReadiness(qlcBridge, {
    exitCode: null,
    signalCode: null,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /health check failed after spawn/);
});

test("system status distinguishes diagnostic bridge from unavailable physical QLC output", () => {
  const manager = new DesktopProcessManager({
    projectRoot: process.cwd(),
  });
  const qlcBridge = manager.requireService("qlcBridge");
  qlcBridge.state = SERVICE_STATES.RUNNING;
  qlcBridge.ownership = SERVICE_OWNERSHIP.OWNED;

  const status = manager.getSystemStatus();

  assert.equal(status.qlcBridgeStatus.bridge8791, "running");
  assert.equal(status.qlcBridgeStatus.qlcPlusWeb9999, "unavailable");
  assert.equal(status.qlcBridgeStatus.physicalQlcOutput, "unavailable");
  assert.equal(status.qlcBridgeStatus.dryRun, true);
  assert.ok(status.services.qlcBridge.statusDetails.includes("Real physical QLC+ output: unavailable"));
});
