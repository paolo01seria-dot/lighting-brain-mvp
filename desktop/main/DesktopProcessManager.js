"use strict";

const http = require("node:http");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");

const SERVICE_STATES = Object.freeze({
  STOPPED: "stopped",
  STARTING: "starting",
  RUNNING: "running",
  REUSED: "reused",
  ERROR: "error",
  STOPPING: "stopping",
});

const SERVICE_OWNERSHIP = Object.freeze({
  OWNED: "owned",
  REUSED: "reused",
  EXTERNAL: "external",
  STALE_PROJECT_SERVICE: "stale_project_service",
  STOPPED: "stopped",
  ERROR: "error",
});

const DEFAULT_QLC_FIXTURE_MAP_PATH = path.join("configs", "current_qlc_fixture_map.json");

class DesktopProcessManager {
  constructor({ projectRoot, pythonCommand = process.env.PYTHON || "python3", legacyAudioRouteManager = null }) {
    this.projectRoot = projectRoot;
    this.pythonCommand = pythonCommand;
    this.legacyAudioRouteManager = legacyAudioRouteManager;
    this.dashboardUrl = "http://127.0.0.1:8788/web/?v=desktop";
    this.logs = [];
    this.maxLogs = 700;
    this.startPromise = null;
    this.qlcBridgeStartPromise = null;
    this.stopPromise = null;
    this.syncPromise = null;
    this.syncMessage = null;
    this.syncBlockedUntil = 0;
    this.services = new Map([
      [
        "webFrontend",
        {
          id: "webFrontend",
          label: "Web frontend",
          state: SERVICE_STATES.STOPPED,
          ownership: SERVICE_OWNERSHIP.STOPPED,
          command: this.pythonCommand,
          args: ["-m", "http.server", "8788", "--bind", "127.0.0.1"],
          host: "127.0.0.1",
          port: 8788,
          probePath: "/web/index.html",
          url: this.dashboardUrl,
          expectedContent: (body) => body.includes("<title>Lighting Brain</title>") && body.includes('id="inputSource"'),
          staleMatchers: ["http.server", "8788"],
          child: null,
          optional: false,
        },
      ],
      [
        "liveAudio",
        {
          id: "liveAudio",
          label: "Python live audio",
          state: SERVICE_STATES.STOPPED,
          ownership: SERVICE_OWNERSHIP.STOPPED,
          command: this.pythonCommand,
          args: ["-m", "lighting_brain.live_audio_cli", "--host", "127.0.0.1", "--port", "8790"],
          host: "127.0.0.1",
          port: 8790,
          probePath: "/devices",
          url: "http://127.0.0.1:8790/devices",
          child: null,
          optional: false,
          expectedJson: (payload) => Array.isArray(payload),
          staleMatchers: ["lighting_brain.live_audio_cli", "8790", "lighting-live-audio"],
        },
      ],
      [
        "qlcBridge",
        {
          id: "qlcBridge",
          label: "QLC+ web bridge",
          state: SERVICE_STATES.STOPPED,
          ownership: SERVICE_OWNERSHIP.STOPPED,
          command: this.pythonCommand,
          args: [
            "-m", "lighting_brain.qlc_bridge",
            "--serve",
            "--dry-run",
            "--bridge-host", "127.0.0.1",
            "--bridge-port", "8791",
            "--fixture-map", DEFAULT_QLC_FIXTURE_MAP_PATH,
          ],
          host: "127.0.0.1",
          port: 8791,
          probePath: "/health",
          url: "http://127.0.0.1:8791/health",
          child: null,
          optional: true,
          expectedJson: (payload) => payload && payload.ok === true,
          note: "Diagnostic dry-run bridge for the DMX Dashboard. Does not require QLC+.",
          staleMatchers: ["lighting_brain.qlc_bridge", "8791"],
          startupTimeoutMs: 2500,
          requiresHealthCheck: true,
          diagnosticMode: true,
          dryRun: true,
        },
      ],
    ]);
  }

  async startSystem({ includeQlcBridge = false } = {}) {
    if (this.isSyncBlocked()) {
      this.addLog("system", "Start blocked: refreshing app state after second launch...");
      return this.getSystemStatus();
    }
    if (this.startPromise) {
      this.addLog("system", "System already starting");
      return this.startPromise;
    }
    if (this.stopPromise) {
      this.addLog("system", "System already stopping");
      return this.getSystemStatus();
    }

    const startPromise = this.performStartSystem({ includeQlcBridge }).finally(() => {
      if (this.startPromise === startPromise) {
        this.startPromise = null;
      }
    });
    this.startPromise = startPromise;
    return startPromise;
  }

