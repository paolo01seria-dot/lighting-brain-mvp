const colors = [
  { name: "red", value: [255, 76, 91] },
  { name: "amber", value: [255, 196, 87] },
  { name: "green", value: [88, 221, 130] },
  { name: "blue", value: [88, 123, 255] },
  { name: "white", value: [245, 247, 248] },
];

const trainingColors = [
  { name: "red", value: [255, 76, 91] },
  { name: "green", value: [88, 221, 130] },
  { name: "blue", value: [88, 123, 255] },
  { name: "yellow", value: [255, 220, 88] },
  { name: "white", value: [245, 247, 248] },
  { name: "casual", value: null },
  { name: "blackout", value: [0, 0, 0], blackout: true },
];

const casualTrainingColors = [
  [255, 76, 91],
  [88, 221, 130],
  [255, 220, 88],
  [88, 123, 255],
  [174, 96, 255],
  [245, 247, 248],
];

const positionNaming = {
  totalFixtureSlots: 32,
  centreDeadbandPercent: 4,
  sideInnerPercent: 25,
};

const componentLaneNames = ["drum", "bass", "vocal", "other"];
const componentLaneLabels = {
  drum: "Drum",
  bass: "Bass",
  vocal: "Vocal",
  other: "Other",
};
const componentLaneWindowSeconds = 5;
const liveSpectrumPixelsPerSecond = 180;
const trainingSpectrumPixelsPerSecond = 150;
const qlcBridgeUrl = "http://127.0.0.1:8791";
const qlcWebMinIntervalMs = 50;
const qlcMinHoldMs = 120;
const qlcAllowedPalettes = {
  primary_rgb_test: {
    red: [255, 0, 0],
    green: [0, 255, 0],
    blue: [0, 0, 255],
  },
  limited_rgb_palette: {
    red: [255, 0, 0],
    green: [0, 255, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    violet: [255, 0, 255],
  },
};
const qlcPrimaryColors = qlcAllowedPalettes.primary_rgb_test;
const qlcLimitedColors = qlcAllowedPalettes.limited_rgb_palette;
const qlcColorNames = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  violet: [255, 0, 255],
};

const genreProfiles = {
  house: { smoothing: 0.48, pulse: 1.28, palette: [1, 2, 3, 4], motion: "bounce", chase: 1.0, threshold: 0.062, decay: 0.78, spread: 2 },
  techno: { smoothing: 0.54, pulse: 1.34, palette: [3, 4, 0], motion: "scan", chase: 1.4, threshold: 0.058, decay: 0.82, spread: 2 },
  metal: { smoothing: 0.36, pulse: 1.58, palette: [0, 4, 3], motion: "hits", chase: 1.95, threshold: 0.055, decay: 0.7, spread: 3 },
  electronic: { smoothing: 0.48, pulse: 1.35, palette: [2, 3, 4, 0], motion: "spiral", chase: 1.25, threshold: 0.06, decay: 0.76, spread: 2 },
  garage: { smoothing: 0.44, pulse: 1.3, palette: [1, 2, 0, 4], motion: "stagger", chase: 1.15, threshold: 0.058, decay: 0.74, spread: 2 },
};

const elements = {
  inputSource: document.querySelector("#inputSource"),
  audioFile: document.querySelector("#audioFile"),
  timelineFile: document.querySelector("#timelineFile"),
  audioDevice: document.querySelector("#audioDevice"),
  audioDeviceSummary: document.querySelector("#audioDeviceSummary"),
  trackLabel: document.querySelector("#trackLabel"),
  outputTarget: document.querySelector("#outputTarget"),
  outputLabel: document.querySelector("#outputLabel"),
  qlcProfile: document.querySelector("#qlcProfile"),
  qlcFixtureCapacity: document.querySelector("#qlcFixtureCapacity"),
  qlcPalette: document.querySelector("#qlcPalette"),
  qlcSmooth: document.querySelector("#qlcSmooth"),
  genreProfile: document.querySelector("#genreProfile"),
  playButton: document.querySelector("#playButton"),
  stopButton: document.querySelector("#stopButton"),
  reviewPlayButton: document.querySelector("#reviewPlayButton"),
  stateLabel: document.querySelector("#stateLabel"),
  energyLabel: document.querySelector("#energyLabel"),
  energyFill: document.querySelector("#energyFill"),
  trackOverview: document.querySelector("#trackOverview"),
  spectrumScroller: document.querySelector("#spectrumScroller"),
  liveSpectrum: document.querySelector("#liveSpectrum"),
  eventLog: document.querySelector("#eventLog"),
  lightCount: document.querySelector("#lightCount"),
  differentiation: document.querySelector("#differentiation"),
  differentiationValue: document.querySelector("#differentiationValue"),
  seekSlider: document.querySelector("#seekSlider"),
  currentTimeLabel: document.querySelector("#currentTimeLabel"),
  durationLabel: document.querySelector("#durationLabel"),
  trainingMode: document.querySelector("#trainingMode"),
  trainingDuration: document.querySelector("#trainingDuration"),
  sampleTagInput: document.querySelector("#sampleTagInput"),
  currentSampleCategory: document.querySelector("#currentSampleCategory"),
  currentSceneCategory: document.querySelector("#currentSceneCategory"),
  currentIntent: document.querySelector("#currentIntent"),
  currentLightingIntent: document.querySelector("#currentLightingIntent"),
  currentTimingIntent: document.querySelector("#currentTimingIntent"),
  currentPhaseSummary: document.querySelector("#currentPhaseSummary"),
  currentGesture: document.querySelector("#currentGesture"),
  currentEnergyTrend: document.querySelector("#currentEnergyTrend"),
  cueNameInput: document.querySelector("#cueNameInput"),
  cueProbabilityInput: document.querySelector("#cueProbabilityInput"),
  saveAnnotationButton: document.querySelector("#saveAnnotationButton"),
  blackoutSceneButton: document.querySelector("#blackoutSceneButton"),
  copySceneButton: document.querySelector("#copySceneButton"),
  pasteSceneButton: document.querySelector("#pasteSceneButton"),
  downloadAnnotationsButton: document.querySelector("#downloadAnnotationsButton"),
  clearTrainingLightsButton: document.querySelector("#clearTrainingLightsButton"),
  trainingSummary: document.querySelector("#trainingSummary"),
  resetLayoutButton: document.querySelector("#resetLayoutButton"),
  stage: document.querySelector("#stage"),
};

let audioContext;
let analyser;
let sourceNode;
let audioElement;
let mediaElementSource;
let objectUrl;
let mediaStream;
let mediaSourceNode;
let liveEventSource;
let audioBuffer;
let loadedFileName = "";
let loadedTimelineName = "";
let timelineEvents = [];
let timelineRhythmEvents = [];
let timelineDuration = 0;
let musicalTimeline = createEmptyMusicalTimeline();
let timelineCurrentEvent = null;
let timelineCurrentRhythmEvent = null;
let timelinePausedAt = 0;
let timelineStartedAt = 0;
let timelineNextIndex = 0;
let timelineNextRhythmIndex = 0;
let startedAt = 0;
let pausedAt = 0;
let animationFrame;
let timelineAnimationFrame;
let reviewAnimationFrame;
let reviewAudioSource;
let reviewAudioElement;
let reviewAudioObjectUrl;
let reviewAudioUsesOriginalElement = false;
let reviewPlaybackStartedAt = 0;
let reviewPlaybackStartTime = 0;
let isPlaying = false;
let inputMode = "system_audio";
let lastTrainingAudioDebugAt = -1;
let lastPhaseRenderLogSecond = -1;
let lastReviewSyncLogSecond = -1;
let lastReviewRenderLogAt = 0;
let reviewRenderFrameCount = 0;
let lastReviewPerfLogAt = 0;
let reviewPerfFrameCount = 0;
let reviewPerfDomWrites = 0;
let lastManualOverrideAppliedKey = null;
let lastManualOverrideMissingKey = null;
let lastEditKeyLogAt = 0;
let lastBrainSourceLogSecond = -1;
let lastTrainingAuditAt = 0;
let lastTrainingAuditReason = "";
let trainingReviewAuditedAfterCapture = false;
let overviewCacheCanvas;
let previousSpectrum;
let sceneVariant = 0;
let lastSceneCategory = "ambient_no_beat";
let smoothedEnergy = 0;
let previousEnergy = 0;
let previousLow = 0;
let previousMid = 0;
let previousHigh = 0;
let previousRms = 0;
let lastEnergyDropTime = -999;
let musicalClock = {
  lastPulseTime: null,
  interval: null,
  confidence: 0,
  source: "none",
};
let frameCounter = 0;
let lastEventSecond = -1;
let categoryCounters = {};
let currentSceneByCategory = {};
let componentHistory = [];
let liveSpectrumWindowStartedAt = null;
const enableAdvancedCueEditing = false;
let cueEditingDisabledLogged = false;
let lastQlcWebSendAt = 0;
let lastQlcWebSceneKey = "";
let qlcWebBlackoutSent = false;
let activeOutputTarget = elements.outputTarget?.value ?? "tester";
let lastQlcPhysicalColorKey = "";
let lastQlcPhysicalColorAt = 0;
let lastQlcPhysicalPhaseMode = "";
let lastQlcHeldLogAt = 0;
let lastQlcSmoothModeLog = "";
let lastQlcCapacityColorKey = "";
let lastQlcCapacityColorAt = 0;
let lastQlcCapacitySceneCategory = "";
let lastQlcCapacitySelectedIntent = "";
let lastQlcCapacityIntensity = 0;
let lastQlcCapacityLogAt = 0;

let lights = [];
let lightStates = [];
let positions = [];
let dragging = null;
let trainingAnnotations = [];
let selectedTrainingCueId = null;
let copiedTrainingScene = null;
let lastLightOffReasonById = {};
let trainingCapture = {
  active: false,
  frames: [],
  cues: [],
  suppressedCueTimes: [],
  duration: 0,
  reviewTime: 0,
  startedAt: 0,
  source: null,
  audioSamples: [],
  audioSampleRate: null,
  manualOverridesByKey: {},
};

function buildLights(count, keepPositions = true) {
  const nextCount = clamp(Math.round(count), 1, 32);
  elements.lightCount.value = String(nextCount);
  syncQlcFixtureCapacity(nextCount);
  if (!keepPositions || positions.length !== nextCount) {
    positions = defaultPositions(nextCount);
  }
  elements.stage.querySelectorAll(".light").forEach((light) => light.remove());
  lights = [];
  lightStates = [];

  positions.forEach((position, index) => {
    const light = document.createElement("div");
    light.setAttribute("role", "button");
    light.tabIndex = 0;
    light.className = "light";
    light.dataset.index = String(index);
    light.title = positionName(index);
    light.style.left = `${position.x}%`;
    light.style.top = `${position.y}%`;
    ["bulb-base", "bulb-depth", "bulb-rim", "bulb-highlight"].forEach((className) => {
      const layer = document.createElement("span");
      layer.className = className;
      light.appendChild(layer);
    });
    const label = document.createElement("span");
    label.className = "light-label";
    label.textContent = positionName(index);
    light.appendChild(label);
    ["first", "second"].forEach((phase) => {
      const phaseButton = document.createElement("button");
      phaseButton.type = "button";
      phaseButton.className = `phase-button phase-button-${phase}`;
      phaseButton.dataset.phase = phase;
      phaseButton.title = phase === "first" ? "Prima meta BPM" : "Seconda meta BPM";
      phaseButton.addEventListener("pointerdown", stopPhaseButtonEvent);
      phaseButton.addEventListener("click", toggleTrainingLightPhase);
      phaseButton.addEventListener("contextmenu", stopPhaseButtonEvent);
      light.appendChild(phaseButton);
    });
    light.addEventListener("pointerdown", startDrag);
    light.addEventListener("contextmenu", cycleTrainingLightBackward);
    elements.stage.appendChild(light);
    lights.push(light);
    lightStates.push({
      intensity: 0,
      age: 999,
      colorIndex: index % colors.length,
      manualColorIndex: null,
      manualRandomColor: null,
      phaseFirstHalf: true,
      phaseSecondHalf: true,
      phaseMode: "full_beat",
      timingIntent: "sustain",
      enabled: true,
      colorMode: "auto",
      blackout: false,
    });
  });

  renderLights();
}

function refreshLightPositionLabels() {
  lights.forEach((light, index) => {
    const label = light.querySelector(".light-label");
    const name = positionName(index);
    light.title = name;
    if (label) label.textContent = name;
  });
}

function positionName(index) {
  const info = positionInfo(index);
  if (info.side === "centre") {
    return `${info.zone}-${info.position}`;
  }
  return `${info.zone}-${info.side}-${info.position}`;
}

function positionInfo(index) {
  const position = positions[index] ?? { x: 50, y: 50 };
  const zone = positionZone(position);
  const side = positionSide(index, position, zone);
  const slotsPerQuarter = Math.max(1, Math.ceil(positionNaming.totalFixtureSlots / 4));
  const outer =
    side === "L"
      ? position.x <= positionNaming.sideInnerPercent
      : side === "R"
        ? position.x >= 100 - positionNaming.sideInnerPercent
        : false;
  const sameZoneSide = positions
    .map((candidate, candidateIndex) => ({ ...candidate, index: candidateIndex }))
    .filter((candidate) => {
      const candidateZone = positionZone(candidate);
      const candidateSide = positionSide(candidate.index, candidate, candidateZone);
      const candidateOuter =
        candidateSide === "L"
          ? candidate.x <= positionNaming.sideInnerPercent
          : candidateSide === "R"
            ? candidate.x >= 100 - positionNaming.sideInnerPercent
            : false;
      return candidateZone === zone && candidateSide === side && candidateOuter === outer;
    })
    .sort((left, right) => {
      if (side === "centre") return left.y - right.y;
      if (!outer) return Math.abs(left.x - 50) - Math.abs(right.x - 50);
      return side === "L" ? left.x - right.x : right.x - left.x;
    });
  const rank = clamp(
    Math.max(1, sameZoneSide.findIndex((candidate) => candidate.index === index) + 1),
    1,
    slotsPerQuarter
  );
  const centrePosition = side === "centre" ? centrePositionInfo(index, zone) : null;
  const macroGroup = side === "centre"
    ? `${zone}-centre-all`
    : `${zone}-${side}-${outer ? "all-to-last" : "all"}`;
  return {
    zone,
    side,
    rank,
    position: centrePosition?.label ?? (outer ? fromLastLabel(rank) : String(rank)),
    centre_offset: centrePosition?.offset ?? null,
    outer,
    macro_group: macroGroup,
    slots_per_quarter: slotsPerQuarter,
  };
}

function positionZone(position) {
  return position.y < 33 ? "up" : position.y < 66 ? "middle" : "down";
}

function positionSide(index, position, zone) {
  if (Math.abs(position.x - 50) >= positionNaming.centreDeadbandPercent) {
    return position.x < 50 ? "L" : "R";
  }

  return "centre";
}

function centrePositionInfo(index, zone) {
  const centreCandidates = positions
    .map((candidate, candidateIndex) => ({ ...candidate, index: candidateIndex }))
    .filter((candidate) => {
      return positionZone(candidate) === zone && Math.abs(candidate.x - 50) < positionNaming.centreDeadbandPercent;
    })
    .sort((left, right) => {
      if (left.y !== right.y) return left.y - right.y;
      return left.index - right.index;
    });

  const order = centreCandidates.findIndex((candidate) => candidate.index === index);
  const centreOrder = Math.floor((centreCandidates.length - 1) / 2);
  const offset = centreOrder - order;
  if (offset === 0) {
    return { label: "centre", offset };
  }
  return { label: `centre${offset > 0 ? "+" : ""}${offset}`, offset };
}

function fromLastLabel(rank) {
  if (rank <= 1) return "last";
  return `${rank}-to-last`;
}

function defaultPositions(count) {
  const result = [];
  const centerX = 50;
  const centerY = 52;
  const radiusX = 32;
  const radiusY = 28;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    result.push({
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    });
  }
  return result;
}

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.72;
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

async function loadAudioFile(file) {
  await ensureAudioContext();
  stopDeviceInput();
  stopTimelinePlayback({ resetPosition: true, keepLights: true });
  stopPlayback({ resetPosition: true });
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrl = URL.createObjectURL(file);
  ensureAudioElement();
  audioElement.src = objectUrl;
  audioElement.load();

  loadedFileName = file.name;
  audioBuffer = null;
  overviewCacheCanvas = null;
  pausedAt = 0;
  elements.trackLabel.textContent = loadedFileName;
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.seekSlider.disabled = false;
  drawTrackOverview();
  updatePlayerTime();
  setState("Ready");
  logEvent(`loaded ${file.name}`);

  file.arrayBuffer().then((data) => {
    return audioContext.decodeAudioData(data);
  }).then((decodedBuffer) => {
    audioBuffer = decodedBuffer;
    overviewCacheCanvas = null;
    drawTrackOverview();
    updatePlayerTime();
  }).catch(() => {
    audioBuffer = null;
    drawTrackOverview();
    logEvent("overview unavailable");
  });
}

function createEmptyMusicalTimeline(source = null, duration = 0) {
  return {
    source,
    duration: Number.isFinite(Number(duration)) ? Number(duration) : 0,
    segments: [],
    beats: [],
    downbeats: [],
    onsets: [],
    events: [],
    lightFrames: [],
    cursor: {
      time: 0,
      frameIndex: -1,
      beatIndex: -1,
      segmentIndex: -1,
    },
  };
}

function numericTime(value, fallback = 0) {
  const time = Number(value);
  return Number.isFinite(time) ? time : fallback;
}

function normalizeAllInOneTimeline(raw) {
  const source = raw?.source ?? raw?.name ?? raw?.track ?? "all_in_one_json";
  const timeline = raw?.timeline ?? raw ?? {};
  const missingFields = [];
  const rawBeats = Array.isArray(timeline.beats) ? timeline.beats : [];
  const rawDownbeats = Array.isArray(timeline.downbeats) ? timeline.downbeats : [];
  const rawSegments = Array.isArray(timeline.segments)
    ? timeline.segments
    : Array.isArray(timeline.sections)
      ? timeline.sections
      : [];
  const rawBoundaries = Array.isArray(timeline.segment_boundaries) ? timeline.segment_boundaries : [];
  const rawLabels = Array.isArray(timeline.segment_labels)
    ? timeline.segment_labels
    : Array.isArray(timeline.labels)
      ? timeline.labels
      : [];
  const rawOnsets = Array.isArray(timeline.onsets)
    ? timeline.onsets
    : Array.isArray(timeline.activations)
      ? timeline.activations
      : [];
  const rawEvents = Array.isArray(timeline.events) ? timeline.events : [];

  [
    ["beats", rawBeats],
    ["downbeats", rawDownbeats],
    ["segments/sections", rawSegments.length ? rawSegments : rawBoundaries],
    ["onsets/activations", rawOnsets],
    ["events", rawEvents],
  ].forEach(([field, value]) => {
    if (!value.length) missingFields.push(field);
  });

  const beats = rawBeats.map((beat, index) => {
    const time = typeof beat === "number" ? beat : numericTime(beat.time ?? beat.start ?? beat.at, NaN);
    return {
      time,
      index: Number(beat.index ?? beat.beat_index ?? index),
      bpm: Number(beat.bpm ?? timeline.bpm ?? 0) || null,
      confidence: clamp(Number(beat.confidence ?? beat.probability ?? 1), 0, 1),
    };
  }).filter((beat) => Number.isFinite(beat.time)).sort((left, right) => left.time - right.time);

  const downbeats = rawDownbeats.map((downbeat) => {
    const time = typeof downbeat === "number" ? downbeat : numericTime(downbeat.time ?? downbeat.start ?? downbeat.at, NaN);
    const beatIndex = beats.findIndex((beat) => Math.abs(beat.time - time) <= 0.04);
    return {
      time,
      beat_index: Number(downbeat.beat_index ?? downbeat.index ?? (beatIndex >= 0 ? beatIndex : 0)),
      confidence: clamp(Number(downbeat.confidence ?? downbeat.probability ?? 1), 0, 1),
    };
  }).filter((downbeat) => Number.isFinite(downbeat.time)).sort((left, right) => left.time - right.time);

  const segments = rawSegments.length
    ? rawSegments.map((segment, index) => normalizeMusicalSegment(segment, index, rawSegments, rawLabels))
    : rawBoundaries.map((start, index) => ({
      start: numericTime(start, 0),
      end: numericTime(rawBoundaries[index + 1], numericTime(timeline.duration, numericTime(start, 0))),
      label: rawLabels[index]?.label ?? rawLabels[index] ?? `segment_${index + 1}`,
      confidence: 1,
      sample_category: rawLabels[index]?.sample_category ?? null,
      scene_category: rawLabels[index]?.scene_category ?? null,
      energy_summary: rawLabels[index]?.energy_summary ?? null,
    }));

  const onsets = rawOnsets.map((onset) => {
    const time = typeof onset === "number" ? onset : numericTime(onset.time ?? onset.start ?? onset.at, NaN);
    return {
      time,
      strength: clamp(Number(onset.strength ?? onset.value ?? onset.activation ?? onset.energy ?? 1), 0, 1),
      band: onset.band ?? onset.component ?? onset.lane ?? "full",
      source: onset.source ?? "all_in_one",
      confidence: clamp(Number(onset.confidence ?? onset.probability ?? 1), 0, 1),
    };
  }).filter((onset) => Number.isFinite(onset.time)).sort((left, right) => left.time - right.time);

  const events = normalizeMusicalEvents({ rawEvents, beats, downbeats, segments, onsets });
  const lastTime = Math.max(
    numericTime(timeline.duration, 0),
    ...events.map((event) => event.time),
    ...segments.map((segment) => segment.end),
    ...beats.map((beat) => beat.time),
    ...onsets.map((onset) => onset.time)
  );
  const normalized = {
    ...createEmptyMusicalTimeline(source, lastTime),
    segments: segments.filter((segment) => Number.isFinite(segment.start)).sort((left, right) => left.start - right.start),
    beats,
    downbeats,
    onsets,
    events,
  };
  normalized.lightFrames = buildLightFramesFromMusicalTimeline(normalized);
  normalized.cursor = musicalTimelineCursorAt(normalized, 0);
  logEvent(
    `[all-in-one] loaded beats=${normalized.beats.length} downbeats=${normalized.downbeats.length} `
    + `segments=${normalized.segments.length} onsets=${normalized.onsets.length} events=${normalized.events.length} `
    + `duration=${roundNumber(normalized.duration, 3)}`
  );
  if (missingFields.length) logEvent(`[all-in-one] missing fields: ${missingFields.join(", ")}`);
  return normalized;
}

function normalizeMusicalSegment(segment, index, allSegments, labels) {
  const start = numericTime(segment.start ?? segment.time ?? segment.at, 0);
  const nextStart = allSegments[index + 1]?.start ?? allSegments[index + 1]?.time ?? allSegments[index + 1]?.at;
  return {
    start,
    end: numericTime(segment.end ?? segment.stop ?? nextStart, start),
    label: segment.label ?? segment.name ?? labels[index]?.label ?? labels[index] ?? `segment_${index + 1}`,
    confidence: clamp(Number(segment.confidence ?? segment.probability ?? 1), 0, 1),
    sample_category: segment.sample_category ?? segment.category ?? null,
    scene_category: segment.scene_category ?? segment.scene ?? null,
    energy_summary: segment.energy_summary ?? segment.energy ?? null,
  };
}

function normalizeMusicalEvents({ rawEvents, beats, downbeats, segments, onsets }) {
  const events = rawEvents.map((event) => ({
    time: numericTime(event.time ?? event.start ?? event.at, NaN),
    type: event.type ?? "light_change",
    source: event.source ?? "timeline_json",
    confidence: clamp(Number(event.confidence ?? event.probability ?? 1), 0, 1),
    metadata: event.metadata ?? event,
  })).filter((event) => Number.isFinite(event.time));
  segments.forEach((segment, index) => {
    events.push({ time: segment.start, type: "segment_start", source: "segment", confidence: segment.confidence, metadata: { index, segment } });
    if (Number.isFinite(segment.end) && segment.end > segment.start) {
      events.push({ time: segment.end, type: "segment_end", source: "segment", confidence: segment.confidence, metadata: { index, segment } });
    }
  });
  beats.forEach((beat) => events.push({ time: beat.time, type: "beat", source: "beat", confidence: beat.confidence, metadata: { beat } }));
  downbeats.forEach((downbeat) => events.push({ time: downbeat.time, type: "downbeat", source: "downbeat", confidence: downbeat.confidence, metadata: { downbeat } }));
  onsets.forEach((onset) => events.push({ time: onset.time, type: "onset", source: onset.source, confidence: onset.confidence, metadata: { onset } }));
  return events.sort((left, right) => left.time - right.time || eventTypePriority(left.type) - eventTypePriority(right.type));
}

function eventTypePriority(type) {
  return {
    segment_start: 0,
    downbeat: 1,
    beat: 2,
    onset: 3,
    manual_cut: 4,
    light_change: 5,
    segment_end: 6,
  }[type] ?? 9;
}

function buildLightFramesFromMusicalTimeline(timeline) {
  const boundaries = new Map();
  const addBoundary = (time, sourceEvent) => {
    const safeTime = roundNumber(clamp(Number(time), 0, Math.max(timeline.duration, 0)), 4);
    if (!Number.isFinite(safeTime)) return;
    const key = String(safeTime);
    const existing = boundaries.get(key) ?? { time: safeTime, sourceEvents: [] };
    if (sourceEvent) existing.sourceEvents.push(sourceEvent);
    boundaries.set(key, existing);
  };
  addBoundary(0, { type: "start", source: timeline.source });
  addBoundary(timeline.duration, { type: "end", source: timeline.source });
  timeline.segments.forEach((segment) => {
    addBoundary(segment.start, { type: "segment_start", segment });
    addBoundary(segment.end, { type: "segment_end", segment });
  });
  timeline.beats.forEach((beat) => addBoundary(beat.time, { type: "beat", beat }));
  addSingleFixtureThreeQuarterBoundaries(timeline, addBoundary);
  timeline.downbeats.forEach((downbeat) => addBoundary(downbeat.time, { type: "downbeat", downbeat }));
  timeline.onsets
    .filter((onset) => onset.strength >= 0.58 || onset.confidence >= 0.75)
    .forEach((onset) => addBoundary(onset.time, { type: "onset", onset }));
  timeline.events
    .filter((event) => ["manual_cut", "light_change", "segment_start", "segment_end", "downbeat"].includes(event.type))
    .forEach((event) => addBoundary(event.time, event));

  const ordered = [...boundaries.values()].sort((left, right) => left.time - right.time);
  const frames = [];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index].time;
    const end = ordered[index + 1].time;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const segment = segmentAtMusicalTime(timeline, start);
    const sourceEvent = preferredSourceEvent(ordered[index].sourceEvents);
    const metadataEvent = preferredMetadataEvent(ordered[index].sourceEvents) ?? sourceEvent;
    const metadata = metadataEvent?.metadata ?? {};
    frames.push({
      id: `lf_${String(frames.length + 1).padStart(4, "0")}`,
      time: start,
      end_time: end,
      editable: true,
      source_event: sourceEvent?.type ?? "musical_boundary",
      sample_category: metadata.sample_category ?? segment?.sample_category ?? null,
      scene_category: metadata.scene_category ?? metadata.scene ?? segment?.scene_category ?? null,
      timing_intent: metadata.timing_intent ?? metadata.lighting?.timing_intent ?? null,
      lighting_intent: metadata.lighting_intent ?? metadata.designer_logic?.lighting_intent ?? metadata.intent ?? null,
      light_snapshot: Array.isArray(metadata.light_snapshot) ? deepCopyLightSnapshot(metadata.light_snapshot) : null,
    });
  }
  return frames;
}

function addSingleFixtureThreeQuarterBoundaries(timeline, addBoundary) {
  if ((lights.length || Number(elements.lightCount?.value ?? 1)) > 1) return;
  const beats = [...(timeline.beats ?? [])].sort((left, right) => Number(left.time ?? 0) - Number(right.time ?? 0));
  beats.forEach((beat, index) => {
    const start = Number(beat.time ?? 0);
    if (!Number.isFinite(start)) return;
    const sourceSnapshot = frameSnapshotAtOrBefore(timeline, start);
    if (!snapshotUsesSingleFixtureThreeQuarterHold(sourceSnapshot)) return;
    const nextBeat = Number(beats[index + 1]?.time);
    const intervalFromBpm = Number(beat.bpm) > 0 ? 60 / Number(beat.bpm) : null;
    const interval = Number.isFinite(nextBeat) && nextBeat > start
      ? nextBeat - start
      : Number.isFinite(intervalFromBpm)
        ? intervalFromBpm
        : null;
    if (!Number.isFinite(interval) || interval <= 0) return;
    const blackoutTime = start + interval * 0.75;
    const endTime = Math.min(start + interval, timeline.duration);
    if (blackoutTime > start && blackoutTime < endTime) {
      addBoundary(blackoutTime, {
        type: "single_fixture_blackout_quarter",
        metadata: {
          sample_category: "single_fixture_blackout_quarter",
          scene_category: "single_fixture_3_4_full_1_4_black",
          timing_intent: "blackout",
          lighting_intent: "blackout",
          light_snapshot: blackoutSnapshotFrom(sourceSnapshot),
        },
      });
    }
    addBoundary(endTime, {
      type: "single_fixture_beat_end",
      metadata: {
        sample_category: "single_fixture_beat_end",
        scene_category: "single_fixture_beat_boundary",
        timing_intent: "single_fixture_three_quarter_hold",
        lighting_intent: "single_fixture_hold",
      },
    });
  });
}

