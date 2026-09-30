const fs = require("fs");
const vm = require("vm");

function loadPresentationData() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of ["data/sort-1998-demo.js", "data/slides.js", "data/pronunciation.js", "data/tts.js", "data/sort-1998-demo-tts.js", "data/audio-manifest.js"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  }
  return context.window;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyPronunciation(text, dictionary) {
  return [...dictionary]
    .sort((left, right) => right.display.length - left.display.length)
    .reduce((result, item) => result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(item.display)}(?![\\p{L}\\p{N}_])`, "gu"), item.spoken), text);
}

function buildAudioPlan() {
  const data = loadPresentationData();
  const tts = data.PRESENTATION_TTS.slides;
  const dictionary = data.PRESENTATION_PRONUNCIATION;
  const screens = data.PRESENTATION_AUDIO_MANIFEST.screens;
  const plan = [];

  for (const screen of Object.values(screens)) {
    const ttsEntry = tts[screen.id];
    for (const audioTrack of screen.tracks) {
      const demoCue = audioTrack.demoCue && data.SORT_1998_DEMO_TTS.cueTracks.find(item => item.audioTrackId === audioTrack.id);
      const sourceSegment = !demoCue && audioTrack.syncKey && ttsEntry.segments.find(item => item.syncKey === audioTrack.syncKey);
      const text = demoCue?.ttsText ?? sourceSegment?.ttsText ?? ttsEntry.ttsText;
      if (!text) continue;
      plan.push({
        id: audioTrack.id,
        corpus: demoCue ? "sort-1998-demo-cue" : "presentation",
        screenId: screen.id,
        syncKey: audioTrack.syncKey,
        frame: demoCue?.frame ?? null,
        parentSegmentId: demoCue?.parentSegmentId ?? null,
        audioSrc: audioTrack.audioSrc,
        speed: audioTrack.speed ?? 1.25,
        ttsText: text,
        providerText: applyPronunciation(text, dictionary)
      });
    }
  }

  return { data, plan };
}

module.exports = { applyPronunciation, buildAudioPlan, loadPresentationData };