  setQlcFixtureMapPath(fixtureMapPath) {
    const service = this.services.get("qlcBridge");
    if (!service) return;
    const resolvedFixtureMapPath = fixtureMapPath || DEFAULT_QLC_FIXTURE_MAP_PATH;
    service.args = [
      "-m", "lighting_brain.qlc_bridge",
      "--serve",
      "--dry-run",
      "--bridge-host", "127.0.0.1",
      "--bridge-port", "8791",
      "--fixture-map", resolvedFixtureMapPath,
    ];
    service.note = `Diagnostic dry-run bridge using fixture map: ${resolvedFixtureMapPath}`;
  }

  async stopSystem({ force = false } = {}) {
    if (this.isSyncBlocked() && !force) {
      this.addLog("system", "Stop blocked: refreshing app state after second launch...");
      return this.getSystemStatus();
    }
    if (this.stopPromise) {
      this.addLog("system", "System already stopping");
      return this.stopPromise;
    }

    const stopPromise = this.performStopSystem().finally(() => {
      if (this.stopPromise === stopPromise) {
        this.stopPromise = null;
      }
    });
    this.stopPromise = stopPromise;
    return stopPromise;
  }

  async ensureQlcBridgeStarted() {
    if (this.isSyncBlocked()) {
      this.addLog("qlcBridge", "QLC bridge start blocked: refreshing app state after second launch...");
      return this.getSystemStatus();
    }
    if (this.stopPromise) {
      this.addLog("qlcBridge", "QLC bridge start blocked: system already stopping");
      return this.getSystemStatus();
    }
    if (this.qlcBridgeStartPromise) {
      this.addLog("qlcBridge", "QLC bridge start already in progress");
      return this.qlcBridgeStartPromise;
    }
    if (this.startPromise) {
      this.addLog("qlcBridge", "Waiting for system start before ensuring QLC bridge");
      return this.startPromise.then(() => this.ensureQlcBridgeStarted());
    }

    const qlcBridgeStartPromise = this.performEnsureQlcBridgeStarted().finally(() => {
      if (this.qlcBridgeStartPromise === qlcBridgeStartPromise) {
        this.qlcBridgeStartPromise = null;
      }
    });
    this.qlcBridgeStartPromise = qlcBridgeStartPromise;
    return qlcBridgeStartPromise;
  }

  async refreshAfterSecondInstance({ minBlockMs = 250 } = {}) {
    if (this.syncPromise) {
      this.addLog("system", "Second-instance refresh already in progress");
      return this.syncPromise;
    }

    this.syncMessage = "Refreshing app state after second launch...";
    this.syncBlockedUntil = Date.now() + minBlockMs;
    this.addLog("system", this.syncMessage);
    const syncPromise = (async () => {
      await this.refreshServiceStatuses();
      const remainingBlockMs = this.syncBlockedUntil - Date.now();
      if (remainingBlockMs > 0) {
        await sleep(remainingBlockMs);
      }
      return this.getSystemStatus();
    })().finally(() => {
      this.syncPromise = null;
      this.syncMessage = null;
      this.syncBlockedUntil = 0;
    });
    this.syncPromise = syncPromise;
    return syncPromise;
  }

  isSyncBlocked() {
    return Boolean(this.syncPromise) || Date.now() < this.syncBlockedUntil;
  }

  async performStartSystem({ includeQlcBridge = false } = {}) {
    await this.refreshServiceStatuses();

    const webFrontend = this.requireService("webFrontend");
    const liveAudio = this.requireService("liveAudio");
    const qlcBridge = this.requireService("qlcBridge");

    if (this.serviceIsStarting(webFrontend) || this.serviceIsStarting(liveAudio)) {
      this.addLog("system", "System already starting");
      return this.getSystemStatus();
    }

    const webHealthy = this.serviceIsHealthy(webFrontend);
    const liveHealthy = this.serviceIsHealthy(liveAudio);
    const qlcBridgeHealthy = this.serviceIsHealthy(qlcBridge);
    const qlcBridgeStarting = this.serviceIsStarting(qlcBridge);

    if (webHealthy && liveHealthy && (!includeQlcBridge || qlcBridgeHealthy || qlcBridgeStarting)) {
      this.addLog("system", "System already running");
      return this.getSystemStatus();
    }

    this.addLog("system", "starting system");
    const startedServiceIds = [];
    try {
      if (this.legacyAudioRouteManager) {
        const routeResult = await this.legacyAudioRouteManager.ensureLegacyRouteOnStart();
        if (!routeResult.ok && routeResult.warning) {
          this.addLog("legacyAudio", routeResult.warning);
        }
      }

      await this.ensureServiceStarted("webFrontend", { startedServiceIds });
      await this.ensureServiceStarted("liveAudio", { startedServiceIds });

      if (includeQlcBridge) {
        await this.ensureServiceStarted("qlcBridge", { startedServiceIds });
      } else if (!qlcBridgeHealthy && !qlcBridgeStarting) {
        await this.refreshOptionalService("qlcBridge");
        if (!this.serviceIsHealthy(this.requireService("qlcBridge"))) {
          this.addLog("qlcBridge", "optional service not started automatically");
        }
      }

      return this.getSystemStatus();
    } catch (error) {
      this.addLog("system", `start failed: ${error.message}`);
      await this.stopOwnedServices(startedServiceIds);
      return this.getSystemStatus();
    }
  }