function snapshotUsesSingleFixtureThreeQuarterHold(snapshot) {
  if (!Array.isArray(snapshot)) return false;
  return snapshot.some((state) => state?.timingIntent === "single_fixture_three_quarter_hold");
}

function preferredSourceEvent(sourceEvents) {
  if (!Array.isArray(sourceEvents) || !sourceEvents.length) return null;
  return [...sourceEvents].sort((left, right) => eventTypePriority(left.type) - eventTypePriority(right.type))[0];
}

function preferredMetadataEvent(sourceEvents) {
  if (!Array.isArray(sourceEvents) || !sourceEvents.length) return null;
  return [...sourceEvents]
    .filter((event) => event?.metadata?.light_snapshot || event?.metadata?.timing_intent || event?.metadata?.lighting_intent)
    .sort((left, right) => eventTypePriority(left.type) - eventTypePriority(right.type))[0] ?? null;
}

function frameSnapshotAtOrBefore(timeline, time) {
  const events = [...(timeline.events ?? [])]
    .filter((event) => Number(event.time ?? 0) <= time + 0.0001 && Array.isArray(event.metadata?.light_snapshot))
    .sort((left, right) => Number(right.time ?? 0) - Number(left.time ?? 0));
  return events[0]?.metadata?.light_snapshot ?? null;
}

function segmentAtMusicalTime(timeline, time) {
  return timeline.segments.find((segment) => time >= segment.start && time < segment.end) ?? null;
}

function musicalTimelineCursorAt(timeline, time) {
  const safeTime = clamp(Number(time ?? 0), 0, Math.max(timeline.duration, 0));
  return {
    time: safeTime,
    frameIndex: timeline.lightFrames.findIndex((frame) => safeTime >= frame.time && safeTime < frame.end_time),
    beatIndex: lastIndexAtOrBefore(timeline.beats, safeTime, "time"),
    segmentIndex: timeline.segments.findIndex((segment) => safeTime >= segment.start && safeTime < segment.end),
  };
}

function lastIndexAtOrBefore(items, time, property) {
  let found = -1;
  items.forEach((item, index) => {
    if (Number(item[property] ?? 0) <= time) found = index;
  });
  return found;
}

async function loadTimelineFile(file) {
  stopDeviceInput();
  stopPlayback({ resetPosition: true, keepLights: true });
  stopTimelinePlayback({ resetPosition: true, keepLights: true });

  const text = await file.text();
  const parsed = JSON.parse(text);
  const timeline = parsed.timeline ?? parsed;
  musicalTimeline = normalizeAllInOneTimeline({ ...timeline, source: file.name });
  const events = Array.isArray(timeline.events) ? timeline.events : [];
  if (!events.length && !musicalTimeline.events.length) {
    throw new Error("Timeline JSON senza eventi");
  }

  const playbackEvents = events.length
    ? events
    : musicalTimeline.events
      .filter((event) => ["segment_start", "downbeat", "onset", "light_change"].includes(event.type))
      .map((event) => ({
        time: event.time,
        scene: event.metadata?.segment?.label ?? event.type,
        sample_category: event.metadata?.segment?.sample_category ?? event.metadata?.sample_category ?? null,
        category: event.metadata?.segment?.sample_category ?? null,
        intent: event.metadata?.lighting_intent ?? event.type,
        metadata: event.metadata ?? {},
      }));

  timelineEvents = playbackEvents
    .map((event) => ({
      ...event,
      time: Number(event.time ?? event.at ?? 0),
    }))
    .filter((event) => Number.isFinite(event.time))
    .sort((left, right) => left.time - right.time);
  timelineRhythmEvents = (Array.isArray(timeline.rhythm_events) ? timeline.rhythm_events : [])
    .map((event) => ({
      ...event,
      time: Number(event.time ?? 0),
    }))
    .filter((event) => Number.isFinite(event.time))
    .sort((left, right) => left.time - right.time);

  const lastEventTime = timelineEvents[timelineEvents.length - 1]?.time ?? 0;
  const lastRhythmTime = timelineRhythmEvents[timelineRhythmEvents.length - 1]?.time ?? 0;
  timelineDuration = Math.max(Number(timeline.duration ?? 0), musicalTimeline.duration, lastEventTime + 8, lastRhythmTime + 2);
  musicalTimeline.duration = Math.max(musicalTimeline.duration, timelineDuration);
  musicalTimeline.lightFrames = buildLightFramesFromMusicalTimeline(musicalTimeline);
  musicalTimeline.cursor = musicalTimelineCursorAt(musicalTimeline, 0);
  loadedTimelineName = file.name;
  timelinePausedAt = 0;
  timelineNextIndex = 0;
  timelineNextRhythmIndex = 0;
  timelineCurrentEvent = timelineEvents[0] ?? null;
  timelineCurrentRhythmEvent = null;
  inputMode = "timeline";
  document.body.classList.remove("is-mic-mode");
  document.body.classList.add("mode-timeline");
  elements.trackLabel.textContent = loadedTimelineName;
  elements.playButton.textContent = "Play";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.seekSlider.disabled = false;
  setState("Timeline ready");
  updateMeter(0);
  renderMusicDissectorDashboard(musicalTimeline);
  updatePlayerTime();
  logEvent(`timeline loaded ${file.name}`);
  if (!timelineRhythmEvents.length) {
    logEvent("no rhythm_events: rigenera il JSON con Python");
  }
}

function ensureAudioElement() {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = "auto";
    audioElement.addEventListener("ended", () => {
      if (reviewAnimationFrame && reviewAudioUsesOriginalElement) {
        pauseTrainingReviewPlayback();
        return;
      }
      stopPlayback({ resetPosition: true });
    });
    audioElement.addEventListener("loadedmetadata", updatePlayerTime);
    audioElement.addEventListener("durationchange", updatePlayerTime);
    audioElement.addEventListener("canplay", () => {
      if (inputMode === "file" && hasLoadedAudio()) {
        elements.playButton.disabled = false;
        elements.stopButton.disabled = false;
      }
    });
  }
  if (!mediaElementSource) {
    mediaElementSource = audioContext.createMediaElementSource(audioElement);
    mediaElementSource.connect(analyser);
    mediaElementSource.connect(audioContext.destination);
  }
}

async function playAudio() {
  if (!audioElement) return;
  await ensureAudioContext();
  cancelAnimationFrame(animationFrame);
  stopSourceNode();
  if (pausedAt >= getAudioDuration()) {
    pausedAt = 0;
  }
  audioElement.currentTime = pausedAt;
  startedAt = audioContext.currentTime - pausedAt;
  await audioElement.play();
  isPlaying = true;
  setState("Playing");
  elements.playButton.textContent = "Pause";
  elements.stopButton.disabled = false;
  beginTrainingCapture("file");
  animate();
}

function pauseAudio() {
  if (!audioElement || !audioContext) return;
  pausedAt = clamp(audioElement.currentTime, 0, getAudioDuration());
  audioElement.pause();
  isPlaying = false;
  cancelAnimationFrame(animationFrame);
  setState("Paused");
  elements.playButton.textContent = "Play";
  if (isTrainingMode()) {
    blackoutAutoLights();
  }
  stopTrainingCapture("paused");
  updatePlayerTime();
}

function stopSourceNode() {
  if (sourceNode) {
    try {
      sourceNode.onended = null;
      sourceNode.stop();
    } catch (_error) {
      // Source may already be stopped.
    }
  }
  sourceNode = null;
}

function stopPlayback(options = {}) {
  const { resetPosition = true, keepLights = false } = options;
  stopSourceNode();
  if (audioElement) {
    audioElement.pause();
    if (resetPosition) {
      audioElement.currentTime = 0;
    }
  }
  isPlaying = false;
  stopTrainingCapture(resetPosition ? "stopped" : "paused");
  if (resetPosition) {
    pausedAt = 0;
  }
  cancelAnimationFrame(animationFrame);
  smoothedEnergy = 0;
  previousEnergy = 0;
  previousLow = 0;
  previousMid = 0;
  previousHigh = 0;
  previousRms = 0;
  lastEnergyDropTime = -999;
  previousSpectrum = null;
  sceneVariant = 0;
  lastSceneCategory = "ambient_no_beat";
  musicalClock = {
    lastPulseTime: null,
    interval: null,
    confidence: 0,
    source: "none",
  };
  frameCounter = 0;
  lastEventSecond = -1;
  categoryCounters = {};
  currentSceneByCategory = {};
  resetSpectrumHistory();
  setState(hasLoadedAudio() ? "Ready" : "Idle");
  elements.playButton.disabled = !hasLoadedAudio();
  elements.playButton.textContent = "Play";
  elements.stopButton.disabled = !hasLoadedAudio();
  if (!keepLights) blackoutLights();
  updateMeter(0);
  updatePlayerTime();
  maybeSendQlcWebBlackout();
}

async function playTimeline() {
  if (!timelineEvents.length) return;
  await ensureAudioContext();
  cancelAnimationFrame(timelineAnimationFrame);
  if (timelinePausedAt >= timelineDuration) {
    timelinePausedAt = 0;
  }
  timelineStartedAt = audioContext.currentTime - timelinePausedAt;
  timelineNextIndex = findNextTimelineIndex(timelinePausedAt);
  timelineNextRhythmIndex = findNextTimelineRhythmIndex(timelinePausedAt);
  timelineCurrentEvent = findTimelineEventAt(timelinePausedAt);
  timelineCurrentRhythmEvent = findTimelineRhythmEventAt(timelinePausedAt);
  isPlaying = true;
  setState("Timeline playing");
  elements.playButton.textContent = "Pause";
  elements.stopButton.disabled = false;
  beginTrainingCapture("timeline_json");
  animateTimeline();
}

function pauseTimeline() {
  if (!audioContext) return;
  timelinePausedAt = clamp(audioContext.currentTime - timelineStartedAt, 0, timelineDuration);
  isPlaying = false;
  cancelAnimationFrame(timelineAnimationFrame);
  setState("Timeline paused");
  elements.playButton.textContent = "Play";
  if (isTrainingMode()) {
    blackoutAutoLights();
  }
  stopTrainingCapture("paused");
  updatePlayerTime();
}

function stopTimelinePlayback(options = {}) {
  const { resetPosition = true, keepLights = false } = options;
  cancelAnimationFrame(timelineAnimationFrame);
  if (inputMode === "timeline") {
    isPlaying = false;
    stopTrainingCapture(resetPosition ? "stopped" : "paused");
    if (resetPosition) {
      timelinePausedAt = 0;
      timelineNextIndex = 0;
      timelineNextRhythmIndex = 0;
      timelineCurrentEvent = timelineEvents[0] ?? null;
      timelineCurrentRhythmEvent = null;
    }
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !timelineEvents.length;
    elements.stopButton.disabled = !timelineEvents.length;
    setState(timelineEvents.length ? "Timeline ready" : "Idle");
    updateMeter(0);
    if (!keepLights) blackoutLights();
    updatePlayerTime();
    maybeSendQlcWebBlackout();
  }
}

function animateTimeline() {
  if (!isPlaying || inputMode !== "timeline") return;
  const time = clamp(audioContext.currentTime - timelineStartedAt, 0, timelineDuration);
  const profile = genreProfiles[elements.genreProfile.value];
  decayLightStates(profile.decay);

  while (timelineNextIndex < timelineEvents.length && timelineEvents[timelineNextIndex].time <= time) {
    triggerTimelineEvent(timelineEvents[timelineNextIndex]);
    timelineCurrentEvent = timelineEvents[timelineNextIndex];
    timelineNextIndex += 1;
  }
  while (timelineNextRhythmIndex < timelineRhythmEvents.length && timelineRhythmEvents[timelineNextRhythmIndex].time <= time) {
    triggerTimelineRhythmEvent(timelineRhythmEvents[timelineNextRhythmIndex]);
    timelineCurrentRhythmEvent = timelineRhythmEvents[timelineNextRhythmIndex];
    timelineNextRhythmIndex += 1;
  }

  const energy = getTimelinePreviewEnergy(time);
  captureTrainingFrame({
    time,
    energy,
    energy_delta: energy - previousEnergy,
    spectral_flux: 0,
    sample_category: timelineCurrentRhythmEvent?.sample_category ?? timelineCurrentEvent?.sample_category,
  });
  updateMeter(energy);
  renderLights();
  updatePlayerTime();
  previousEnergy = energy;

  if (maybeFinishTrainingCapture(time)) return;
  if (time >= timelineDuration) {
    stopTimelinePlayback({ resetPosition: true });
    return;
  }
  timelineAnimationFrame = requestAnimationFrame(animateTimeline);
}

function animate() {
  if (!analyser || !isPlaying) return;
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeData = new Uint8Array(analyser.fftSize);
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);
  const profile = genreProfiles[elements.genreProfile.value];
  analyser.smoothingTimeConstant = profile.smoothing;

  const spectralFlux = getSpectralFlux(frequencyData);
  const inputGain = inputMode === "mic_device" ? 5.8 : 2.75;
  const rawEnergy = clamp((average(frequencyData) / 255) * inputGain + spectralFlux * 0.72, 0, 1);
  const rms = getRms(timeData);
  smoothedEnergy = smoothedEnergy * 0.32 + rawEnergy * 0.68;
  const energy = Math.min(1, smoothedEnergy * profile.pulse);
  const time = audioContext ? audioContext.currentTime - startedAt : 0;
  const energyDeltaForCapture = energy - previousEnergy;
  const componentLanes = componentLanesFromFrequency(frequencyData, spectralFlux, energy);
  drawComponentLanes(componentLanes, time, { beatPulse: shouldDrawBeatPulse(time) });
  updateLights(frequencyData, energy, rms, profile, spectralFlux);
  captureTrainingFrame({
    time,
    energy,
    energy_delta: energyDeltaForCapture,
    spectral_flux: spectralFlux,
    sample_category: categoryForEnergy(energy),
    component_lanes: componentLanes,
  });
  updateMeter(energy);
  updatePlayerTime();
  maybeLogSignal(energy);
  previousSpectrum = new Uint8Array(frequencyData);
  if (maybeFinishTrainingCapture(time)) return;

  animationFrame = requestAnimationFrame(animate);
}

function updateLights(frequencyData, energy, rms, profile, spectralFlux) {
  const bands = getBands(frequencyData, 5);
  const time = audioContext ? audioContext.currentTime - startedAt : 0;
  const low = bands[0] ?? 0;
  const mid = bands[2] ?? 0;
  const high = bands[4] ?? 0;
  const dominantBand = indexOfMax(bands);
  const energyDelta = energy - previousEnergy;
  const lowDelta = low - previousLow;
  const midDelta = mid - previousMid;
  const highDelta = high - previousHigh;
  const rmsDelta = rms - previousRms;
  if (shouldBlackoutForEnergyDrop(energy, rms, time)) {
    blackoutLights();
    rememberPreviousAudioState({ energy, low, mid, high, rms });
    frameCounter += 1;
    return;
  }
  const lowOnset = Math.max(0, lowDelta * 1.45 + rmsDelta * 1.4);
  const tonalOnset = Math.max(0, midDelta * 2.3 + highDelta * 1.75 + spectralFlux * 2.55 + energyDelta * 0.58);
  const onsetStrength = Math.max(0, energyDelta * 1.1 + lowOnset + tonalOnset + high * 0.055);
  updateMusicalClock({
    time,
    lowOnset,
    tonalOnset,
    energy,
    low,
    mid,
    high,
  });
  const clockPulse = shouldTriggerClockPulse(time);
  const isOnset = onsetStrength > profile.threshold || clockPulse;
  const isStrongHit = onsetStrength > profile.threshold * 3.2 || rmsDelta > 0.12;

  decayLightStates(profile.decay);

  if (isOnset) {
    triggerPattern({
      profile,
      time,
      energy,
      low,
      mid,
      high,
      dominantBand,
      strong: isStrongHit,
      clockSource: musicalClock.source,
      category: categoryForEnergy(energy),
    });
  } else if (shouldHoldSparseChase(time, profile, energy)) {
    triggerPattern({
      profile,
      time,
      energy: energy * 0.72,
      low,
      mid,
      high,
      dominantBand,
      strong: false,
      sparse: true,
      clockSource: musicalClock.source,
      category: categoryForEnergy(energy),
    });
  }

  renderLights();
  rememberPreviousAudioState({ energy, low, mid, high, rms });
  frameCounter += 1;
}

function shouldBlackoutForEnergyDrop(energy, rms, time) {
  const energyDrop = previousEnergy - energy;
  const rmsDrop = previousRms - rms;
  const absoluteQuiet = energy < 0.045 && rms < 0.035;
  const abruptDrop = previousEnergy > 0.22 && energyDrop > 0.16 && energy < 0.18;
  const abruptRmsDrop = previousRms > 0.12 && rmsDrop > 0.08 && rms < 0.08;
  const cooldownReady = time - lastEnergyDropTime > 0.22;
  if ((absoluteQuiet || abruptDrop || abruptRmsDrop) && cooldownReady) {
    lastEnergyDropTime = time;
    musicalClock.confidence *= 0.38;
    musicalClock.source = "none";
    logEvent(`${formatTime(Math.floor(time))} blackout energy drop`);
    return true;
  }
  return false;
}

function rememberPreviousAudioState(reading) {
  previousEnergy = reading.energy;
  previousLow = reading.low;
  previousMid = reading.mid;
  previousHigh = reading.high;
  previousRms = reading.rms;
}

function updateMusicalClock(reading) {
  const candidates = [
    { source: "bass", strength: reading.lowOnset, minEnergy: reading.low },
    { source: "mid_arpeggio", strength: reading.tonalOnset, minEnergy: reading.mid },
    { source: "high_pattern", strength: reading.tonalOnset * 0.82, minEnergy: reading.high },
  ];
  const candidate = candidates
    .filter((item) => item.strength > 0.012 && item.minEnergy > 0.01)
    .sort((a, b) => b.strength - a.strength)[0];

  if (!candidate) {
    musicalClock.confidence *= 0.992;
    return;
  }

  if (musicalClock.lastPulseTime === null) {
    musicalClock.lastPulseTime = reading.time;
    musicalClock.source = candidate.source;
    musicalClock.confidence = Math.max(musicalClock.confidence, 0.36);
    return;
  }

  const interval = reading.time - musicalClock.lastPulseTime;
  if (interval < 0.18) return;
  if (interval > 1.6) {
    musicalClock.lastPulseTime = reading.time;
    musicalClock.confidence *= 0.72;
    return;
  }

  const previousInterval = musicalClock.interval ?? interval;
  const stable = Math.abs(interval - previousInterval) < 0.2;
  musicalClock.interval = previousInterval * 0.68 + interval * 0.32;
  musicalClock.lastPulseTime = reading.time;
  musicalClock.source = candidate.source;
  musicalClock.confidence = clamp(
    musicalClock.confidence + (stable ? 0.18 : 0.06) + candidate.strength * 0.15,
    0,
    1
  );
}

function shouldTriggerClockPulse(time) {
  if (!musicalClock.interval || musicalClock.confidence < 0.16) return false;
  const elapsed = time - musicalClock.lastPulseTime;
  if (elapsed < musicalClock.interval * 0.92) return false;
  if (elapsed > musicalClock.interval * 1.35) return false;
  musicalClock.lastPulseTime = time;
  musicalClock.confidence *= 0.985;
  return true;
}

function decayLightStates(decay) {
  lightStates.forEach((state) => {
    state.intensity *= decay;
    state.age += 1;
    if (state.intensity < 0.025) {
      state.intensity = 0;
    }
  });
}

function shouldHoldSparseChase(time, profile, energy) {
  if (!isPlaying) return false;
  if (energy < 0.24 && musicalClock.source === "none") return false;
  const framesPerStep = Math.max(12, Math.round(38 / profile.chase));
  return frameCounter % framesPerStep === 0 && time > 0.25;
}

function triggerPattern(context) {
  const count = lights.length;
  if (!count) return;
  const rigCapacity = rigCapacityForLightCount(count);
  const trend = energyTrend(context.energy - previousEnergy);
  const rawSceneTimingIntent = timingIntentForSample(context.category, null, context.energy, trend);
  const sceneTimingIntent = timingIntentForRig(rawSceneTimingIntent, context, rigCapacity);
  const sceneLightingIntent = lightingIntentForRig(lightingIntentForSample(context.category, null, context.energy, trend), sceneTimingIntent);
  const beatStep = Math.floor(context.time / Math.max(musicalClock.interval ?? 0.5, 0.24));

  const rawActiveIndexes = context.gesture
    ? pickGestureLights(context, count)
    : pickActiveLights(context.profile, context.time, count, context.strong, context.sparse, context.clockSource, context.energy, rigCapacity);
  const activeIndexes = rawActiveIndexes.slice(0, rigCapacity.maxPulseLights);
  activeIndexes.forEach((index, order) => {
    const colorIndex = pickRigColorIndex(context, index, order, "pulse", rigCapacity);
    const clockBoost = context.clockSource && context.clockSource !== "none" ? 0.08 : 0;
    const base = context.strong ? 0.96 : context.sparse ? 0.48 : 0.62 + clockBoost;
    const spectral = context.low * 0.2 + context.mid * 0.14 + context.high * 0.18;
    const phase = phaseConfigForTimingIntent(sceneTimingIntent, order, beatStep);
    lightStates[index].intensity = clamp(base + spectral - order * 0.06, 0.28, 1);
    lightStates[index].age = 0;
    lightStates[index].colorIndex = colorIndex;
    lightStates[index].lightingIntent = sceneLightingIntent;
    lightStates[index].timingIntent = sceneTimingIntent;
    lightStates[index].enabled = true;
    lightStates[index].colorMode = "auto";
    lightStates[index].blackout = false;
    lightStates[index].manualColorIndex = null;
    lightStates[index].manualRandomColor = null;
    lightStates[index].phaseFirstHalf = phase.first;
    lightStates[index].phaseSecondHalf = phase.second;
    lightStates[index].phaseMode = phase.mode;
    lightStates[index] = normalizeLightState(lightStates[index], { index, timingIntent: sceneTimingIntent });
  });

  const anchorIndexes = pickRigAnchorLights(context, count, activeIndexes, rigCapacity);
  anchorIndexes.forEach((index, order) => {
    const colorIndex = pickRigColorIndex(context, index, order, "anchor", rigCapacity);
    const anchorBase = context.sparse ? 0.44 : context.category === "steady_bass_pulse" ? 0.5 : 0.38;
    const anchorIntensity = clamp(anchorBase + context.energy * 0.24 - order * 0.025, 0.22, 0.72);
    lightStates[index].intensity = Math.max(lightStates[index].intensity * 0.92, anchorIntensity);
    lightStates[index].age = Math.min(lightStates[index].age, 4);
    lightStates[index].colorIndex = colorIndex;
    lightStates[index].lightingIntent = "sustain";
    lightStates[index].timingIntent = "sustain";
    lightStates[index].enabled = true;
    lightStates[index].colorMode = "auto";
    lightStates[index].blackout = false;
    lightStates[index].manualColorIndex = null;
    lightStates[index].manualRandomColor = null;
    lightStates[index].phaseFirstHalf = true;
    lightStates[index].phaseSecondHalf = true;
    lightStates[index].phaseMode = "full_beat";
    lightStates[index] = normalizeLightState(lightStates[index], { index, timingIntent: "sustain" });
  });

  blackoutNonActive([...activeIndexes, ...anchorIndexes], rigCapacity.blackoutFloor(context));
  updateBrainSemantics(sceneLightingIntent, sceneTimingIntent);
}

function rigCapacityForLightCount(count) {
  if (count <= 1) {
    return {
      name: "single_fixture",
      maxPulseLights: 1,
      anchorCount: 0,
      colorHoldBeats: 16,
      anchorColorHoldBeats: 16,
      blackoutFloor: (context) => context.strong ? 0.03 : 0.015,
    };
  }
  if (count <= 3) {
    return {
      name: "small_rig",
      maxPulseLights: 2,
      anchorCount: 0,
      colorHoldBeats: 2,
      anchorColorHoldBeats: 6,
      blackoutFloor: (context) => context.strong ? 0.07 : 0.025,
    };
  }
  if (count < 8) {
    return {
      name: "medium_rig",
      maxPulseLights: 4,
      anchorCount: count >= 5 ? 1 : 0,
      colorHoldBeats: 1,
      anchorColorHoldBeats: 8,
      blackoutFloor: (context) => context.strong ? 0.08 : 0.035,
    };
  }
  return {
    name: "large_rig",
    maxPulseLights: 6,
    anchorCount: Math.min(4, Math.floor(count / 3)),
    colorHoldBeats: 1,
    anchorColorHoldBeats: 12,
    blackoutFloor: (context) => context.strong ? 0.1 : 0.045,
  };
}

function timingIntentForRig(timingIntent, context, rigCapacity) {
  if (timingIntent === "blackout") return timingIntent;
  if (rigCapacity.name === "single_fixture") {
    if (context.energy <= 0.12 && !context.strong) return "sustain";
    if (shouldUseSingleFixtureThreeQuarterHold({ ...context, timingIntent })) return "single_fixture_three_quarter_hold";
    return "fade_sustain";
  }
  if (rigCapacity.name === "small_rig" && timingIntent === "strobe_like") {
    return context.strong ? "alternate_halves" : "pulse_full_beat";
  }
  return timingIntent;
}

function shouldUseSingleFixtureThreeQuarterHold(context = {}) {
  const category = String(context.category ?? "").toLowerCase();
  const timing = String(context.timingIntent ?? "").toLowerCase();
  const lighting = String(context.lightingIntent ?? "").toLowerCase();
  const energy = Number(context.energy ?? 0);
  if (category === "steady_bass_pulse" && energy >= 0.24 && energy <= 0.72) return true;
  if (category === "buildup" && energy >= 0.42 && !context.strong) return true;
  if (timing.includes("pulse_full_beat") && lighting !== "strobe_like" && energy <= 0.68) return true;
  return false;
}

function lightingIntentForRig(lightingIntent, timingIntent) {
  if (timingIntent === "blackout") return "blackout";
  if (timingIntent === "single_fixture_three_quarter_hold") return "single_fixture_hold";
  if (timingIntent === "sustain" || timingIntent === "fade_sustain") return "sustain";
  return lightingIntent;
}

function rigBeatStep(time, holdBeats) {
  const interval = Math.max(musicalClock.interval ?? 0.5, 0.24);
  const holdSeconds = Math.max(interval * holdBeats, 0.3);
  return Math.floor(time / holdSeconds);
}

function pickRigColorIndex(context, index, order, role, rigCapacity) {
  if (role !== "anchor" && rigCapacity.colorHoldBeats <= 1) {
    return pickColorIndex(context, index, order);
  }
  const holdBeats = role === "anchor" ? rigCapacity.anchorColorHoldBeats : rigCapacity.colorHoldBeats;
  const heldStep = rigBeatStep(context.time, holdBeats);
  const heldContext = {
    ...context,
    time: heldStep * Math.max(musicalClock.interval ?? 0.5, 0.24),
  };
  return pickColorIndex(heldContext, index, order);
}

function pickRigAnchorLights(context, count, activeIndexes, rigCapacity) {
  if (rigCapacity.anchorCount <= 0 || context.category === "high_energy_drop") return [];
  if (context.category === "silence_or_pause" || context.category === "stop_music_moment") return [];
  const step = rigBeatStep(context.time + sceneVariant, rigCapacity.anchorColorHoldBeats);
  const candidates = symmetricalIndexes(step, count, Math.min(count, rigCapacity.anchorCount * 2))
    .filter((index) => !activeIndexes.includes(index));
  return candidates.slice(0, rigCapacity.anchorCount);
}

function phaseConfigForTimingIntent(timingIntent, order, beatStep) {
  if (timingIntent === "single_fixture_three_quarter_hold") {
    return { first: true, second: true, mode: "full_beat" };
  }
  if (timingIntent === "pulse_first_half") {
    return { first: true, second: false, mode: "first_half" };
  }
  if (timingIntent === "pulse_second_half") {
    return { first: false, second: true, mode: "second_half" };
  }
  if (timingIntent === "alternate_halves" || timingIntent === "strobe_like") {
    const firstHalf = (order + beatStep) % 2 === 0;
    return {
      first: firstHalf,
      second: !firstHalf,
      mode: firstHalf ? "first_half" : "second_half",
    };
  }
  if (timingIntent === "blackout") {
    return { first: false, second: false, mode: "off" };
  }
  return { first: true, second: true, mode: "full_beat" };
}

function pickGestureLights(context, count) {
  if (count <= 1) return [0];
  const step = Math.floor(context.time * 2.1 + sceneVariant);
  if (context.gesture === "accent_flash" || context.gesture === "downbeat_flash") {
    return symmetricalIndexes(step, count, Math.min(count, 4));
  }
  if (context.gesture === "accent_pair" || context.gesture === "symmetrical_pair") {
    return symmetricalIndexes(step, count, Math.min(count, 2));
  }
  if (context.gesture === "buildup_spark") {
    const pairs = buildSymmetryPairs(count);
    return pairs[0] ?? symmetricalIndexes(step, count, Math.min(count, 2));
  }
  if (context.gesture === "drop_step") {
    return symmetricalIndexes(step, count, Math.min(count, 3));
  }
  return musicalSingleOrPair(step, count, context.sparse);
}

