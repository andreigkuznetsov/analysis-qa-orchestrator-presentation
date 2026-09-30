const fs = require("fs");
const vm = require("vm");
const { applyPronunciation, buildAudioPlan } = require("./tts-utils");

const context = { window: {} };
vm.createContext(context);
for (const file of ["data/sort-1998-demo.js", "data/sort-1998-demo-tts.js", "data/pronunciation.js", "data/audio-manifest.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const demo = context.window.SORT_1998_DEMO;
const model = context.window.SORT_1998_DEMO_TTS;
const manifest = context.window.PRESENTATION_AUDIO_MANIFEST;
const failures = [];
const expectedSegmentIds = [
  "sort-demo-start-documents", "sort-demo-context-doc2rag", "sort-demo-requirements-extraction",
  "sort-demo-requirements-review", "sort-demo-logic-first-pass", "sort-demo-logic-review-decisions",
  "sort-demo-fix-rerun", "sort-demo-test-design", "sort-demo-test-review", "sort-demo-summary"
];
const segmentById = id => model.segments.find(item => item.id === id);

if (model.segments.length !== 10) failures.push(`expected 10 parent segments, got ${model.segments.length}`);
if (model.segments.map(item => item.id).join("|") !== expectedSegmentIds.join("|")) failures.push("parent segment IDs or order differ from the approved scenario");
if (model.autoSyncEnabled !== true) failures.push("Cue-level Auto-sync must be enabled for runtime integration");
if (model.startsAfterTrackId !== "slide-08-intro") failures.push("demo narration must start after slide-08-intro");

const approvedTextChecks = [
  ["sort-demo-start-documents", "На старте в нём ещё нет документов, требований и результатов проверки."],
  ["sort-demo-requirements-extraction", "Это позволяет понимать, откуда взят каждый фрагмент контекста и почему он относится к текущей задаче."],
  ["sort-demo-logic-first-pass", "Каждую из них должен проверить аналитик или тестировщик."],
  ["sort-demo-test-review", "Тестировщик может открыть каждый тест-кейс"],
  ["sort-demo-summary", "При этом ни одна критическая точка не проходит автоматически без решения аналитика или тестировщика."]
];
for (const [id, approvedText] of approvedTextChecks) {
  if (!segmentById(id)?.ttsText.includes(approvedText)) failures.push(`${id}: approved wording is missing: ${approvedText}`);
}
const userOccurrences = model.segments.flatMap(item => [...item.ttsText.matchAll(/пользователь/giu)].map(() => item.id));
if (userOccurrences.join("|") !== "sort-demo-requirements-extraction") failures.push(`unexpected professional-role use of «пользователь»: ${userOccurrences.join(", ") || "none"}`);

const visualFrames = new Set(demo.frames.map(item => item.order));
const semanticCues = [];
for (const [segmentIndex, parent] of model.segments.entries()) {
  if (parent.order !== segmentIndex + 1) failures.push(`${parent.id}: invalid parent segment order`);
  if (!parent.ttsText.trim()) failures.push(`${parent.id}: empty parent ttsText`);
  if (parent.status !== "legacy") failures.push(`${parent.id}: parent audio status must be legacy`);
  if (!/^slide-08-demo-[a-z0-9-]+$/.test(parent.legacyAudioTrackId)) failures.push(`${parent.id}: invalid legacyAudioTrackId`);
  if (!/^assets\/audio\/slide-08\/[a-z0-9-]+\.ogg$/.test(parent.legacyAudioPath)) failures.push(`${parent.id}: invalid legacyAudioPath`);
  let previousPosition = -1;
  for (const [cueIndex, semanticCue] of parent.cues.entries()) {
    semanticCues.push({ ...semanticCue, parentSegmentId: parent.id });
    if (semanticCue.order !== cueIndex + 1) failures.push(`${parent.id}: invalid semantic cue order`);
    if (!parent.frames.includes(semanticCue.frame)) failures.push(`${parent.id}: cue frame ${semanticCue.frame} is outside parent frames`);
    const position = parent.ttsText.indexOf(semanticCue.anchorText);
    if (position < 0) failures.push(`${parent.id}: missing exact anchor: ${semanticCue.anchorText}`);
    if (position <= previousPosition) failures.push(`${parent.id}: semantic anchors are not in narration order`);
    previousPosition = position;
  }
}

if (semanticCues.length !== 28) failures.push(`expected 28 semantic cues, got ${semanticCues.length}`);
if (model.cueTracks.length !== 28) failures.push(`expected 28 cue-level tracks, got ${model.cueTracks.length}`);

const { plan } = buildAudioPlan();
const cueAudioPlan = plan.filter(item => item.corpus === "sort-1998-demo-cue");
if (cueAudioPlan.length !== 28) failures.push(`shared audio plan must contain 28 cue tracks, got ${cueAudioPlan.length}`);

const cueIds = new Set();
const audioTrackIds = new Set();
const audioPaths = new Set();
const frameCounts = new Map();
for (const [index, cueTrack] of model.cueTracks.entries()) {
  const suffix = String(index + 1).padStart(2, "0");
  const sourceCue = semanticCues[index];
  if (cueTrack.order !== index + 1) failures.push(`${cueTrack.id}: invalid global order`);
  if (cueTrack.id !== `sort-demo-cue-${suffix}`) failures.push(`${cueTrack.id}: unstable cue ID`);
  if (cueTrack.audioTrackId !== `slide-08-demo-cue-${suffix}`) failures.push(`${cueTrack.id}: invalid audioTrackId`);
  if (cueTrack.audioPath !== `assets/audio/slide-08/demo/cue-${suffix}.ogg`) failures.push(`${cueTrack.id}: invalid audioPath`);
  if (cueTrack.status !== "pendingGeneration") failures.push(`${cueTrack.id}: status must be pendingGeneration`);
  if (!visualFrames.has(cueTrack.frame)) failures.push(`${cueTrack.id}: invalid frame ${cueTrack.frame}`);
  if (!cueTrack.ttsText) failures.push(`${cueTrack.id}: empty ttsText`);
  if (!/[.!?…»]$/u.test(cueTrack.ttsText)) failures.push(`${cueTrack.id}: ttsText does not end as a complete utterance`);
  if (!cueTrack.ttsText.startsWith(cueTrack.anchorText)) failures.push(`${cueTrack.id}: ttsText does not start with its semantic anchor`);
  if (cueTrack.parentSegmentId !== sourceCue?.parentSegmentId || cueTrack.frame !== sourceCue?.frame || cueTrack.anchorText !== sourceCue?.anchorText) failures.push(`${cueTrack.id}: source semantic cue mapping changed`);
  if (cueIds.has(cueTrack.id)) failures.push(`${cueTrack.id}: duplicate cue ID`);
  if (audioTrackIds.has(cueTrack.audioTrackId)) failures.push(`${cueTrack.id}: duplicate audioTrackId`);
  if (audioPaths.has(cueTrack.audioPath)) failures.push(`${cueTrack.id}: duplicate audioPath`);
  cueIds.add(cueTrack.id);
  audioTrackIds.add(cueTrack.audioTrackId);
  audioPaths.add(cueTrack.audioPath);
  frameCounts.set(cueTrack.frame, (frameCounts.get(cueTrack.frame) || 0) + 1);

  const plannedTrack = cueAudioPlan.find(track => track.id === cueTrack.audioTrackId);
  if (!plannedTrack) failures.push(`${cueTrack.id}: missing from shared audio plan`);
  else {
    if (plannedTrack.audioSrc !== cueTrack.audioPath || plannedTrack.ttsText !== cueTrack.ttsText) failures.push(`${cueTrack.id}: shared audio plan mismatch`);
    if (plannedTrack.providerText !== applyPronunciation(cueTrack.ttsText, context.window.PRESENTATION_PRONUNCIATION)) failures.push(`${cueTrack.id}: pronunciation preprocessing mismatch`);
  }
}

for (let frame = 1; frame <= 27; frame += 1) {
  const expectedCount = frame === 27 ? 2 : 1;
  if (frameCounts.get(frame) !== expectedCount) failures.push(`frame ${frame}: expected ${expectedCount} cue track(s), got ${frameCounts.get(frame) || 0}`);
}

const legacyTrackIds = new Set(model.segments.map(item => item.legacyAudioTrackId));
if (cueAudioPlan.some(item => legacyTrackIds.has(item.id) || !item.audioSrc.startsWith("assets/audio/slide-08/demo/"))) failures.push("legacy demo audio entered the cue production plan");
const manifestCueTracks = manifest.screens["slide-08"].tracks.filter(item => item.demoCue);
if (manifestCueTracks.length !== 28) failures.push(`runtime manifest must contain 28 cue tracks, got ${manifestCueTracks.length}`);
for (const [index, manifestTrack] of manifestCueTracks.entries()) {
  const cueTrack = model.cueTracks[index];
  if (manifestTrack.id !== cueTrack.audioTrackId || manifestTrack.audioSrc !== cueTrack.audioPath || manifestTrack.frame !== cueTrack.frame || manifestTrack.order !== cueTrack.order || manifestTrack.ttsRef !== cueTrack.id) failures.push(`${cueTrack.id}: runtime manifest mapping mismatch`);
  if (!Number.isFinite(manifestTrack.duration) || manifestTrack.duration <= 0) failures.push(`${cueTrack.id}: runtime duration is missing`);
}
const manifestTrackIds = new Set(Object.values(manifest.screens).flatMap(screen => screen.tracks.map(track => track.id)));
if ([...legacyTrackIds].some(id => manifestTrackIds.has(id))) failures.push("legacy demo audio entered the runtime manifest");

console.log(JSON.stringify({
  parentSegments: model.segments.length,
  semanticCues: semanticCues.length,
  cueTracks: model.cueTracks.length,
  cueTrackIds: model.cueTracks.map(item => item.audioTrackId),
  frameCoverage: [...frameCounts.entries()].sort((a, b) => a[0] - b[0]),
  legacyTracksInCuePlan: cueAudioPlan.filter(item => legacyTrackIds.has(item.id)).length,
  autoSyncEnabled: model.autoSyncEnabled,
  failures
}, null, 2));

if (failures.length) process.exit(1);