  async performStopSystem() {
    this.addLog("system", "stopping system");
    const services = Array.from(this.services.values()).reverse();
    await Promise.all(services.map((service) => this.stopService(service.id)));
    if (this.legacyAudioRouteManager) {
      const restore = await this.legacyAudioRouteManager.restorePreviousOutput({ reason: "stop system" });
      if (!restore.ok && restore.warning) {
        this.addLog("legacyAudio", restore.warning);
      }
    }
    return this.getSystemStatus();
  }

  async performEnsureQlcBridgeStarted() {
    await this.refreshServiceStatuses();

    const qlcBridge = this.requireService("qlcBridge");
    if (this.serviceIsStarting(qlcBridge)) {
      this.addLog("qlcBridge", "QLC+ web bridge already starting");
      return this.getSystemStatus();
    }
    if (this.serviceIsHealthy(qlcBridge)) {
      this.addLog("qlcBridge", "QLC+ web bridge already running");
      return this.getSystemStatus();
    }

    const startedServiceIds = [];
    try {
      await this.ensureServiceStarted("qlcBridge", { startedServiceIds });
      this.addLog("qlcBridge", "Diagnostic dry-run bridge active; QLC+ is not required for DMX Dashboard diagnostics");
      return this.getSystemStatus();
    } catch (error) {
      this.addLog("qlcBridge", `start failed: ${error.message}`);
      await this.stopOwnedServices(startedServiceIds);
      return this.getSystemStatus();
    }
  }

  async ensureServiceStarted(id, { startedServiceIds = [] } = {}) {
    const service = this.requireService(id);
    if (this.serviceIsStarting(service)) {
      this.addLog(id, `${service.label} already starting`);
      return;
    }
    if (this.serviceIsHealthy(service)) {
      this.addLog(id, `${service.label} already running`);
      return;
    }
    await this.startService(id, { startedServiceIds });
  }

  serviceIsHealthy(service) {
    return [SERVICE_STATES.RUNNING, SERVICE_STATES.REUSED].includes(service.state)
      && ![SERVICE_OWNERSHIP.ERROR, SERVICE_OWNERSHIP.STALE_PROJECT_SERVICE].includes(service.ownership);
  }

  serviceIsStarting(service) {
    return service.state === SERVICE_STATES.STARTING;
  }

