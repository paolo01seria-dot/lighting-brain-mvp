"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { LightSetupManager } = require("../main/LightSetupManager");

test("setCurrentSetup stores repo-local setup paths as relative", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lighting-brain-light-setup-"));
  const setupDir = path.join(projectRoot, "configs", "light-setups");
  fs.mkdirSync(setupDir, { recursive: true });
  const setupPath = path.join(setupDir, "test-setup.json");
  fs.writeFileSync(setupPath, JSON.stringify({
    name: "Test Setup",
    qlcFixtures: [{
      id: "fixture_001",
      label: "Fixture 1",
      address: 1,
      channels: 3,
      rgb: { r: 1, g: 2, b: 3 },
    }],
  }));

  const manager = new LightSetupManager({ projectRoot });
  const result = manager.setCurrentSetup(setupPath);
  const selection = JSON.parse(fs.readFileSync(path.join(projectRoot, "configs", "light_setup_selection.json"), "utf8"));

  assert.equal(result.ok, true);
  assert.equal(selection.selectedSetupPath, path.join("configs", "light-setups", "test-setup.json"));
});
