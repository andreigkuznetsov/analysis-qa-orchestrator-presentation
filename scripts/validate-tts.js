const fs = require("fs");
const vm = require("vm");

const normalize = value => value.replace(/\s+/g, " ").trim();
const scriptFile = fs.readdirSync("reference/presentation").find(name => name.endsWith(".txt"));
const source = fs.readFileSync(`reference/presentation/${scriptFile}`, "utf8");
const context = { window: {} };
vm.createContext(context);

for (const file of ["data/slides.js", "data/pronunciation.js", "data/tts.js"]) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const data = context.window.PRESENTATION_DATA;
const failures = [];
const comparisons = [];
const firstPersonPatterns = ["я хочу", "я покажу", "я разработал", "я не хотел", "я выбрал", "для меня", "мы посмотрели", "пройдём"];
const forbiddenAbbreviations = ["QA", "БА", "СА", "LLM", "MVP"];
const termPattern = term => new RegExp(`(?<![\\p{L}\\p{N}_])${term}(?![\\p{L}\\p{N}_])`, "iu");

const contentGuards = {
  "slide-07": [
    "работающий минимально жизнеспособный продукт", "основной процесс", "Doc2RAG", "OpenRouter",
    "одного пользователя с настроенными подключениями", "Runs, то есть проекты", "состояние каждого Run сохраняется",
    "экспортировать вместе с уже полученными результатами", "передать другому участнику команды", "После импорта",
    "открыть тот же Run", "посмотреть требования", "результаты проверки", "тестовое покрытие",
    "продолжить ручную работу", "без отдельной настройки этих интеграций", "portable-приложения под Windows",
    "не требуется отдельно разворачивать и поддерживать серверную часть", "локальными файлами",
    "хранятся на компьютере пользователя", "Test IT", "статистика использования моделей"
  ],
  "slide-10": [
    "минимально жизнеспособным продуктом", "изменение могло быть размечено не полностью",
    "бизнес- и системная аналитика могли по-разному называть одну сущность",
    "тип параметра мог расходиться между описанием и примером",
    "системная аналитика могла не описывать обработку результата", "способен вернуть бэкенд",
    "правила подготовки входных артефактов", "Этот перечень не закрыт", "Следующая Story",
    "исходной бизнес- или системной аналитике", "до отправки документов в Doc2RAG",
    "предварительная проверка входных артефактов", "нормализовать автоматически",
    "затрагивает смысл", "ручной проверке", "Исходные документы при этом сохраняются",
    "нормализованное представление остаётся связано с источником"
  ]
};

for (let number = 1; number <= 10; number += 1) {
  const match = source.match(new RegExp(`Слайд ${number}:\\s*([\\s\\S]*?)(?=\\s*Слайд ${number + 1}:|$)`));
  const id = `slide-${String(number).padStart(2, "0")}`;
  const slide = data.slides.find(item => item.id === id);
  const ttsLower = slide.ttsText.toLocaleLowerCase("ru-RU");
  const transcriptExact = Boolean(match) && normalize(match[1]) === normalize(slide.transcript);
  const ttsAutonomous = Boolean(normalize(slide.ttsText));
  const firstPersonHits = firstPersonPatterns.filter(pattern => ttsLower.includes(pattern));
  const semanticTts = slide.ttsText.replaceAll("Analysis & QA Orchestrator", "");
  const abbreviationHits = forbiddenAbbreviations.filter(term => termPattern(term).test(semanticTts));
  const missingAnchors = (contentGuards[id] || []).filter(anchor => !slide.ttsText.includes(anchor));
  const ttsNoFirstPerson = firstPersonHits.length === 0 || id === "slide-01";
  const ttsAbbreviations = abbreviationHits.length === 0;
  const ttsContentGuard = missingAnchors.length === 0;

  comparisons.push({ slide: number, transcriptExact, ttsAutonomous, ttsNoFirstPerson, ttsAbbreviations, ttsContentGuard });
  if (!transcriptExact) failures.push(`${id}: transcript differs from reference script`);
  if (!ttsAutonomous) failures.push(`${id}: autonomous ttsText is empty`);
  if (!ttsNoFirstPerson) failures.push(`${id}: first-person phrases: ${firstPersonHits.join(", ")}`);
  if (!ttsAbbreviations) failures.push(`${id}: forbidden abbreviations: ${abbreviationHits.join(", ")}`);
  if (!ttsContentGuard) failures.push(`${id}: missing content anchors: ${missingAnchors.join(" | ")}`);
}

for (const id of ["slide-01", "slide-04", "slide-05", "slide-06", "slide-10"]) {
  const slide = data.slides.find(item => item.id === id);
  if (normalize(slide.segments.map(item => item.ttsText).join(" ")) !== normalize(slide.ttsText)) {
    failures.push(`${id}: segment ttsText does not reconstruct autonomous ttsText`);
  }
  for (const item of slide.segments) {
    const lower = item.ttsText.toLocaleLowerCase("ru-RU");
    if (firstPersonPatterns.some(pattern => lower.includes(pattern))) failures.push(`${id}/${item.syncKey}: first-person phrase found`);
    const semanticSegment = item.ttsText.replaceAll("Analysis & QA Orchestrator", "");
    if (forbiddenAbbreviations.some(term => termPattern(term).test(semanticSegment))) failures.push(`${id}/${item.syncKey}: forbidden abbreviation found`);
  }
}