  async startService(id, { startedServiceIds = [] } = {}) {
    const service = this.requireService(id);
    if (service.externalOnly) {
      await this.refreshExternalService(id);
      return;
    }
    if (service.child && childIsAlive(service.child) && [SERVICE_STATES.STARTING, SERVICE_STATES.RUNNING].includes(service.state)) {
      if (!service.requiresHealthCheck) {
        this.addLog(id, `already ${service.state}, keeping owned process pid=${service.child.pid}`);
        return;
      }
      const ownedProbe = await this.probeService(service);
      if (ownedProbe.expected) {
        this.addLog(id, `already ${service.state}, keeping owned process pid=${service.child.pid}`);
        return;
      }
      service.state = SERVICE_STATES.ERROR;
      service.ownership = SERVICE_OWNERSHIP.ERROR;
      service.error = `owned process pid=${service.child.pid} is alive but health check failed: ${ownedProbe.detail || "no response"}`;
      this.addLog(id, service.error);
      await this.stopService(id);
    } else if (service.child && childIsAlive(service.child)) {
      this.addLog(id, `stopping unhealthy owned process before restart pid=${service.child.pid}`);
      await this.stopService(id);
    } else if (service.child) {
      service.child = null;
    }

    if (service.child && [SERVICE_STATES.STARTING, SERVICE_STATES.RUNNING].includes(service.state)) {
      this.addLog(id, `already ${service.state}, keeping owned process pid=${service.child.pid}`);
      return;
    }

    service.state = SERVICE_STATES.STARTING;
    service.ownership = SERVICE_OWNERSHIP.STOPPED;
    service.error = null;

    const probe = await this.probeService(service);
    if (probe.occupied && probe.expected) {
      service.state = SERVICE_STATES.REUSED;
      service.ownership = SERVICE_OWNERSHIP.REUSED;
      service.error = null;
      service.child = null;
      this.addLog(id, `Reusing healthy ${service.label.toLowerCase()}`);
      return;
    }
    if (probe.staleProjectService && probe.processes?.length) {
      this.addLog(id, `stale project service detected on port ${service.port}, cleaning automatically`);
      await this.killProcesses(probe.processes, {
        serviceId: id,
        reason: `auto-clean stale project service on port ${service.port}`,
      });
      const reprobe = await this.probeService(service);
      if (reprobe.occupied && reprobe.expected) {
        service.state = SERVICE_STATES.REUSED;
        service.ownership = SERVICE_OWNERSHIP.REUSED;
        service.error = null;
        service.child = null;
        this.addLog(id, `Reusing healthy ${service.label.toLowerCase()} after stale cleanup`);
        return;
      }
      if (reprobe.occupied) {
        service.state = SERVICE_STATES.ERROR;
        service.ownership = reprobe.staleProjectService
          ? SERVICE_OWNERSHIP.STALE_PROJECT_SERVICE
          : SERVICE_OWNERSHIP.ERROR;
        service.error = reprobe.staleProjectService
          ? `Port ${service.port} still contains stale project service after automatic cleanup.`
          : `Port ${service.port} is still occupied after automatic cleanup. Close the conflicting app or use debug cleanup.`;
        this.addLog(id, `Port ${service.port} still blocked after automatic stale cleanup`);
        this.addLog(id, service.error);
        if (!service.optional) throw new Error(service.error);
        return;
      }
    }
    if (probe.occupied && !probe.expected) {
      service.state = SERVICE_STATES.ERROR;
      service.ownership = probe.staleProjectService
        ? SERVICE_OWNERSHIP.STALE_PROJECT_SERVICE
        : SERVICE_OWNERSHIP.ERROR;
      service.error = probe.staleProjectService
        ? `Port ${service.port} contains stale project service. Use Clean stale project services or Force Cleanup Ports.`
        : `Port ${service.port} is already used by another process. Use debug cleanup or close the conflicting app.`;
      this.addLog(id, `Port ${service.port} open but health check failed`);
      if (probe.staleProjectService) {
        this.addLog(id, `Port ${service.port} contains stale project service`);
      }
      this.addLog(id, service.error);
      if (!service.optional) throw new Error(service.error);
      return;
    }

    const env = {
      ...process.env,
      PYTHONPATH: joinPathList(path.join(this.projectRoot, "src"), process.env.PYTHONPATH),
    };
    this.addLog(id, `spawn cwd=${this.projectRoot}`);
    this.addLog(id, `spawn PYTHONPATH=${env.PYTHONPATH}`);
    this.addLog(id, `spawn command=${formatCommandForLog(service.command, service.args)}`);
    const child = spawn(service.command, service.args, {
      cwd: this.projectRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    service.child = child;
    service.ownership = SERVICE_OWNERSHIP.OWNED;
    startedServiceIds.push(id);

    child.stdout.on("data", (chunk) => this.addLog(id, chunk.toString("utf8").trimEnd()));
    child.stderr.on("data", (chunk) => this.addLog(id, chunk.toString("utf8").trimEnd()));
    child.on("spawn", () => {
      service.state = SERVICE_STATES.STARTING;
      service.error = null;
      this.addLog(id, `spawned pid=${child.pid}; waiting for health`);
    });
    child.on("error", (error) => {
      service.state = SERVICE_STATES.ERROR;
      service.ownership = SERVICE_OWNERSHIP.ERROR;
      service.error = error.message;
      service.child = null;
      this.addLog(id, `error: ${error.message}`);
    });
    child.on("exit", (code, signal) => {
      const wasStopping = service.state === SERVICE_STATES.STOPPING;
      service.child = null;
      service.lastExit = { code, signal, time: new Date().toISOString() };
      service.state = wasStopping || code === 0 ? SERVICE_STATES.STOPPED : SERVICE_STATES.ERROR;
      service.ownership = service.state === SERVICE_STATES.STOPPED
        ? SERVICE_OWNERSHIP.STOPPED
        : SERVICE_OWNERSHIP.ERROR;
      service.error = service.state === SERVICE_STATES.ERROR ? `exit code=${code} signal=${signal}` : null;
      this.addLog(id, `exit code=${code} signal=${signal}`);
    });

    const readiness = await this.waitForServiceReadiness(service, child);
    if (!readiness.ok) {
      service.state = readiness.state || SERVICE_STATES.ERROR;
      service.ownership = readiness.state === SERVICE_STATES.STOPPED
        ? SERVICE_OWNERSHIP.STOPPED
        : SERVICE_OWNERSHIP.ERROR;
      service.error = readiness.error;
      this.addLog(id, readiness.error);
      if (service.child && service.child === child) {
        await this.stopService(id);
        service.state = SERVICE_STATES.ERROR;
        service.ownership = SERVICE_OWNERSHIP.ERROR;
        service.error = readiness.error;
      }
      if (!service.optional) throw new Error(readiness.error);
      return;
    }

    service.state = SERVICE_STATES.RUNNING;
    service.error = null;
    this.addLog(id, `running pid=${child.pid} health=${service.probePath || "/"}`);
  }

  async waitForServiceReadiness(service, child) {
    const timeoutMs = service.startupTimeoutMs || 4000;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) {
        return {
          ok: false,
          state: SERVICE_STATES.ERROR,
          error: `process exited before health check passed (exit=${child.exitCode} signal=${child.signalCode})`,
        };
      }
      const probe = await this.probeService(service);
      if (probe.expected) {
        return { ok: true };
      }
      await sleep(120);
    }
    const probe = await this.probeService(service);
    if (probe.expected) {
      return { ok: true };
    }
    return {
      ok: false,
      state: probe.occupied ? SERVICE_STATES.ERROR : SERVICE_STATES.STOPPED,
      error: `health check failed after spawn on ${service.probePath || "/"}: ${probe.detail || "no response"}`,
    };
  }

