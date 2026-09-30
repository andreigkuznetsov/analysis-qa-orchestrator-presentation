const fs = require("fs");
const path = require("path");
const { buildAudioPlan } = require("../tts-utils");

const ENDPOINT = "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis";
const VOICE = "filipp";
const SAMPLES = [
  { speed: 1.15, output: "assets/audio/slide-01-speed-115.ogg" },
  { speed: 1.20, output: "assets/audio/slide-01-speed-120.ogg" },
  { speed: 1.25, output: "assets/audio/slide-01-speed-125.ogg" }
];

function extractAudio(payload) {
  let records;
  try {
    records = [JSON.parse(payload)];
  } catch (_) {
    records = payload.trim().split(/\r?\n/).filter(Boolean).flatMap(line => {
      try { return [JSON.parse(line)]; } catch (_) { return []; }
    });
  }
  const chunks = records
    .map(record => record.result?.audioChunk?.data || record.audioChunk?.data)
    .filter(Boolean)
    .map(value => Buffer.from(value, "base64"));
  if (!chunks.length) throw new Error("SpeechKit response contains no audio chunks.");
  return Buffer.concat(chunks);
}

function safeApiError(payload) {
  try {
    const parsed = JSON.parse(payload);
    const code = parsed.code || parsed.error?.code || parsed.error_code;
    const message = parsed.message || parsed.error?.message || parsed.error_message;
    return [code && `code ${code}`, message].filter(Boolean).join(": ");
  } catch (_) {
    return "response body is not valid JSON";
  }
}

function inspectOggOpus(buffer) {
  if (buffer.length < 32 || buffer.toString("ascii", 0, 4) !== "OggS" || !buffer.includes(Buffer.from("OpusHead"))) {
    throw new Error("SpeechKit response is not a valid Ogg Opus file.");
  }
  const opusHead = buffer.indexOf(Buffer.from("OpusHead"));
  const preSkip = buffer.readUInt16LE(opusHead + 10);
  let offset = 0;
  let finalGranule = 0n;
  while (offset + 27 <= buffer.length) {
    if (buffer.toString("ascii", offset, offset + 4) !== "OggS") throw new Error("Invalid Ogg page boundary.");
    const segmentCount = buffer[offset + 26];
    if (offset + 27 + segmentCount > buffer.length) throw new Error("Incomplete Ogg segment table.");
    let payloadSize = 0;
    for (let index = 0; index < segmentCount; index += 1) payloadSize += buffer[offset + 27 + index];
    const granule = buffer.readBigUInt64LE(offset + 6);
    if (granule !== 0xffffffffffffffffn && granule > finalGranule) finalGranule = granule;
    offset += 27 + segmentCount + payloadSize;
  }
  if (offset !== buffer.length || finalGranule <= BigInt(preSkip)) throw new Error("Incomplete Ogg Opus metadata.");
  return { bytes: buffer.length, durationSeconds: Number(finalGranule - BigInt(preSkip)) / 48000 };
}

async function synthesize(apiKey, text, speed) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Api-Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      hints: [{ voice: VOICE }, { speed: speed.toFixed(2) }],
      outputAudioSpec: { containerAudio: { containerAudioType: "OGG_OPUS" } },
      loudnessNormalizationType: "LUFS",
      unsafeMode: true
    })
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`SpeechKit request failed with HTTP ${response.status}: ${safeApiError(payload)}`);
  return extractAudio(payload);
}

async function main() {
  const apiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
  if (!apiKey) throw new Error("YANDEX_SPEECHKIT_API_KEY is not available.");
  const { plan } = buildAudioPlan();
  const sample = plan.find(item => item.id === "slide-01");
  if (!sample) throw new Error("slide-01 is missing from the audio plan.");

  const generated = [];
  for (const definition of SAMPLES) {
    const audio = await synthesize(apiKey, sample.providerText, definition.speed);
    generated.push({ ...definition, audio, metadata: inspectOggOpus(audio) });
  }

  for (const item of generated) {
    const outputPath = path.resolve(item.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, item.audio);
  }

  console.log(JSON.stringify({
    endpoint: ENDPOINT,
    voice: VOICE,
    samples: generated.map(({ speed, output, metadata }) => ({ speed, output, ...metadata }))
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
