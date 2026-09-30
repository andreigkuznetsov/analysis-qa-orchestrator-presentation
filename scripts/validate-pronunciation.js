const { applyPronunciation, loadPresentationData } = require("./tts-utils");

const data = loadPresentationData();
const dictionary = data.PRESENTATION_PRONUNCIATION;
const terms = ["QA", "Run", "Runs", "Story", "Doc2RAG", "OpenRouter", "Test IT", "SmartDS", "БА", "СА", "LLM", "MVP", "API", "FastAPI", "DATA_ROOT", "Windows", "Excel", "Logic Review", "Test Design", "WebView2", "pywebview", "Orchestrator", "пробелам", "тестами", "бэкенд"];
const failures = [];

for (const term of terms) {
  const expected = dictionary.find(item => item.display === term)?.spoken;
  const actual = applyPronunciation(term, dictionary);
  if (!expected || actual !== expected) failures.push({ term, expected, actual });
}

const boundarySample = applyPronunciation("Runs, Run и runner.", dictionary);
if (boundarySample !== "раны, ран и runner.") failures.push({ term: "word boundaries", actual: boundarySample });

const productName = applyPronunciation("Analysis & QA Orchestrator", dictionary);
if (productName !== "аналисисэндкьюэйоркестр+атор") failures.push({ term: "product name", actual: productName });

console.log(JSON.stringify({ checked: terms.length, failures }, null, 2));
if (failures.length) process.exit(1);