  async refreshOptionalService(id) {
    const service = this.requireService(id);
    if (service.child && [SERVICE_STATES.STARTING, SERVICE_STATES.RUNNING, SERVICE_STATES.STOPPING].includes(service.state)) {
      return;
    }
    const probe = await this.probeService(service);
    if (probe.occupied && probe.expected) {
      service.state = SERVICE_STATES.REUSED;
      service.ownership = SERVICE_OWNERSHIP.REUSED;
      service.error = null;
      this.addLog(id, `Reusing healthy ${service.label.toLowerCase()}`);
    } else if (probe.occupied) {
      service.state = SERVICE_STATES.ERROR;
      service.ownership = probe.staleProjectService
        ? SERVICE_OWNERSHIP.STALE_PROJECT_SERVICE
        : SERVICE_OWNERSHIP.ERROR;
      service.error = probe.staleProjectService
        ? `Optional port ${service.port} contains stale project service.`
        : `Optional port ${service.port} is occupied by an unknown process.`;
      this.addLog(id, `Port ${service.port} open but health check failed`);
      if (probe.staleProjectService) {
        this.addLog(id, `Port ${service.port} contains stale project service`);
      }
      this.addLog(id, service.error);
    } else if (!service.child) {
      service.state = SERVICE_STATES.STOPPED;
      service.ownership = SERVICE_OWNERSHIP.STOPPED;
      service.error = null;
    }
  }

  async refreshExternalService(id) {
    const service = this.requireService(id);
    const probe = await this.probeService(service, { acceptAnyHttp: true });
    if (probe.occupied) {
      service.state = SERVICE_STATES.REUSED;
      service.ownership = SERVICE_OWNERSHIP.EXTERNAL;
      service.error = null;
      this.addLog(id, `external service detected on port ${service.port}`);
    } else {
      service.state = SERVICE_STATES.STOPPED;
      service.ownership = SERVICE_OWNERSHIP.EXTERNAL;
      service.error = null;
    }
  }

  async stopService(id) {
    const service = this.requireService(id);
    if (!service.child) {
      if (service.ownership === SERVICE_OWNERSHIP.REUSED || service.ownership === SERVICE_OWNERSHIP.EXTERNAL) {
        this.addLog(id, `not stopping ${service.ownership} service`);
        return;
      }
      service.state = SERVICE_STATES.STOPPED;
      service.ownership = service.externalOnly ? SERVICE_OWNERSHIP.EXTERNAL : SERVICE_OWNERSHIP.STOPPED;
      return;
    }
    service.state = SERVICE_STATES.STOPPING;
    this.addLog(id, `stopping owned process pid=${service.child.pid}`);
    await terminateChild(service.child);
    service.child = null;
    service.state = SERVICE_STATES.STOPPED;
    service.ownership = SERVICE_OWNERSHIP.STOPPED;
  }

  async stopOwnedServices(serviceIds = null) {
    const ids = serviceIds || Array.from(this.services.keys());
    await Promise.all(ids.map(async (id) => {
      const service = this.requireService(id);
      if (service.ownership === SERVICE_OWNERSHIP.OWNED || service.child) {
        await this.stopService(id);
      }
    }));
  }