function pickActiveLights(profile, time, count, strong, sparse = false, clockSource = "none", energy = 0, rigCapacity = rigCapacityForLightCount(count)) {
  const interval = Math.max(musicalClock.interval ?? 0.5, 0.24);
  const pulseStep = Math.floor(time / interval);
  const halfPulseStep = Math.floor(time / Math.max(interval / 2, 0.12));
  const differentiation = Number(elements.differentiation.value);
  const stableScene = differentiation >= 6;
  const weakGesture = !strong && (energy < 0.5 || clockSource === "mid_arpeggio");
  const pairCount = strong && !stableScene ? 2 : 1;

  if (weakGesture) {
    return mirrorSwapIndexes(halfPulseStep, count, sparse).slice(0, rigCapacity.maxPulseLights);
  }

  if (clockSource === "high_pattern" && strong) {
    return symmetricalIndexes(pulseStep, count, Math.min(count, 4, rigCapacity.maxPulseLights));
  }

  return symmetricalIndexes(pulseStep, count, Math.min(count, pairCount * 2, rigCapacity.maxPulseLights));
}

function musicalSingleOrPair(step, count, sparse) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(step, count);
  if (sparse || step % 4 !== 0) {
    return [pair[step % 2]];
  }
  return pair;
}

function mirrorSwapIndexes(step, count, sparse) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(Math.floor(step / 2), count);
  if (!sparse && step % 4 === 0) return pair;
  return [pair[step % pair.length]];
}

function symmetricalIndexes(step, count, spread) {
  if (count <= 1) return [0];
  const pair = symmetricalPair(step, count);
  const result = [...pair];
  let offset = 1;
  while (result.length < spread) {
    const nextPair = symmetricalPair(step + offset, count);
    nextPair.forEach((index) => {
      if (result.length < spread && !result.includes(index)) {
        result.push(index);
      }
    });
    offset += 1;
  }
  return result;
}

function symmetricalPair(step, count) {
  if (count <= 1) return [0];
  const pairPresets = buildSymmetryPairs(count);
  return pairPresets[step % pairPresets.length];
}

function buildSymmetryPairs(count) {
  const pairs = [];
  const usedKeys = new Set();
  const candidates = positions
    .slice(0, count)
    .map((position, index) => ({ ...position, index, info: positionInfo(index) }))
    .sort((left, right) => symmetrySortScore(left) - symmetrySortScore(right));

  candidates.forEach((left) => {
    const right = candidates
      .filter((candidate) => candidate.index !== left.index)
      .sort((a, b) => mirroredDistance(left, a) - mirroredDistance(left, b))[0];
    if (!right) return;
    const pair = uniqueIndexes([left.index, right.index], count);
    const key = pair.slice().sort((a, b) => a - b).join(":");
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      pairs.push(pair);
    }
  });

  if (!pairs.length && count > 1) {
    pairs.push(uniqueIndexes([0, Math.floor(count / 2)], count));
  }
  return pairs.filter((pair) => pair.length > 0);
}

function symmetrySortScore(light) {
  const zoneOrder = { up: 0, middle: 1, down: 2 };
  const zone = zoneOrder[light.info.zone] ?? 3;
  const side = light.info.side === "centre" ? 1 : 0;
  const outer = light.info.outer ? 0 : 1;
  return zone * 1000 + side * 100 + outer * 10 + light.info.rank;
}

function mirroredDistance(left, right) {
  const mirrorX = 100 - left.x;
  const sameZonePenalty = left.info.zone === right.info.zone ? 0 : 22;
  const sameSidePenalty = left.info.side !== "centre" && left.info.side === right.info.side ? 18 : 0;
  const distance = Math.abs(right.x - mirrorX) + Math.abs(right.y - left.y) * 1.35;
  return distance + sameZonePenalty + sameSidePenalty;
}

function uniqueIndexes(values, count) {
  const result = [];
  values.forEach((value) => {
    const index = ((value % count) + count) % count;
    if (!result.includes(index)) {
      result.push(index);
    }
  });
  return result;
}

function pickColorIndex(context, index, order) {
  const { profile, time, dominantBand, energy, high, category, colorFamily } = context;
  const differentiation = Number(elements.differentiation.value);
  const categoryOffset = category === "high_energy_drop" ? 2 : category === "steady_bass_pulse" ? 1 : 0;
  const phrase = Math.floor(time / 8);
  if (colorFamily === "white") return 4;
  if (colorFamily === "hot") return order % 2 === 0 ? 0 : 1;
  if (colorFamily === "amber") return 1;
  if (colorFamily === "cool") return order % 2 === 0 ? 3 : 2;
  if (high > 0.62 && order === 0) {
    return 4;
  }
  if (dominantBand >= 0 && dominantBand < colors.length && energy > 0.64 && differentiation <= 3) {
    return dominantBand;
  }
  const stablePhrase = differentiation >= 6 ? Math.floor(time / 16) : phrase;
  const interval = Math.max(musicalClock.interval ?? 0.5, 0.24);
  const beatStep = Math.floor(time / interval);
  const pairStep = beatStep + stablePhrase + sceneVariant + categoryOffset;
  const pairOffset = order > 1 ? Math.floor(order / 2) : 0;
  return profile.palette[(pairStep + pairOffset) % profile.palette.length];
}

function blackoutNonActive(activeIndexes, maxIntensity) {
  lightStates.forEach((state, index) => {
    if (!activeIndexes.includes(index)) {
      state.intensity = Math.min(state.intensity, maxIntensity);
    }
  });
}

function blackoutLights() {
  lightStates.forEach((state, index) => {
    setLightOffForScene(state);
    state.age = 999;
    if (!isTrainingMode()) {
      state.manualColorIndex = null;
      lightStates[index] = normalizeLightState(state, { index, timingIntent: "blackout" });
    }
  });
  renderLights();
}

function blackoutAutoLights() {
  lightStates.forEach((state) => {
    if (state.manualColorIndex === null || state.manualColorIndex === undefined) {
      state.intensity = 0;
      state.age = 999;
      state.timingIntent = "blackout";
    }
  });
  renderLights();
}

function randomTrainingColor() {
  return casualTrainingColors[Math.floor(Math.random() * casualTrainingColors.length)];
}

