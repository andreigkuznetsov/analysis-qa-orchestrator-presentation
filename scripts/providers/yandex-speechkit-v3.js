const fs = require("fs");
const path = require("path");
const { buildAudioPlan } = require("../tts-utils");

const ENDPOINT = "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis";
const VOICE = "marina";
const ROLE = "neutral";
const OUTPUT = "assets/audio/slide-01.wav";

function audioChunksFromResponse(payload) {
  let records;
  try {
    records = [JSON.parse(payload)];
  } catch (_) {
    records = payload.trim().split(/\r?\n/).filter(Boolean).flatMap(line => {
      try { return [JSON.parse(line)]; } catch (_) { return []; }
    });
  }
  return records
    .map(record => record.result?.audioChunk?.data || record.audioChunk?.data)
    .filter(Boolean)
    .map(value => Buffer.from(value, "base64"));
}

function inspectWav(buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("SpeechKit response is not a valid WAV container.");
  }
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && size >= 12) byteRate = buffer.readUInt32LE(offset + 8 + 8);
    if (id === "data") { dataSize = size; break; }
    offset += 8 + size + (size % 2);
  }
  if (!byteRate || !dataSize) throw new Error("WAV metadata is incomplete.");
  return { bytes: buffer.length, durationSeconds: dataSize / byteRate };
}

async function main() {
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
  if (!apiKey) throw new Error("YANDEX_SPEECHKIT_API_KEY is not available.");

  const { plan } = buildAudioPlan();
  const sample = plan.find(item => item.id === "slide-01");
  if (!sample) throw new Error("slide-01 is missing from the audio plan.");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: sample.providerText,
      hints: [{ voice: VOICE }, { role: ROLE }],
      outputAudioSpec: { containerAudio: { containerAudioType: "WAV" } },
      loudnessNormalizationType: "LUFS",
      unsafeMode: true
    })
  });

  const payload = await response.text();
  if (!response.ok) throw new Error(`SpeechKit request failed with HTTP ${response.status}.`);
  const chunks = audioChunksFromResponse(payload);
  if (!chunks.length) throw new Error("SpeechKit response contains no audio chunks.");

  const wav = Buffer.concat(chunks);
  const metadata = inspectWav(wav);
  const outputPath = path.resolve(OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, wav);
  console.log(JSON.stringify({ endpoint: ENDPOINT, voice: VOICE, role: ROLE, output: OUTPUT, ...metadata }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
