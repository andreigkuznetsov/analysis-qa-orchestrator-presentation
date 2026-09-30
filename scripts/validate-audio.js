const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadPresentationData } = require("./tts-utils");
const { inspectOggOpus } = require("./providers/yandex-speechkit-v3-client");

const normalize = value => value.replace(/\s+/g, " ").trim();
const data = loadPresentationData();
const screens = data.PRESENTATION_AUDIO_MANIFEST.screens;
const tts = data.PRESENTATION_TTS.slides;
const failures = [];
const inspected = [];
const pending = [];
const allowStaleArgument = process.argv.find(argument => argument.startsWith("--allow-stale-tracks="));
const allowStaleTrackIds = new Set(allowStaleArgument ? allowStaleArgument.slice("--allow-stale-tracks=".length).split(",").map(value => value.trim()).filter(Boolean) : []);

for (const id of [...data.PRESENTATION_TTS.autoplaySlideIds, "tech"]) {
  if (!screens[id]) failures.push(`missing manifest screen: ${id}`);
}
if (screens.tech.autoplayEligible) failures.push("tech must not be autoplay eligible");
const slide01Tracks = screens["slide-01"].tracks;
if (slide01Tracks.length !== 2 || slide01Tracks.map(item => item.id).join("|") !== "slide-01-title|slide-01-body") failures.push("slide-01 must contain title then body");
if (slide01Tracks[0]?.audioSrc !== "assets/audio/slide-01/title.ogg" || slide01Tracks[1]?.audioSrc !== "assets/audio/slide-01/body.ogg") failures.push("slide-01 production paths are invalid");
if (slide01Tracks[0]?.speed !== 1.15 || slide01Tracks[1]?.speed !== 1.25) failures.push("slide-01 track speeds are invalid");
if (slide01Tracks.some(item => item.audioSrc === "assets/audio/slide-01.ogg" || item.id === "slide-01")) failures.push("legacy slide-01 track is still in runtime manifest");
const slide08Tracks = screens["slide-08"].tracks;
const slide08DemoTracks = slide08Tracks.filter(item => item.demoCue);
if (slide08Tracks.length !== 29 || slide08Tracks[0].id !== "slide-08-intro") failures.push("slide-08 must contain intro followed by 28 cue tracks");
if (slide08DemoTracks.length !== 28) failures.push("slide-08 must contain exactly 28 cue tracks");
slide08DemoTracks.forEach((item, index) => {
  const order = index + 1;
  const expectedFrame = order === 28 ? 27 : order;
  if (item.order !== order || item.frame !== expectedFrame || item.id !== `slide-08-demo-cue-${String(order).padStart(2, "0")}`) failures.push(`${item.id}: invalid slide-08 cue metadata`);
  if (!item.audioSrc.startsWith("assets/audio/slide-08/demo/")) failures.push(`${item.id}: invalid cue audio path`);
});
if (screens["slide-04"].tracks[0].id !== "slide-04-intro") failures.push("slide-04 intro must be first");

for (const id of ["slide-04", "slide-05", "slide-06", "slide-10"]) {
  const entry = tts[id];
  if (normalize(entry.segments.map(item => item.ttsText).join(" ")) !== normalize(entry.ttsText)) failures.push(`${id}: segments do not reconstruct ttsText`);
  for (const audioTrack of screens[id].tracks) {
    if (audioTrack.syncKey && !entry.segments.some(item => item.syncKey === audioTrack.syncKey)) failures.push(`${id}: missing segment for ${audioTrack.syncKey}`);
  }
}

const paths = Object.values(screens).flatMap(screen => screen.tracks.map(item => item.audioSrc));
if (new Set(paths).size !== paths.length) failures.push("audio paths must be unique");
if (paths.some(item => !item.endsWith(".ogg"))) failures.push("all production paths must use OGG");
if (paths.some(item => /speed-\d+\.ogg$/i.test(item))) failures.push("sample path found in production manifest");