function hslToRgb(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  const [rp, gp, bp] = hue < 60
    ? [c, x, 0]
    : hue < 120
      ? [x, c, 0]
      : hue < 180
        ? [0, c, x]
        : hue < 240
          ? [0, x, c]
          : hue < 300
            ? [x, 0, c]
            : [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

function manualLightColor(state) {
  if (state.colorMode === "random" && state.manualRandomColor) {
    return { name: "casual", value: state.manualRandomColor, randomizeOnPlayback: true };
  }
  if (state.manualColorIndex === null || state.manualColorIndex === undefined) return null;
  const color = trainingColors[state.manualColorIndex];
  if (!color) return null;
  if (color.name === "casual") {
    return { ...color, value: state.manualRandomColor ?? [245, 247, 248], randomizeOnPlayback: true };
  }
  return color;
}

function resolvedLightColorValue(color, state, context = {}) {
  if (Array.isArray(color?.value)) return color.value;
  if (color?.name === "casual") {
    const resolved = state.manualRandomColor ?? stableCasualColor(context);
    state.manualRandomColor = resolved;
    state.colorMode = "random";
    return resolved;
  }
  return [245, 247, 248];
}

function phaseModeFromHalves(first, second) {
  if (first && second) return "full_beat";
  if (first) return "first_half";
  if (second) return "second_half";
  return "off";
}

function phaseHalvesForMode(phaseMode) {
  if (phaseMode === "first_half") return { first: true, second: false };
  if (phaseMode === "second_half") return { first: false, second: true };
  if (phaseMode === "off") return { first: false, second: false };
  return { first: true, second: true };
}

function stableCasualColor(context = {}) {
  const stablePalette = casualTrainingColors.filter((_color, index) => index !== 4);
  const seed = Number(context.index ?? context.fixtureIndex ?? context.colorIndex ?? 0);
  const paletteIndex = Math.abs(Math.round(seed)) % stablePalette.length;
  return [...stablePalette[paletteIndex]];
}

function timingIntentPhaseMode(timingIntent, context = {}) {
  if (timingIntent === "pulse_first_half") return "first_half";
  if (timingIntent === "pulse_second_half") return "second_half";
  if (timingIntent === "pulse_full_beat") return "full_beat";
  if (timingIntent === "single_fixture_three_quarter_hold") return "full_beat";
  if (timingIntent === "blackout") return "off";
  if (timingIntent === "alternate_halves" || timingIntent === "strobe_like") {
    const index = Number(context.index ?? context.fixtureIndex ?? 0);
    return index % 2 === 0 ? "first_half" : "second_half";
  }
  return null;
}

function finalTimingIntentForPhase(phaseMode, rawTimingIntent) {
  if (phaseMode === "off") return "blackout";
  if (phaseMode === "first_half") return "pulse_first_half";
  if (phaseMode === "second_half") return "pulse_second_half";
  if (phaseMode === "full_beat" && rawTimingIntent === "single_fixture_three_quarter_hold") return "single_fixture_three_quarter_hold";
  if (phaseMode === "full_beat" && rawTimingIntent === "pulse_full_beat") return "pulse_full_beat";
  if (phaseMode === "full_beat" && (rawTimingIntent === "alternate_halves" || rawTimingIntent === "strobe_like")) return rawTimingIntent;
  return "sustain";
}

function normalizeLightState(rawState = {}, context = {}) {
  const casualIndex = trainingColors.findIndex((color) => color.name === "casual");
  const blackoutIndex = trainingColors.findIndex((color) => color.blackout);
  const manualColorIndex = rawState.manualColorIndex === undefined ? null : rawState.manualColorIndex;
  const manualColor = manualColorIndex === null ? null : trainingColors[manualColorIndex];
  const timingIntent = context.timingIntent ?? rawState.timingIntent ?? context.sceneTimingIntent ?? "sustain";
  let phaseMode = rawState.phaseMode ?? null;
  if (!phaseMode) {
    phaseMode = timingIntentPhaseMode(timingIntent, context);
  }
  if (!phaseMode) {
    phaseMode = phaseModeFromHalves(rawState.phaseFirstHalf !== false, rawState.phaseSecondHalf !== false);
  }
  if (!["full_beat", "first_half", "second_half", "off"].includes(phaseMode)) {
    phaseMode = "full_beat";
  }
  if (timingIntent === "pulse_first_half") phaseMode = "first_half";
  if (timingIntent === "pulse_second_half") phaseMode = "second_half";
  if (timingIntent === "pulse_full_beat") phaseMode = "full_beat";
  if (timingIntent === "single_fixture_three_quarter_hold") phaseMode = "full_beat";
  if (timingIntent === "blackout") phaseMode = "off";

  const rawIntensity = clamp(Number(rawState.intensity ?? 0), 0, 1);
  const off = rawState.enabled === false
    || rawState.blackout === true
    || rawState.colorMode === "off"
    || manualColor?.blackout
    || timingIntent === "blackout"
    || phaseMode === "off"
    || rawIntensity <= 0;

  if (off) {
    return {
      ...rawState,
      enabled: false,
      intensity: 0,
      age: Number(rawState.age ?? 0),
      colorIndex: clamp(Math.round(Number(rawState.colorIndex ?? context.index ?? 0)), 0, colors.length - 1),
      manualColorIndex: manualColor?.blackout ? manualColorIndex : blackoutIndex,
      manualRandomColor: null,
      colorMode: "off",
      blackout: true,
      lightingIntent: "blackout",
      timingIntent: "blackout",
      phaseMode: "off",
      phaseFirstHalf: false,
      phaseSecondHalf: false,
    };
  }

  const randomColorMode = rawState.colorMode === "random" || manualColorIndex === casualIndex || manualColor?.name === "casual";
  const normalizedPhase = phaseHalvesForMode(phaseMode);
  const finalTimingIntent = finalTimingIntentForPhase(phaseMode, timingIntent);
  const finalLightingIntent = finalTimingIntent === "blackout"
    ? "blackout"
    : finalTimingIntent === "pulse_first_half" || finalTimingIntent === "pulse_second_half" || finalTimingIntent === "pulse_full_beat"
      ? "pulse"
      : finalTimingIntent === "single_fixture_three_quarter_hold"
        ? "single_fixture_hold"
      : finalTimingIntent === "alternate_halves"
        ? "alternating_pulse"
        : finalTimingIntent === "strobe_like"
          ? "strobe_like"
          : rawState.lightingIntent ?? context.lightingIntent ?? "sustain";
  return {
    ...rawState,
    enabled: rawState.enabled !== false,
    intensity: rawIntensity,
    age: Number(rawState.age ?? 0),
    colorIndex: clamp(Math.round(Number(rawState.colorIndex ?? context.index ?? 0)), 0, colors.length - 1),
    manualColorIndex,
    manualRandomColor: randomColorMode ? (rawState.manualRandomColor ?? stableCasualColor({ ...context, colorIndex: rawState.colorIndex })) : null,
    colorMode: randomColorMode ? "random" : rawState.colorMode ?? (manualColorIndex === null ? "auto" : "manual"),
    blackout: false,
    lightingIntent: finalLightingIntent,
    timingIntent: finalTimingIntent,
    phaseMode,
    phaseFirstHalf: normalizedPhase.first,
    phaseSecondHalf: normalizedPhase.second,
  };
}

function lightOffReason(state) {
  if (!state) return "missing_state";
  if (state?.phaseMode !== "off") {
    const normalized = normalizeLightState(state);
    if (normalized.phaseMode === "off") return "blackout";
  }
  if (state.enabled === false) return "manual_scene";
  if (state.blackout) return "blackout";
  if (state.colorMode === "off") return "blackout";
  if (state.phaseMode === "off") return "phase_off";
  if (state.timingIntent === "blackout") return "blackout";
  if (state.phaseFirstHalf === false && state.phaseSecondHalf === false) return "phase_off";
  if (Number(state.intensity ?? 0) <= 0) return "intensity_zero";
  return null;
}

function isLightOffState(state) {
  return Boolean(lightOffReason(state));
}

function phaseStateForLight(state) {
  const normalized = normalizeLightState(state);
  const phaseMode = normalized.phaseMode;
  const off = phaseMode === "off";
  return {
    phaseMode,
    firstOn: !off && (phaseMode === "first_half" || phaseMode === "full_beat"),
    secondOn: !off && (phaseMode === "second_half" || phaseMode === "full_beat"),
    fullBeat: !off && phaseMode === "full_beat",
    off,
  };
}

function phaseButtonVisualState(state, phaseState, baseColor, _manualCasual, lightOff) {
  const off = lightOff || phaseState.off || isLightOffState(state);
  const offButton = { selected: false, off: true, color: "rgb(0, 0, 0)" };
  if (off) {
    return { first: offButton, second: offButton };
  }
  return {
    first: {
      selected: phaseState.firstOn,
      off: !phaseState.firstOn,
      color: phaseState.firstOn ? baseColor : "rgb(0, 0, 0)",
    },
    second: {
      selected: phaseState.secondOn,
      off: !phaseState.secondOn,
      color: phaseState.secondOn ? baseColor : "rgb(0, 0, 0)",
    },
  };
}

function applyPhaseButtonVisual(button, visualState) {
  if (!button) return;
  button.classList.toggle("is-selected", visualState.selected);
  button.classList.toggle("is-off", visualState.off);
  button.style.setProperty("--phase-button-color", visualState.color);
  button.style.setProperty("--phase-button-rgb", cssRgbTriplet(visualState.color));
}

function cssRgbTriplet(color) {
  const match = String(color ?? "").match(/rgba?\(([^)]+)\)/i);
  if (!match) return "79, 195, 177";
  const parts = match[1]
    .split(",")
    .slice(0, 3)
    .map((part) => clamp(Number.parseFloat(part.trim()), 0, 255));
  if (parts.length < 3 || parts.some((value) => !Number.isFinite(value))) return "79, 195, 177";
  return parts.map((value) => String(Math.round(value))).join(", ");
}

function forceLightVisualOff(light) {
  light.classList.remove("active", "phase-split", "flat-visible", "casual");
  light.classList.add("blackout");
  light.style.background = "";
  light.style.opacity = "0.82";
  light.style.boxShadow = "";
  light.style.setProperty("--beam", "transparent");
  light.style.setProperty("--beam-opacity", "0");
  light.style.removeProperty("--lens-fill");
  light.style.removeProperty("--phase-lens-fill");
  light.style.removeProperty("--flat-phase-fill");
  light.style.removeProperty("--flat-bulb-fill");
  light.style.removeProperty("--light-rgb");
  light.style.removeProperty("--phase-left");
  light.style.removeProperty("--phase-right");
  light.style.removeProperty("--phase-button-color");
}

function clearPhaseVisualResidues() {
  lights.forEach((light) => {
    light.classList.remove("phase-split");
    light.style.removeProperty("--phase-left");
    light.style.removeProperty("--phase-right");
    light.style.removeProperty("--phase-button-color");
    light.style.removeProperty("--phase-lens-fill");
    light.style.removeProperty("--flat-phase-fill");
    light.style.removeProperty("--light-rgb");
    light.querySelectorAll(".phase-button").forEach((button) => {
      button.classList.remove("is-selected");
      button.classList.add("is-off");
      button.style.setProperty("--phase-button-color", "rgb(0, 0, 0)");
      button.style.setProperty("--phase-button-rgb", "0, 0, 0");
    });
  });
}

function resetModeVisualState(reason) {
  if (reviewAnimationFrame) {
    cancelAnimationFrame(reviewAnimationFrame);
    reviewAnimationFrame = null;
  }
  stopReviewAudioSource();
  selectedTrainingCueId = null;
  document.body.classList.remove("is-training-edit", "is-review-playing");
  clearPhaseVisualResidues();
  updateCueEditor();
  updateReviewPlayButton();
  logEvent(`[mode-reset] reason=${reason}`);
}

function resetLiveLightState(reason) {
  lightStates.forEach((state, index) => {
    state.enabled = true;
    state.intensity = 0;
    state.age = 999;
    state.colorIndex = index % colors.length;
    state.manualColorIndex = null;
    state.manualRandomColor = null;
    state.colorMode = "auto";
    state.blackout = false;
    state.phaseFirstHalf = true;
    state.phaseSecondHalf = true;
    state.phaseMode = "full_beat";
    state.lightingIntent = "sustain";
    state.timingIntent = "sustain";
  });
  lastLightOffReasonById = {};
  if (trainingCapture.manualOverridesByKey && Object.keys(trainingCapture.manualOverridesByKey).length) {
    trainingCapture.manualOverridesByKey = {};
    logEvent(`[manual-override] cleared reason=${reason}`);
  } else {
    logEvent(`[manual-override] ignored reason=live_mode`);
  }
  renderLights();
}

function phaseModeSummary() {
  const counts = { first: 0, second: 0, full: 0, off: 0 };
  lightStates.forEach((state, index) => {
    const phaseState = phaseStateForLight(normalizeLightState(state, { index }));
    if (phaseState.off) counts.off += 1;
    else if (phaseState.phaseMode === "first_half") counts.first += 1;
    else if (phaseState.phaseMode === "second_half") counts.second += 1;
    else counts.full += 1;
  });
  return `first:${counts.first} second:${counts.second} full:${counts.full} off:${counts.off}`;
}

function phaseModeSummaryForSnapshot(snapshot) {
  const counts = { first: 0, second: 0, full: 0, off: 0 };
  if (!Array.isArray(snapshot)) return phaseModeSummary();
  snapshot.forEach((state, index) => {
    const phaseState = phaseStateForLight(normalizeLightState(state, { index }));
    if (phaseState.off) counts.off += 1;
    else if (phaseState.phaseMode === "first_half") counts.first += 1;
    else if (phaseState.phaseMode === "second_half") counts.second += 1;
    else counts.full += 1;
  });
  return `first:${counts.first} second:${counts.second} full:${counts.full} off:${counts.off}`;
}

function updateBrainSemantics(lightingIntent, timingIntent, phaseSummaryOverride) {
  if (lightingIntent !== undefined && elements.currentLightingIntent) elements.currentLightingIntent.textContent = lightingIntent ?? "-";
  if (timingIntent !== undefined && elements.currentTimingIntent) elements.currentTimingIntent.textContent = timingIntent ?? "-";
  if (elements.currentPhaseSummary) elements.currentPhaseSummary.textContent = phaseSummaryOverride ?? phaseModeSummary();
}

function logLightOff(index, reason) {
  if (lastLightOffReasonById[index] === reason) return;
  lastLightOffReasonById[index] = reason;
  logEvent(`[light-off] id=${index} reason=${reason}`);
}

function qlcWebBridgeActive() {
  return elements.outputTarget?.value === "qlc_web_bridge";
}

function postQlcWeb(path, payload) {
  return fetch(`${qlcBridgeUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  }).then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response;
  }).catch((error) => {
    console.warn(`[qlc-web] failed ${path}`, error);
    logEvent(`[qlc-web] failed ${path}: ${error.message}`);
  });
}

function sendQlcWebBlackout() {
  if (qlcWebBlackoutSent && lastQlcWebSceneKey === "blackout") return;
  qlcWebBlackoutSent = true;
  lastQlcWebSceneKey = "blackout";
  lastQlcPhysicalColorKey = "0,0,0";
  lastQlcPhysicalPhaseMode = "off";
  lastQlcPhysicalColorAt = performance.now();
  lastQlcCapacityColorKey = "0,0,0";
  lastQlcCapacityColorAt = performance.now();
  lastQlcCapacitySceneCategory = "blackout";
  lastQlcCapacitySelectedIntent = "blackout";
  lastQlcCapacityIntensity = 0;
  lastQlcWebSendAt = performance.now();
  console.log("[qlc-web] blackout");
  console.log("[qlc-web] POST /blackout");
  postQlcWeb("/blackout", {});
}

function maybeSendQlcWebBlackout() {
  if (!qlcWebBridgeActive()) return;
  sendQlcWebBlackout();
}

function qlcSmoothHoldMs() {
  const mode = elements.qlcSmooth?.value ?? "beat_aware";
  if (mode === "off") return 0;
  if (mode === "safe") return 220;
  if (mode === "debug_slow") return 400;
  return qlcMinHoldMs;
}

function qlcFixtureCapacityValue() {
  return qlcFixtureCapacityForLightCount(lights.length || Number(elements.lightCount?.value ?? 1));
}

function qlcFixtureCapacityForLightCount(count) {
  const normalizedCount = clamp(Math.round(Number(count ?? 1)), 1, 32);
  if (normalizedCount <= 1) return "one_fixture_simple";
  if (normalizedCount <= 3) return "small_group";
  return "full_show_future";
}

function syncQlcFixtureCapacity(count = lights.length || Number(elements.lightCount?.value ?? 1)) {
  const capacity = qlcFixtureCapacityForLightCount(count);
  if (elements.qlcFixtureCapacity && elements.qlcFixtureCapacity.value !== capacity) {
    elements.qlcFixtureCapacity.value = capacity;
  }
  return capacity;
}

function qlcFixtureBudget() {
  const capacity = qlcFixtureCapacityValue();
  if (capacity === "small_group") return 3;
  if (capacity === "full_show_future") return 8;
  return 1;
}

function qlcCapacityColorHoldMs() {
  const capacity = qlcFixtureCapacityValue();
  const intervalSeconds = Number(musicalClock?.interval);
  if (capacity === "one_fixture_simple") {
    if (Number.isFinite(intervalSeconds) && intervalSeconds > 0 && musicalClock.confidence >= 0.16) {
      return Math.max(2200, Math.min(7200, Math.round(intervalSeconds * 8 * 1000)));
    }
    return 2400;
  }
  if (Number.isFinite(intervalSeconds) && intervalSeconds > 0 && musicalClock.confidence >= 0.16) {
    return Math.max(350, Math.min(900, Math.round(intervalSeconds * 1000)));
  }
  return 300;
}

function stableHash(value) {
  const text = String(value ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function qlcPrimaryFromIndex(index) {
  return ["red", "green", "blue"][Math.abs(index) % 3];
}

function qlcLimitedColorFromIndex(index) {
  return ["red", "green", "blue", "yellow", "violet"][Math.abs(index) % 5];
}

function nearestQlcPaletteColor(rgb, palette) {
  let bestName = "red";
  let bestDistance = Infinity;
  Object.entries(palette).forEach(([name, color]) => {
    const distance = ((rgb[0] - color[0]) ** 2) + ((rgb[1] - color[1]) ** 2) + ((rgb[2] - color[2]) ** 2);
    if (distance < bestDistance) {
      bestName = name;
      bestDistance = distance;
    }
  });
  return bestName;
}

function mapQlcColor(rawRgb, context = {}) {
  const profile = elements.qlcProfile?.value ?? "single_rgb_test";
  const qlcPalette = elements.qlcPalette?.value ?? "limited_rgb_palette";
  const rgb = rawRgb.map((value) => clamp(Math.round(Number(value ?? 0)), 0, 255));
  const [r, g, b] = rgb;
  if (profile !== "single_rgb_test") {
    return { rgb, name: "raw", reason: "full_mapping" };
  }
  if (r <= 0 && g <= 0 && b <= 0) {
    return { rgb: [0, 0, 0], name: "blackout", reason: "blackout" };
  }

  const seed = stableHash([
    context.index,
    context.colorName,
    context.timingIntent,
    context.lightingIntent,
    context.sampleCategory,
    Math.floor((context.time ?? 0) / 8),
  ].join(":"));
  let colorName = null;
  const colorNameRaw = String(context.colorName ?? "").toLowerCase();
  const palette = qlcPalette === "primary_rgb_test" ? qlcPrimaryColors : qlcLimitedColors;
  if (qlcPalette === "full_rgb_future") {
    return { rgb, name: "raw", reason: "full_rgb_future" };
  }
  if (colorNameRaw === "red") colorName = "red";
  else if (colorNameRaw === "green") colorName = "green";
  else if (colorNameRaw === "blue") colorName = "blue";
  else if (colorNameRaw === "yellow" || colorNameRaw === "amber" || colorNameRaw === "orange" || colorNameRaw === "warm") {
    colorName = qlcPalette === "primary_rgb_test" ? (seed % 2 === 0 ? "red" : "green") : "yellow";
  } else if (colorNameRaw === "violet" || colorNameRaw === "purple" || colorNameRaw === "magenta") {
    colorName = qlcPalette === "primary_rgb_test" ? (seed % 2 === 0 ? "red" : "blue") : "violet";
  } else if (colorNameRaw === "white" || colorNameRaw === "casual") {
    colorName = qlcPalette === "primary_rgb_test" ? qlcPrimaryFromIndex(seed) : qlcLimitedColorFromIndex(seed);
  } else if (r > 210 && g > 210 && b > 210) {
    colorName = qlcPalette === "primary_rgb_test" ? qlcPrimaryFromIndex(seed) : qlcLimitedColorFromIndex(seed);
  } else if (r > 150 && g > 110 && b < 130) colorName = qlcPalette === "primary_rgb_test" ? (seed % 2 === 0 ? "red" : "green") : "yellow";
  else if (r > 130 && b > 130 && g < 150) colorName = qlcPalette === "primary_rgb_test" ? (seed % 2 === 0 ? "red" : "blue") : "violet";
  else if (g > 130 && b > 130 && r < 130) colorName = qlcPalette === "primary_rgb_test" ? (seed % 2 === 0 ? "green" : "blue") : (seed % 2 === 0 ? "green" : "blue");
  else colorName = nearestQlcPaletteColor(rgb, palette);

  if (!palette[colorName]) colorName = nearestQlcPaletteColor(rgb, palette);
  const mapped = palette[colorName];
  console.log(`[qlc-web] palette=${qlcPalette} rawColor=(${r},${g},${b}) mappedColor=(${mapped[0]},${mapped[1]},${mapped[2]}) colorName=${colorName}`);
  return { rgb: mapped, name: colorName, reason: `palette_${qlcPalette}` };
}

function qlcStrongEventReason(candidate, scene) {
  if (scene.intensity <= 0 || (scene.r === 0 && scene.g === 0 && scene.b === 0)) return "blackout";
  const timing = String(candidate?.timingIntent ?? "").toLowerCase();
  const lighting = String(candidate?.lightingIntent ?? "").toLowerCase();
  const sample = String(candidate?.sampleCategory ?? "").toLowerCase();
  const phaseMode = String(candidate?.phaseMode ?? "").toLowerCase();
  if (["first_half", "second_half", "full_beat", "off"].includes(phaseMode) && phaseMode !== lastQlcPhysicalPhaseMode) return `phase_${phaseMode}`;
  if (timing.includes("strobe")) return "strobe_intent";
  if (timing.includes("first_half") || timing.includes("second_half") || timing.includes("full_beat")) return timing;
  if (sample.includes("drop") || sample.includes("buildup")) return sample || "drop";
  if (lighting.includes("build") || lighting.includes("peak")) return lighting;
  if (candidate?.beatPhase !== null && candidate?.beatPhase !== undefined && candidate.beatPhase < 0.08 && candidate.intensity >= 0.62) return "beat";
  return null;
}

function qlcSelectedIntent(candidate, scene) {
  const timing = String(candidate?.timingIntent ?? "").toLowerCase();
  const lighting = String(candidate?.lightingIntent ?? "").toLowerCase();
  const sample = String(candidate?.sampleCategory ?? "").toLowerCase();
  const sceneCategory = String(candidate?.sceneCategory ?? "").toLowerCase();
  if (scene.intensity <= 0 || (scene.r === 0 && scene.g === 0 && scene.b === 0) || timing.includes("blackout") || sample.includes("silence") || sample.includes("stop")) {
    return "blackout";
  }
  if (sample.includes("drop") || sample.includes("buildup") || lighting.includes("build") || lighting.includes("peak") || timing.includes("strobe")) {
    return "drop_downbeat_strong";
  }
  if (candidate?.beatPhase !== null && candidate?.beatPhase !== undefined && candidate.beatPhase < 0.1 && candidate.intensity >= 0.62) {
    return "drop_downbeat_strong";
  }
  if (sample.includes("bass") || sceneCategory.includes("steady_bass") || sceneCategory.includes("groove") || timing.includes("pulse")) {
    return "bass_pulse_main_groove";
  }
  if (sceneCategory && sceneCategory !== lastQlcCapacitySceneCategory) return "section_change";
  if ((sample.includes("vocal") || sample.includes("snare")) && candidate.intensity >= 0.78) return "strong_vocal_snare_accent";
  return "minor_onset_ignored";
}

function sceneWithQlcColor(scene, colorKey) {
  const [r, g, b] = colorKey.split(",").map((value) => clamp(Math.round(Number(value)), 0, 255));
  return { ...scene, r, g, b };
}

function updateQlcCapacityState(scene, candidate, selectedIntent, now) {
  lastQlcCapacityColorKey = `${scene.r},${scene.g},${scene.b}`;
  lastQlcCapacityColorAt = now;
  lastQlcCapacitySceneCategory = candidate?.sceneCategory ?? candidate?.sampleCategory ?? "";
  lastQlcCapacitySelectedIntent = selectedIntent;
  lastQlcCapacityIntensity = scene.intensity;
}

function applyQlcFixtureCapacity(scene, candidate) {
  const profile = elements.qlcProfile?.value ?? "single_rgb_test";
  const capacity = qlcFixtureCapacityValue();
  if (profile !== "single_rgb_test" || capacity !== "one_fixture_simple") return { scene, held: false };

  const now = performance.now();
  const colorKey = `${scene.r},${scene.g},${scene.b}`;
  const currentKey = lastQlcCapacityColorKey;
  const selectedIntent = qlcSelectedIntent(candidate, scene);
  const fixtureBudget = qlcFixtureBudget();
  const minHoldMs = qlcCapacityColorHoldMs();
  const elapsedMs = currentKey ? now - lastQlcCapacityColorAt : Infinity;
  const sourceCategory = candidate?.sceneCategory ?? candidate?.sampleCategory ?? "unknown";
  const candidateChange = {
    color: colorKey,
    intensity: scene.intensity,
    reason: selectedIntent,
    sourceCategory,
    timingIntent: candidate?.timingIntent ?? "",
    phaseMode: candidate?.phaseMode ?? "",
    strength: roundNumber(candidate?.intensity ?? scene.intensity, 3),
  };
  if (now - lastQlcCapacityLogAt > 250 || selectedIntent !== lastQlcCapacitySelectedIntent) {
    console.log(`[qlc-web] capacity=${capacity} selectedIntent=${selectedIntent} fixtureBudget=${fixtureBudget}`);
    lastQlcCapacityLogAt = now;
  }

  if (selectedIntent === "blackout") {
    if (!lastQlcCapacityColorKey) {
      updateQlcCapacityState(scene, candidate, selectedIntent, now);
    } else {
      lastQlcCapacitySceneCategory = sourceCategory;
      lastQlcCapacitySelectedIntent = selectedIntent;
      lastQlcCapacityIntensity = 0;
    }
    console.log("[qlc-web] allow change reason=blackout");
    return { scene, held: false };
  }
  if (!currentKey) {
    updateQlcCapacityState(scene, candidate, selectedIntent, now);
    console.log("[qlc-web] allow change reason=initial");
    return { scene, held: false };
  }
  if (colorKey === currentKey) {
    lastQlcCapacitySceneCategory = sourceCategory;
    lastQlcCapacitySelectedIntent = selectedIntent;
    lastQlcCapacityIntensity = scene.intensity;
    return { scene, held: false };
  }

  const sceneChanged = sourceCategory && sourceCategory !== lastQlcCapacitySceneCategory;
  const strongReason = qlcStrongEventReason(candidate, scene);
  const colorStableLongEnough = elapsedMs >= minHoldMs;
  const beatAligned = candidate?.beatPhase !== null && candidate?.beatPhase !== undefined && candidate.beatPhase < 0.12;
  const intensityDelta = Math.abs(scene.intensity - lastQlcCapacityIntensity);
  const strongBeatColorChange = Boolean(strongReason && /drop|buildup|strobe|beat|build|peak|full_beat/.test(strongReason));
  const sceneChangeAllowed = sceneChanged && elapsedMs >= minHoldMs * 0.5;
  const strongColorAllowed = strongBeatColorChange && colorStableLongEnough;
  if (sceneChangeAllowed || strongColorAllowed || (beatAligned && colorStableLongEnough) || colorStableLongEnough) {
    const reason = sceneChangeAllowed ? "section_changed_after_hold" : strongColorAllowed ? `${strongReason}_after_hold` : beatAligned ? "beat_aligned_after_hold" : "color_stable_long_enough";
    updateQlcCapacityState(scene, candidate, selectedIntent, now);
    console.log(`[qlc-web] allow change reason=${reason}`);
    return { scene, held: false };
  }

  console.log(`[qlc-web] color hold current=(${currentKey}) candidate=(${colorKey}) elapsedMs=${Math.round(elapsedMs)}`);
  if (intensityDelta >= 0.05) {
    const pulseScene = sceneWithQlcColor(scene, currentKey);
    lastQlcCapacitySceneCategory = sourceCategory;
    lastQlcCapacitySelectedIntent = selectedIntent;
    lastQlcCapacityIntensity = pulseScene.intensity;
    console.log(`[qlc-web] pulse allowed without color change reason=${strongReason ?? `intensity_delta_${roundNumber(intensityDelta, 3)}`}`);
    return { scene: pulseScene, held: false };
  }
  console.log(`[qlc-web] held by fixture capacity reason=color_hold candidate=${JSON.stringify(candidateChange)} current=${currentKey}`);
  return { scene: null, held: true };
}

function applyQlcSmoothing(scene, candidate) {
  const profile = elements.qlcProfile?.value ?? "single_rgb_test";
  if (profile !== "single_rgb_test") return { scene, held: false };
  const mode = elements.qlcSmooth?.value ?? "beat_aware";
  const minHoldMs = qlcSmoothHoldMs();
  const modeKey = `${mode}:${minHoldMs}`;
  if (lastQlcSmoothModeLog !== modeKey) {
    console.log(`[qlc-web] smoothing mode=${mode} minHoldMs=${minHoldMs}`);
    lastQlcSmoothModeLog = modeKey;
  }
  if (minHoldMs <= 0) return { scene, held: false };

  const colorKey = `${scene.r},${scene.g},${scene.b}`;
  const now = performance.now();
  const reason = qlcStrongEventReason(candidate, scene);
  if (!lastQlcPhysicalColorKey || colorKey === lastQlcPhysicalColorKey) {
    lastQlcPhysicalColorKey = colorKey;
    lastQlcPhysicalPhaseMode = candidate?.phaseMode ?? "";
    lastQlcPhysicalColorAt = now;
    return { scene, held: false };
  }
  if (reason) {
    console.log(`[qlc-web] smoothing=${mode} minHoldMs=${minHoldMs} allowed reason=${reason}`);
    lastQlcPhysicalColorKey = colorKey;
    lastQlcPhysicalPhaseMode = candidate?.phaseMode ?? "";
    lastQlcPhysicalColorAt = now;
    return { scene, held: false };
  }
  const elapsed = now - lastQlcPhysicalColorAt;
  if (elapsed < minHoldMs) {
    const remainingMs = Math.ceil(minHoldMs - elapsed);
    if (now - lastQlcHeldLogAt > 180) {
      console.log(`[qlc-web] held color current=(${lastQlcPhysicalColorKey}) candidate=(${colorKey}) remainingMs=${remainingMs}`);
      lastQlcHeldLogAt = now;
    }
    return { scene: null, held: true };
  }
  lastQlcPhysicalColorKey = colorKey;
  lastQlcPhysicalPhaseMode = candidate?.phaseMode ?? "";
  lastQlcPhysicalColorAt = now;
  return { scene, held: false };
}

function sendQlcWebScene(candidate) {
  if (!qlcWebBridgeActive()) return;
  const mappedColor = mapQlcColor(candidate.rgb, candidate);
  const safeIntensity = clamp(Number(candidate.intensity ?? 0), 0, 1);
  const scene = {
    r: mappedColor.rgb[0],
    g: mappedColor.rgb[1],
    b: mappedColor.rgb[2],
    intensity: roundNumber(safeIntensity, 3),
  };
  const capacityLimited = applyQlcFixtureCapacity(scene, candidate);
  if (capacityLimited.held) return;
  if (!capacityLimited.scene) return;
  const smoothed = applyQlcSmoothing(capacityLimited.scene, candidate);
  if (smoothed.held) return;
  if (!smoothed.scene) return;
  const finalScene = smoothed.scene;
  const key = `${finalScene.r},${finalScene.g},${finalScene.b},${finalScene.intensity}`;
  const now = performance.now();
  if (key === lastQlcWebSceneKey) return;
  if (now - lastQlcWebSendAt < qlcWebMinIntervalMs) return;
  lastQlcWebSceneKey = key;
  lastQlcWebSendAt = now;
  qlcWebBlackoutSent = finalScene.r === 0 && finalScene.g === 0 && finalScene.b === 0 && finalScene.intensity === 0;
  console.log(
    `[qlc-web] profile=${elements.qlcProfile?.value ?? "single_rgb_test"} selectedVirtualLight=${candidate.index ?? "-"} `
    + `rawColor=(${candidate.rgb[0]},${candidate.rgb[1]},${candidate.rgb[2]}) mappedColor=(${finalScene.r},${finalScene.g},${finalScene.b}) intensity=${finalScene.intensity}`
  );
  console.log(`[qlc-web] send scene fixture_001 rgb=(${finalScene.r},${finalScene.g},${finalScene.b}) intensity=${finalScene.intensity}`);
  console.log("[qlc-web] POST /scene");
  postQlcWeb("/scene", {
    fixtures: {
      fixture_001: finalScene,
    },
  });
}

function renderLights() {
  const playingReview = Boolean(reviewAnimationFrame);
  const liveListening = isPlaying && (inputMode === "mic_device" || inputMode === "system_audio");
  const timelinePlaying = isPlaying && inputMode === "timeline";
  const phaseAnimatedMode = playingReview || liveListening || timelinePlaying;
  const editStaticMode = trainingReviewModeActive() && !phaseAnimatedMode;
  const reviewTime = phaseAnimatedMode ? currentPlaybackTime() : trainingCapture.reviewTime ?? currentPlaybackTime();
  const beatPhase = phaseAnimatedMode ? currentBeatPhaseAt(reviewTime).phase : null;
  let selectedVirtualLight = null;
  lights.forEach((light, index) => {
    const state = normalizeLightState(lightStates[index] ?? { intensity: 0, colorIndex: index % colors.length }, { index });
    lightStates[index] = state;
    const manual = state.manualColorIndex !== null && state.manualColorIndex !== undefined;
    const manualColor = manualLightColor(state);
    const color = manualColor ?? colors[state.colorIndex];
    let manualCasual = Boolean(editStaticMode && manual && manualColor?.name === "casual");
    const [r, g, b] = resolvedLightColorValue(color, state, { index, colorIndex: state.colorIndex, time: reviewTime });
    const phaseState = phaseStateForLight(state);
    if (phaseState.off) manualCasual = false;
    const manualBlackout = Boolean(manual && (manualColor?.blackout || phaseState.off));
    const offReason = phaseState.off || manualBlackout ? lightOffReason(state) ?? "blackout" : null;
    const lightOff = Boolean(offReason);
    if (lightOff) manualCasual = false;
    if (lightOff) logLightOff(index, offReason);
    else delete lastLightOffReasonById[index];
    const intensity = lightOff ? 0 : manual ? 1 : clamp(state.intensity, 0, 1);
    const timingIntent = state.timingIntent ?? timingIntentForLightState(state);
    const effectiveIntensity = lightOff ? 0 : applyPhaseEnvelope(intensity, state, beatPhase, timingIntent, phaseAnimatedMode);
    const visible = effectiveIntensity > 0.04;
    if (visible && !lightOff) {
      const candidate = {
        index,
        rgb: [r, g, b],
        colorName: color.name,
        intensity: effectiveIntensity,
        timingIntent,
        lightingIntent: state.lightingIntent,
        phaseMode: phaseState.phaseMode,
        sampleCategory: elements.currentSampleCategory?.textContent ?? "",
        sceneCategory: lastSceneCategory,
        beatPhase,
        time: reviewTime,
      };
      if (
        !selectedVirtualLight
        || candidate.intensity > selectedVirtualLight.intensity + 0.015
        || (Math.abs(candidate.intensity - selectedVirtualLight.intensity) <= 0.015 && candidate.index < selectedVirtualLight.index)
      ) {
        selectedVirtualLight = candidate;
      }
    }
    const flatColor = `rgb(${r}, ${g}, ${b})`;
    light.style.setProperty("--light-rgb", `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`);
    const phaseButtonState = phaseButtonVisualState(state, phaseState, flatColor, manualCasual, lightOff);
    const leftPhaseButton = light.querySelector('[data-phase="first"]');
    const rightPhaseButton = light.querySelector('[data-phase="second"]');
    if (phaseState.off || lightOff || timingIntent === "blackout" || effectiveIntensity <= 0) {
      applyPhaseButtonVisual(leftPhaseButton, phaseButtonState.first);
      applyPhaseButtonVisual(rightPhaseButton, phaseButtonState.second);
      forceLightVisualOff(light);
      if (playingReview) reviewPerfDomWrites += 1;
      return;
    }
    const phaseSplit = editStaticMode && !phaseState.off && !(phaseState.firstOn && phaseState.secondOn);
    const lensFill = manualCasual
      ? "url('assets/casual-color.jpg') center / cover"
      : flatColor;
    const phaseOff = "rgb(0, 0, 0)";
    const showGlow = visible && !lightOff;
    const phaseOffMask = phaseSplit
      ? `linear-gradient(90deg, ${phaseState.firstOn ? "transparent" : phaseOff} 0 50%, ${phaseState.firstOn ? "transparent" : phaseOff} 50%, ${phaseState.secondOn ? "transparent" : phaseOff} 50%, ${phaseState.secondOn ? "transparent" : phaseOff} 100%)`
      : "";
    const phaseLensFill = phaseSplit
      ? manualCasual
        ? `${phaseOffMask}, url('assets/casual-color.jpg') center / cover`
        : `linear-gradient(90deg, ${phaseState.firstOn ? flatColor : phaseOff} 0 50%, ${phaseState.firstOn ? flatColor : phaseOff} 50%, ${phaseState.secondOn ? flatColor : phaseOff} 50%, ${phaseState.secondOn ? flatColor : phaseOff} 100%)`
      : "";
    const flatBulbFill = visible && !lightOff
      ? lensFill
      : "";
    const flatPhaseFill = phaseSplit
      ? manualCasual
        ? `${phaseOffMask}, url('assets/casual-color.jpg') center / cover`
        : `linear-gradient(90deg, ${phaseState.firstOn ? flatColor : phaseOff} 0 50%, ${phaseState.firstOn ? flatColor : phaseOff} 50%, ${phaseState.secondOn ? flatColor : phaseOff} 50%, ${phaseState.secondOn ? flatColor : phaseOff} 100%)`
      : flatBulbFill;

    light.style.background = visible
      ? manualCasual
        ? ""
        : phaseSplit
        ? ""
        : ""
      : "";
    light.style.opacity = visible ? "1" : "0.82";
    light.style.boxShadow = showGlow
      ? `0 0 ${Math.round(10 + effectiveIntensity * 54)}px rgba(${r}, ${g}, ${b}, ${effectiveIntensity * 0.84})`
      : "";
    light.style.setProperty("--beam", showGlow ? `rgba(${r}, ${g}, ${b}, ${effectiveIntensity})` : "transparent");
    light.style.setProperty("--beam-opacity", showGlow ? String(effectiveIntensity * 0.42) : "0");
    light.style.setProperty("--lens-fill", visible && !lightOff ? (phaseSplit ? phaseLensFill : lensFill) : "");
    if (phaseLensFill) {
      light.style.setProperty("--phase-lens-fill", phaseLensFill);
    } else {
      light.style.removeProperty("--phase-lens-fill");
    }
    if (editStaticMode) {
      const phaseColor = manualCasual ? "transparent" : flatColor;
      light.style.setProperty("--phase-left", phaseButtonState.first.selected ? phaseColor : phaseOff);
      light.style.setProperty("--phase-right", phaseButtonState.second.selected ? phaseColor : phaseOff);
    } else {
      light.style.removeProperty("--phase-left");
      light.style.removeProperty("--phase-right");
      light.style.removeProperty("--phase-button-color");
      light.style.removeProperty("--phase-lens-fill");
      light.style.removeProperty("--flat-phase-fill");
    }
    if (flatBulbFill) {
      light.style.setProperty("--flat-bulb-fill", flatBulbFill);
      light.style.setProperty("--flat-phase-fill", flatPhaseFill);
    } else {
      light.style.removeProperty("--flat-bulb-fill");
      light.style.removeProperty("--flat-phase-fill");
    }
    light.classList.toggle("active", effectiveIntensity > 0.62);
    light.classList.toggle("manual", manual);
    light.classList.toggle("casual", manualCasual && !lightOff);
    light.classList.toggle("phase-split", phaseSplit);
    light.classList.toggle("blackout", lightOff);
    light.classList.toggle("flat-visible", Boolean(flatBulbFill));
    applyPhaseButtonVisual(leftPhaseButton, phaseButtonState.first);
    applyPhaseButtonVisual(rightPhaseButton, phaseButtonState.second);
    if (playingReview) reviewPerfDomWrites += 1;
  });
  if (qlcWebBridgeActive()) {
    if (selectedVirtualLight) {
      sendQlcWebScene(selectedVirtualLight);
    } else {
      sendQlcWebScene({
        index: null,
        rgb: [0, 0, 0],
        colorName: "blackout",
        intensity: 0,
        timingIntent: "blackout",
        lightingIntent: "blackout",
        phaseMode: "off",
        sampleCategory: elements.currentSampleCategory?.textContent ?? "",
        sceneCategory: lastSceneCategory,
        beatPhase,
        time: reviewTime,
      });
    }
  }
  updateBrainSemantics(undefined, undefined);
}

function updateMeter(energy) {
  const percent = Math.round(energy * 100);
  elements.energyLabel.textContent = `${percent}%`;
  elements.energyFill.style.width = `${percent}%`;
}

function liveFrameToFrequencyData(frame) {
  const frequencyData = new Uint8Array(64);
  const spectrum = Array.isArray(frame.spectrum) ? frame.spectrum : [];
  if (!spectrum.length) return frequencyData;
  frequencyData.forEach((_value, index) => {
    const sourceIndex = Math.min(spectrum.length - 1, Math.floor((index / frequencyData.length) * spectrum.length));
    frequencyData[index] = Math.round(clamp(spectrum[sourceIndex], 0, 1) * 255);
  });
  return frequencyData;
}

function handleLiveAudioFrame(frame) {
  if (frame.error) {
    setState("Live audio error");
    logEvent(frame.error);
    stopLiveAudio(false);
    return;
  }
  const profile = genreProfiles[elements.genreProfile.value];
  const frequencyData = liveFrameToFrequencyData(frame);
  const energy = clamp(Number(frame.energy ?? 0), 0, 1);
  const rms = energy / 4;
  const time = Number(frame.time ?? 0);
  startedAt = audioContext ? audioContext.currentTime - time : startedAt;
  const componentLanes = frame.component_lanes
    ? normalizeComponentLanes(frame.component_lanes)
    : componentLanesFromFrequency(frequencyData, Number(frame.spectral_flux ?? 0), energy);
  drawComponentLanes(componentLanes, time, { beatPulse: shouldDrawBeatPulse(time) });
  if (frame.sample_category === "silence_or_pause" || frame.sample_category === "stop_music_moment" || frame.energy_drop > 0.18) {
    blackoutLights();
    captureTrainingAudio(frame);
    captureTrainingFrame({
      time,
      energy,
      energy_delta: Number(frame.energy_delta ?? 0),
      spectral_flux: Number(frame.spectral_flux ?? 0),
      sample_category: frame.sample_category ?? "silence_or_pause",
      component_lanes: componentLanes,
    });
    updateMeter(energy);
    updatePlayerTime();
    maybeLogBrainSource({
      mode: trainingCapture.active ? "training" : "live",
      time,
      sample: frame.sample_category ?? "silence_or_pause",
      timing: timingIntentForSample(frame.sample_category ?? "silence_or_pause", null, energy, energyTrend(Number(frame.energy_delta ?? 0))),
      usesLiveFrame: true,
      usesTrainingFrame: false,
    });
    maybeLogLiveFrame(frame);
    rememberPreviousAudioState({
      energy,
      low: 0,
      mid: 0,
      high: 0,
      rms,
    });
    maybeFinishTrainingCapture(time);
    return;
  }
  updateLights(frequencyData, energy, rms, profile, Number(frame.spectral_flux ?? 0));
  captureTrainingAudio(frame);
  captureTrainingFrame({
    time,
    energy,
    energy_delta: Number(frame.energy_delta ?? 0),
    spectral_flux: Number(frame.spectral_flux ?? 0),
    sample_category: frame.sample_category,
    component_lanes: componentLanes,
  });
  updateMeter(energy);
  updatePlayerTime();
  maybeLogBrainSource({
    mode: trainingCapture.active ? "training" : "live",
    time,
    sample: frame.sample_category ?? categoryForEnergy(energy),
    timing: timingIntentForSample(frame.sample_category ?? categoryForEnergy(energy), null, energy, energyTrend(Number(frame.energy_delta ?? 0))),
    usesLiveFrame: true,
    usesTrainingFrame: false,
  });
  maybeLogLiveFrame(frame);
  previousSpectrum = new Uint8Array(frequencyData);
  maybeFinishTrainingCapture(time);
}

function maybeLogLiveFrame(frame) {
  const second = Math.floor(Number(frame.time ?? 0));
  if (second === lastEventSecond || second % 2 !== 0) return;
  lastEventSecond = second;
  const audioSamples = Array.isArray(frame.audio_samples) ? frame.audio_samples.length : 0;
  logEvent(
    `${formatTime(second)} live ${frame.sample_category ?? "unknown"} `
    + `energy:${Math.round((frame.energy ?? 0) * 100)}% `
    + `pcm:${audioSamples}@${frame.audio_sample_rate ?? "-"}`
  );
}

function maybeLogBrainSource({ mode, time, sample, timing, usesLiveFrame, usesTrainingFrame, phaseSummary }) {
  const second = Math.floor(Number(time ?? 0));
  if (second === lastBrainSourceLogSecond) return;
  lastBrainSourceLogSecond = second;
  logEvent(
    `[brain-source] mode=${mode} inputMode=${inputMode} trainingActive=${trainingCapture.active} `
    + `usesLiveFrame=${usesLiveFrame} usesTrainingFrame=${usesTrainingFrame} `
    + `usesSpectrogramVisual=false time=${roundNumber(Number(time ?? 0), 3)} `
    + `sample=${sample ?? "-"} timing=${timing ?? "-"} phaseSummary=${phaseSummary ?? phaseModeSummary()}`
  );
  if ((inputMode === "mic_device" || inputMode === "system_audio") && isPlaying && !isTrainingMode() && usesTrainingFrame) {
    logEvent("[bug] live_using_training_frames");
  }
}

function maybeLogSignal(energy) {
  const currentSecond = Math.floor(audioContext.currentTime - startedAt);
  if (currentSecond === lastEventSecond || currentSecond < 0) return;
  if (currentSecond % 2 !== 0) return;
  lastEventSecond = currentSecond;

  const output = elements.outputTarget.value;
  const genre = elements.genreProfile.value;
  const category = categoryForEnergy(energy);
  const sceneChanged = updateCategoryScene(category);
  const intent = category === "high_energy_drop" ? "peak_energy" : category === "steady_bass_pulse" ? "main_groove" : "low_energy";
  logEvent(`${formatTime(currentSecond)} ${output} ${genre} ${category} clock:${musicalClock.source}${sceneChanged ? " scene-change" : ""}`);
}

function triggerTimelineEvent(event) {
  const profile = genreProfiles[elements.genreProfile.value];
  const category = event.sample_category ?? event.category ?? categoryFromScene(event.scene);
  const energy = timelineCategoryEnergy(category);
  const clockSource = category === "steady_bass_pulse"
    ? "bass"
    : category === "buildup"
      ? "mid_arpeggio"
      : category === "high_energy_drop"
        ? "high_pattern"
        : "none";

  updateCategoryScene(category);
  triggerPattern({
    profile,
    time: event.time,
    energy,
    low: category === "steady_bass_pulse" ? 0.82 : energy * 0.38,
    mid: category === "buildup" || category === "steady_bass_pulse" ? 0.72 : energy * 0.45,
    high: category === "high_energy_drop" ? 0.86 : energy * 0.34,
    dominantBand: category === "high_energy_drop" ? 4 : category === "buildup" ? 2 : 1,
    strong: category === "high_energy_drop",
    sparse: category === "ambient_no_beat" || category === "breakdown",
    clockSource,
    category,
  });
  logEvent(`${formatTime(Math.floor(event.time))} timeline ${category} ${event.scene ?? "scene"}`);
}

function triggerTimelineRhythmEvent(event) {
  const profile = genreProfiles[elements.genreProfile.value];
  const category = event.sample_category ?? event.category ?? categoryFromScene(event.scene);
  const downbeat = event.pulse === "downbeat";
  const accent = event.pulse === "accent";
  const highEnergy = category === "high_energy_drop";
  const buildup = category === "buildup";
  const steady = category === "steady_bass_pulse";
  const baseEnergy = Number(event.intensity ?? timelineCategoryEnergy(category));
  const beatEnergy = clamp(baseEnergy * (downbeat ? 1.08 : 0.82), 0.2, 1);

  triggerPattern({
    profile,
    time: event.time,
    energy: beatEnergy,
    low: steady || highEnergy ? 0.74 : 0.32,
    mid: buildup || steady ? 0.68 : 0.42,
    high: highEnergy ? 0.78 : downbeat ? 0.48 : 0.28,
    dominantBand: highEnergy ? 4 : buildup ? 2 : 1,
    strong: accent || (highEnergy && downbeat),
    sparse: category === "ambient_no_beat" || category === "breakdown",
    clockSource: steady ? "bass" : buildup ? "mid_arpeggio" : highEnergy ? "high_pattern" : "none",
    category,
    gesture: event.gesture,
    colorFamily: event.color_family,
    symmetry: event.symmetry,
  });
}

function categoryFromScene(scene = "") {
  const normalized = String(scene).toLowerCase();
  if (normalized.includes("drop") || normalized.includes("hook") || normalized.includes("chorus")) return "high_energy_drop";
  if (normalized.includes("buildup") || normalized.includes("lift")) return "buildup";
  if (normalized.includes("pulse") || normalized.includes("chase") || normalized.includes("groove")) return "steady_bass_pulse";
  if (normalized.includes("break")) return "breakdown";
  return "ambient_no_beat";
}

function timelineCategoryEnergy(category) {
  if (category === "high_energy_drop") return 0.92;
  if (category === "buildup") return 0.72;
  if (category === "steady_bass_pulse") return 0.58;
  if (category === "breakdown") return 0.34;
  return 0.24;
}

function getTimelinePreviewEnergy(time) {
  const previousRhythmEvent = findTimelineRhythmEventAt(time);
  if (previousRhythmEvent) {
    const age = Math.max(0, time - previousRhythmEvent.time);
    const base = Number(previousRhythmEvent.intensity ?? timelineCategoryEnergy(previousRhythmEvent.sample_category));
    return clamp(base * Math.exp(-age * 3.6), 0, 1);
  }
  const previousEvent = findTimelineEventAt(time);
  return previousEvent
    ? timelineCategoryEnergy(previousEvent.sample_category ?? previousEvent.category ?? categoryFromScene(previousEvent.scene)) * 0.25
    : 0;
}

function findTimelineEventAt(time) {
  let current = timelineEvents[0] ?? null;
  for (const event of timelineEvents) {
    if (event.time > time) break;
    current = event;
  }
  return current;
}

function findTimelineRhythmEventAt(time) {
  let current = null;
  for (const event of timelineRhythmEvents) {
    if (event.time > time) break;
    current = event;
  }
  return current;
}

function categoryForEnergy(energy) {
  if (energy > 0.68) return "high_energy_drop";
  if (energy > 0.34) return "steady_bass_pulse";
  return "ambient_no_beat";
}

function updateCategoryScene(category) {
  const threshold = Number(elements.differentiation.value);
  categoryCounters[category] = (categoryCounters[category] ?? 0) + 1;
  if (category !== lastSceneCategory) {
    lastSceneCategory = category;
    sceneVariant = (sceneVariant + 1) % Math.max(2, threshold + 1);
    return true;
  }
  if (!currentSceneByCategory[category]) {
    currentSceneByCategory[category] = 0;
    return true;
  }
  if ((categoryCounters[category] - 1) % threshold === 0) {
    currentSceneByCategory[category] += 1;
    sceneVariant = (sceneVariant + 1) % Math.max(2, threshold + 1);
    return true;
  }
  return false;
}

function logEvent(message) {
  const previous = elements.eventLog.textContent.trim();
  const next = previous ? `${message}\n${previous}` : message;
  elements.eventLog.textContent = next.split("\n").slice(0, 9).join("\n");
}

function setState(value) {
  elements.stateLabel.textContent = value;
}

function average(values) {
  if (!values.length) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function getRms(values) {
  if (!values.length) return 0;
  let total = 0;
  for (const value of values) {
    const centered = (value - 128) / 128;
    total += centered * centered;
  }
  return Math.sqrt(total / values.length);
}

function getBands(values, bandCount) {
  if (!values.length) return Array.from({ length: bandCount }, () => 0);
  const bands = [];
  const bandSize = Math.floor(values.length / bandCount);
  for (let band = 0; band < bandCount; band += 1) {
    const start = band * bandSize;
    const end = band === bandCount - 1 ? values.length : start + bandSize;
    bands.push(average(values.slice(start, end)) / 255);
  }
  return bands;
}

function getSpectralFlux(values) {
  if (!previousSpectrum || !values.length) return 0;
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += Math.max(0, values[index] - previousSpectrum[index]);
  }
  return clamp(total / (values.length * 255), 0, 1);
}

function indexOfMax(values) {
  if (!values.length) return -1;
  let maxIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[maxIndex]) {
      maxIndex = index;
    }
  }
  return maxIndex;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function currentPlaybackTime() {
  if (inputMode === "timeline") {
    return isPlaying && audioContext
      ? clamp(audioContext.currentTime - timelineStartedAt, 0, timelineDuration)
      : clamp(timelinePausedAt, 0, timelineDuration);
  }
  if (trainingReviewUsesOriginalFileAudio() && !isPlaying) {
    if (reviewAnimationFrame && reviewAudioUsesOriginalElement && audioElement) {
      return clamp(audioElement.currentTime || trainingCapture.reviewTime, 0, trainingCapture.duration);
    }
    return clamp(trainingCapture.reviewTime, 0, trainingCapture.duration);
  }
  if ((inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && trainingReviewModeActive()) {
    return clamp(trainingCapture.reviewTime, 0, trainingCapture.duration);
  }
  if (inputMode === "mic_device" || inputMode === "system_audio") {
    return audioContext && isPlaying ? Math.max(0, audioContext.currentTime - startedAt) : 0;
  }
  if (!hasLoadedAudio()) return 0;
  if (audioElement) {
    return clamp(audioElement.currentTime || pausedAt, 0, getAudioDuration());
  }
  return clamp(pausedAt, 0, getAudioDuration());
}

function updatePlayerTime() {
  const current = currentPlaybackTime();
  const reviewMode = trainingReviewModeActive();
  const duration = reviewMode ? trainingCapture.duration : inputMode === "mic_device" || inputMode === "system_audio" ? 0 : getAudioDuration();
  elements.currentTimeLabel.textContent = formatTime(Math.floor(current));
  elements.durationLabel.textContent = (inputMode === "mic_device" || inputMode === "system_audio") && !reviewMode ? "live" : formatTime(Math.floor(duration));
  drawOverviewPlayhead(current, duration);
  updateTrainingReadout(current);
  if (reviewMode && !isPlaying) {
    elements.seekSlider.disabled = false;
    elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
    return;
  }
  if (inputMode === "timeline") {
    elements.seekSlider.disabled = !timelineEvents.length;
    elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
    return;
  }
  if (!hasLoadedAudio() || inputMode !== "file") {
    elements.seekSlider.value = "0";
    elements.seekSlider.disabled = true;
    return;
  }
  elements.seekSlider.disabled = false;
  elements.seekSlider.value = String(Math.round((current / Math.max(duration, 0.001)) * 1000));
}

function updateTrainingReadout(time) {
  if (trainingReviewModeActive() && !isPlaying && applyTrainingReviewFrame(time)) {
    return;
  }
  const sceneEvent = inputMode === "timeline" ? findTimelineEventAt(time) : null;
  const rhythmEvent = inputMode === "timeline" ? findTimelineRhythmEventAt(time) : null;
  const metadata = sceneEvent?.metadata ?? {};
  elements.currentSampleCategory.textContent = sceneEvent?.sample_category ?? rhythmEvent?.sample_category ?? "-";
  elements.currentSceneCategory.textContent = metadata.lighting?.scene_category ?? sceneEvent?.scene ?? "-";
  elements.currentIntent.textContent = metadata.designer_logic?.lighting_intent ?? sceneEvent?.intent ?? "-";
  updateBrainSemantics(metadata.designer_logic?.lighting_intent ?? sceneEvent?.intent, metadata.lighting?.timing_intent ?? rhythmEvent?.timing_intent);
  elements.currentGesture.textContent = rhythmEvent?.gesture ?? "-";
  elements.currentEnergyTrend.textContent = metadata.audio?.energy_trend ?? "-";
}

function hasLoadedAudio() {
  return Boolean(audioElement?.src);
}

function getAudioDuration() {
  if (inputMode === "timeline") {
    return timelineDuration;
  }
  if (audioElement && Number.isFinite(audioElement.duration)) {
    return audioElement.duration;
  }
  return audioBuffer?.duration ?? 0;
}

function drawTrackOverview() {
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;

  if (!audioBuffer) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#0d1011";
    context.fillRect(0, 0, width, height);
    drawOverviewGrid(context, width, height);
    return;
  }

  if (overviewCacheCanvas && overviewCacheCanvas.width === width && overviewCacheCanvas.height === height) {
    context.drawImage(overviewCacheCanvas, 0, 0);
    return;
  }

  overviewCacheCanvas = document.createElement("canvas");
  overviewCacheCanvas.width = width;
  overviewCacheCanvas.height = height;
  const overviewContext = overviewCacheCanvas.getContext("2d");
  overviewContext.fillStyle = "#0d1011";
  overviewContext.fillRect(0, 0, width, height);

  const data = audioBuffer.getChannelData(0);
  const samplesPerPixel = Math.max(1, Math.floor(data.length / width));
  drawOverviewGrid(overviewContext, width, height);

  for (let x = 0; x < width; x += 1) {
    const start = x * samplesPerPixel;
    const end = Math.min(data.length, start + samplesPerPixel);
    let peak = 0;
    let rms = 0;
    let crossings = 0;
    let previous = data[start] ?? 0;

    for (let index = start; index < end; index += 1) {
      const value = data[index];
      const absolute = Math.abs(value);
      peak = Math.max(peak, absolute);
      rms += value * value;
      if ((previous <= 0 && value > 0) || (previous >= 0 && value < 0)) {
        crossings += 1;
      }
      previous = value;
    }

    const windowSize = Math.max(1, end - start);
    rms = Math.sqrt(rms / windowSize);
    const brightness = clamp(crossings / Math.max(12, windowSize * 0.18), 0, 1);
    const center = height * 0.5;
    const lowHeight = Math.max(1, peak * height * 0.4);
    const midHeight = Math.max(1, rms * height * 1.15);
    const highHeight = Math.max(1, brightness * rms * height * 0.86);

    overviewContext.fillStyle = `rgba(79, 195, 177, ${0.18 + rms * 1.6})`;
    overviewContext.fillRect(x, center - midHeight, 1, midHeight * 2);
    overviewContext.fillStyle = `rgba(255, 196, 87, ${0.16 + peak * 0.62})`;
    overviewContext.fillRect(x, center - lowHeight * 0.5, 1, lowHeight);
    overviewContext.fillStyle = `rgba(245, 247, 248, ${0.08 + highHeight / height})`;
    overviewContext.fillRect(x, Math.max(0, center - lowHeight - highHeight), 1, highHeight);
  }
  context.drawImage(overviewCacheCanvas, 0, 0);
}

function drawTimelineOverview() {
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#0d1011";
  context.fillRect(0, 0, width, height);
  drawOverviewGrid(context, width, height);

  timelineEvents.forEach((event) => {
    const category = event.sample_category ?? event.category ?? categoryFromScene(event.scene);
    const energy = timelineCategoryEnergy(category);
    const x = Math.round((event.time / Math.max(timelineDuration, 0.001)) * width);
    const markerHeight = Math.max(12, energy * height * 0.84);
    const [r, g, b] = colors[colorIndexForTimelineCategory(category)].value;
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.28 + energy * 0.62})`;
    context.fillRect(Math.max(0, x - 2 * ratio), height - markerHeight, Math.max(2, 4 * ratio), markerHeight);
  });
}

