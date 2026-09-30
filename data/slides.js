window.PRESENTATION_DATA = {
  slides: [
    {
      id: "slide-01",
      title: "Analysis & QA Orchestrator",
      className: "hero-slide",
      html: `
        <section class="hero-copy">
          <div class="hero-brand"><img class="hero-product-logo" src="assets/logo_orch.png" alt="Логотип Analysis & QA Orchestrator"><span class="hero-client"><span class="eyebrow">Разработано для</span><img src="assets/logo-smartds.svg" alt="SmartDS"></span></div>
          <h1>Analysis &amp; QA<br><span>Orchestrator</span></h1>
          <p class="hero-slogan">От контекста - к качеству</p>
          <p class="hero-purpose">Инструмент для анализа требований, проверки аналитики и подготовки тест-дизайна</p>
          <p class="author">Автор идеи и создание продукта: <b>Андрей Кузнецов</b></p>
        </section>
        <section class="hero-flow" aria-label="Документы, контекст, требования, проверка, покрытие">
          <div class="flow-node"><span>01</span><b>Документы</b></div><i>→</i>
          <div class="flow-node"><span>02</span><b>Контекст</b></div><i>→</i>
          <div class="flow-node"><span>03</span><b>Требования</b></div><i>→</i>
          <div class="flow-node"><span>04</span><b>Проверка<br>аналитики</b></div><i>→</i>
          <div class="flow-node accent"><span>05</span><b>Тестовое<br>покрытие</b></div>
        </section>`
    },
    {
      id: "slide-02",
      title: "До разработки и тестирования нужно разобраться в требованиях",
      className: "requirements-intro",
      html: `
        <header class="slide-heading"><span class="eyebrow">Исходная ситуация</span><h1>До разработки и тестирования<br>нужно разобраться в требованиях</h1></header>
        <div class="story-input"><span>Story</span><i>+</i><span>БА</span><i>/</i><span>СА</span></div>
        <div class="analysis-route">
          <article class="route-card strong"><small>01</small><h3>Контекст Story</h3><p>Собрать связанные изменения и документы</p></article>
          <span class="route-arrow">→</span>
          <article class="route-card"><small>02</small><h3>Ручной анализ</h3><p>Сопоставить БА и СА, выделить и согласовать требования</p></article>
          <span class="route-arrow">→</span>
          <article class="route-card result-card"><small>03</small><h3>Основа работы</h3><ul><li>требования</li><li>пробелы</li><li>основа покрытия</li></ul></article>
        </div>
        <p class="key-message">Значительная часть этой работы требует ручного анализа.</p>`
    },
    {
      id: "slide-03",
      title: "Один управляемый процесс",
      className: "process-slide",
      html: `
        <header class="slide-heading"><span class="eyebrow">Analysis &amp; QA Orchestrator</span><h1>Один управляемый процесс</h1><p>Оркестратор берёт на себя значительную часть предварительной работы.</p></header>
        <div class="story-tag">Story <span>вход процесса</span></div>
        <div class="managed-process">
          <article><small>01</small><b>Артефакты</b><span>БА / СА</span></article><i>→</i>
          <article><small>02</small><b>Контекст</b><span>для Story</span></article><i>→</i>
          <article><small>03</small><b>Требования</b><span>проверенный набор</span></article><i>→</i>
          <article><small>04</small><b>Проверка аналитики</b><span>логика и полнота</span></article><i>→</i>
          <article><small>05</small><b>Тестовое покрытие</b><span>тест-кейсы</span></article>
        </div>
        <div class="process-notes"><p><b>Состояние сохраняется</b><br>Результат каждого этапа остаётся внутри Run.</p><p><b>Маршрут управляется</b><br>Переход дальше зависит от ручной проверки.</p></div>`
    },
    {
      id: "slide-04",
      title: "От документов до тестового покрытия",
      className: "workflow-slide",
      html: `
        <div class="workflow-copy"><header class="slide-heading compact-heading"><span class="eyebrow">Полный маршрут</span><h1>От документов до тестового покрытия</h1></header>
          <div class="workflow-steps" role="group" aria-label="Этапы workflow">
            <button type="button" data-workflow-step="documents"><span>01</span>Документы и контекст</button>
            <button type="button" data-workflow-step="requirements"><span>02</span>Требования</button>
            <button type="button" data-workflow-step="logic"><span>03</span>Проверка аналитики</button>
            <button type="button" data-workflow-step="remediation"><span>04</span>Исправление БА / СА</button>
            <button type="button" data-workflow-step="coverage"><span>05</span>Тестовое покрытие</button>
          </div>
          <div class="workflow-description" id="workflow-description" aria-live="polite"></div>
        </div>
        <figure class="workflow-figure" id="workflow-figure">
          <div class="native-workflow" id="native-workflow" aria-label="Workflow Analysis & QA Orchestrator"></div>
        </figure>`
    },
    {
      id: "slide-05",
      title: "Человек остаётся в контуре",
      className: "human-slide",
      html: `
        <header class="slide-heading"><span class="eyebrow">Контрольные точки</span><h1>Человек остаётся в контуре</h1><p>Одинаковые действия имеют разный смысл на разных этапах.</p></header>
        <div class="decision-grid">
          <article class="decision-card" data-decision-card="requirement"><span class="card-kicker">Требование</span><div class="decision-source">Нейросеть <i>→</i> Требование <i>→</i> Аналитик / QA</div><div class="decision-actions"><button type="button" data-decision="accept">Принять</button><button type="button" data-decision="exclude">Исключить</button></div><div class="decision-result" aria-live="polite"><small>Результат решения</small><strong>Использовать дальше</strong><span>Требование входит в проверенный набор.</span></div></article>
          <article class="decision-card issue" data-decision-card="finding"><span class="card-kicker">Проблема аналитики</span><div class="decision-source">Нейросеть <i>→</i> Найденная проблема <i>→</i> Аналитик</div><div class="decision-actions"><button type="button" data-decision="exclude">Исключить</button><button type="button" data-decision="accept">Принять</button></div><div class="decision-result" aria-live="polite"><small>Результат решения</small><strong>Можно продолжить</strong><span>Проблема не подтверждена человеком.</span></div></article>
        </div>
        <p class="statement">Решение человека определяет дальнейший маршрут процесса.</p>`
    },
    {
      id: "slide-06",
      title: "Что получает команда",
      className: "team-slide",
      html: `
        <header class="slide-heading"><span class="eyebrow">Один Run · общая основа</span><h1>Что получает команда</h1></header>
        <div class="role-explorer"><div class="role-tabs" role="tablist" aria-label="Роли команды"><button type="button" role="tab" data-role="customer">Бизнес-заказчик</button><button type="button" role="tab" data-role="sdm">SDM</button><button type="button" role="tab" data-role="analyst">БА / СА</button><button type="button" role="tab" data-role="developer">Разработчик</button><button type="button" role="tab" data-role="qa">QA</button><button type="button" role="tab" data-role="support">Поддержка</button></div><article class="role-detail" id="role-detail" role="tabpanel" aria-live="polite"></article></div>
        <p class="key-message">Оркестратор остаётся рабочим инструментом аналитика и QA, но результат используется всей командой.</p>`
    },
    {
      id: "slide-07",
      title: "Что уже работает в 1.0.0 MVP",
      className: "mvp-slide",
      html: `
        <header class="slide-heading"><span class="eyebrow">Работающий MVP</span><h1>Что уже работает в 1.0.0 MVP</h1></header>
        <div class="capability-grid">
          <article><span class="card-kicker">Рабочий процесс</span><h3>Основной маршрут</h3><ul><li>Требования</li><li>Проверка логики и полноты</li><li>Тестовое покрытие</li></ul></article>
          <article><span class="card-kicker">Интеграции</span><h3>Подключения</h3><ul><li>Doc2RAG</li><li>OpenRouter</li><li>Test IT</li></ul></article>
          <article><span class="card-kicker">Работа с проектами</span><h3>Runs</h3><ul><li>Сохранение состояния</li><li>Экспорт и импорт проекта</li><li>Статистика</li></ul></article>
          <article class="delivery"><span class="card-kicker">Поставка</span><h3>Windows portable</h3><ul><li>Windows 10 / 11 x64</li><li>Локальное хранение проектов</li><li>Без развёртывания сервера</li></ul></article>
        </div>
        <p class="key-message">MVP уже закрывает основной маршрут: от аналитики к проверенному тестовому покрытию.</p>`
    },
    {
      id: "slide-08",
      title: "Один Run: от аналитики до тест-кейсов",
      className: "demo-slide",
      html: `
        <section class="sort-demo-intro" id="sort-demo-intro">
          <div class="demo-copy"><span class="eyebrow">Переход к живому демо</span><h1>Один Run:<br>от аналитики<br>до тест-кейсов</h1><ol><li>Загружаем БА / СА</li><li>Получаем и проверяем требования</li><li>Проверяем логику и полноту</li><li>Исправляем БА / СА при подтверждённой проблеме</li><li>Формируем и проверяем тестовое покрытие</li><li>Экспортируем результат</li></ol><button class="sort-demo-launch" id="sort-demo-launch" type="button">Открыть SORT-1998 demo</button></div>
          <figure class="demo-shot"><img src="assets/run-overview.png" alt="Экран Run в Analysis & QA Orchestrator"><figcaption><span></span>Run 006 · реальный интерфейс Orchestrator</figcaption></figure>
        </section>
        <section class="sort-demo" id="sort-demo" hidden tabindex="-1" aria-label="Демонстрация процесса SORT-1998">
          <header class="sort-demo-meta">
            <div><span class="sort-demo-count" id="sort-demo-count">01 / 27</span><h2 id="sort-demo-title">Пустой Run</h2></div>
            <span class="sort-demo-group" id="sort-demo-group">Старт и документы</span>
          </header>
          <figure class="sort-demo-frame"><img id="sort-demo-image" src="assets/demo/sort-1998/1.png" alt="SORT-1998: Пустой Run"><div class="sort-demo-focus" id="sort-demo-focus" hidden aria-hidden="true"><span id="sort-demo-focus-label"></span><div id="sort-demo-focus-crop"></div></div></figure>
          <footer class="sort-demo-controls">
            <div class="sort-demo-progress" aria-hidden="true"><span id="sort-demo-progress"></span></div>
            <button id="sort-demo-prev" type="button" aria-label="Предыдущий кадр">← Назад</button>
            <button id="sort-demo-restart" type="button">Начать сначала</button>
            <button id="sort-demo-next" class="primary" type="button" aria-label="Следующий кадр">Вперёд →</button>
          </footer>
        </section>`
    },
    {
      id: "slide-09",
      title: "Что меняется в процессе",
      className: "change-slide",
      html: `
        <header class="slide-heading"><span class="eyebrow">Результат внедрения процесса</span><h1>Что меняется в процессе</h1></header>
        <div class="change-list">
          <article><b>01</b><div><h3>Единый маршрут</h3><p>Состояние Story и результаты этапов сохраняются в одном процессе.</p></div></article>
          <article><b>02</b><div><h3>Прослеживаемость</h3><p>Исходная аналитика → требования → контрольная точка → тестовое покрытие.</p></div></article>
          <article><b>03</b><div><h3>Контроль результата</h3><p>Решения на ключевых этапах принимает человек.</p></div></article>
          <article><b>04</b><div><h3>Повторяемость</h3><p>Один процесс можно применять к разным Story.</p></div></article>
        </div>`
    },
    {
      id: "slide-10",
      title: "Направление развития: качество входных артефактов",
      className: "future-slide",
      html: `
        <header class="slide-heading"><span class="status-badge">Будущее развитие инструмента</span><h1>Качество входных артефактов</h1></header>
        <section class="rule-process discovery"><div class="process-label"><span>01</span><div><b>Как появляются правила</b><small>Из практики - только через решение человека</small></div></div><div class="rule-chain"><span>Реальная Story</span><i>→</i><span>Результат Orchestrator</span><i>→</i><span>Анализ причины</span><i>→</i><span>Кандидат в новое или уточнённое правило</span></div><div class="human-approval"><span>Кандидат в правило</span><i>↓</i><b>Принято человеком</b><i>↓</i><span>Попадает в набор правил</span></div></section>
        <section class="rule-process application"><div class="process-label"><span>02</span><div><b>Как правила применяются</b><small>Используется уже принятый набор правил</small></div></div><div class="rule-chain"><span>БА / СА</span><i>→</i><span>Проверка по правилам</span><i>→</i><span>Ревью человеком</span><i>→</i><span>Безопасная нормализация</span><i>→</i><span>Doc2RAG</span></div></section>
        <div class="rules-cta"><div><span>Сформулированные правила</span></div><button type="button" id="open-rules">Посмотреть правила</button></div>`
    },
    {
      id: "questions",
      title: "Спасибо за внимание!",
      className: "questions-slide",
      html: `<div class="questions-content"><img src="assets/logo_orch.png" alt=""><span class="eyebrow">Analysis &amp; QA Orchestrator</span><p>От контекста - к качеству</p><h1>Спасибо за внимание!</h1></div>`
    }
  ],
  workflow: {
    connections: [
      ["wf-documents", "wf-doc2rag"], ["wf-doc2rag", "wf-context"],
      ["wf-context-input", "wf-requirements-llm"], ["wf-requirements-llm", "wf-requirements-result"], ["wf-requirements-result", "wf-requirements-review"], ["wf-requirements-review", "wf-approved-requirements"],
      ["wf-approved-input", "wf-logic-llm"], ["wf-logic-llm", "wf-findings"], ["wf-findings", "wf-findings-review"], ["wf-findings-review", "wf-clean-state"],
      ["wf-confirmed-finding", "wf-remediation"], ["wf-remediation", "wf-updated-documents"], ["wf-updated-documents", "wf-requirements-llm", "return"],
      ["wf-approved-test-input", "wf-test-design"], ["wf-test-design", "wf-test-coverage"], ["wf-test-coverage", "wf-test-review"], ["wf-test-review", "wf-export"]
    ],
    groups: [
      { id: "documents", label: "Документы и контекст", description: "Документы обрабатываются, чтобы сформировать релевантный контекст Story.", stages: ["wf-stage-1"] },
      { id: "requirements", label: "Требования", description: "Требования сначала извлекаются, затем отдельно проверяются человеком.", stages: ["wf-stage-2", "wf-stage-3"] },
      { id: "logic", label: "Проверка аналитики", description: "Logic Review и ручная проверка найденных проблем остаются отдельными этапами.", stages: ["wf-stage-4", "wf-stage-5"] },
      { id: "remediation", label: "Исправление БА / СА", description: "Подтверждённая проблема возвращается в аналитику и не передаётся в Test Design.", stages: ["wf-stage-5a"] },
      { id: "coverage", label: "Тестовое покрытие", description: "Генерация покрытия и финальная проверка с экспортом выполняются отдельно.", stages: ["wf-stage-6", "wf-stage-7"] }
    ],
    stages: [
      { id: "wf-stage-1", number: "1", title: "Артефакты БА и СА", syncKey: "stage-artifacts", group: "documents", nodes: ["wf-documents", "wf-doc2rag", "wf-context"], happens: "Документы БА и СА обрабатываются через Doc2RAG, разбиваются на части и используются для формирования контекста текущей Story.", result: "Релевантный структурированный контекст для дальнейшего анализа." },
      { id: "wf-stage-2", number: "2", title: "Извлечение требований", syncKey: "stage-requirements-extraction", group: "requirements", nodes: ["wf-context-input", "wf-requirements-llm", "wf-requirements-result"], happens: "LLM анализирует подготовленный контекст, извлекает требования из документов и структурирует их для проверки пользователем.", result: "Набор извлечённых требований." },
      { id: "wf-stage-3", number: "3", title: "Проверка требований", syncKey: "stage-requirements-review", group: "requirements", nodes: ["wf-requirements-review-input", "wf-requirements-review", "wf-approved-requirements"], happens: "Аналитик или QA проверяет каждое требование, принимает релевантные, исключает ошибочные или нерелевантные и при необходимости добавляет комментарии.", result: "Проверенный набор утверждённых требований." },
      { id: "wf-stage-4", number: "4", title: "Проверка логики и полноты", syncKey: "stage-logic-review", group: "logic", nodes: ["wf-approved-input", "wf-logic-llm", "wf-findings"], happens: "LLM анализирует утверждённые требования на противоречия, неоднозначности, пробелы и проблемы бизнес-логики.", result: "Список потенциальных проблем аналитики для ручной проверки." },
      { id: "wf-stage-5", number: "5", title: "Проверка результатов", syncKey: "stage-findings-review", group: "logic", nodes: ["wf-findings-review-input", "wf-findings-review", "wf-clean-state"], happens: "Аналитик проверяет каждую найденную проблему и решает, подтвердить её или исключить.", result: "Либо отсутствие подтверждённых проблем, либо переход к исправлению БА / СА.", condition: "К подготовке тестового покрытия можно перейти только после проверки всех найденных проблем и при отсутствии подтверждённых проблем аналитики." },
      { id: "wf-stage-5a", number: "5a", title: "Исправление аналитики", syncKey: "stage-remediation", group: "remediation", nodes: ["wf-confirmed-finding", "wf-remediation", "wf-updated-documents"], happens: "Подтверждённая проблема исправляется в исходных документах БА или СА, после чего документы обновляются в Run.", result: "Обновлённые входные документы.", condition: "После исправления анализ начинается повторно с извлечения требований. Подтверждённая проблема не передаётся в Test Design.", returnLabel: "Возврат к извлечению требований" },
      { id: "wf-stage-6", number: "6", title: "Подготовка тестового покрытия", syncKey: "stage-test-design", group: "coverage", nodes: ["wf-approved-test-input", "wf-test-design", "wf-test-coverage"], happens: "LLM создаёт тест-кейсы на основе утверждённых требований и формирует матрицу покрытия.", result: "Тестовое покрытие, связанное с требованиями.", condition: "Этап доступен только после успешной проверки аналитики." },
      { id: "wf-stage-7", number: "7", title: "Финальная проверка и экспорт", syncKey: "stage-test-review", group: "coverage", nodes: ["wf-test-review-input", "wf-test-review", "wf-export"], happens: "QA проверяет тест-кейсы, при необходимости дорабатывает их и подтверждает результат.", result: "Проверенное тестовое покрытие, которое можно экспортировать в матрицу покрытия или Excel для Test IT." }
    ],
    nodes: {
      "wf-documents": { label: "Документы БА / СА", kind: "source", syncKey: "documents" },
      "wf-doc2rag": { label: "Doc2RAG", detail: "контекст документов", kind: "system", syncKey: "doc2rag" },
      "wf-context": { label: "Контекст Story", kind: "result", syncKey: "context" },
      "wf-context-input": { label: "Контекст", kind: "source", syncKey: "requirements-context" },
      "wf-requirements-llm": { label: "LLM / OpenRouter", kind: "system", syncKey: "requirements-llm" },
      "wf-requirements-result": { label: "Извлечённые требования", kind: "result", syncKey: "requirements-result" },
      "wf-requirements-review-input": { label: "Извлечённые требования", kind: "source", syncKey: "requirements-review-input" },
      "wf-requirements-review": { label: "Review человеком", detail: "принять / исключить", kind: "human", syncKey: "requirements-review" },
      "wf-approved-requirements": { label: "Утверждённые требования", kind: "approved", syncKey: "approved-requirements" },
      "wf-approved-input": { label: "Утверждённые требования", kind: "source", syncKey: "logic-input" },
      "wf-logic-llm": { label: "LLM / OpenRouter", kind: "system", syncKey: "logic-llm" },
      "wf-findings": { label: "Результаты проверки", kind: "result", syncKey: "findings" },
      "wf-findings-review-input": { label: "Результаты проверки", kind: "source", syncKey: "findings-review-input" },
      "wf-findings-review": { label: "Review человеком", detail: "подтвердить / исключить", kind: "human", syncKey: "findings-review" },
      "wf-clean-state": { label: "Нет подтверждённых проблем", kind: "approved", syncKey: "clean-state" },
      "wf-confirmed-finding": { label: "Подтверждённая проблема", kind: "remediation", syncKey: "confirmed-finding" },
      "wf-remediation": { label: "Исправить БА / СА", kind: "remediation", syncKey: "remediation" },
      "wf-updated-documents": { label: "Обновить документы", kind: "remediation", syncKey: "updated-documents" },
      "wf-approved-test-input": { label: "Утверждённые требования", kind: "source", syncKey: "test-input" },
      "wf-test-design": { label: "LLM / OpenRouter", detail: "Test Design", kind: "system", syncKey: "test-design" },
      "wf-test-coverage": { label: "Тестовое покрытие", kind: "result", syncKey: "test-coverage" },
      "wf-test-review-input": { label: "Тестовое покрытие", kind: "source", syncKey: "test-review-input" },
      "wf-test-review": { label: "Review человеком", kind: "human", syncKey: "test-review" },
      "wf-export": { label: "Экспорт результатов", kind: "approved", syncKey: "export" }
    }
  },
  tech: `
    <p class="tech-lead">Desktop-приложение использует тот же web-интерфейс внутри локального приложения.</p>
    <div class="tech-grid">
      <article><span>Desktop</span><b>Python 3</b><b>FastAPI</b><b>Uvicorn</b><b>pywebview</b><b>WebView2</b></article>
      <article><span>Интерфейс</span><b>HTML</b><b>CSS</b><b>JavaScript</b><b>Jinja2</b></article>
      <article><span>Интеграции</span><b>Doc2RAG API</b><b>OpenRouter API</b><b>Test IT</b></article>
      <article><span>Поставка и хранение</span><b>PyInstaller</b><b>Windows portable</b><b>локальный DATA_ROOT</b><b>Windows DPAPI</b></article>
    </div>`,
  techMeta: { id: "tech" },
  discussion: { label: "Обсуждение продукта", url: null }
};
