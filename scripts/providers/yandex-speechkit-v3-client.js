const ENDPOINT = "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis";

function parseRecords(payload) {
  try {
    return [JSON.parse(payload)];
  } catch (_) {
    return payload.trim().split(/\r?\n/).filter(Boolean).flatMap(line => {
      try { return [JSON.parse(line)]; } catch (_) { return []; }
    });
  }
}

function safeApiError(payload) {
  const record = parseRecords(payload)[0];
  if (!record) return "response body is not valid JSON";
  const code = record.code || record.error?.code || record.error_code;
  const message = record.message || record.error?.message || record.error_message;
  return [code && `code ${code}`, message].filter(Boolean).join(": ") || "unknown API error";
}

function extractAudio(payload) {
  const chunks = parseRecords(payload)
    .map(record => record.result?.audioChunk?.data || record.audioChunk?.data)
    .filter(Boolean)
    .map(value => Buffer.from(value, "base64"));
  if (!chunks.length) throw new Error("SpeechKit response contains no audio chunks.");
  return Buffer.concat(chunks);
}

function inspectOggOpus(buffer) {
  if (buffer.length < 32 || buffer.toString("ascii", 0, 4) !== "OggS" || !buffer.includes(Buffer.from("OpusHead"))) {
    throw new Error("Audio is not a valid Ogg Opus file.");
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

async function synthesizeOggOpus({ apiKey, text, voice, speed }) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Api-Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      hints: [{ voice }, { speed: speed.toFixed(2) }],
      outputAudioSpec: { containerAudio: { containerAudioType: "OGG_OPUS" } },
      loudnessNormalizationType: "LUFS",
      unsafeMode: true
    })
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${safeApiError(payload)}`);
  const audio = extractAudio(payload);
  return { audio, metadata: inspectOggOpus(audio) };
}

module.exports = { ENDPOINT, inspectOggOpus, synthesizeOggOpus };