  async forceCleanupPorts({ includeExternalQlc = false } = {}) {
    const ports = knownProjectPorts(this.services, { includeExternalQlc });
    this.addLog("debug", `Force cleanup requested for ports: ${ports.join(", ")}`);
    const results = [];
    for (const port of ports) {
      const listeners = await listenerProcessesForPort(port);
      if (!listeners.length) {
        results.push({ port, listeners: [], released: true, remainingListeners: [] });
        this.addLog("debug", `Port ${port}: no listener found`);
        continue;
      }
      for (const listener of listeners) {
        this.addLog("debug", `Port ${port} listener PID found: ${listener.pid} ${listener.commandLine}`);
      }
      const killed = await this.killProcesses(listeners, {
        serviceId: "debug",
        reason: `force cleanup on port ${port}`,
        force: true,
      });
      const remainingListeners = await listenerProcessesForPort(port);
      const released = remainingListeners.length === 0;
      if (released) {
        this.addLog("debug", `Port ${port} released`);
      } else {
        this.addLog("debug", `Port ${port} still occupied after kill`);
      }
      results.push({ port, listeners, killed, released, remainingListeners });
    }
    await this.refreshServiceStatuses();
    return {
      results,
      status: this.getSystemStatus(),
    };
  }

  async cleanStaleProjectServices() {
    const results = [];
    for (const service of this.services.values()) {
      if (!service.port || service.externalOnly) continue;
      const probe = await this.probeService(service);
      if (!probe.staleProjectService || !probe.processes?.length) continue;
      // eslint-disable-next-line no-await-in-loop
      const killed = await this.killProcesses(probe.processes, {
        serviceId: "debug",
        reason: `manual stale cleanup on port ${service.port}`,
      });
      results.push(...killed.map((entry) => ({ service: service.id, port: service.port, ...entry })));
    }
    return {
      results,
      status: this.getSystemStatus(),
    };
  }

  async probeService(service, { acceptAnyHttp = false } = {}) {
    if (!service.port) return { occupied: false, expected: false, detail: "no port" };
    const httpProbe = await probeHttpService({
      host: service.host || "127.0.0.1",
      port: service.port,
      path: service.probePath || "/",
      expectedJson: service.expectedJson,
      expectedContent: service.expectedContent,
      acceptAnyHttp,
    });
    if (!httpProbe.occupied) return httpProbe;
    const processes = await processesForPort(service.port);
    const staleProjectService = isStaleProjectService({
      projectRoot: this.projectRoot,
      service,
      processes,
    });
    return {
      ...httpProbe,
      processes,
      staleProjectService,
    };
  }

  async canOpenDashboard() {
    if (this.isSyncBlocked()) {
      this.addLog("webFrontend", "Dashboard blocked: app state refresh in progress");
      return {
        ok: false,
        error: "Dashboard blocked: refreshing app state after second launch.",
      };
    }
    const service = this.requireService("webFrontend");
    const probe = await this.probeService(service);
    if (probe.expected) {
      return { ok: true, url: this.dashboardUrl };
    }
    this.addLog("webFrontend", "Dashboard blocked: web frontend not healthy");
    return {
      ok: false,
      error: probe.staleProjectService
        ? "Dashboard blocked: web frontend is a stale project service."
        : "Dashboard blocked: web frontend not healthy.",
    };
  }