const slide05 = data.slides.find(item => item.id === "slide-05");
const approvedSlide01 = "Сейчас будет показан Analysis & QA Orchestrator. Это инструмент, разработанный для SmartDS, который помогает упростить подготовительную работу перед тестированием. Основная идея состоит в том, чтобы связать в одном процессе исходные документы бизнес- и системной аналитики, извлечение требований, проверку их логики и полноты и подготовку тестового покрытия. Часть этой работы выполняется автоматически, но решения на ключевых этапах остаются за человеком.";
const slide01 = data.slides.find(item => item.id === "slide-01");
if (normalize(slide01.ttsText) !== approvedSlide01) failures.push("slide-01: approved autonomous ttsText changed");
if (slide01.segments.map(item => item.syncKey).join("|") !== "title|body") failures.push("slide-01: invalid segment order");
if (slide01.segments[0]?.ttsText !== "Сейчас будет показан Analysis & QA Orchestrator.") failures.push("slide-01: title segment changed");
if (normalize(slide01.segments.map(item => item.ttsText).join(" ")) !== approvedSlide01) failures.push("slide-01: title/body do not reconstruct autonomous ttsText");
const slide05Opening = "Ручная проверка обязательна на каждом ключевом этапе работы Оркестратора.";
if (!slide05.ttsText.startsWith(slide05Opening)) failures.push("slide-05: autonomous ttsText has an invalid opening");
if (slide05.ttsText.includes("Это один из принципиальных моментов Оркестратора.")) failures.push("slide-05: obsolete opening is still present");
if (/\b(?:Accept|Exclude)\b/i.test(slide05.ttsText)) failures.push("slide-05: English decision terms found in autonomous ttsText");
for (const term of ["Принять", "Исключить"]) {
  if (!slide05.ttsText.includes(term)) failures.push(`slide-05: missing Russian UI term ${term}`);
}
const slide05SyncKeys = slide05.segments.map(item => item.syncKey);
for (const key of ["decision-neutral", "requirement-accept", "requirement-exclude", "problem-exclude", "problem-accept"]) {
  if (!slide05SyncKeys.includes(key)) failures.push(`slide-05: missing decision sync key ${key}`);
}

const slide06 = data.slides.find(item => item.id === "slide-06");
const slide06Opening = "Результаты работы Оркестратора используются всей командой, а не только аналитиком и тестировщиком.";
if (!slide06.ttsText.startsWith(slide06Opening)) failures.push("slide-06: autonomous ttsText has an invalid opening");
const slide06ExpectedKeys = ["roles-intro", "business", "sdm", "ba-sa", "developer", "qa", "support"];
if (slide06.segments.map(item => item.syncKey).join("|") !== slide06ExpectedKeys.join("|")) failures.push("slide-06: invalid role segment order");
const slide06Business = slide06.segments.find(item => item.syncKey === "business")?.ttsText || "";
if (/аналитик/iu.test(slide06Business)) failures.push("slide-06/business: analysts must not be mentioned");
if (slide06Business.includes("На этом этапе")) failures.push("slide-06/business: ambiguous stage phrase found");
const slide06BaSa = slide06.segments.find(item => item.syncKey === "ba-sa")?.ttsText || "";
if (!slide06BaSa.includes("структурированный набор требований") || !slide06BaSa.includes("исправления исходных документов")) failures.push("slide-06/ba-sa: standalone role text is incomplete");
for (const key of ["roles-intro", "business", "ba-sa"]) {
  const text = slide06.segments.find(item => item.syncKey === key)?.ttsText.trim() || "";
  if (!/[.!?]$/u.test(text)) failures.push(`slide-06/${key}: changed segment contains an unfinished sentence`);
}

const slide10 = data.slides.find(item => item.id === "slide-10");
const slide10Normalized = normalize(slide10.ttsText);
const approvedRulesPhrase = "Такие случаи мы начали фиксировать как правила подготовки входных артефактов. Сейчас уже сформирован набор таких правил.";
if (!slide10Normalized.includes(approvedRulesPhrase)) failures.push("slide-10: approved rules wording is missing");
if (slide10Normalized.includes("Сейчас уже сформирован набор правил подготовки входных артефактов.")) failures.push("slide-10: repeated rules wording is still present");
const slide10Data = data.slides.find(item => item.id === "slide-10");
if (!slide10Data.html.includes("Будущее развитие инструмента")) failures.push("slide-10: status badge text is invalid");
if (!slide10Data.html.includes("<h1>Качество входных артефактов</h1>")) failures.push("slide-10: main heading changed unexpectedly");

if (!data.techMeta.ttsText || !data.slides.find(item => item.id === "questions").ttsText) failures.push("questions or tech autonomous ttsText is empty");
if (data.slides.some(slide => slide.audioSrc !== null || slide.autoplayDuration !== null || slide.syncMarkers.some(item => item.timing !== null))) {
  failures.push("audio, autoplay duration or real marker timing found");
}

const expectedTerms = ["Analysis & QA Orchestrator", "QA", "Run", "Runs", "Story", "Doc2RAG", "OpenRouter", "Test IT", "SmartDS", "БА", "СА", "LLM", "MVP", "Windows", "Excel", "API", "Logic Review", "Test Design", "FastAPI", "DATA_ROOT", "WebView2", "pywebview"];
const actualTerms = context.window.PRESENTATION_PRONUNCIATION.map(item => item.display);
for (const term of expectedTerms) {
  if (!actualTerms.includes(term)) failures.push(`missing pronunciation entry: ${term}`);
}

console.log(JSON.stringify({ scriptFile, comparisons, segmentedSlides: ["slide-01", "slide-04", "slide-05", "slide-06", "slide-10"], pronunciationEntries: actualTerms.length, failures }, null, 2));
if (failures.length) process.exit(1);