for (const screen of Object.values(screens)) {
  for (const audioTrack of screen.tracks) {
    if (audioTrack.transcriptId !== screen.transcriptId) failures.push(`${audioTrack.id}: invalid transcriptId`);
    if (audioTrack.autoplayEligible !== screen.autoplayEligible) failures.push(`${audioTrack.id}: invalid autoplay flag`);
    if (audioTrack.duration === null) {
      pending.push({ id: audioTrack.id, audioSrc: audioTrack.audioSrc });
      continue;
    }
    if (!Number.isFinite(audioTrack.duration) || audioTrack.duration <= 0) failures.push(`${audioTrack.id}: invalid manifest duration`);
    const absolutePath = path.resolve(audioTrack.audioSrc);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${audioTrack.id}: missing audio file ${audioTrack.audioSrc}`);
      continue;
    }
    try {
      const metadata = inspectOggOpus(fs.readFileSync(absolutePath));
      inspected.push({ id: audioTrack.id, bytes: metadata.bytes, duration: metadata.durationSeconds });
      if (metadata.bytes <= 0) failures.push(`${audioTrack.id}: empty audio file`);
      if (Math.abs(metadata.durationSeconds - audioTrack.duration) > 0.000001 && !allowStaleTrackIds.has(audioTrack.id)) failures.push(`${audioTrack.id}: manifest duration mismatch`);
    } catch (error) {
      failures.push(`${audioTrack.id}: ${error.message}`);
    }
  }
}

class MockAudio {
  static instances = [];
  constructor(src) { this.src = src; this.currentTime = 0; this.listeners = {}; this.muted = false; this.playbackRate = 1; MockAudio.instances.push(this); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  play() { this.listeners.play?.(); return Promise.resolve(); }
  pause() { this.listeners.pause?.(); }
  removeAttribute() { this.src = ""; }
  load() {}
  end() { this.listeners.ended?.(); }
  fail() { this.listeners.error?.(); }
}

const store = new Map();
const context = {
  window: {},
  Audio: MockAudio,
  sessionStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/audio-controller.js", "utf8"), context, { filename: "js/audio-controller.js" });
const states = [];
const sync = [];
let advances = 0;
const controller = new context.window.PresentationAudioController({
  manifest: { screens: { test: { autoplayEligible: true, tracks: [{ id: "a", audioSrc: "a.mp3", syncKey: "one" }, { id: "b", audioSrc: "b.mp3", syncKey: "two" }] } } },
  onAdvance: () => { advances += 1; },
  onSync: key => sync.push(key),
  onState: state => states.push(state),
  onError: () => {}
});
controller.loadScreen("test");
controller.play();
controller.pause();
controller.play();
const activeAudio = MockAudio.instances.at(-1);
controller.setPlaybackRate(1.2);
if (activeAudio.playbackRate !== 1.2 || activeAudio.currentTime !== 0 || !controller.playing) failures.push("live playbackRate update failed");
controller.setMuted(true);
controller.setTranscriptOpen(true);
if (!controller.playing || !controller.muted || !controller.transcriptOpen) failures.push("play/pause/resume/mute/transcript state failed");
MockAudio.instances.at(-1).end();
if (controller.trackIndex !== 1 || sync.at(-1) !== "two") failures.push("sequential track sync failed");
if (MockAudio.instances.at(-1).playbackRate !== 1.2) failures.push("playbackRate was not applied to the next track");
controller.setAutoplay(true);
MockAudio.instances.at(-1).end();
if (advances !== 1) failures.push("autoplay advance failed");
controller.replay();
if (controller.trackIndex !== 0 || sync.at(-1) !== "one") failures.push("replay failed");
MockAudio.instances.at(-1).fail();
if (controller.autoplay || !controller.error) failures.push("error fallback failed");
controller.loadScreen("test");
if (controller.playing || controller.trackIndex !== 0) failures.push("screen switch cleanup failed");

const restoredController = new context.window.PresentationAudioController({
  manifest: { screens: {} }, onAdvance: () => {}, onSync: () => {}, onState: () => {}, onError: () => {}
});
if (restoredController.playbackRate !== 1.2) failures.push("playbackRate session restore failed");

let slide01ManualAdvances = 0;
const slide01Manual = new context.window.PresentationAudioController({
  manifest: data.PRESENTATION_AUDIO_MANIFEST,
  onAdvance: () => { slide01ManualAdvances += 1; },
  onSync: () => {}, onState: () => {}, onError: () => {}
});
slide01Manual.loadScreen("slide-01");
slide01Manual.play();
if (!MockAudio.instances.at(-1).src.endsWith("slide-01/title.ogg")) failures.push("slide-01 manual must start with title");
slide01Manual.pause();
slide01Manual.play();
if (slide01Manual.trackIndex !== 0 || !slide01Manual.playing) failures.push("slide-01 title pause/resume failed");
MockAudio.instances.at(-1).end();
if (slide01Manual.trackIndex !== 1 || !MockAudio.instances.at(-1).src.endsWith("slide-01/body.ogg")) failures.push("slide-01 manual title-to-body transition failed");
MockAudio.instances.at(-1).end();
if (slide01ManualAdvances !== 0 || slide01Manual.screenId !== "slide-01") failures.push("slide-01 manual must remain on the current screen");

let slide01AutoAdvances = 0;
const slide01Auto = new context.window.PresentationAudioController({
  manifest: data.PRESENTATION_AUDIO_MANIFEST,
  onAdvance: () => { slide01AutoAdvances += 1; },
  onSync: () => {}, onState: () => {}, onError: () => {}
});
slide01Auto.loadScreen("slide-01");
slide01Auto.setAutoplay(true);
slide01Auto.play();
MockAudio.instances.at(-1).end();
if (slide01Auto.trackIndex !== 1 || !MockAudio.instances.at(-1).src.endsWith("slide-01/body.ogg")) failures.push("slide-01 auto title-to-body transition failed");
MockAudio.instances.at(-1).end();
if (slide01AutoAdvances !== 1) failures.push("slide-01 auto must advance after body");

console.log(JSON.stringify({
  screens: Object.keys(screens).length,
  tracks: paths.length,
  inspectedFiles: inspected.length,
  pendingGeneration: pending,
  allowedStaleTracks: [...allowStaleTrackIds],
  totalBytes: inspected.reduce((sum, item) => sum + item.bytes, 0),
  totalDuration: inspected.reduce((sum, item) => sum + item.duration, 0),
  syncEventsTested: sync,
  playbackRatesTested: [0.8, 0.9, 1, 1.1, 1.2],
  controllerStates: states.length,
  slide01Flow: { manualAdvances: slide01ManualAdvances, autoAdvances: slide01AutoAdvances },
  failures
}, null, 2));
if (failures.length) process.exit(1);