function renderMusicDissectorDashboard(timeline = musicalTimeline) {
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#0d1011";
  context.fillRect(0, 0, width, height);
  drawOverviewGrid(context, width, height);
  renderTimelineSegments(context, timeline, width, height, ratio);
  renderTimelineBeats(context, timeline, width, height, ratio);
  renderTimelineDownbeats(context, timeline, width, height, ratio);
  renderTimelineOnsets(context, timeline, width, height, ratio);
  renderTimelineLightFrames(context, timeline, width, height, ratio);
  renderTimelineCursor(context, timeline, width, height, ratio);
}

function timelineX(time, timeline, width) {
  return clamp(Number(time ?? 0) / Math.max(timeline.duration, 0.001), 0, 1) * width;
}

function renderTimelineSegments(context, timeline, width, height, ratio) {
  timeline.segments.forEach((segment, index) => {
    const x = timelineX(segment.start, timeline, width);
    const endX = timelineX(segment.end, timeline, width);
    const category = segment.sample_category ?? segment.label;
    const [r, g, b] = colors[colorIndexForTimelineCategory(category)].value;
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${index % 2 === 0 ? 0.12 : 0.18})`;
    context.fillRect(x, 0, Math.max(1, endX - x), height * 0.28);
    context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.48)`;
    context.lineWidth = Math.max(1, ratio);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  });
}

function renderTimelineBeats(context, timeline, width, height, ratio) {
  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.lineWidth = Math.max(1, ratio);
  timeline.beats.forEach((beat) => {
    if (timelineHasLightFrameAt(timeline, beat.time)) return;
    const x = timelineX(beat.time, timeline, width);
    context.beginPath();
    context.moveTo(x, height * 0.28);
    context.lineTo(x, height);
    context.stroke();
  });
}

function renderTimelineDownbeats(context, timeline, width, height, ratio) {
  context.strokeStyle = "rgba(255, 196, 87, 0.78)";
  context.lineWidth = Math.max(1, 1.6 * ratio);
  timeline.downbeats.forEach((downbeat) => {
    if (timelineHasLightFrameAt(timeline, downbeat.time)) return;
    const x = timelineX(downbeat.time, timeline, width);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  });
}

function renderTimelineOnsets(context, timeline, width, height, ratio) {
  timeline.onsets.forEach((onset) => {
    if (timelineHasLightFrameAt(timeline, onset.time)) return;
    const x = timelineX(onset.time, timeline, width);
    const markerHeight = Math.max(8 * ratio, onset.strength * height * 0.42);
    context.fillStyle = `rgba(245, 247, 248, ${0.18 + onset.strength * 0.46})`;
    context.fillRect(x - ratio, height - markerHeight, Math.max(1, 2 * ratio), markerHeight);
  });
}

function timelineHasLightFrameAt(timeline, time) {
  const safeTime = roundNumber(Number(time ?? 0), 4);
  return (timeline.lightFrames ?? []).some((frame) => roundNumber(Number(frame.time ?? 0), 4) === safeTime);
}

function renderTimelineLightFrames(context, timeline, width, height, ratio) {
  context.strokeStyle = "rgba(245, 247, 248, 0.72)";
  context.lineWidth = Math.max(1, 1.4 * ratio);
  timeline.lightFrames.forEach((frame, index) => {
    const x = timelineX(frame.time, timeline, width);
    const selected = index === timeline.cursor.frameIndex;
    context.strokeStyle = selected ? "rgba(245, 247, 248, 1)" : "rgba(245, 247, 248, 0.58)";
    context.beginPath();
    context.moveTo(x, height * 0.12);
    context.lineTo(x, height);
    context.stroke();
    if (selected) {
      context.fillStyle = "rgba(245, 247, 248, 0.92)";
      context.fillRect(x - 3 * ratio, height * 0.1, 6 * ratio, 6 * ratio);
    }
  });
}

function renderTimelineCursor(context, timeline, width, height, ratio) {
  const x = timelineX(timeline.cursor.time, timeline, width);
  context.strokeStyle = "rgba(255, 255, 255, 0.96)";
  context.lineWidth = Math.max(1, 1.3 * ratio);
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, height);
  context.stroke();
}

function colorIndexForTimelineCategory(category) {
  if (category === "high_energy_drop") return 4;
  if (category === "buildup") return 1;
  if (category === "steady_bass_pulse") return 3;
  if (category === "breakdown") return 2;
  return 0;
}

function drawOverviewGrid(context, width, height) {
  context.strokeStyle = "rgba(255, 255, 255, 0.06)";
  context.lineWidth = 1;
  for (let line = 1; line < 4; line += 1) {
    const y = (height / 4) * line;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawOverviewPlayhead(current, duration) {
  if (inputMode === "timeline") {
    musicalTimeline.cursor = musicalTimelineCursorAt(musicalTimeline, current);
    renderMusicDissectorDashboard(musicalTimeline);
    return;
  }
  if (!audioBuffer || inputMode !== "file") return;
  drawTrackOverview();
  const canvas = elements.trackOverview;
  const context = canvas.getContext("2d");
  if (overviewCacheCanvas) {
    context.drawImage(overviewCacheCanvas, 0, 0);
  }
  const progress = clamp(current / Math.max(duration, 0.001), 0, 1);
  const x = Math.round(progress * canvas.width);
  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
  context.lineWidth = Math.max(1, window.devicePixelRatio || 1);
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, canvas.height);
  context.stroke();
}

function componentLanesFromFrequency(frequencyData, spectralFlux = 0, energy = 0) {
  const bands = getBands(frequencyData, 8);
  const low = (bands[0] ?? 0) * 0.72 + (bands[1] ?? 0) * 0.42;
  const lowMid = (bands[2] ?? 0) * 0.36 + (bands[3] ?? 0) * 0.44;
  const mid = (bands[3] ?? 0) * 0.3 + (bands[4] ?? 0) * 0.5 + (bands[5] ?? 0) * 0.2;
  const high = (bands[6] ?? 0) * 0.4 + (bands[7] ?? 0) * 0.6;
  const transient = clamp(spectralFlux * 4.5, 0, 1);
  const bass = clamp(low * 1.85, 0, 1);
  const drum = clamp(transient * 0.74 + low * 0.34 + high * 0.32, 0, 1);
  const vocal = clamp((lowMid * 0.35 + mid * 0.85) * (1 - transient * 0.22), 0, 1);
  const other = clamp((mid * 0.35 + high * 0.42 + energy * 0.32) * (1 - bass * 0.12), 0, 1);
  return {
    drum: roundNumber(drum, 4),
    bass: roundNumber(bass, 4),
    vocal: roundNumber(vocal, 4),
    other: roundNumber(other, 4),
  };
}

function normalizeComponentLanes(componentLanes) {
  if (!componentLanes) return null;
  return componentLaneNames.reduce((lanes, name) => {
    lanes[name] = roundNumber(clamp(componentLanes[name] ?? 0, 0, 1), 4);
    return lanes;
  }, {});
}

function strongestComponentLane(componentLanes) {
  if (!componentLanes) return "-";
  let strongest = "drum";
  componentLaneNames.forEach((name) => {
    if ((componentLanes[name] ?? 0) > (componentLanes[strongest] ?? 0)) {
      strongest = name;
    }
  });
  return `${componentLaneLabels[strongest]} ${Math.round((componentLanes[strongest] ?? 0) * 100)}%`;
}

function shouldDrawBeatPulse(time) {
  if (!musicalClock.interval || musicalClock.confidence < 0.18 || musicalClock.lastPulseTime === null) return false;
  return Math.abs(time - musicalClock.lastPulseTime) < 0.08;
}

function trainingReviewAvailable() {
  return !trainingCapture.active && trainingCapture.frames.length > 0;
}

function trainingReviewUsesOriginalFileAudio() {
  return isTrainingMode()
    && trainingReviewAvailable()
    && trainingCapture.source === "file"
    && hasLoadedAudio()
    && Boolean(audioElement?.src);
}

function trainingReviewModeActive() {
  return isTrainingMode()
    && trainingReviewAvailable()
    && (trainingReviewUsesOriginalFileAudio() || inputMode === "file" || inputMode === "mic_device" || inputMode === "system_audio");
}

function trainingReviewCueTimes() {
  if (!trainingCapture.frames.length) return [];
  const times = new Set(trainingReviewAutomaticCueTimes());
  trainingCapture.cues.forEach((cue) => times.add(roundNumber(cue.time, 4)));
  return [...times]
    .filter((time) => !isSuppressedCueTime(time))
    .sort((left, right) => left - right);
}

function trainingReviewFrameTimes() {
  const lightFrameTimes = (musicalTimeline.lightFrames ?? [])
    .map((frame) => roundNumber(Number(frame.time ?? 0), 4))
    .filter((time) => Number.isFinite(time));
  if (lightFrameTimes.length) {
    return [...new Set(lightFrameTimes)].sort((left, right) => left - right);
  }
  if (!trainingCapture.frames.length) return [];
  return [...new Set(trainingCapture.frames
    .map((frame) => roundNumber(Number(frame.time ?? 0), 4))
    .filter((time) => Number.isFinite(time)))]
    .sort((left, right) => left - right);
}

function trainingReviewAutomaticCueTimes() {
  if (!trainingCapture.frames.length) return [];
  const times = new Set([0, roundNumber(trainingCapture.duration, 4)]);
  const intervals = trainingCapture.frames
    .map((frame) => Number(frame.rhythm_split?.base_interval_seconds))
    .filter((interval) => Number.isFinite(interval) && interval >= 0.12 && interval <= 2);
  const sortedIntervals = intervals.sort((left, right) => left - right);
  const interval = sortedIntervals.length ? sortedIntervals[Math.floor(sortedIntervals.length / 2)] : 0.5;
  for (let time = 0; time <= trainingCapture.duration + interval * 0.5; time += interval) {
    const beatStart = clamp(time, 0, trainingCapture.duration);
    times.add(roundNumber(beatStart, 4));
  }
  return [...times].sort((left, right) => left - right);
}

function isSuppressedCueTime(time) {
  return (trainingCapture.suppressedCueTimes ?? []).some((suppressedTime) => (
    Math.abs(suppressedTime - time) <= cueHitThresholdSeconds()
  ));
}

function snapTrainingReviewTime(rawTime) {
  const times = trainingReviewFrameTimes();
  if (!times.length) return clamp(rawTime, 0, trainingCapture.duration);
  const nearest = times.reduce((closest, time) => (
    Math.abs(time - rawTime) < Math.abs(closest - rawTime) ? time : closest
  ), times[0]);
  const threshold = Math.max(0.08, trainingReviewHitThresholdSeconds(18));
  if (Math.abs(nearest - rawTime) <= threshold) return nearest;
  return clamp(rawTime, 0, trainingCapture.duration);
}

function phaseFromPulse(time, pulseTime, interval, source) {
  if (!Number.isFinite(time) || !Number.isFinite(pulseTime) || !Number.isFinite(interval) || interval <= 0) {
    return { phase: null, source: "none" };
  }
  const elapsed = ((time - pulseTime) % interval + interval) % interval;
  return { phase: clamp(elapsed / interval, 0, 0.9999), source };
}

function currentBeatPhaseAt(time) {
  let result = { phase: null, source: "none" };
  if ((inputMode === "timeline" || trainingCapture.source === "timeline") && timelineRhythmEvents.length) {
    const index = timelineRhythmEvents.findIndex((event) => event.time > time);
    const previous = timelineRhythmEvents[index > 0 ? index - 1 : 0];
    const next = index >= 0 ? timelineRhythmEvents[index] : null;
    const interval = next && previous ? next.time - previous.time : musicalClock.interval;
    result = phaseFromPulse(time, previous?.time, interval, "timelineRhythmEvents");
  }
  if (result.phase === null && musicalClock.interval && musicalClock.confidence >= 0.18 && musicalClock.lastPulseTime !== null) {
    result = phaseFromPulse(time, musicalClock.lastPulseTime, musicalClock.interval, musicalClock.source || "musicalClock");
  }
  if (result.phase === null && trainingReviewModeActive()) {
    const frame = findTrainingFrameAt(time) ?? trainingCapture.frames[0];
    const interval = Number(frame?.rhythm_split?.base_interval_seconds);
    const pulseTime = Number(frame?.time);
    if (Number.isFinite(interval) && interval > 0 && Number.isFinite(pulseTime)) {
      result = phaseFromPulse(time, pulseTime, interval, "trainingFrames");
    }
  }
  const second = Math.floor(time);
  if (second !== lastPhaseRenderLogSecond) {
    lastPhaseRenderLogSecond = second;
    logEvent(`[phase-render] time=${roundNumber(time, 2)} beatPhase=${result.phase === null ? "null" : roundNumber(result.phase, 3)} source=${result.source}`);
  }
  return result;
}

function phaseModeForState(state) {
  return normalizeLightState(state).phaseMode;
}

function applyPhaseEnvelope(intensity, state, beatPhase, timingIntent, isPlayingReview) {
  const phaseState = phaseStateForLight(state);
  if (phaseState.off || timingIntent === "blackout") return 0;
  if (!isPlayingReview) return intensity;
  if (beatPhase === null || beatPhase === undefined) return intensity;
  if (timingIntent === "single_fixture_three_quarter_hold") {
    return beatPhase < 0.75 ? intensity : 0;
  }
  const impulsive = timingIntent === "pulse_first_half"
    || timingIntent === "pulse_second_half"
    || timingIntent === "pulse_full_beat"
    || timingIntent === "alternate_halves"
    || timingIntent === "strobe_like";
  if (!impulsive) return intensity;
  if (phaseState.phaseMode === "full_beat") return intensity;
  if (phaseState.phaseMode === "first_half") return beatPhase < 0.5 ? intensity : 0;
  if (phaseState.phaseMode === "second_half") return beatPhase >= 0.5 ? intensity : 0;
  return intensity;
}

function timingIntentForLightState(state, sceneTimingIntent = "sustain") {
  const normalized = normalizeLightState(state, { sceneTimingIntent });
  return normalized.timingIntent;
}

function timingIntentForSample(category, sceneCategory, energy, trend = "stable") {
  const normalizedScene = String(sceneCategory ?? "").toLowerCase();
  if (category === "silence_or_pause" || category === "stop_music_moment") return "blackout";
  if (category === "ambient_no_beat") return energy > 0.18 ? "fade_sustain" : "sustain";
  if (category === "breakdown") return "fade_sustain";
  if (category === "buildup") return trend === "rising" ? "alternate_halves" : "pulse_full_beat";
  if (category === "high_energy_drop") {
    if (energy > 0.7 || normalizedScene.includes("drop")) return "strobe_like";
    return "alternate_halves";
  }
  if (category === "steady_bass_pulse") {
    return energy > 0.48 ? "alternate_halves" : "pulse_full_beat";
  }
  if (normalizedScene.includes("blackout")) return "blackout";
  if (normalizedScene.includes("strobe")) return "strobe_like";
  return energy > 0.22 ? "pulse_full_beat" : "sustain";
}

function lightingIntentForSample(category, sceneCategory, energy, trend = "stable") {
  const timingIntent = timingIntentForSample(category, sceneCategory, energy, trend);
  if (timingIntent === "blackout") return "blackout";
  if (timingIntent === "strobe_like") return "strobe_like";
  if (timingIntent === "alternate_halves") return "alternating_pulse";
  if (timingIntent === "pulse_full_beat" || timingIntent === "pulse_first_half" || timingIntent === "pulse_second_half") return "pulse";
  if (category === "ambient_no_beat" || category === "breakdown" || timingIntent === "fade_sustain") return "sustain";
  return trend === "rising" ? "build_tension" : "sustain";
}

function captureLightSnapshot(sceneTimingIntent = "sustain") {
  return lightStates.map((state, index) => {
    const normalized = normalizeLightState(state, { index, sceneTimingIntent });
    lightStates[index] = normalized;
    const phaseState = phaseStateForLight(normalized);
    return {
      enabled: normalized.enabled !== false && !phaseState.off,
      intensity: roundNumber(normalized.intensity ?? 0, 4),
      age: normalized.age ?? 0,
      colorIndex: normalized.colorIndex ?? 0,
      manualColorIndex: normalized.manualColorIndex ?? null,
      manualRandomColor: normalized.manualRandomColor ?? null,
      colorMode: normalized.colorMode,
      blackout: Boolean(normalized.blackout || phaseState.off),
      phaseFirstHalf: phaseState.firstOn,
      phaseSecondHalf: phaseState.secondOn,
      phaseMode: phaseState.phaseMode,
      lightingIntent: normalized.lightingIntent ?? (phaseState.off ? "blackout" : "sustain"),
      timingIntent: normalized.timingIntent,
    };
  });
}

function applyLightSnapshot(snapshot) {
  if (!Array.isArray(snapshot)) return false;
  snapshot.forEach((state, index) => {
    if (!lightStates[index]) return;
    const normalized = normalizeLightState(state, { index });
    lightStates[index] = {
      ...lightStates[index],
      intensity: normalized.intensity,
      age: normalized.age,
      colorIndex: normalized.colorIndex,
      manualColorIndex: normalized.manualColorIndex,
      manualRandomColor: normalized.manualRandomColor,
      enabled: normalized.enabled,
      colorMode: normalized.colorMode,
      blackout: normalized.blackout,
      phaseFirstHalf: normalized.phaseFirstHalf,
      phaseSecondHalf: normalized.phaseSecondHalf,
      phaseMode: normalized.phaseMode,
      lightingIntent: normalized.lightingIntent,
      timingIntent: normalized.timingIntent,
    };
  });
  renderLights();
  return true;
}

function persistCurrentTrainingFrameScene() {
  if (!canEditTrainingScene()) return null;
  const time = currentPlaybackTime();
  const frame = findTrainingFrameAt(time);
  if (!frame) return null;
  const lightSnapshot = captureLightSnapshot(frame.timing_intent ?? "sustain");
  const scene = {
    source: "user_scene",
    edited_at: new Date().toISOString(),
    time: roundNumber(frame.time, 4),
    review_time: roundNumber(time, 4),
    sample_category: frame.sample_category ?? null,
    scene_category: `${frame.scene_category ?? "training_scene"}__user`,
    lighting_intent: frame.lighting_intent ?? lightingIntentForSample(frame.sample_category, frame.scene_category, frame.energy ?? 0, frame.energy_trend),
    timing_intent: frame.timing_intent ?? timingIntentForSample(frame.sample_category, frame.scene_category, frame.energy ?? 0, frame.energy_trend),
    intent: frame.intent ?? null,
    dominant_component: frame.dominant_component ?? frame.clock_source ?? null,
    energy_trend: frame.energy_trend ?? null,
    light_snapshot: lightSnapshot,
  };
  frame.user_scene = scene;
  frame.final_scene = scene;
  saveManualOverrideForTime(time, lightSnapshot);
  elements.currentSampleCategory.textContent = scene.sample_category ?? "-";
  elements.currentSceneCategory.textContent = scene.scene_category ?? "-";
  elements.currentIntent.textContent = scene.intent ?? "-";
  updateBrainSemantics(scene.lighting_intent, scene.timing_intent);
  elements.currentGesture.textContent = scene.dominant_component ?? "-";
  elements.currentEnergyTrend.textContent = scene.energy_trend ?? "-";
  return frame;
}

function drawComponentLanes(componentLanes, time, options = {}) {
  const canvas = elements.liveSpectrum;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  updateSpectrumCanvasWidth();
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(260, Math.round(rect.width * ratio));
  const height = Math.max(120, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.fillStyle = "rgba(13, 16, 17, 0.34)";
  context.fillRect(0, 0, width, height);
  drawOverviewGrid(context, width, height);

  const reviewMode = trainingReviewModeActive();
  const trainingGraphMode = reviewMode || trainingCapture.active;
  const liveWindowSeconds = liveSpectrumWindowSeconds();
  if (Number.isFinite(time) && !trainingGraphMode) {
    if (liveSpectrumWindowStartedAt === null || time < liveSpectrumWindowStartedAt || time - liveSpectrumWindowStartedAt >= liveWindowSeconds) {
      componentHistory = [];
      liveSpectrumWindowStartedAt = time;
      logEvent(`[spectrum] live window reset seconds=${roundNumber(liveWindowSeconds, 2)}`);
    }
    componentHistory.push({ time, lanes: componentLanes, beat: Boolean(options.beatPulse) });
    componentHistory = componentHistory.filter((item) => time - item.time <= liveWindowSeconds);
  } else if (Number.isFinite(time) && trainingCapture.active) {
    componentHistory.push({ time, lanes: componentLanes, beat: Boolean(options.beatPulse) });
    componentHistory = componentHistory.filter((item) => time - item.time <= Math.max(trainingCapture.duration || componentLaneWindowSeconds, componentLaneWindowSeconds));
  } else if (reviewMode) {
    componentHistory = [];
    liveSpectrumWindowStartedAt = null;
  }

  const laneHeight = height / componentLaneNames.length;
  componentLaneNames.forEach((_name, laneIndex) => {
    const y = laneIndex * laneHeight;
    context.fillStyle = laneIndex % 2 === 0 ? "rgba(255, 255, 255, 0.018)" : "rgba(255, 255, 255, 0.036)";
    context.fillRect(0, y, width, laneHeight);
    context.strokeStyle = "rgba(145, 163, 168, 0.18)";
    context.beginPath();
    context.moveTo(0, y + laneHeight);
    context.lineTo(width, y + laneHeight);
    context.stroke();
  });

  const colorByLane = {
    drum: [255, 196, 87],
    bass: [88, 123, 255],
    vocal: [255, 132, 60],
    other: [245, 247, 248],
  };
  const history = reviewMode
    ? trainingCapture.frames.map((frame) => ({
      time: frame.time,
      lanes: frame.component_lanes,
      beat: Boolean(frame.rhythm_split?.fastest_component),
    }))
    : componentHistory;
  const captureDuration = trainingGraphMode ? trainingCapture.duration : liveWindowSeconds;
  const currentTime = reviewMode ? currentPlaybackTime() : Number.isFinite(time) ? time : history.at(-1)?.time ?? 0;
  const windowStart = trainingGraphMode ? 0 : (liveSpectrumWindowStartedAt ?? currentTime - liveWindowSeconds);
  history.forEach((point, pointIndex) => {
    const progress = trainingGraphMode
      ? clamp(point.time / Math.max(captureDuration, 0.001), 0, 1)
      : clamp((point.time - windowStart) / liveWindowSeconds, 0, 1);
    const pointX = progress * width;
    if (point.beat) {
      context.strokeStyle = "rgba(255, 255, 255, 0.42)";
      context.lineWidth = Math.max(1, ratio);
      context.beginPath();
      context.moveTo(pointX, 0);
      context.lineTo(pointX, height);
      context.stroke();
    }
    componentLaneNames.forEach((name, laneIndex) => {
      const value = clamp(point.lanes?.[name] ?? 0, 0, 1);
      const previous = history[pointIndex - 1];
      const previousValue = clamp(previous?.lanes?.[name] ?? value, 0, 1);
      const previousProgress = previous
        ? trainingGraphMode
          ? clamp(previous.time / Math.max(captureDuration, 0.001), 0, 1)
          : clamp((previous.time - windowStart) / liveWindowSeconds, 0, 1)
        : progress;
      const previousX = previousProgress * width;
      const yBase = laneIndex * laneHeight + laneHeight * 0.82;
      const y = yBase - value * laneHeight * 0.62;
      const previousY = yBase - previousValue * laneHeight * 0.62;
      const [r, g, b] = colorByLane[name];
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.36 + value * 0.5})`;
      context.lineWidth = Math.max(1, 1.6 * ratio);
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(pointX, y);
      context.stroke();
      if (value > 0.42) {
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.08 + value * 0.24})`;
        context.fillRect(pointX - 1 * ratio, laneIndex * laneHeight + laneHeight * 0.15, 2 * ratio, laneHeight * 0.7);
      }
    });
  });

  drawTrainingCueMarkers(context, width, height, ratio, captureDuration, reviewMode ? currentTime : null);

  if (reviewMode && reviewAnimationFrame) {
    followSpectrumPlayhead(currentTime, captureDuration);
  }
}

