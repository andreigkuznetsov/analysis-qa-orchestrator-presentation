const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { buildAudioPlan } = require("./tts-utils");
const { inspectOggOpus, synthesizeOggOpus } = require("./providers/yandex-speechkit-v3-client");

const VOICE = "filipp";
const DEFAULT_SPEED = 1.25;
const VALIDATIONS = ["scripts/validate-tts.js", "scripts/validate-pronunciation.js", "scripts/validate-sort-demo-tts.js", "scripts/validate-audio.js"];

function runValidations(requestedIds = []) {
  for (const script of VALIDATIONS) {
    const args = [script];
    if (script === "scripts/validate-audio.js" && requestedIds.length) args.push(`--allow-stale-tracks=${requestedIds.join(",")}`);
    const result = spawnSync(process.execPath, args, { stdio: "inherit", shell: false });
    if (result.status !== 0) throw new Error(`Validation failed: ${script}`);
  }
}

function replaceManifestDuration(source, trackId, duration) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`${trackId}: generated duration is invalid.`);
  const escapedId = trackId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(track\\("${escapedId}",\\s*"[^"]+",\\s*)(?:null|[0-9]+(?:\\.[0-9]+)?)(\\s*[,\\)])`);
  const matches = source.match(new RegExp(pattern.source, "g")) || [];
  if (matches.length !== 1) throw new Error(`${trackId}: expected exactly one manifest track entry, found ${matches.length}.`);
  return source.replace(pattern, `$1${duration}$2`);
}

function updateManifestDuration(trackId, duration) {
  const manifestPath = path.resolve("data/audio-manifest.js");
  const source = fs.readFileSync(manifestPath, "utf8");
  fs.writeFileSync(manifestPath, replaceManifestDuration(source, trackId, duration), "utf8");
}

function validateSelectedQueue(queue) {
  for (const item of queue) {
    if (!item.ttsText?.trim()) throw new Error(`${item.id}: ttsText is empty.`);
    if (!item.providerText?.trim()) throw new Error(`${item.id}: pronunciation preprocessing produced empty text.`);
    if (!item.audioSrc.startsWith("assets/audio/") || !item.audioSrc.endsWith(".ogg")) throw new Error(`${item.id}: invalid production output path ${item.audioSrc}.`);
    if (![1.15, DEFAULT_SPEED].includes(item.speed)) throw new Error(`${item.id}: unsupported SpeechKit speed ${item.speed}.`);
  }
  if (VOICE !== "filipp" || DEFAULT_SPEED !== 1.25) throw new Error("Unexpected SpeechKit provider configuration.");
}

function isValidExistingFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  try {
    inspectOggOpus(fs.readFileSync(filePath));
    return true;
  } catch (_) {
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const tracksArgument = process.argv.find(argument => argument.startsWith("--tracks="));
  const requestedIds = tracksArgument ? tracksArgument.slice("--tracks=".length).split(",").map(value => value.trim()).filter(Boolean) : [];
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
  if (!dryRun && !apiKey) throw new Error("YANDEX_SPEECHKIT_API_KEY is not available.");

  runValidations(requestedIds);
  const { plan } = buildAudioPlan();
  const production = plan.filter(item => item.corpus === "presentation" && item.audioSrc.startsWith("assets/audio/") && item.audioSrc.endsWith(".ogg"));
  const demoProduction = plan.filter(item => item.corpus === "sort-1998-demo-cue");
  const sampleTracks = production.filter(item => /speed-\d+\.ogg$/i.test(item.audioSrc));
  if (sampleTracks.length) throw new Error(`Sample tracks unexpectedly entered production queue: ${sampleTracks.map(item => item.id).join(", ")}`);
  if (production.length !== 31) throw new Error(`Unexpected production track count: ${production.length}; expected 31.`);
  if (demoProduction.length !== 28) throw new Error(`Unexpected SORT-1998 demo cue track count: ${demoProduction.length}; expected 28.`);
  const selectableProduction = [...production, ...demoProduction];
  const knownIds = new Set(selectableProduction.map(item => item.id));
  const unknownIds = requestedIds.filter(id => !knownIds.has(id));
  if (unknownIds.length) throw new Error(`Unknown production track ID(s): ${unknownIds.join(", ")}`);
  const queue = requestedIds.length ? selectableProduction.filter(item => requestedIds.includes(item.id)) : production;
  validateSelectedQueue(queue);

  if (dryRun) {
    console.log(JSON.stringify({ voice: VOICE, role: null, defaultSpeed: DEFAULT_SPEED, format: "OGG_OPUS", forceSelected: requestedIds.length > 0, tracks: queue.map(item => ({ id: item.id, output: item.audioSrc, syncKey: item.syncKey, speed: item.speed })) }, null, 2));
    console.log("Dry run complete: no SpeechKit requests were made.");
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Production queue: ${queue.length} track(s); voice=${VOICE}; defaultSpeed=${DEFAULT_SPEED}; format=OGG_OPUS.`);
  for (const item of queue) {
    const outputPath = path.resolve(item.audioSrc);
    if (!requestedIds.length && isValidExistingFile(outputPath)) {
      skipped += 1;
      console.log(`SKIP ${item.id}: valid file already exists.`);
      continue;
    }

    try {
      const { audio } = await synthesizeOggOpus({ apiKey, text: item.providerText, voice: VOICE, speed: item.speed });
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, audio);
      const writtenMetadata = inspectOggOpus(fs.readFileSync(outputPath));
      updateManifestDuration(item.id, writtenMetadata.durationSeconds);
      created += 1;
      console.log(`CREATE ${item.id}: ${item.audioSrc}; speed=${item.speed}; ${writtenMetadata.bytes} bytes; ${writtenMetadata.durationSeconds.toFixed(3)} s.`);
    } catch (error) {
      failed += 1;
      console.error(`ERROR ${item.id} (${item.audioSrc}): ${error.message}`);
    }
  }

  console.log(`Summary: created=${created}; skipped=${skipped}; failed=${failed}.`);
  if (failed) process.exitCode = 1;
  else runValidations();
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { replaceManifestDuration };