  async refreshServiceStatuses() {
    for (const [id, service] of this.services) {
      if (service.externalOnly) {
        // eslint-disable-next-line no-await-in-loop
        await this.refreshExternalService(id);
        continue;
      }
      if (service.child && service.state === SERVICE_STATES.STOPPING) {
        continue;
      }
      if (service.child && childIsAlive(service.child) && [SERVICE_STATES.STARTING, SERVICE_STATES.RUNNING].includes(service.state)) {
        if (!service.requiresHealthCheck || (service.state === SERVICE_STATES.STARTING && this.qlcBridgeStartPromise)) {
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const ownedProbe = await this.probeService(service);
        if (ownedProbe.expected) {
          service.state = SERVICE_STATES.RUNNING;
          service.ownership = SERVICE_OWNERSHIP.OWNED;
          service.error = null;
          continue;
        }
        service.state = SERVICE_STATES.ERROR;
        service.ownership = SERVICE_OWNERSHIP.ERROR;
        service.error = `Owned process pid=${service.child.pid} failed health check: ${ownedProbe.detail || "no response"}`;
        this.addLog(id, service.error);
        continue;
      }
      if (service.child && !childIsAlive(service.child)) {
        service.child = null;
      }
      // eslint-disable-next-line no-await-in-loop
      const probe = await this.probeService(service);
      if (probe.occupied && probe.expected) {
        service.state = SERVICE_STATES.REUSED;
        service.ownership = SERVICE_OWNERSHIP.REUSED;
        service.error = null;
      } else if (probe.occupied) {
        service.state = SERVICE_STATES.ERROR;
        service.ownership = probe.staleProjectService
          ? SERVICE_OWNERSHIP.STALE_PROJECT_SERVICE
          : SERVICE_OWNERSHIP.ERROR;
        service.error = probe.staleProjectService
          ? `Port ${service.port} contains stale project service.`
          : `Port ${service.port} is occupied by another process.`;
      } else {
        service.state = SERVICE_STATES.STOPPED;
        service.ownership = SERVICE_OWNERSHIP.STOPPED;
        service.error = null;
      }
    }
  }

  getSystemStatus() {
    const services = {};
    let hasStartingService = false;
    let hasStoppingService = false;
    let hasErrorService = false;
    for (const [id, service] of this.services) {
      if (service.state === SERVICE_STATES.STARTING) hasStartingService = true;
      if (service.state === SERVICE_STATES.STOPPING) hasStoppingService = true;
      if (service.state === SERVICE_STATES.ERROR) hasErrorService = true;
      services[id] = {
        id,
        status: service.state,
        label: service.label,
        state: service.state,
        ownership: service.ownership,
        command: service.command,
        args: service.args,
        port: service.port || null,
        url: service.url,
        optional: Boolean(service.optional),
        note: service.note || null,
        error: service.error || null,
        pid: service.child?.pid || null,
        healthy: [SERVICE_STATES.RUNNING, SERVICE_STATES.REUSED].includes(service.state)
          && ![SERVICE_OWNERSHIP.ERROR, SERVICE_OWNERSHIP.STALE_PROJECT_SERVICE].includes(service.ownership),
        recentLogs: this.logs.filter((entry) => entry.serviceId === id).slice(-12),
      };
    }
    const qlcBridgeStatus = this.buildQlcBridgeStatus(services);
    if (services.qlcBridge) {
      services.qlcBridge.statusDetails = [
        `QLC bridge 8791: ${qlcBridgeStatus.bridge8791}`,
        `DMX Dashboard diagnostic mirror: ${qlcBridgeStatus.diagnosticMirror}`,
        "Mode: dry-run diagnostics",
      ];
    }

    const requiredHealthy = ["webFrontend", "liveAudio"]
      .every((id) => services[id]?.healthy === true);

    let systemState = SERVICE_STATES.STOPPED;
    if (this.isSyncBlocked()) {
      systemState = "syncing";
    } else if (this.startPromise || hasStartingService) {
      systemState = SERVICE_STATES.STARTING;
    } else if (this.stopPromise || hasStoppingService) {
      systemState = SERVICE_STATES.STOPPING;
    } else if (requiredHealthy) {
      systemState = SERVICE_STATES.RUNNING;
    } else if (hasErrorService) {
      systemState = SERVICE_STATES.ERROR;
    }

    return {
      dashboardUrl: this.dashboardUrl,
      systemState,
      startInProgress: Boolean(this.startPromise),
      stopInProgress: Boolean(this.stopPromise),
      qlcBridgeStartInProgress: Boolean(this.qlcBridgeStartPromise),
      qlcBridgeStatus,
      syncInProgress: this.isSyncBlocked(),
      syncMessage: this.syncMessage,
      services,
    };
  }

  getLogs() {
    return this.logs.slice();
  }

  addLog(serviceId, message) {
    if (!message) return;
    const lines = String(message).split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      this.logs.push({
        time: new Date().toISOString(),
        serviceId,
        message: line,
      });
    }
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
  }

  requireService(id) {
    const service = this.services.get(id);
    if (!service) throw new Error(`Unknown desktop service: ${id}`);
    return service;
  }

  buildQlcBridgeStatus(services) {
    const bridge = services.qlcBridge;
    const bridgeRunning = bridge?.healthy === true;
    return {
      bridge8791: bridgeRunning ? "running" : (bridge?.state || SERVICE_STATES.STOPPED),
      physicalOutput: "not managed in diagnostic mode",
      diagnosticMirror: bridgeRunning ? "available" : "available via desktop IPC mirror when dashboard is open",
      diagnosticMode: true,
      dryRun: true,
      message: "QLC bridge 8791 uses dry-run diagnostics; QLC+ is not required for DMX Dashboard diagnostics.",
    };
  }

  async killProcesses(processes, { serviceId, reason, force = false }) {
    const results = [];
    for (const processInfo of processes) {
      try {
        process.kill(processInfo.pid, "SIGTERM");
        this.addLog(serviceId, `Killing PID ${processInfo.pid} with SIGTERM (${reason})`);
        results.push({ pid: processInfo.pid, killed: true });
      } catch (error) {
        this.addLog(serviceId, `${reason}: failed to kill pid ${processInfo.pid}: ${error.message}`);
        results.push({ pid: processInfo.pid, killed: false, error: error.message });
      }
    }
    await sleep(700);
    if (force) {
      for (const result of results) {
        const pidAlive = await pidExists(result.pid);
        if (!pidAlive) continue;
        try {
          process.kill(result.pid, "SIGKILL");
          this.addLog(serviceId, `Killing PID ${result.pid} with SIGKILL (${reason})`);
          result.forced = true;
        } catch (error) {
          this.addLog(serviceId, `${reason}: failed SIGKILL for pid ${result.pid}: ${error.message}`);
          result.forceError = error.message;
        }
      }
      await sleep(500);
    }
    return results;
  }
}