function updateSpectrumCanvasWidth() {
  const canvas = elements.liveSpectrum;
  const scroller = elements.spectrumScroller;
  if (!canvas || !scroller) return;
  const trainingGraphMode = trainingReviewModeActive() || trainingCapture.active;
  if (!trainingGraphMode) {
    canvas.style.width = "100%";
    return;
  }
  const visibleWidth = scroller.clientWidth || canvas.getBoundingClientRect().width || 980;
  const width = Math.max(visibleWidth, Math.round(trainingCapture.duration * trainingSpectrumPixelsPerSecond));
  canvas.style.width = `${width}px`;
}

function liveSpectrumWindowSeconds() {
  const scroller = elements.spectrumScroller;
  const canvas = elements.liveSpectrum;
  const visibleWidth = scroller?.clientWidth || canvas?.getBoundingClientRect().width || 900;
  return clamp(visibleWidth / liveSpectrumPixelsPerSecond, 5, 10);
}

function resetSpectrumHistory() {
  componentHistory = [];
  liveSpectrumWindowStartedAt = null;
}

function followSpectrumPlayhead(currentTime, duration) {
  const canvas = elements.liveSpectrum;
  const scroller = elements.spectrumScroller;
  if (!canvas || !scroller || !duration) return;
  const canvasWidth = canvas.getBoundingClientRect().width;
  const x = clamp(currentTime / Math.max(duration, 0.001), 0, 1) * canvasWidth;
  const leftEdge = scroller.scrollLeft;
  const rightEdge = leftEdge + scroller.clientWidth;
  const margin = Math.min(180, scroller.clientWidth * 0.34);
  if (x < leftEdge + margin || x > rightEdge - margin) {
    scroller.scrollLeft = clamp(x - scroller.clientWidth * 0.45, 0, canvasWidth - scroller.clientWidth);
  }
}

