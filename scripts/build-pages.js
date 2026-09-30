const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadPresentationData } = require("./tts-utils");
const { inspectOggOpus } = require("./providers/yandex-speechkit-v3-client");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist-pages");
const RUNTIME_FILES = [
  "index.html",
  "css/presentation.css",
  "js/audio-controller.js",
  "js/presentation.js",
  "data/rules.js",
  "data/sort-1998-demo.js",
  "data/sort-1998-demo-tts.js",
  "data/slides.js",
  "data/pronunciation.js",
  "data/tts.js",
  "data/audio-manifest.js"
];
const VALIDATIONS = [
  "scripts/validate-tts.js",
  "scripts/validate-pronunciation.js",
  "scripts/validate-sort-demo-tts.js",
  "scripts/validate-audio.js"
];

function fail(message) {
  throw new Error(message);
}

function normalizeRelative(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function safeSourcePath(relativePath) {
  const normalized = normalizeRelative(relativePath);
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) fail(`Unsafe publish path: ${relativePath}`);
  const absolute = path.resolve(ROOT, normalized);
  if (!absolute.startsWith(`${ROOT}${path.sep}`)) fail(`Path escapes project: ${relativePath}`);
  return { normalized, absolute };
}

function copy(relativePath) {
  const { normalized, absolute } = safeSourcePath(relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`Missing runtime file: ${normalized}`);
  const destination = path.join(OUTPUT, ...normalized.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(absolute, destination);
}

function runValidations() {
  for (const script of VALIDATIONS) {
    const result = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: "inherit", shell: false });
    if (result.status !== 0) fail(`Validation failed: ${script}`);
  }
}

function extractAssetReferences(text) {
  return [...text.matchAll(/assets\/[A-Za-z0-9_./-]+\.(?:png|svg|jpe?g|webp|ogg)/gi)].map(match => normalizeRelative(match[0]));
}

function collectAllFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectAllFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function validateSecurity(files) {
  const forbiddenNames = /(^|[\\/])\.env(?:\.|$)|credentials?|cookies?|debug[-_.]?dump/i;
  const textPatterns = [
    ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ["authorization header", /Authorization\s*:\s*["'`](?:Bearer|Basic|Api-Key)\s+/i],
    ["assigned credential", /(?:api[_-]?key|access[_-]?token|password|client[_-]?secret)\s*[:=]\s*["'`][^"'`\r\n]{8,}/i],
    ["embedded URL credentials", /https?:\/\/[^\s/:]+:[^\s@]+@/i],
    ["absolute Windows path", /\b[A-Za-z]:\\[^\r\n"'`]+/],
    ["personal email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ["localhost dependency", /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i],
    ["screen 10 debug", /screen10-debug-v1|console\.debug\s*\(/]
  ];
  const findings = [];
  for (const file of files) {
    const relative = normalizeRelative(path.relative(OUTPUT, file));
    if (forbiddenNames.test(relative)) findings.push(`${relative}: forbidden filename`);
    if (!/\.(?:html|css|js|svg|txt|json)$/i.test(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const [label, pattern] of textPatterns) if (pattern.test(text)) findings.push(`${relative}: ${label}`);
  }
  if (findings.length) fail(`Security sanity check failed:\n${findings.join("\n")}`);
}

function validateReferences(files, allowedAssets) {
  const index = fs.readFileSync(path.join(OUTPUT, "index.html"), "utf8");
  const documentRefs = [...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(value => !value.startsWith("#"));
  for (const reference of documentRefs) {
    if (/^(?:https?:|data:|mailto:)/i.test(reference)) continue;
    if (reference.startsWith("/")) fail(`Root-absolute reference is not Pages-safe: ${reference}`);
    const target = path.resolve(OUTPUT, reference.split(/[?#]/)[0]);
    if (!target.startsWith(`${OUTPUT}${path.sep}`) || !fs.existsSync(target)) fail(`Broken index reference: ${reference}`);
  }
  for (const file of files.filter(item => /\.(?:html|css|js)$/i.test(item))) {
    const text = fs.readFileSync(file, "utf8");
    for (const reference of extractAssetReferences(text)) {
      if (!allowedAssets.has(reference)) fail(`Runtime references non-allowlisted asset: ${reference}`);
      if (!fs.existsSync(path.join(OUTPUT, ...reference.split("/")))) fail(`Broken runtime asset reference: ${reference}`);
    }
  }
  const publishedAssets = collectAllFiles(path.join(OUTPUT, "assets")).map(file => normalizeRelative(path.relative(OUTPUT, file)));
  const extras = publishedAssets.filter(file => !allowedAssets.has(file));
  if (extras.length) fail(`Unexpected assets in publish package: ${extras.join(", ")}`);
}

function build() {
  runValidations();
  if (path.dirname(OUTPUT) !== ROOT || path.basename(OUTPUT) !== "dist-pages") fail("Unsafe publish output path.");
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  for (const file of RUNTIME_FILES) copy(file);
  fs.writeFileSync(path.join(OUTPUT, ".nojekyll"), "", "utf8");

  const data = loadPresentationData();
  const audio = Object.values(data.PRESENTATION_AUDIO_MANIFEST.screens).flatMap(screen => screen.tracks.map(track => normalizeRelative(track.audioSrc)));
  if (new Set(audio).size !== audio.length) fail("Runtime manifest contains duplicate audio paths.");
  for (const audioPath of audio) {
    const { absolute } = safeSourcePath(audioPath);
    inspectOggOpus(fs.readFileSync(absolute));
  }

  const imageRefs = new Set();
  for (const file of RUNTIME_FILES) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const reference of extractAssetReferences(text)) if (!reference.endsWith(".ogg")) imageRefs.add(reference);
  }
  for (const slide of data.PRESENTATION_DATA.slides) {
    for (const reference of extractAssetReferences(slide.html)) if (!reference.endsWith(".ogg")) imageRefs.add(reference);
  }
  for (const frame of data.SORT_1998_DEMO.frames) imageRefs.add(normalizeRelative(frame.image));

  const allowedAssets = new Set([...audio, ...imageRefs]);
  for (const asset of [...allowedAssets].sort()) copy(asset);

  const files = collectAllFiles(OUTPUT);
  validateReferences(files, allowedAssets);
  validateSecurity(files);

  const extensionCount = extension => files.filter(file => path.extname(file).toLowerCase() === extension).length;
  const summary = {
    output: normalizeRelative(path.relative(ROOT, OUTPUT)),
    files: files.length,
    bytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    html: extensionCount(".html"),
    css: extensionCount(".css"),
    js: files.filter(file => normalizeRelative(path.relative(OUTPUT, file)).startsWith("js/") && path.extname(file).toLowerCase() === ".js").length,
    dataFiles: files.filter(file => normalizeRelative(path.relative(OUTPUT, file)).startsWith("data/")).length,
    images: files.filter(file => /\.(?:png|svg|jpe?g|webp)$/i.test(file)).length,
    audio: extensionCount(".ogg"),
    demoScreenshots: files.filter(file => /assets[\\/]demo[\\/]sort-1998[\\/]\d+\.png$/i.test(file)).length
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log("GitHub Pages package is clean and ready.");
}

try {
  build();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