function probeHttpService({ host, port, path: probePath, expectedJson, expectedContent, acceptAnyHttp }) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host,
        port,
        path: probePath,
        timeout: 800,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 32768) {
            request.destroy();
          }
        });
        response.on("end", () => {
          const httpOk = response.statusCode >= 200 && response.statusCode < 500;
          let expected = acceptAnyHttp && httpOk;
          if (!expected && response.statusCode >= 200 && response.statusCode < 300) {
            if (expectedJson) {
              try {
                expected = Boolean(expectedJson(JSON.parse(body)));
              } catch (_error) {
                expected = false;
              }
            } else if (expectedContent) {
              expected = Boolean(expectedContent(body, response));
            } else {
              expected = true;
            }
          }
          resolve({
            occupied: true,
            expected,
            statusCode: response.statusCode,
            detail: `HTTP ${response.statusCode}`,
          });
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", (error) => {
      if (error.code === "ECONNREFUSED") {
        resolve({ occupied: false, expected: false, detail: "connection refused" });
      } else {
        resolve({ occupied: true, expected: false, detail: error.message });
      }
    });
  });
}

function joinPathList(first, existing) {
  return existing ? `${first}${path.delimiter}${existing}` : first;
}

function formatCommandForLog(command, args = []) {
  return [command, ...args]
    .map((part) => (/\s/u.test(String(part)) ? JSON.stringify(String(part)) : String(part)))
    .join(" ");
}

function childIsAlive(child) {
  return Boolean(child) && child.exitCode === null && child.signalCode === null && !child.killed;
}

function terminateChild(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      try {
        if (!child.killed) child.kill("SIGKILL");
      } catch (_error) {
        // Process may already be gone.
      }
      resolve();
    }, 2500);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      child.kill("SIGTERM");
    } catch (_error) {
      clearTimeout(timeout);
      resolve();
    }
  });
}

function knownProjectPorts(services) {
  return Array.from(new Set(
    Array.from(services.values())
      .map((service) => service.port)
      .filter((port) => Number.isInteger(port) && port > 0),
  )).sort((a, b) => a - b);
}

function listenerPidsForPort(port) {
  return new Promise((resolve) => {
    execFile("lsof", ["-nP", `-tiTCP:${port}`, "-sTCP:LISTEN"], { timeout: 1200 }, (error, stdout) => {
      if (error && !stdout) {
        resolve([]);
        return;
      }
      const pids = stdout
        .split(/\s+/)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid);
      resolve(Array.from(new Set(pids)));
    });
  });
}

function processesForPort(port) {
  return new Promise((resolve) => {
    listenerPidsForPort(port).then(async (pids) => {
      const uniquePids = Array.from(new Set(pids));
      const processes = [];
      for (const pid of uniquePids) {
        // eslint-disable-next-line no-await-in-loop
        processes.push(await processInfo(pid));
      }
      resolve(processes.filter(Boolean));
    }).catch(() => resolve([]));
  });
}

function listenerProcessesForPort(port) {
  return processesForPort(port);
}

function processInfo(pid) {
  return new Promise((resolve) => {
    execFile("ps", ["-p", String(pid), "-o", "pid=", "-o", "command="], { timeout: 1000 }, (psError, psStdout) => {
      if (psError || !psStdout.trim()) {
        resolve(null);
        return;
      }
      execFile("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { timeout: 1000 }, (_cwdError, cwdStdout) => {
        const commandLine = psStdout.trim();
        const cwdLine = cwdStdout
          .split(/\r?\n/)
          .find((line) => line.startsWith("n"));
        resolve({
          pid,
          commandLine,
          cwd: cwdLine ? cwdLine.slice(1) : "",
        });
      });
    });
  });
}

function isStaleProjectService({ projectRoot, service, processes }) {
  if (!processes.length) return false;
  return processes.some((processInfo) => {
    const inProject = processInfo.cwd && processInfo.cwd.startsWith(projectRoot);
    const matchesService = (service.staleMatchers || []).some((token) => processInfo.commandLine.includes(token));
    return inProject && matchesService;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pidExists(pid) {
  return new Promise((resolve) => {
    execFile("ps", ["-p", String(pid)], { timeout: 1000 }, (error, stdout) => {
      resolve(Boolean(!error && stdout && stdout.includes(String(pid))));
    });
  });
}

module.exports = {
  DesktopProcessManager,
  SERVICE_OWNERSHIP,
  SERVICE_STATES,
  DEFAULT_QLC_FIXTURE_MAP_PATH,
};