function drawTrainingCueMarkers(context, width, height, ratio, duration, currentTime) {
  if (!trainingReviewModeActive()) return;
  const frameTimes = trainingReviewFrameTimes();
  const currentThreshold = trainingReviewHitThresholdSeconds(12);
  frameTimes.forEach((time) => {
    const x = clamp(time / Math.max(duration, 0.001), 0, 1) * width;
    const selected = Number.isFinite(currentTime) && Math.abs(time - currentTime) <= currentThreshold;
    context.strokeStyle = selected ? "rgba(245, 247, 248, 0.95)" : "rgba(245, 247, 248, 0.34)";
    context.lineWidth = selected ? Math.max(1, 1.8 * ratio) : Math.max(1, ratio);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    if (selected) {
      context.fillStyle = "rgba(245, 247, 248, 0.92)";
      context.beginPath();
      context.arc(x, height - 7 * ratio, Math.max(3, 3.4 * ratio), 0, Math.PI * 2);
      context.fill();
    }
  });
  trainingCapture.cues.forEach((cue) => {
    const x = clamp(cue.time / Math.max(duration, 0.001), 0, 1) * width;
    const selected = cue.id === selectedTrainingCueId || (Number.isFinite(currentTime) && Math.abs(cue.time - currentTime) <= currentThreshold);
    context.strokeStyle = selected ? "rgba(255, 196, 87, 1)" : "rgba(255, 196, 87, 0.86)";
    context.lineWidth = selected ? Math.max(1, 2.2 * ratio) : Math.max(1, 1.5 * ratio);
    context.setLineDash([4 * ratio, 4 * ratio]);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(255, 196, 87, 0.92)";
    context.font = `${Math.round(10 * ratio)}px system-ui, sans-serif`;
    context.textBaseline = "top";
    context.fillText(cue.name, x + 4 * ratio, 4 * ratio);
  });
  if (Number.isFinite(currentTime)) {
    const x = clamp(currentTime / Math.max(duration, 0.001), 0, 1) * width;
    context.strokeStyle = "rgba(255, 255, 255, 0.96)";
    context.lineWidth = Math.max(1, 1.2 * ratio);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
}

function cueTimeFromCanvasEvent(event) {
  const rect = elements.liveSpectrum.getBoundingClientRect();
  const progress = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
  return progress * Math.max(trainingCapture.duration, 0.001);
}

function trainingReviewHitThresholdSeconds(pixelRadius = 14) {
  const rect = elements.liveSpectrum.getBoundingClientRect();
  const measuredWidth = rect.width || elements.liveSpectrum.width || 980;
  const secondsPerPixel = trainingCapture.duration / Math.max(measuredWidth, 1);
  return Math.max(0.08, secondsPerPixel * pixelRadius);
}

function cueHitThresholdSeconds() {
  return trainingReviewHitThresholdSeconds(16);
}

function nearestCueHit(time) {
  const threshold = cueHitThresholdSeconds();
  const manual = trainingCapture.cues
    .map((cue, index) => ({ type: "manual", cue, index, time: cue.time, distance: Math.abs(cue.time - time) }))
    .filter((hit) => hit.distance <= threshold);
  const automatic = trainingReviewAutomaticCueTimes()
    .filter((cueTime) => cueTime > cueHitThresholdSeconds() && cueTime < trainingCapture.duration - cueHitThresholdSeconds())
    .filter((cueTime) => !isSuppressedCueTime(cueTime))
    .map((cueTime) => ({ type: "automatic", time: cueTime, distance: Math.abs(cueTime - time) }))
    .filter((hit) => hit.distance <= threshold);
  return [...manual, ...automatic].sort((left, right) => left.distance - right.distance)[0] ?? null;
}

function toggleTrainingCueAt(time, source = "manual") {
  const before = trainingCapture.cues.length + trainingReviewAutomaticCueTimes().length - (trainingCapture.suppressedCueTimes?.length ?? 0);
  logEvent(
    `[cue-edit] action=toggle time=${roundNumber(time, 4)} before=${before} `
    + `nearestFrameMs=${nearestFrameDistanceMs(time) ?? "-"} source=${source}`
  );
  const hit = nearestCueHit(time);
  if (hit?.type === "manual") {
    const [removed] = trainingCapture.cues.splice(hit.index, 1);
    if (selectedTrainingCueId === removed.id) selectedTrainingCueId = null;
    updateCueEditor();
    updateTrainingSummary();
    redrawTrainingReview();
    logEvent(`cue removed ${removed.name}`);
    logEvent(`[cue-edit] removed id=${removed.id} time=${roundNumber(removed.time, 4)}`);
    const after = trainingCapture.cues.length + trainingReviewAutomaticCueTimes().length - (trainingCapture.suppressedCueTimes?.length ?? 0);
    logEvent(`[cue-edit] action=toggle time=${roundNumber(time, 4)} after=${after}`);
    return;
  }
  if (hit?.type === "automatic") {
    trainingCapture.suppressedCueTimes = [
      ...(trainingCapture.suppressedCueTimes ?? []),
      roundNumber(hit.time, 4),
    ];
    updateTrainingSummary();
    redrawTrainingReview();
    logEvent(`auto cue removed ${formatTime(Math.floor(hit.time))}`);
    logEvent(`[cue-edit] removed id=auto time=${roundNumber(hit.time, 4)}`);
    const after = trainingCapture.cues.length + trainingReviewAutomaticCueTimes().length - (trainingCapture.suppressedCueTimes?.length ?? 0);
    logEvent(`[cue-edit] action=toggle time=${roundNumber(time, 4)} after=${after}`);
    return;
  }
  const cue = addTrainingCue(time);
  if (cue) logEvent(`[cue-edit] added id=${cue.id} time=${roundNumber(cue.time, 4)}`);
  const after = trainingCapture.cues.length + trainingReviewAutomaticCueTimes().length - (trainingCapture.suppressedCueTimes?.length ?? 0);
  logEvent(`[cue-edit] action=toggle time=${roundNumber(time, 4)} after=${after}`);
}

function addTrainingCue(time) {
  if (!canEditTrainingScene()) return;
  const cueTime = roundNumber(clamp(time, 0, trainingCapture.duration), 4);
  const frame = findTrainingFrameAt(cueTime);
  const rhythmSplit = estimateFastestRhythmSplit(cueTime);
  const component = rhythmSplit.fastest_component ?? dominantComponentName(frame?.component_lanes) ?? "sound";
  const cue = {
    id: `cue_${String(trainingCapture.cues.length + 1).padStart(3, "0")}`,
    name: `${component}_cue_${String(trainingCapture.cues.length + 1).padStart(2, "0")}`,
    time: cueTime,
    probability: 0.9,
    split_type: "sound_scene_split",
    sample_category: frame?.sample_category ?? null,
    scene_category: frame?.scene_category ?? null,
    dominant_component: component,
    fastest_component_bpm: rhythmSplit.fastest_component_bpm,
    rhythm_split: rhythmSplit,
  };
  trainingCapture.cues.push(cue);
  trainingCapture.cues.sort((left, right) => left.time - right.time);
  selectedTrainingCueId = cue.id;
  seekToSliderValue((cueTime / Math.max(trainingCapture.duration, 0.001)) * 1000).catch((error) => {
    setState("Cue seek error");
    logEvent(error.message);
  });
  updateTrainingSummary();
  redrawTrainingReview();
  logEvent(`cue ${cue.name} ${formatTime(Math.floor(cueTime))}`);
  return cue;
}

function selectedTrainingCue() {
  return trainingCapture.cues.find((cue) => cue.id === selectedTrainingCueId) ?? null;
}

function updateCueEditor() {
  const cue = selectedTrainingCue();
  const enabled = canEditTrainingScene() && Boolean(cue);
  elements.cueNameInput.disabled = !enabled;
  elements.cueProbabilityInput.disabled = !enabled;
  elements.cueNameInput.value = cue?.name ?? "";
  elements.cueProbabilityInput.value = String(cue?.probability ?? 0.9);
  elements.cueNameInput.placeholder = enabled ? "cue name" : "no cue";
}

function estimateFastestRhythmSplit(time) {
  const windowStart = Math.max(0, time - 3);
  const windowEnd = Math.min(trainingCapture.duration, time + 3);
  const frames = trainingCapture.frames.filter((frame) => frame.time >= windowStart && frame.time <= windowEnd);
  const laneStats = componentLaneNames.map((name) => {
    const peaks = componentPeaks(frames, name);
    const bpm = bpmFromPeaks(peaks);
    return { component: name, bpm, peaks: peaks.length };
  }).filter((stat) => stat.bpm);
  laneStats.sort((left, right) => right.bpm - left.bpm);
  const fastest = laneStats[0];
  const baseInterval = musicalClock.interval || (fastest?.bpm ? 60 / fastest.bpm : null);
  return {
    fastest_component: fastest?.component ?? null,
    fastest_component_bpm: fastest ? roundNumber(fastest.bpm, 2) : null,
    base_interval_seconds: baseInterval ? roundNumber(baseInterval, 4) : null,
    split_reason: fastest
      ? `${fastest.component} pulses faster than the global groove`
      : "manual split without enough component peaks",
    candidate_components: laneStats.map((stat) => ({
      component: stat.component,
      bpm: roundNumber(stat.bpm, 2),
      peaks: stat.peaks,
    })),
  };
}

function componentPeaks(frames, component) {
  const peaks = [];
  for (let index = 1; index < frames.length - 1; index += 1) {
    const previous = frames[index - 1].component_lanes?.[component] ?? 0;
    const current = frames[index].component_lanes?.[component] ?? 0;
    const next = frames[index + 1].component_lanes?.[component] ?? 0;
    if (current > 0.38 && current >= previous * 1.08 && current >= next * 1.08) {
      const lastPeak = peaks.at(-1);
      if (!lastPeak || frames[index].time - lastPeak > 0.16) {
        peaks.push(frames[index].time);
      }
    }
  }
  return peaks;
}

function bpmFromPeaks(peaks) {
  if (peaks.length < 2) return null;
  const intervals = [];
  for (let index = 0; index < peaks.length - 1; index += 1) {
    const interval = peaks[index + 1] - peaks[index];
    if (interval >= 0.12 && interval <= 2.0) intervals.push(interval);
  }
  if (!intervals.length) return null;
  const mean = average(intervals);
  return mean > 0 ? 60 / mean : null;
}

function dominantComponentName(componentLanes) {
  if (!componentLanes) return null;
  let strongest = componentLaneNames[0];
  componentLaneNames.forEach((name) => {
    if ((componentLanes[name] ?? 0) > (componentLanes[strongest] ?? 0)) strongest = name;
  });
  return strongest;
}

function redrawTrainingReview() {
  if (!trainingReviewAvailable()) return;
  const frame = findTrainingFrameAt(currentPlaybackTime()) ?? trainingCapture.frames.at(-1);
  drawComponentLanes(frame?.component_lanes ?? null, currentPlaybackTime());
  if (!trainingCapture.active && trainingCapture.frames.length && !trainingReviewAuditedAfterCapture) {
    auditTrainingReview("redraw_after_capture");
    trainingReviewAuditedAfterCapture = true;
  }
}

async function seekToSliderValue(value) {
  if (inputMode === "timeline") {
    const wasPlaying = isPlaying;
    timelinePausedAt = (Number(value) / 1000) * timelineDuration;
    timelineNextIndex = findNextTimelineIndex(timelinePausedAt);
    timelineNextRhythmIndex = findNextTimelineRhythmIndex(timelinePausedAt);
    timelineCurrentEvent = findTimelineEventAt(timelinePausedAt);
    timelineCurrentRhythmEvent = findTimelineRhythmEventAt(timelinePausedAt);
    if (wasPlaying) {
      await playTimeline();
    } else {
      updatePlayerTime();
    }
    return;
  }
  if ((inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && trainingReviewModeActive()) {
    pauseTrainingReviewPlayback();
    const rawTime = (Number(value) / 1000) * trainingCapture.duration;
    const time = snapTrainingReviewTime(rawTime);
    auditTrainingReview("review_scrub");
    applyTrainingReviewFrame(time);
    redrawTrainingReview();
    updatePlayerTime();
    return;
  }
  if (trainingReviewUsesOriginalFileAudio() && !isPlaying) {
    pauseTrainingReviewPlayback();
    const rawTime = (Number(value) / 1000) * trainingCapture.duration;
    const time = snapTrainingReviewTime(rawTime);
    auditTrainingReview("review_scrub");
    if (audioElement) {
      audioElement.currentTime = clamp(time, 0, getAudioDuration());
    }
    applyTrainingReviewFrame(time);
    redrawTrainingReview();
    updatePlayerTime();
    return;
  }
  if (!hasLoadedAudio() || inputMode !== "file") return;
  const wasPlaying = isPlaying;
  pausedAt = (Number(value) / 1000) * getAudioDuration();
  if (audioElement) {
    audioElement.currentTime = pausedAt;
  }
  if (wasPlaying) {
    cancelAnimationFrame(animationFrame);
    await playAudio();
  } else {
    updatePlayerTime();
  }
}

function seekToTimelineFrame(index) {
  const frames = musicalTimeline.lightFrames ?? [];
  if (!frames.length) return false;
  const safeIndex = clamp(Math.round(index), 0, frames.length - 1);
  const frame = frames[safeIndex];
  musicalTimeline.cursor = musicalTimelineCursorAt(musicalTimeline, frame.time);
  const duration = Math.max(musicalTimeline.duration || getAudioDuration() || trainingCapture.duration, 0.001);
  seekToSliderValue((frame.time / duration) * 1000).catch((error) => {
    setState("Frame seek error");
    logEvent(error.message);
  });
  logEvent(`[music-nav] frame=${safeIndex + 1}/${frames.length} time=${roundNumber(frame.time, 4)} source=${frame.source_event}`);
  return true;
}

function nextTimelineFrame() {
  const frames = musicalTimeline.lightFrames ?? [];
  if (!frames.length) return false;
  const cursor = musicalTimelineCursorAt(musicalTimeline, currentPlaybackTime());
  return seekToTimelineFrame(Math.min(frames.length - 1, cursor.frameIndex + 1));
}

function previousTimelineFrame() {
  const frames = musicalTimeline.lightFrames ?? [];
  if (!frames.length) return false;
  const cursor = musicalTimelineCursorAt(musicalTimeline, currentPlaybackTime());
  const index = cursor.frameIndex <= 0 ? 0 : cursor.frameIndex - 1;
  return seekToTimelineFrame(index);
}

function seekToNearestMusicalEvent(time) {
  const events = musicalTimeline.events ?? [];
  if (!events.length) return false;
  const nearest = events.reduce((closest, event) => (
    Math.abs(event.time - time) < Math.abs(closest.time - time) ? event : closest
  ), events[0]);
  const nearestFrameIndex = nearestTimelineFrameIndexAt(nearest.time);
  return seekToTimelineFrame(nearestFrameIndex);
}

function nearestTimelineFrameIndexAt(time) {
  const frames = musicalTimeline.lightFrames ?? [];
  if (!frames.length) return -1;
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  frames.forEach((frame, index) => {
    const distance = Math.abs(Number(frame.time ?? 0) - time);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function nextBeatOrDownbeatFrame(direction = 1) {
  const markers = [
    ...(musicalTimeline.beats ?? []).map((beat) => ({ time: beat.time, type: "beat" })),
    ...(musicalTimeline.downbeats ?? []).map((downbeat) => ({ time: downbeat.time, type: "downbeat" })),
  ].sort((left, right) => left.time - right.time || eventTypePriority(left.type) - eventTypePriority(right.type));
  if (!markers.length) return false;
  const current = currentPlaybackTime();
  const marker = direction > 0
    ? markers.find((item) => item.time > current + 0.01) ?? markers.at(-1)
    : [...markers].reverse().find((item) => item.time < current - 0.01) ?? markers[0];
  return seekToTimelineFrame(nearestTimelineFrameIndexAt(marker.time));
}

function findNextTimelineIndex(time) {
  const index = timelineEvents.findIndex((event) => event.time >= time);
  return index === -1 ? timelineEvents.length : index;
}

function findNextTimelineRhythmIndex(time) {
  const index = timelineRhythmEvents.findIndex((event) => event.time >= time);
  return index === -1 ? timelineRhythmEvents.length : index;
}

function isTrainingMode() {
  return Boolean(elements.trainingMode?.checked);
}

function canEditTrainingScene() {
  return isTrainingMode() && !trainingCapture.active && trainingCapture.frames.length > 0;
}

function updateTrainingEditState() {
  const playingReview = Boolean(reviewAnimationFrame);
  const editable = canEditTrainingScene() && !playingReview;
  document.body.classList.toggle("is-training-edit", editable);
  document.body.classList.toggle("is-review-playing", playingReview);
  elements.saveAnnotationButton.disabled = !editable;
  elements.blackoutSceneButton.disabled = !editable;
  elements.copySceneButton.disabled = !editable;
  elements.pasteSceneButton.disabled = !editable || !copiedTrainingScene;
  elements.clearTrainingLightsButton.disabled = !editable;
  updateCueEditor();
  updateReviewPlayButton();
}

function selectedTrainingDuration() {
  return Math.max(1, Number(elements.trainingDuration?.value ?? 30));
}

function nearestFrameDistanceMs(time) {
  if (!trainingCapture.frames.length) return null;
  const nearest = trainingCapture.frames.reduce((best, frame) => {
    const distance = Math.abs(Number(frame.time ?? 0) - time);
    return distance < best ? distance : best;
  }, Infinity);
  return Number.isFinite(nearest) ? Math.round(nearest * 1000) : null;
}

function nearestCueDistanceMs(time) {
  const cues = trainingReviewCueTimes();
  if (!cues.length) return null;
  const nearest = cues.reduce((best, cueTime) => {
    const distance = Math.abs(Number(cueTime ?? 0) - time);
    return distance < best ? distance : best;
  }, Infinity);
  return Number.isFinite(nearest) ? Math.round(nearest * 1000) : null;
}

function maxRepeatedStreak(frames, property) {
  let maxStreak = 0;
  let currentStreak = 0;
  let previousValue;
  frames.forEach((frame) => {
    const value = frame?.[property] ?? null;
    currentStreak = value === previousValue ? currentStreak + 1 : 1;
    previousValue = value;
    maxStreak = Math.max(maxStreak, currentStreak);
  });
  return maxStreak;
}

function auditTrainingFrameIntegrity(reason = "manual") {
  const frames = trainingCapture.frames ?? [];
  let duplicate = 0;
  let outOfOrder = 0;
  let zeroEnergy = 0;
  let dtBelow50ms = 0;
  let dtBelow100ms = 0;
  const deltas = [];
  const seenTimes = new Set();
  frames.forEach((frame, index) => {
    const time = Number(frame?.time ?? 0);
    const roundedTime = roundNumber(time, 4);
    if (seenTimes.has(roundedTime)) duplicate += 1;
    seenTimes.add(roundedTime);
    if (Number(frame?.energy ?? 0) <= 0) zeroEnergy += 1;
    if (index > 0) {
      const previousTime = Number(frames[index - 1]?.time ?? 0);
      const delta = time - previousTime;
      if (delta < 0) outOfOrder += 1;
      if (Number.isFinite(delta)) {
        deltas.push(delta);
        if (delta < 0.05) dtBelow50ms += 1;
        if (delta < 0.1) dtBelow100ms += 1;
      }
    }
  });
  const minDt = deltas.length ? Math.min(...deltas) : 0;
  const maxDt = deltas.length ? Math.max(...deltas) : 0;
  const avgDt = deltas.length ? average(deltas) : 0;
  logEvent(
    `[frame-integrity] reason=${reason} frames=${frames.length} duplicate=${duplicate} `
    + `outOfOrder=${outOfOrder} zeroEnergy=${zeroEnergy} minDt=${roundNumber(minDt, 4)} `
    + `avgDt=${roundNumber(avgDt, 4)} maxDt=${roundNumber(maxDt, 4)} `
    + `dtBelow50ms=${dtBelow50ms} dtBelow100ms=${dtBelow100ms} `
    + `repeatedCategoryMax=${maxRepeatedStreak(frames, "sample_category")} `
    + `repeatedTimingMax=${maxRepeatedStreak(frames, "timing_intent")}`
  );
}

function auditFrameAccess(reason = "manual") {
  const frames = trainingCapture.frames ?? [];
  const cues = trainingReviewCueTimes();
  const threshold = Math.max(0.1, cueHitThresholdSeconds());
  const nearestDistances = frames.map((frame) => {
    const time = Number(frame?.time ?? 0);
    if (!cues.length) return Infinity;
    return cues.reduce((nearest, cueTime) => Math.min(nearest, Math.abs(time - cueTime)), Infinity);
  });
  const finiteDistances = nearestDistances.filter(Number.isFinite);
  const framesWithoutNearbyCue = nearestDistances.filter((distance) => !Number.isFinite(distance) || distance > threshold).length;
  let maxFramesBetweenCues = frames.length;
  if (cues.length >= 2) {
    maxFramesBetweenCues = 0;
    for (let index = 0; index < cues.length - 1; index += 1) {
      const start = cues[index];
      const end = cues[index + 1];
      const count = frames.filter((frame) => frame.time > start && frame.time < end).length;
      maxFramesBetweenCues = Math.max(maxFramesBetweenCues, count);
    }
  }
  const avgNearestCueMs = finiteDistances.length ? Math.round(average(finiteDistances) * 1000) : -1;
  const maxNearestCueMs = finiteDistances.length ? Math.round(Math.max(...finiteDistances) * 1000) : -1;
  const inaccessibleLikely = frames.length > cues.length && (framesWithoutNearbyCue > Math.max(2, frames.length * 0.35) || maxFramesBetweenCues > 2);
  logEvent(
    `[frame-access] reason=${reason} frames=${frames.length} cues=${cues.length} `
    + `framesWithoutNearbyCue=${framesWithoutNearbyCue} maxFramesBetweenCues=${maxFramesBetweenCues} `
    + `avgNearestCueMs=${avgNearestCueMs} maxNearestCueMs=${maxNearestCueMs} `
    + `inaccessibleLikely=${inaccessibleLikely}`
  );
}

function snapshotSignature(snapshot) {
  if (!Array.isArray(snapshot)) return "none";
  return JSON.stringify(snapshot.map((state) => ({
    enabled: state.enabled !== false,
    intensity: roundNumber(Number(state.intensity ?? 0), 3),
    colorIndex: state.colorIndex ?? null,
    colorMode: state.colorMode ?? null,
    blackout: Boolean(state.blackout),
    phaseMode: state.phaseMode ?? null,
  })));
}

function nearestLightFrameDistanceMs(time) {
  const lightFrames = musicalTimeline.lightFrames ?? [];
  if (!lightFrames.length) return null;
  const nearest = lightFrames.reduce((distance, frame) => Math.min(distance, Math.abs(Number(frame.time ?? 0) - time)), Infinity);
  return Number.isFinite(nearest) ? Math.round(nearest * 1000) : null;
}

function auditHiddenLightChanges(reason) {
  const lightFrames = musicalTimeline.lightFrames ?? [];
  const frames = trainingCapture.frames ?? [];
  const accessibleTimes = lightFrames.map((frame) => Number(frame.time ?? 0)).filter(Number.isFinite);
  const maxAllowedGap = Math.max(0.12, musicalClock.interval ? musicalClock.interval * 0.5 : 0.25);
  let hiddenChanges = 0;
  let maxGapMs = 0;
  let previousSignature = null;

  frames.forEach((frame) => {
    const time = Number(frame.time ?? 0);
    const signature = snapshotSignature(frameSnapshot(frame) ?? frame.light_snapshot);
    if (previousSignature !== null && signature !== previousSignature) {
      const nearest = accessibleTimes.length
        ? accessibleTimes.reduce((distance, frameTime) => Math.min(distance, Math.abs(frameTime - time)), Infinity)
        : Infinity;
      maxGapMs = Math.max(maxGapMs, Number.isFinite(nearest) ? Math.round(nearest * 1000) : -1);
      if (!Number.isFinite(nearest) || nearest > maxAllowedGap) {
        hiddenChanges += 1;
        logEvent(`[bug] hidden_light_change time=${roundNumber(time, 4)} light=all previous=${previousSignature} next=${signature}`);
      }
    }
    previousSignature = signature;
  });

  const currentGapMs = nearestLightFrameDistanceMs(currentPlaybackTime());
  if (currentGapMs !== null) maxGapMs = Math.max(maxGapMs, currentGapMs);
  logEvent(
    `[hidden-light-audit] reason=${reason} frames=${frames.length} lightFrames=${lightFrames.length} `
    + `hiddenChanges=${hiddenChanges} maxGapMs=${maxGapMs} ok=${hiddenChanges === 0}`
  );
  return hiddenChanges === 0;
}

function syncMusicalTimelineFromTrainingCapture(reason = "training_capture") {
  if (!trainingCapture.frames.length) return musicalTimeline;
  const duration = Math.max(trainingCapture.duration, trainingCapture.frames.at(-1)?.time ?? 0);
  const timeline = createEmptyMusicalTimeline(trainingCapture.source ?? reason, duration);
  timeline.onsets = trainingCapture.frames.map((frame, index) => ({
    time: roundNumber(Number(frame.time ?? 0), 4),
    strength: clamp(Number(frame.spectral_flux ?? frame.energy_delta ?? frame.energy ?? 0), 0, 1),
    band: frame.dominant_component ?? frame.clock_source ?? "full",
    source: "training_frame",
    confidence: 0.7,
    frame_index: index,
  }));
  timeline.beats = trainingCapture.frames
    .filter((frame) => Boolean(frame.rhythm_split?.base_interval_seconds))
    .map((frame, index) => ({
      time: roundNumber(Number(frame.time ?? 0), 4),
      index,
      bpm: frame.rhythm_split?.base_interval_seconds ? roundNumber(60 / frame.rhythm_split.base_interval_seconds, 2) : null,
      confidence: 0.55,
    }));
  timeline.segments = trainingCapture.frames.map((frame, index) => {
    const next = trainingCapture.frames[index + 1];
    return {
      start: roundNumber(Number(frame.time ?? 0), 4),
      end: roundNumber(Number(next?.time ?? duration), 4),
      label: frame.scene_category ?? frame.sample_category ?? `frame_${index + 1}`,
      confidence: 0.65,
      sample_category: frame.sample_category ?? null,
      scene_category: frame.scene_category ?? null,
      energy_summary: {
        energy: frame.energy ?? null,
        trend: frame.energy_trend ?? null,
      },
    };
  }).filter((segment) => segment.end > segment.start);
  timeline.events = normalizeMusicalEvents({
    rawEvents: trainingCapture.frames.map((frame, index) => ({
      time: frame.time,
      type: "light_change",
      source: "training_frame",
      confidence: 0.8,
      metadata: {
        frame_index: index,
        sample_category: frame.sample_category,
        scene_category: frame.scene_category,
        timing_intent: frame.timing_intent,
        lighting_intent: frame.lighting_intent,
        light_snapshot: frameSnapshot(frame) ?? frame.light_snapshot,
      },
    })),
    beats: timeline.beats,
    downbeats: timeline.downbeats,
    segments: timeline.segments,
    onsets: timeline.onsets,
  });
  timeline.lightFrames = buildLightFramesFromMusicalTimeline(timeline);
  timeline.cursor = musicalTimelineCursorAt(timeline, trainingCapture.reviewTime ?? 0);
  musicalTimeline = timeline;
  logEvent(`[all-in-one] training sync reason=${reason} frames=${trainingCapture.frames.length} lightFrames=${timeline.lightFrames.length}`);
  return musicalTimeline;
}

function auditTrainingReview(reason) {
  if (!trainingCapture.frames.length) return;
  const now = performance.now();
  if (reason === lastTrainingAuditReason && now - lastTrainingAuditAt < 1000) return;
  lastTrainingAuditAt = now;
  lastTrainingAuditReason = reason;
  auditTrainingFrameIntegrity(reason);
  auditFrameAccess(reason);
  auditHiddenLightChanges(reason);
}

function beginTrainingCapture(source) {
  if (!isTrainingMode()) return;
  pauseTrainingReviewPlayback();
  resetModeVisualState("training_on");
  lastTrainingAudioDebugAt = -1;
  if (elements.spectrumScroller) {
    elements.spectrumScroller.scrollLeft = 0;
  }
  resetSpectrumHistory();
  trainingReviewAuditedAfterCapture = false;
  trainingCapture = {
    active: true,
    frames: [],
    cues: [],
    suppressedCueTimes: [],
    duration: selectedTrainingDuration(),
    reviewTime: 0,
    startedAt: audioContext?.currentTime ?? 0,
    source,
    audioSamples: [],
    audioSampleRate: null,
    manualOverridesByKey: {},
  };
  selectedTrainingCueId = null;
  elements.seekSlider.disabled = true;
  elements.durationLabel.textContent = formatTime(trainingCapture.duration);
  updateTrainingSummary();
  updateTrainingEditState();
  logEvent(`training capture ${formatTime(trainingCapture.duration)}`);
}

function stopTrainingCapture(reason = "stopped") {
  if (!trainingCapture.active) return;
  trainingCapture.active = false;
  const audioDuration = trainingCapture.audioSampleRate
    ? trainingCapture.audioSamples.length / trainingCapture.audioSampleRate
    : 0;
  trainingCapture.reviewTime = 0;
  elements.seekSlider.disabled = !trainingCapture.frames.length;
  updateTrainingSummary();
  updateTrainingEditState();
  if (trainingCapture.frames.length) {
    syncMusicalTimelineFromTrainingCapture(`capture_${reason}`);
    applyTrainingReviewFrame(0);
    redrawTrainingReview();
    auditTrainingReview(`capture_${reason}`);
    trainingReviewAuditedAfterCapture = true;
  }
  logEvent(
    `training ${reason}: ${trainingCapture.frames.length} frames, `
    + `audioSamples:${trainingCapture.audioSamples.length}, `
    + `audioSampleRate:${trainingCapture.audioSampleRate ?? "-"}, `
    + `audioDuration:${roundNumber(audioDuration, 2)}s`
  );
}

function maybeFinishTrainingCapture(time) {
  if (!trainingCapture.active) return false;
  if (time < trainingCapture.duration) return false;
  stopTrainingCapture("complete");
  if (inputMode === "mic_device") {
    stopDeviceInput();
  } else if (inputMode === "system_audio") {
    stopLiveAudio();
  } else if (inputMode === "timeline") {
    pauseTimeline();
  } else {
    pauseAudio();
  }
  return true;
}

function captureTrainingFrame(reading) {
  if (!trainingCapture.active) return;
  const time = roundNumber(reading.time ?? currentPlaybackTime(), 4);
  const previous = trainingCapture.frames[trainingCapture.frames.length - 1];
  if (previous && time - previous.time < 0.18) return;
  const category = reading.sample_category ?? categoryForEnergy(reading.energy ?? 0);
  const sceneChanged = updateCategoryScene(category);
  const componentLanes = normalizeComponentLanes(reading.component_lanes);
  const sceneCategory = sceneCategoryForSample(category, sceneChanged);
  const trend = energyTrend(reading.energy_delta ?? ((reading.energy ?? 0) - previousEnergy));
  const rawTimingIntent = timingIntentForSample(category, sceneCategory, reading.energy ?? 0, trend);
  const rigCapacity = rigCapacityForLightCount(lights.length || Number(elements.lightCount?.value ?? 1));
  const timingIntent = timingIntentForRig(rawTimingIntent, { category, energy: reading.energy ?? 0, strong: category === "high_energy_drop" }, rigCapacity);
  const lightingIntent = lightingIntentForRig(lightingIntentForSample(category, sceneCategory, reading.energy ?? 0, trend), timingIntent);
  const frame = {
    time,
    source: trainingCapture.source ?? inputMode,
    genre: elements.genreProfile.value,
    sample_category: category,
    sample_tag: normalizeSampleTag(elements.sampleTagInput.value),
    scene_category: sceneCategory,
    lighting_intent: lightingIntent,
    timing_intent: timingIntent,
    scene_pool_hint: scenePoolHint(category),
    intent: intentForSample(category, reading.energy ?? 0),
    energy: roundNumber(reading.energy ?? 0, 4),
    energy_trend: trend,
    spectral_flux: roundNumber(reading.spectral_flux ?? 0, 4),
    component_lanes: componentLanes,
    dominant_component: strongestComponentLane(componentLanes),
    rhythm_split: estimateFastestRhythmSplit(time),
    clock_source: musicalClock.source,
    light_snapshot: captureLightSnapshot(timingIntent),
  };
  trainingCapture.frames.push(frame);
  elements.currentSampleCategory.textContent = frame.sample_category ?? "-";
  elements.currentSceneCategory.textContent = frame.scene_category ?? "-";
  elements.currentIntent.textContent = frame.intent ?? "-";
  updateBrainSemantics(frame.lighting_intent, frame.timing_intent);
  elements.currentGesture.textContent = frame.dominant_component ?? frame.clock_source ?? "-";
  elements.currentEnergyTrend.textContent = frame.energy_trend ?? "-";
  updateTrainingEditState();
}

function captureTrainingAudio(frame) {
  if (!trainingCapture.active) return;
  const liveCapture = trainingCapture.source === "python_live_audio" || inputMode === "system_audio";
  if (!liveCapture && trainingCapture.source !== "mic_device") return;
  const samples = Array.isArray(frame.audio_samples) ? frame.audio_samples : [];
  const sampleRate = Number(frame.audio_sample_rate);
  const frameTime = Number(frame.time ?? 0);
  const shouldDebug = liveCapture && (lastTrainingAudioDebugAt < 0 || frameTime - lastTrainingAudioDebugAt >= 2);
  if (shouldDebug) {
    logEvent(
      `capture audio active:${trainingCapture.active} source:${trainingCapture.source} `
      + `frameSamples:${samples.length} frameRate:${Number.isFinite(sampleRate) ? sampleRate : "-"} `
      + `total:${trainingCapture.audioSamples.length}`
    );
    lastTrainingAudioDebugAt = frameTime;
  }
  if (!samples.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return;
  if (!trainingCapture.audioSampleRate) {
    trainingCapture.audioSampleRate = sampleRate;
  }
  if (trainingCapture.audioSampleRate !== sampleRate) {
    if (liveCapture) {
      logEvent(`capture audio samplerate mismatch frame:${sampleRate} capture:${trainingCapture.audioSampleRate}`);
    }
    return;
  }
  trainingCapture.audioSamples.push(...samples.map((sample) => clamp(Number(sample), -1, 1)));
  if (shouldDebug) {
    logEvent(`capture audio appended total:${trainingCapture.audioSamples.length}`);
  }
}

function sceneCategoryForSample(category, sceneChanged) {
  const genre = elements.genreProfile.value;
  const variant = currentSceneByCategory[category] ?? 0;
  if (category === "high_energy_drop") return `${genre}_drop_mirror_release_${variant}`;
  if (category === "buildup") return `${genre}_tension_mirror_rise_${variant}`;
  if (category === "steady_bass_pulse") return `${genre}_mirror_groove_swap_${variant}`;
  if (category === "stop_music_moment" || category === "silence_or_pause") return "blackout_or_freeze";
  return sceneChanged ? `${genre}_sparse_mirror_shift_${variant}` : `${genre}_sparse_mirror_hold`;
}

function scenePoolHint(category) {
  const pairs = buildSymmetryPairs(lights.length).slice(0, 6).map((pair) => pair.map((index) => positionName(index)));
  const timing = category === "steady_bass_pulse" ? "bpm_or_half_bpm_swap" : category === "high_energy_drop" ? "mirrored_pair_flash" : "sparse_mirror_accent";
  return {
    timing,
    allowed_motion: "mirror_pairs_only",
    forbidden_motion: "continuous_ring_chase",
    candidate_pairs: pairs,
  };
}

function intentForSample(category, energy) {
  if (category === "high_energy_drop") return "release_energy";
  if (category === "buildup") return "increase_tension";
  if (category === "steady_bass_pulse") return "keep_groove_visible";
  if (category === "stop_music_moment" || category === "silence_or_pause") return "emphasize_stop";
  return energy > 0.2 ? "support_texture" : "create_space";
}

function energyTrend(delta) {
  if (delta > 0.055) return "rising";
  if (delta < -0.055) return "falling";
  return "stable";
}

function frameScene(frame) {
  return frame?.final_scene ?? frame?.user_scene ?? null;
}

function frameSnapshot(frame) {
  return frameScene(frame)?.light_snapshot ?? frame?.light_snapshot ?? null;
}

function trainingFramePairAt(time) {
  let previous = trainingCapture.frames[0] ?? null;
  let next = null;
  for (const frame of trainingCapture.frames) {
    if (frame.time <= time) {
      previous = frame;
      continue;
    }
    next = frame;
    break;
  }
  return { previous, next };
}

function nearestTrainingFrameIndexAt(time) {
  if (!trainingCapture.frames.length) return -1;
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  trainingCapture.frames.forEach((frame, index) => {
    const distance = Math.abs((frame.time ?? 0) - time);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function getTrainingEditKeyInfo(time) {
  const safeTime = clamp(Number(time ?? trainingCapture.reviewTime ?? 0), 0, trainingCapture.duration || 0);
  const cue = findTrainingCueAt(safeTime);
  const nearestFrameMs = nearestFrameDistanceMs(safeTime);
  const nearestCueMs = nearestCueDistanceMs(safeTime);
  if (cue?.id) return { key: `cue:${cue.id}`, source: "cue", nearestFrameMs, nearestCueMs };
  const frameIndex = nearestTrainingFrameIndexAt(safeTime);
  if (frameIndex >= 0) return { key: `frame:${frameIndex}`, source: "frame", nearestFrameMs, nearestCueMs };
  return { key: `time:${Math.round(safeTime * 100)}`, source: "time", nearestFrameMs, nearestCueMs };
}

function getTrainingEditKey(time) {
  const info = getTrainingEditKeyInfo(time);
  const now = performance.now();
  if (now - lastEditKeyLogAt >= 750) {
    logEvent(
      `[edit-key] time=${roundNumber(Number(time ?? 0), 3)} key=${info.key} source=${info.source} `
      + `nearestFrameMs=${info.nearestFrameMs ?? "-"} nearestCueMs=${info.nearestCueMs ?? "-"}`
    );
    lastEditKeyLogAt = now;
  }
  return info.key;
}

function getManualOverrideForTime(time) {
  const { key, source } = getTrainingEditKeyInfo(time);
  const override = trainingCapture.manualOverridesByKey?.[key] ?? null;
  return { key, source, override };
}

function saveManualOverrideForTime(time, lightStatesSnapshot) {
  if (!Array.isArray(lightStatesSnapshot)) return null;
  if (!trainingCapture.manualOverridesByKey) trainingCapture.manualOverridesByKey = {};
  const { key, source } = getTrainingEditKeyInfo(time);
  const snapshot = deepCopyLightSnapshot(lightStatesSnapshot);
  const overrideSource = snapshot.every((state) => state.blackout || state.phaseMode === "off" || state.colorMode === "off")
    ? "blackout_current_scene"
    : source;
  trainingCapture.manualOverridesByKey[key] = {
    key,
    time: roundNumber(Number(time ?? 0), 4),
    edited_at: new Date().toISOString(),
    source: overrideSource,
    light_snapshot: snapshot,
  };
  lastManualOverrideMissingKey = null;
  logEvent(`[manual-override] saved key=${key} source=${overrideSource} lights=${snapshot.length}`);
  return trainingCapture.manualOverridesByKey[key];
}

function applyManualOverrideForTime(time) {
  const { key, source, override } = getManualOverrideForTime(time);
  if (!override?.light_snapshot) return false;
  if (override.light_snapshot.length !== lights.length) {
    logEvent(`[manual-override] skipped incompatible snapshot key=${key} lights=${override.light_snapshot.length}/${lights.length}`);
    return false;
  }
  const applied = applyLightSnapshot(override.light_snapshot);
  if (applied && lastManualOverrideAppliedKey !== key) {
    logEvent(`[manual-override] applied key=${key} source=${source}`);
    lastManualOverrideAppliedKey = key;
  }
  return applied;
}

function logManualOverrideMissing(time, fallback) {
  const { key, source } = getTrainingEditKeyInfo(time);
  const marker = `${key}:${fallback}`;
  if (lastManualOverrideMissingKey === marker) return;
  logEvent(`[manual-override] missing key=${key} source=${source} fallback=${fallback}`);
  lastManualOverrideMissingKey = marker;
}

function interpolatedTrainingSnapshot(previousFrame, nextFrame, time) {
  const previousSnapshot = frameSnapshot(previousFrame);
  if (!Array.isArray(previousSnapshot)) return null;
  if (previousFrame?.timing_intent === "single_fixture_three_quarter_hold") return previousSnapshot;
  const nextSnapshot = frameSnapshot(nextFrame);
  if (!Array.isArray(nextSnapshot) || !nextFrame || nextFrame.time <= previousFrame.time) {
    return previousSnapshot;
  }
  const progress = clamp((time - previousFrame.time) / Math.max(nextFrame.time - previousFrame.time, 0.001), 0, 1);
  return previousSnapshot.map((state, index) => {
    const nextState = nextSnapshot[index];
    const from = Number(state.intensity ?? 0);
    const to = Number(nextState?.intensity ?? from);
    return {
      ...state,
      intensity: roundNumber(from + (to - from) * progress, 4),
    };
  });
}

function applyTrainingReviewFrame(time) {
  if (trainingCapture.active || !trainingCapture.frames.length) return false;
  if ((inputMode === "mic_device" || inputMode === "system_audio") && isPlaying && !isTrainingMode()) {
    logEvent("[bug] live_using_training_frames");
  }
  trainingCapture.reviewTime = clamp(time, 0, trainingCapture.duration);
  const { previous: frame, next: nextFrame } = trainingFramePairAt(trainingCapture.reviewTime);
  if (!frame) return false;
  const finalScene = frameScene(frame);
  const cue = findTrainingCueAt(trainingCapture.reviewTime);
  selectedTrainingCueId = cue?.id ?? null;
  const { override } = getManualOverrideForTime(trainingCapture.reviewTime);
  const snapshot = override?.light_snapshot
    ?? interpolatedTrainingSnapshot(frame, nextFrame, trainingCapture.reviewTime)
    ?? frameSnapshot(frame);
  let phaseSummary = phaseModeSummaryForSnapshot(snapshot);
  let applied = false;
  if (override?.light_snapshot) {
    applied = applyManualOverrideForTime(trainingCapture.reviewTime);
  } else {
    const fallback = frame.user_scene || frame.final_scene ? "brain" : frame.light_snapshot ? "frame" : cue ? "cue" : "default";
    logManualOverrideMissing(trainingCapture.reviewTime, fallback);
    applied = applyLightSnapshot(snapshot);
  }
  if (!applied) {
    if (frame.sample_category === "silence_or_pause" || frame.sample_category === "stop_music_moment") {
      blackoutLights();
      phaseSummary = phaseModeSummary();
    }
  }
  elements.currentSampleCategory.textContent = finalScene?.sample_category ?? frame.sample_category ?? "-";
  elements.currentSceneCategory.textContent = finalScene?.scene_category ?? frame.scene_category ?? "-";
  elements.currentIntent.textContent = finalScene?.intent ?? frame.intent ?? "-";
  updateBrainSemantics(finalScene?.lighting_intent ?? frame.lighting_intent, finalScene?.timing_intent ?? frame.timing_intent, phaseSummary);
  maybeLogBrainSource({
    mode: "review",
    time: trainingCapture.reviewTime,
    sample: finalScene?.sample_category ?? frame.sample_category,
    timing: finalScene?.timing_intent ?? frame.timing_intent,
    usesLiveFrame: false,
    usesTrainingFrame: true,
    phaseSummary,
  });
  elements.currentGesture.textContent = finalScene?.dominant_component ?? frame.dominant_component ?? frame.clock_source ?? "-";
  elements.currentEnergyTrend.textContent = finalScene?.energy_trend ?? "-";
  updateCueEditor();
  updateMeter(frame.energy ?? 0);
  reviewRenderFrameCount += 1;
  const now = performance.now();
  if (now - lastReviewRenderLogAt >= 1000) {
    logEvent(`[review-render] fps=${reviewRenderFrameCount} trainingFrames=${trainingCapture.frames.length} interpolated=${Boolean(nextFrame)}`);
    reviewRenderFrameCount = 0;
    lastReviewRenderLogAt = now;
  }
  return true;
}

function updateReviewPlayButton() {
  if (!elements.reviewPlayButton) return;
  const enabled = trainingReviewUsesOriginalFileAudio()
    || (trainingReviewAvailable() && (inputMode === "mic_device" || inputMode === "system_audio"))
    || (trainingReviewAvailable() && inputMode === "file" && hasLoadedAudio());
  elements.reviewPlayButton.disabled = !enabled;
  elements.reviewPlayButton.textContent = reviewAnimationFrame ? "⏸" : "▶";
}

function pauseTrainingReviewPlayback() {
  if (reviewAnimationFrame) {
    cancelAnimationFrame(reviewAnimationFrame);
  }
  reviewAnimationFrame = null;
  stopReviewAudioSource();
  updateReviewPlayButton();
  updateTrainingEditState();
}

function currentReviewAudioTime() {
  if (reviewAudioUsesOriginalElement && audioElement) {
    return clamp(audioElement.currentTime || 0, 0, trainingCapture.duration);
  }
  if (reviewAudioElement) {
    return clamp(reviewAudioElement.currentTime || 0, 0, trainingCapture.duration);
  }
  return null;
}

async function toggleTrainingReviewPlayback() {
  if (!trainingReviewAvailable() || isPlaying) return;
  if (reviewAnimationFrame) {
    pauseTrainingReviewPlayback();
    return;
  }
  reviewPlaybackStartTime = trainingCapture.reviewTime ?? 0;
  const audioStarted = await startReviewAudioAt(reviewPlaybackStartTime);
  reviewPlaybackStartedAt = performance.now();
  reviewRenderFrameCount = 0;
  reviewPerfFrameCount = 0;
  reviewPerfDomWrites = 0;
  lastReviewRenderLogAt = 0;
  lastReviewPerfLogAt = 0;
  lastReviewSyncLogSecond = -1;
  lastPhaseRenderLogSecond = -1;
  const animateReview = () => {
    const elapsed = (performance.now() - reviewPlaybackStartedAt) / 1000;
    const visualFallbackTime = reviewPlaybackStartTime + elapsed;
    const audioTime = audioStarted ? currentReviewAudioTime() : null;
    const time = clamp(audioTime ?? visualFallbackTime, 0, trainingCapture.duration);
    const syncSecond = Math.floor(time);
    if (syncSecond !== lastReviewSyncLogSecond) {
      const driftMs = audioTime === null ? 0 : Math.round((audioTime - visualFallbackTime) * 1000);
      logEvent(`[review-sync] audioTime=${audioTime === null ? "none" : roundNumber(audioTime, 3)} visualTime=${roundNumber(visualFallbackTime, 3)} driftMs=${driftMs}`);
      lastReviewSyncLogSecond = syncSecond;
    }
    applyTrainingReviewFrame(time);
    redrawTrainingReview();
    updatePlayerTime();
    reviewPerfFrameCount += 1;
    const perfNow = performance.now();
    if (perfNow - lastReviewPerfLogAt >= 1000) {
      logEvent(`[review-perf] fps=${reviewPerfFrameCount} domWrites=${reviewPerfDomWrites} playingReview=true`);
      reviewPerfFrameCount = 0;
      reviewPerfDomWrites = 0;
      lastReviewPerfLogAt = perfNow;
    }
    if (time >= trainingCapture.duration) {
      pauseTrainingReviewPlayback();
      return;
    }
    reviewAnimationFrame = requestAnimationFrame(animateReview);
  };
  reviewAnimationFrame = requestAnimationFrame(animateReview);
  updateReviewPlayButton();
  updateTrainingEditState();
}

function stopReviewAudioSource() {
  if (reviewAudioUsesOriginalElement) {
    if (audioElement) {
      pausedAt = clamp(audioElement.currentTime || 0, 0, getAudioDuration());
      audioElement.pause();
    }
    reviewAudioUsesOriginalElement = false;
  }
  if (reviewAudioElement) {
    reviewAudioElement.pause();
    reviewAudioElement.removeAttribute("src");
    reviewAudioElement.load();
    reviewAudioElement = null;
  }
  if (reviewAudioObjectUrl) {
    URL.revokeObjectURL(reviewAudioObjectUrl);
    reviewAudioObjectUrl = null;
  }
  if (!reviewAudioSource) return;
  try {
    reviewAudioSource.stop();
  } catch (_error) {
    // Already stopped.
  }
  if (reviewAudioSource.reviewGain) {
    reviewAudioSource.reviewGain.disconnect();
  }
  reviewAudioSource.disconnect();
  reviewAudioSource = null;
}

async function startReviewAudioAt(time) {
  stopReviewAudioSource();
  if (trainingReviewUsesOriginalFileAudio() || (inputMode === "file" && hasLoadedAudio())) {
    if (!audioElement?.src) {
      logEvent("review audio missing");
      return false;
    }
    await ensureAudioContext();
    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }
    audioElement.currentTime = clamp(time, 0, getAudioDuration());
    reviewAudioUsesOriginalElement = true;
    try {
      await audioElement.play();
      return true;
    } catch (_error) {
      reviewAudioUsesOriginalElement = false;
      logEvent("review audio missing");
      return false;
    }
  }
  if (!trainingCapture.audioSamples?.length || !trainingCapture.audioSampleRate) {
    logEvent(
      "review audio missing: no PCM captured from Python live audio "
      + `(source:${trainingCapture.source ?? "-"} input:${inputMode} `
      + `frames:${trainingCapture.frames.length} samples:${trainingCapture.audioSamples?.length ?? 0} `
      + `rate:${trainingCapture.audioSampleRate ?? "-"})`
    );
    return false;
  }
  if (audioContext?.state === "suspended") {
    await audioContext.resume();
  }
  const offset = clamp(time, 0, Math.max(0, trainingCapture.audioSamples.length / trainingCapture.audioSampleRate - 0.001));
  const wavBlob = audioSamplesToWavBlob(trainingCapture.audioSamples, trainingCapture.audioSampleRate);
  reviewAudioObjectUrl = URL.createObjectURL(wavBlob);
  reviewAudioElement = new Audio(reviewAudioObjectUrl);
  reviewAudioElement.preload = "auto";
  reviewAudioElement.volume = 1;
  reviewAudioElement.onended = () => {
    reviewAudioElement = null;
  };
  await new Promise((resolve) => {
    if (reviewAudioElement.readyState >= 1) {
      resolve();
      return;
    }
    reviewAudioElement.addEventListener("loadedmetadata", resolve, { once: true });
  });
  reviewAudioElement.currentTime = offset;
  await reviewAudioElement.play();
  return true;
}

function audioSamplesToWavBlob(samples, sampleRate) {
  const channelCount = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  samples.forEach((sample) => {
    const value = clamp(Number(sample), -1, 1);
    view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    offset += bytesPerSample;
  });
  return new Blob([view], { type: "audio/wav" });
}

function writeAscii(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function setLightOffForScene(state) {
  Object.assign(state, normalizeLightState({
    ...state,
    enabled: false,
    intensity: 0,
    colorMode: "off",
    blackout: true,
    phaseMode: "off",
    phaseFirstHalf: false,
    phaseSecondHalf: false,
    lightingIntent: "blackout",
    timingIntent: "blackout",
    manualRandomColor: null,
  }, { timingIntent: "blackout" }));
}

function deepCopyLightSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function blackoutSnapshotFrom(snapshot) {
  const source = Array.isArray(snapshot) && snapshot.length ? snapshot : lightStates;
  const blackoutIndex = trainingColors.findIndex((color) => color.blackout);
  return source.map((state, index) => normalizeLightState({
    ...state,
    enabled: false,
    intensity: 0,
    colorMode: "off",
    blackout: true,
    phaseMode: "off",
    phaseFirstHalf: false,
    phaseSecondHalf: false,
    lightingIntent: "blackout",
    timingIntent: "blackout",
    manualColorIndex: blackoutIndex,
    manualRandomColor: null,
  }, { index, timingIntent: "blackout" }));
}

function cycleTrainingLight(index, direction = 1) {
  if (!canEditTrainingScene()) return;
  const state = lightStates[index];
  if (!state) return;
  const previousPhaseMode = phaseModeForState(state);
  const restorePhaseMode = previousPhaseMode === "off" ? "full_beat" : previousPhaseMode;
  const currentIndex = state.manualColorIndex === null || state.manualColorIndex === undefined
    ? (direction > 0 ? -1 : 0)
    : state.manualColorIndex;
  const nextIndex = (currentIndex + direction + trainingColors.length) % trainingColors.length;
  const nextColor = trainingColors[nextIndex];
  state.manualColorIndex = nextIndex;
  state.manualRandomColor = null;
  if (nextColor.blackout) {
    setLightOffForScene(state);
  } else {
    state.enabled = true;
    state.colorMode = nextColor.name === "casual" ? "random" : "manual";
    if (nextColor.name === "casual") {
      state.manualRandomColor = stableCasualColor({ index, colorIndex: nextIndex, time: currentPlaybackTime() });
    }
    state.blackout = false;
    state.intensity = 1;
    if (state.timingIntent === "blackout") state.timingIntent = "sustain";
    if (state.lightingIntent === "blackout") state.lightingIntent = "sustain";
    const previousHalves = phaseHalvesForMode(restorePhaseMode);
    state.phaseFirstHalf = previousHalves.first;
    state.phaseSecondHalf = previousHalves.second;
    state.phaseMode = restorePhaseMode;
  }
  state.timingIntent = timingIntentForLightState(state);
  renderLights();
  persistCurrentTrainingFrameScene();
}

function cycleTrainingLightBackward(event) {
  if (!canEditTrainingScene()) return;
  if (event.target.closest(".phase-button")) return;
  event.preventDefault();
  const index = Number(event.currentTarget.dataset.index);
  cycleTrainingLight(index, -1);
}

function stopPhaseButtonEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function toggleTrainingLightPhase(event) {
  if (!canEditTrainingScene()) return;
  event.preventDefault();
  event.stopPropagation();
  const phaseButton = event.currentTarget;
  if (!phaseButton?.classList?.contains("phase-button")) return;
  const light = phaseButton.closest(".light");
  if (!light) return;
  const index = Number(light.dataset.index);
  const state = lightStates[index];
  if (!state) return;
  if (state.manualColorIndex === null || state.manualColorIndex === undefined) {
    state.manualColorIndex = 0;
    state.intensity = 1;
    state.enabled = true;
    state.colorMode = "manual";
    state.blackout = false;
    if (state.timingIntent === "blackout") state.timingIntent = "sustain";
    if (state.lightingIntent === "blackout") state.lightingIntent = "sustain";
  }
  if (trainingColors[state.manualColorIndex]?.blackout) {
    state.manualColorIndex = 0;
    state.intensity = 1;
    state.enabled = true;
    state.colorMode = "manual";
    state.blackout = false;
    if (state.timingIntent === "blackout") state.timingIntent = "sustain";
    if (state.lightingIntent === "blackout") state.lightingIntent = "sustain";
  }
  const currentPhaseMode = phaseModeForState({ ...state, phaseMode: null });
  if (phaseButton.dataset.phase === "first") {
    if (currentPhaseMode === "first_half") return;
    if (currentPhaseMode === "second_half") {
      state.phaseFirstHalf = true;
      state.phaseSecondHalf = true;
      state.phaseMode = "full_beat";
      state.timingIntent = "pulse_full_beat";
      renderLights();
      persistCurrentTrainingFrameScene();
      return;
    }
    state.phaseFirstHalf = true;
    state.phaseSecondHalf = false;
    state.phaseMode = "first_half";
  } else {
    if (currentPhaseMode === "second_half") return;
    if (currentPhaseMode === "first_half") {
      state.phaseFirstHalf = true;
      state.phaseSecondHalf = true;
      state.phaseMode = "full_beat";
      state.timingIntent = "pulse_full_beat";
      renderLights();
      persistCurrentTrainingFrameScene();
      return;
    }
    state.phaseFirstHalf = false;
    state.phaseSecondHalf = true;
    state.phaseMode = "second_half";
  }
  state.intensity = state.phaseFirstHalf || state.phaseSecondHalf ? 1 : 0;
  state.timingIntent = timingIntentForLightState(state);
  renderLights();
  persistCurrentTrainingFrameScene();
}

function clearTrainingLights() {
  if (!canEditTrainingScene()) return;
  lightStates.forEach((state) => {
    state.age = 999;
    setLightOffForScene(state);
  });
  renderLights();
  persistCurrentTrainingFrameScene();
}

function blackoutCurrentTrainingScene() {
  if (!canEditTrainingScene()) return;
  const key = getTrainingEditKey(currentPlaybackTime());
  lightStates.forEach((state) => {
    state.age = 999;
    setLightOffForScene(state);
  });
  renderLights();
  persistCurrentTrainingFrameScene();
  logEvent(`[blackout] current scene only key=${key}`);
  logEvent("[scene-edit] blackout current scene");
}

function copyCurrentTrainingScene() {
  if (!canEditTrainingScene()) return;
  copiedTrainingScene = deepCopyLightSnapshot(captureLightSnapshot());
  logEvent("[scene-edit] copied current scene");
  updateTrainingEditState();
}

function pasteCopiedTrainingScene() {
  if (!canEditTrainingScene() || !copiedTrainingScene) return;
  applyLightSnapshot(deepCopyLightSnapshot(copiedTrainingScene));
  persistCurrentTrainingFrameScene();
  logEvent("[scene-edit] pasted scene");
}

function saveTrainingAnnotation() {
  if (!canEditTrainingScene()) return;
  const time = currentPlaybackTime();
  const sceneEvent = inputMode === "timeline" ? findTimelineEventAt(time) : null;
  const rhythmEvent = inputMode === "timeline" ? findTimelineRhythmEventAt(time) : null;
  const captureFrame = findTrainingFrameAt(time);
  const finalScene = captureFrame?.final_scene ?? captureFrame?.user_scene ?? null;
  const cue = findTrainingCueAt(time);
  const annotation = {
    id: `mark_${String(trainingAnnotations.length + 1).padStart(3, "0")}`,
    time: roundNumber(time, 4),
    input_mode: inputMode,
    track: loadedTimelineName || loadedFileName || null,
    sound_sample: normalizeSampleTag(elements.sampleTagInput.value),
    cue: cue ? {
      id: cue.id,
      name: cue.name,
      probability: cue.probability,
      rhythm_split: cue.rhythm_split,
    } : null,
    brain: {
      scene: sceneEvent?.scene ?? finalScene?.scene_category ?? captureFrame?.scene_category ?? null,
      sample_category: sceneEvent?.sample_category ?? rhythmEvent?.sample_category ?? finalScene?.sample_category ?? captureFrame?.sample_category ?? null,
      genre_affinity: captureFrame?.genre ?? elements.genreProfile.value,
      intent: sceneEvent?.intent ?? finalScene?.intent ?? captureFrame?.intent ?? null,
      lighting_intent: finalScene?.lighting_intent ?? captureFrame?.lighting_intent ?? null,
      timing_intent: finalScene?.timing_intent ?? captureFrame?.timing_intent ?? null,
      rhythm_gesture: rhythmEvent?.gesture ?? finalScene?.dominant_component ?? captureFrame?.clock_source ?? null,
      metadata: sceneEvent?.metadata ?? null,
    },
    desired_lights: lightStates.map((state, index) => {
      const info = positionInfo(index);
      const color = manualLightColor(state);
      const isBlackout = isLightOffState(state) || Boolean(color?.blackout || (state.phaseFirstHalf === false && state.phaseSecondHalf === false));
      const isCasual = color?.name === "casual";
      const phaseMode = phaseModeForState(state);
      return {
        index,
        position_name: positionName(index),
        zone: info.zone,
        side: info.side,
        rank: info.rank,
        position: info.position,
        centre_offset: info.centre_offset,
        outer: info.outer,
        macro_group: info.macro_group,
        slots_per_quarter: info.slots_per_quarter,
        x: roundNumber(positions[index]?.x ?? 0, 2),
        y: roundNumber(positions[index]?.y ?? 0, 2),
        enabled: !isBlackout,
        colorMode: isBlackout ? "off" : state.colorMode ?? (isCasual ? "random" : "manual"),
        blackout: isBlackout,
        color: isBlackout ? "off" : color?.name ?? "off",
        rgb: isCasual ? null : color?.value ?? [0, 0, 0],
        random_palette: isCasual ? casualTrainingColors : null,
        intensity: color && !isBlackout ? 1 : 0,
        phase_mode: phaseMode,
        timing_intent: timingIntentForLightState(state, finalScene?.timing_intent ?? captureFrame?.timing_intent ?? "sustain"),
        phase: {
          first_half_on: state.phaseFirstHalf !== false,
          second_half_on: state.phaseSecondHalf !== false,
        },
      };
    }),
  };
  trainingAnnotations.push(annotation);
  updateTrainingSummary();
  logEvent(`saved ${annotation.id} ${formatTime(Math.floor(time))}`);
}

function normalizeSampleTag(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || null;
}

function updateTrainingSummary() {
  const frameText = trainingCapture.frames.length ? `, ${trainingCapture.frames.length} frames` : "";
  const cueText = trainingCapture.cues.length ? `, ${trainingCapture.cues.length} cues` : "";
  const timeText = trainingCapture.active ? `, recording ${formatTime(trainingCapture.duration)}` : "";
  elements.trainingSummary.textContent = `${trainingAnnotations.length} marks${frameText}${cueText}${timeText}`;
}

function findTrainingFrameAt(time) {
  let current = null;
  for (const frame of trainingCapture.frames) {
    if (frame.time > time) break;
    current = frame;
  }
  return current;
}

function findTrainingCueAt(time) {
  const threshold = cueHitThresholdSeconds();
  let current = null;
  let nearestDistance = Infinity;
  for (const cue of trainingCapture.cues) {
    const distance = Math.abs(cue.time - time);
    if (distance <= threshold && distance < nearestDistance) {
      current = cue;
      nearestDistance = distance;
    }
  }
  return current;
}

function downloadTrainingAnnotations() {
  const payload = {
    version: 1,
    created_at: new Date().toISOString(),
    track: loadedTimelineName || loadedFileName || null,
    captured_training: {
      source: trainingCapture.source,
      duration: trainingCapture.duration,
      frames: trainingCapture.frames,
      cues: trainingCapture.cues,
      manual_overrides_by_key: trainingCapture.manualOverridesByKey ?? {},
    },
    annotations: trainingAnnotations,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lighting-training-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function roundNumber(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function toggleTransport() {
  if (inputMode === "timeline") {
    if (isPlaying) {
      pauseTimeline();
    } else {
      await playTimeline();
    }
    return;
  }
  if (inputMode === "mic_device") {
    if (isPlaying) {
      stopDeviceInput();
    } else {
      await startDeviceInput();
    }
    return;
  }
  if (inputMode === "system_audio") {
    if (isPlaying) {
      stopLiveAudio();
    } else {
      await startLiveAudio();
    }
    return;
  }

  if (isPlaying) {
    pauseAudio();
  } else {
    await playAudio();
  }
}

function setInputMode(mode) {
  pauseTrainingReviewPlayback();
  if (inputMode === "timeline" && mode !== "timeline") {
    stopTimelinePlayback({ resetPosition: false, keepLights: true });
  }
  if (inputMode === "system_audio" && mode !== "system_audio") {
    stopLiveAudio(false);
  }
  inputMode = mode;
  const fileMode = mode === "file";
  const timelineMode = mode === "timeline";
  const liveMode = mode === "system_audio";
  document.body.classList.toggle("is-mic-mode", mode === "mic_device" || liveMode);
  document.body.classList.toggle("mode-file", fileMode);
  document.body.classList.toggle("mode-timeline", timelineMode);
  document.body.classList.toggle("mode-mic_device", mode === "mic_device");
  document.body.classList.toggle("mode-system_audio", liveMode);
  elements.audioFile.disabled = !fileMode;
  elements.audioFile.closest(".file-control").classList.toggle("disabled", !fileMode);
  elements.audioDevice.disabled = mode !== "mic_device" && !liveMode;
  if (fileMode) {
    stopDeviceInput();
    setState(hasLoadedAudio() ? "Ready" : "Idle");
    elements.trackLabel.textContent = loadedFileName || "No track loaded";
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !hasLoadedAudio();
    elements.stopButton.disabled = !hasLoadedAudio();
  } else if (timelineMode) {
    stopDeviceInput();
    stopLiveAudio(false);
    stopPlayback({ resetPosition: false, keepLights: true });
    setState(timelineEvents.length ? "Timeline ready" : "Load timeline");
    elements.trackLabel.textContent = loadedTimelineName || "No timeline loaded";
    elements.playButton.textContent = "Play";
    elements.playButton.disabled = !timelineEvents.length;
    elements.stopButton.disabled = !timelineEvents.length;
    if (timelineEvents.length) {
      drawTimelineOverview();
    }
  } else if (mode === "mic_device") {
    stopPlayback({ resetPosition: false, keepLights: true });
    setState("Mic ready");
    elements.trackLabel.textContent = "Mic Device";
    elements.playButton.textContent = "Listen";
    elements.playButton.disabled = false;
    elements.stopButton.disabled = true;
    refreshAudioDevices();
  } else {
    stopDeviceInput();
    stopPlayback({ resetPosition: false, keepLights: true });
    setState("Audio Device ready");
    elements.trackLabel.textContent = "Audio Device";
    elements.playButton.textContent = "Listen";
    elements.playButton.disabled = false;
    elements.stopButton.disabled = true;
    refreshLiveAudioDevices();
  }
  updatePlayerTime();
}

function updateOutputMode() {
  const selected = elements.outputTarget.options[elements.outputTarget.selectedIndex].text;
  elements.outputLabel.textContent = selected;
  document.body.classList.toggle("output-timeline", elements.outputTarget.value === "timeline_json");
  document.body.classList.toggle("output-qlc-web", elements.outputTarget.value === "qlc_web_bridge");
}

function resetQlcWebOutputState(reason = "config") {
  lastQlcWebSceneKey = "";
  qlcWebBlackoutSent = false;
  lastQlcPhysicalColorKey = "";
  lastQlcPhysicalPhaseMode = "";
  lastQlcPhysicalColorAt = 0;
  lastQlcHeldLogAt = 0;
  lastQlcSmoothModeLog = "";
  lastQlcCapacityColorKey = "";
  lastQlcCapacityColorAt = 0;
  lastQlcCapacitySceneCategory = "";
  lastQlcCapacitySelectedIntent = "";
  lastQlcCapacityIntensity = 0;
  lastQlcCapacityLogAt = 0;
  if (qlcWebBridgeActive()) {
    console.log(`[qlc-web] reset output state reason=${reason}`);
    renderLights();
  }
}

async function refreshAudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    elements.audioDevice.innerHTML = '<option value="">Audio devices unavailable</option>';
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => {
      if (device.kind !== "audioinput") return false;
      const label = device.label.toLowerCase();
      if (label.includes("zoom")) return false;
      if (label.includes("virtual")) return false;
      return true;
    });
    const previous = elements.audioDevice.value;
    elements.audioDevice.innerHTML = '<option value="">Default audio input</option>';
    audioInputs.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = normalizeInputDeviceName(device.label, index);
      elements.audioDevice.appendChild(option);
    });
    elements.audioDevice.value = previous;
    updateAudioDeviceSummary("MacBook microphone");
  } catch (error) {
    logEvent(`mic list ${error.message}`);
  }
}

function normalizeInputDeviceName(label, index) {
  const clean = label.trim();
  if (!clean) return index === 0 ? "MacBook Air microphone" : `External mic ${index}`;
  if (/macbook|built-in|integrated|microphone/i.test(clean)) {
    return "MacBook Air microphone";
  }
  return clean;
}

async function refreshLiveAudioDevices() {
  elements.audioDevice.innerHTML = "";
  try {
    const response = await fetch("http://127.0.0.1:8790/devices", { cache: "no-store" });
    if (!response.ok) throw new Error(`live server ${response.status}`);
    const devices = await response.json();
    const visibleDevices = devices.filter(shouldShowLiveDevice);
    const loopbackDevice = visibleDevices.find(isSystemLoopbackDevice);
    const selectableDevices = loopbackDevice
      ? visibleDevices.filter(isSystemLoopbackDevice)
      : [{ index: "default", name: "Default Python input (may be microphone)" }, ...visibleDevices];
    selectableDevices.forEach((device) => {
      const option = document.createElement("option");
      option.value = String(device.index);
      option.textContent = normalizeLiveDeviceName(device.name, device.index);
      elements.audioDevice.appendChild(option);
    });
    if (loopbackDevice) {
      elements.audioDevice.value = String(loopbackDevice.index);
      updateAudioDeviceSummary(normalizeLiveDeviceName(loopbackDevice.name, loopbackDevice.index));
      setState("System audio ready");
      logEvent(`system loopback: ${loopbackDevice.name}`);
    } else {
      updateAudioDeviceSummary("System loopback missing");
      setState("No system loopback");
      logEvent("install/select BlackHole to hear Spotify/Rekordbox");
    }
  } catch (_error) {
    updateAudioDeviceSummary("Python server offline");
    setState("Start audio server");
    logEvent("run: lighting-live-audio");
  }
}

function updateAudioDeviceSummary(value) {
  if (elements.audioDeviceSummary) {
    elements.audioDeviceSummary.value = value;
    elements.audioDeviceSummary.textContent = value;
  }
}

function selectedLiveAudioDevice() {
  const selectedOption = elements.audioDevice.selectedOptions[0];
  if (selectedOption && isSystemLoopbackDevice({ name: selectedOption.textContent })) {
    updateAudioDeviceSummary(selectedOption.textContent);
    return elements.audioDevice.value;
  }
  const loopbackOption = [...elements.audioDevice.options].find((option) => isSystemLoopbackDevice({ name: option.textContent }));
  if (loopbackOption) {
    elements.audioDevice.value = loopbackOption.value;
    updateAudioDeviceSummary(loopbackOption.textContent);
    return loopbackOption.value;
  }
  return elements.audioDevice.value || "default";
}

function shouldShowLiveDevice(device) {
  const name = String(device.name || "").toLowerCase();
  if (name.includes("zoom")) return false;
  if (name.includes("teams")) return false;
  return true;
}

function isSystemLoopbackDevice(device) {
  return /blackhole|loopback|soundflower|vb-cable|audio hijack/i.test(String(device.name || ""));
}

function normalizeLiveDeviceName(name, index) {
  const clean = String(name || "").trim();
  if (!clean) return index === 0 ? "Default Python input" : `Input ${index}`;
  if (isSystemLoopbackDevice({ name: clean })) {
    return `${clean} (system loopback)`;
  }
  if (/macbook|built-in|microphone/i.test(clean)) {
    return "MacBook microphone";
  }
  return clean;
}

async function startLiveAudio() {
  await ensureAudioContext();
  resetModeVisualState("listen_start");
  resetLiveLightState("live_start");
  stopPlayback({ resetPosition: false, keepLights: true });
  stopDeviceInput(false);
  stopLiveAudio(false);
  const selectedDevice = selectedLiveAudioDevice();
  const url = `http://127.0.0.1:8790/events?device=${encodeURIComponent(selectedDevice)}`;
  liveEventSource = new EventSource(url);
  isPlaying = true;
  startedAt = audioContext.currentTime;
  pausedAt = 0;
  elements.playButton.textContent = "Pause";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.trackLabel.textContent = "Audio Device";
  setState("Audio Device listening");
  logEvent("audio device live");
  resetSpectrumHistory();
  beginTrainingCapture("python_live_audio");
  liveEventSource.onmessage = (event) => {
    handleLiveAudioFrame(JSON.parse(event.data));
  };
  liveEventSource.onerror = () => {
    if (inputMode !== "system_audio") return;
    setState("Live audio error");
    logEvent("python live server disconnected");
    stopLiveAudio(false);
  };
}

function stopLiveAudio(resetUi = true) {
  if (liveEventSource) {
    liveEventSource.close();
  }
  liveEventSource = null;
  if (inputMode === "system_audio") {
    isPlaying = false;
    cancelAnimationFrame(animationFrame);
    if (resetUi) {
      setState("Audio Device ready");
      elements.trackLabel.textContent = "Audio Device";
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      updateMeter(0);
      updatePlayerTime();
    }
    stopTrainingCapture("stopped");
    resetModeVisualState(resetUi ? "pause" : "live_start");
    updateTrainingEditState();
    maybeSendQlcWebBlackout();
  }
}

async function startDeviceInput() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setState("Mic error");
    logEvent("Mic Device richiede localhost o HTTPS");
    return;
  }

  await ensureAudioContext();
  resetModeVisualState("listen_start");
  resetLiveLightState("live_start");
  stopPlayback({ resetPosition: false, keepLights: true });
  stopLiveAudio(false);
  stopDeviceInput(false);
  elements.playButton.disabled = true;
  elements.stopButton.disabled = true;
  setState("Opening mic");

  const selectedDevice = elements.audioDevice.value;
  const constraints = selectedDevice
    ? { audio: { deviceId: { exact: selectedDevice }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
    : { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  mediaSourceNode = audioContext.createMediaStreamSource(mediaStream);
  mediaSourceNode.connect(analyser);
  startedAt = audioContext.currentTime;
  pausedAt = 0;
  isPlaying = true;
  elements.playButton.textContent = "Pause";
  elements.playButton.disabled = false;
  elements.stopButton.disabled = false;
  elements.trackLabel.textContent = "Mic Device";
  setState("Listening");
  await refreshAudioDevices();
  resetSpectrumHistory();
  beginTrainingCapture("mic_device");
  animate();
  logEvent("mic device live");
}

function stopDeviceInput(resetUi = true) {
  if (mediaSourceNode) {
    mediaSourceNode.disconnect();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  mediaSourceNode = null;
  mediaStream = null;
  if (inputMode === "mic_device") {
    isPlaying = false;
    cancelAnimationFrame(animationFrame);
    if (resetUi) {
      setState("Mic ready");
      elements.trackLabel.textContent = "Mic Device";
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      updateMeter(0);
      updatePlayerTime();
    }
    stopTrainingCapture("stopped");
    resetModeVisualState(resetUi ? "pause" : "live_start");
    updateTrainingEditState();
    maybeSendQlcWebBlackout();
  }
}

elements.audioFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  event.target.value = "";
  if (file) {
    elements.inputSource.value = "file";
    setInputMode("file");
    loadAudioFile(file).catch((error) => {
      setState("Load error");
      logEvent(error.message);
    });
  }
});

elements.timelineFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  event.target.value = "";
  if (file) {
    loadTimelineFile(file).catch((error) => {
      setState("Timeline error");
      logEvent(error.message);
    });
  }
});

elements.playButton.addEventListener("click", () => {
  toggleTransport().catch((error) => {
    const micDenied = inputMode === "mic_device" && /permission|denied|notallowed/i.test(error.message);
    setState(micDenied ? "Mic denied" : "Play error");
    if (inputMode === "mic_device") {
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
    }
    logEvent(micDenied ? "microphone permission denied" : error.message);
  });
});

elements.stopButton.addEventListener("click", () => {
  if (inputMode === "mic_device") {
    stopDeviceInput();
    blackoutLights();
  } else if (inputMode === "system_audio") {
    stopLiveAudio();
    blackoutLights();
  } else if (inputMode === "timeline") {
    stopTimelinePlayback({ resetPosition: true });
  } else {
    stopPlayback({ resetPosition: true });
  }
});

elements.inputSource.addEventListener("change", () => {
  setInputMode(elements.inputSource.value);
});

elements.audioDevice.addEventListener("change", () => {
  if (inputMode === "mic_device" && isPlaying) {
    startDeviceInput().catch((error) => {
      const micDenied = /permission|denied|notallowed/i.test(error.message);
      setState(micDenied ? "Mic denied" : "Mic error");
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      logEvent(micDenied ? "microphone permission denied" : error.message);
    });
  } else if (inputMode === "system_audio" && isPlaying) {
    startLiveAudio().catch((error) => {
      setState("Live audio error");
      elements.playButton.textContent = "Listen";
      elements.playButton.disabled = false;
      elements.stopButton.disabled = true;
      logEvent(error.message);
    });
  }
});

elements.seekSlider.addEventListener("input", () => {
  seekToSliderValue(elements.seekSlider.value).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

document.addEventListener("keydown", (event) => {
  const tagName = event.target?.tagName?.toLowerCase();
  if (["input", "select", "textarea"].includes(tagName) || event.target?.isContentEditable) return;
  if (!["ArrowRight", "ArrowLeft"].includes(event.key)) return;
  if (!(inputMode === "timeline" || trainingReviewAvailable())) return;
  if (!(musicalTimeline.lightFrames ?? []).length) return;
  event.preventDefault();
  if (event.shiftKey) {
    nextBeatOrDownbeatFrame(event.key === "ArrowRight" ? 1 : -1);
  } else if (event.key === "ArrowRight") {
    nextTimelineFrame();
  } else {
    previousTimelineFrame();
  }
});

elements.trackOverview.addEventListener("click", (event) => {
  const liveReview = (inputMode === "mic_device" || inputMode === "system_audio") && !isPlaying && trainingReviewModeActive();
  if ((!hasLoadedAudio() || inputMode !== "file") && inputMode !== "timeline" && !liveReview) return;
  const rect = elements.trackOverview.getBoundingClientRect();
  const progress = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  seekToSliderValue(progress * 1000).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

elements.liveSpectrum.addEventListener("click", (event) => {
  if (!trainingReviewAvailable()) return;
  const time = snapTrainingReviewTime(cueTimeFromCanvasEvent(event));
  seekToSliderValue((time / Math.max(trainingCapture.duration, 0.001)) * 1000).catch((error) => {
    setState("Seek error");
    logEvent(error.message);
  });
});

elements.liveSpectrum.addEventListener("contextmenu", (event) => {
  if (!enableAdvancedCueEditing) {
    event.preventDefault();
    if (!cueEditingDisabledLogged) {
      logEvent("[cue-edit] disabled until All-In-One/Music Dissector dashboard rewrite");
      cueEditingDisabledLogged = true;
    }
    return;
  }
  if (!canEditTrainingScene()) return;
  event.preventDefault();
  toggleTrainingCueAt(cueTimeFromCanvasEvent(event), "contextmenu");
});

elements.reviewPlayButton?.addEventListener("click", () => {
  toggleTrainingReviewPlayback().catch((error) => {
    setState("Review audio error");
    logEvent(error.message);
  });
});

window.addEventListener("resize", () => {
  overviewCacheCanvas = null;
  drawTrackOverview();
  redrawTrainingReview();
  updatePlayerTime();
});

elements.outputTarget.addEventListener("change", () => {
  const previousOutputTarget = activeOutputTarget;
  activeOutputTarget = elements.outputTarget.value;
  updateOutputMode();
  if (previousOutputTarget === "qlc_web_bridge" && activeOutputTarget !== "qlc_web_bridge") {
    sendQlcWebBlackout();
  }
  if (activeOutputTarget === "qlc_web_bridge") {
    resetQlcWebOutputState("output_selected");
  }
  logEvent(`output ${elements.outputLabel.textContent}`);
});

elements.qlcProfile?.addEventListener("change", () => {
  logEvent(`qlc profile ${elements.qlcProfile.value}`);
  resetQlcWebOutputState("profile_change");
});

elements.qlcFixtureCapacity?.addEventListener("change", () => {
  logEvent(`qlc fixture capacity ${elements.qlcFixtureCapacity.value}`);
  resetQlcWebOutputState("fixture_capacity_change");
});

elements.qlcPalette?.addEventListener("change", () => {
  logEvent(`qlc palette ${elements.qlcPalette.value}`);
  resetQlcWebOutputState("palette_change");
});

elements.qlcSmooth?.addEventListener("change", () => {
  logEvent(`qlc smooth ${elements.qlcSmooth.value}`);
  resetQlcWebOutputState("smooth_change");
});

elements.genreProfile.addEventListener("change", () => {
  logEvent(`genre ${elements.genreProfile.value}`);
});

function applyLightCountSetting() {
  const oldCount = lights.length;
  const newCount = clamp(Math.round(Number(elements.lightCount.value)), 1, 32);
  const oldQlcCapacity = qlcFixtureCapacityValue();
  if (oldCount === newCount) {
    elements.lightCount.value = String(newCount);
    syncQlcFixtureCapacity(newCount);
    return;
  }
  buildLights(Number(elements.lightCount.value), false);
  const newQlcCapacity = qlcFixtureCapacityValue();
  const overrideCount = Object.keys(trainingCapture.manualOverridesByKey ?? {}).length;
  if (overrideCount) {
    logEvent(`[manual-override] skipped incompatible snapshot count=${overrideCount} old=${oldCount} new=${newCount}`);
  }
  trainingCapture.manualOverridesByKey = {};
  logEvent(`[layout] light count changed old=${oldCount} new=${newCount}`);
  if (oldQlcCapacity !== newQlcCapacity) {
    logEvent(`qlc fixture capacity auto ${newQlcCapacity}`);
    resetQlcWebOutputState("fixture_capacity_auto");
  }
  resetModeVisualState("layout");
  logEvent(`lights ${elements.lightCount.value}`);
}

elements.lightCount.addEventListener("input", applyLightCountSetting);
elements.lightCount.addEventListener("change", applyLightCountSetting);

elements.differentiation.addEventListener("input", () => {
  elements.differentiationValue.textContent = elements.differentiation.value;
});

elements.trainingMode.addEventListener("change", () => {
  document.body.classList.toggle("is-training", isTrainingMode());
  if (!isTrainingMode()) {
    stopTrainingCapture("off");
    resetModeVisualState("training_off");
  } else {
    resetModeVisualState("training_on");
  }
  updateTrainingEditState();
  updatePlayerTime();
  logEvent(isTrainingMode() ? "training on" : "training off");
});

elements.saveAnnotationButton.addEventListener("click", () => {
  saveTrainingAnnotation();
});

elements.downloadAnnotationsButton.addEventListener("click", () => {
  downloadTrainingAnnotations();
});

elements.clearTrainingLightsButton.addEventListener("click", () => {
  clearTrainingLights();
});

elements.cueNameInput.addEventListener("input", () => {
  const cue = selectedTrainingCue();
  if (!cue) return;
  cue.name = elements.cueNameInput.value.trim() || cue.id;
  updateTrainingSummary();
  redrawTrainingReview();
});

elements.cueProbabilityInput.addEventListener("input", () => {
  const cue = selectedTrainingCue();
  if (!cue) return;
  cue.probability = roundNumber(clamp(Number(elements.cueProbabilityInput.value), 0, 1), 3);
  elements.cueProbabilityInput.value = String(cue.probability);
});

elements.blackoutSceneButton.addEventListener("click", blackoutCurrentTrainingScene);
elements.copySceneButton.addEventListener("click", copyCurrentTrainingScene);
elements.pasteSceneButton.addEventListener("click", pasteCopiedTrainingScene);

elements.resetLayoutButton.addEventListener("click", () => {
  buildLights(Number(elements.lightCount.value), false);
  logEvent("layout reset");
});

function startDrag(event) {
  if (event.button !== 0) return;
  if (event.target.closest(".phase-button")) return;
  const light = event.currentTarget;
  const index = Number(light.dataset.index);
  light.setPointerCapture(event.pointerId);
  light.classList.add("dragging");
  dragging = { light, index, moved: false };
  light.addEventListener("pointermove", moveDraggedLight);
  light.addEventListener("pointerup", stopDrag);
  light.addEventListener("pointercancel", stopDrag);
}

function moveDraggedLight(event) {
  if (!dragging) return;
  const rect = elements.stage.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 6, 94);
  const previous = positions[dragging.index] ?? { x, y };
  if (Math.abs(previous.x - x) > 0.4 || Math.abs(previous.y - y) > 0.4) {
    dragging.moved = true;
  }
  positions[dragging.index] = { x, y };
  dragging.light.style.left = `${x}%`;
  dragging.light.style.top = `${y}%`;
  refreshLightPositionLabels();
}

function stopDrag(event) {
  const light = event.currentTarget;
  const wasClick = dragging && !dragging.moved;
  const index = dragging?.index;
  light.classList.remove("dragging");
  light.releasePointerCapture(event.pointerId);
  light.removeEventListener("pointermove", moveDraggedLight);
  light.removeEventListener("pointerup", stopDrag);
  light.removeEventListener("pointercancel", stopDrag);
  dragging = null;
  if (wasClick && Number.isInteger(index) && canEditTrainingScene()) {
    cycleTrainingLight(index);
  }
}

buildLights(Number(elements.lightCount.value), false);
updateOutputMode();
setInputMode(elements.inputSource.value);
drawTrackOverview();
updateTrainingSummary();
updateTrainingEditState();
