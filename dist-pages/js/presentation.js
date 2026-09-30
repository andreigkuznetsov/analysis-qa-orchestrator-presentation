(function () {
  "use strict";

  const data = window.PRESENTATION_DATA;
  const stage = document.getElementById("stage");
  const menu = document.getElementById("slide-menu");
  const openMenu = document.getElementById("open-menu");
  const openTech = document.getElementById("open-tech");
  const techOverlay = document.getElementById("tech-overlay");
  const closeTech = document.getElementById("close-tech");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const currentNumber = document.getElementById("current-number");
  const totalNumber = document.getElementById("total-number");
  const screenTitle = document.getElementById("screen-title");
  const progress = document.getElementById("progress");
  const rulesOverlay = document.getElementById("rules-overlay");
  const closeRules = document.getElementById("close-rules");
  const rulesCategories = document.getElementById("rules-categories");
  const rulesList = document.getElementById("rules-list");
  const rulesData = window.ORCHESTRATOR_RULES;
  const transcriptPanel = document.getElementById("transcript-panel");
  const transcriptContent = document.getElementById("transcript-content");
  const closeTranscript = document.getElementById("close-transcript");
  const audioStart = document.getElementById("audio-start");
  const audioControls = document.querySelector(".audio-controls");
  const audioPlay = document.getElementById("audio-play");
  const audioReplay = document.getElementById("audio-replay");
  const audioMute = document.getElementById("audio-mute");
  const audioTranscript = document.getElementById("audio-transcript");
  const audioAutoplay = document.getElementById("audio-autoplay");
  const audioRate = document.getElementById("audio-rate");
  const audioStatus = document.getElementById("audio-status");
  let current = 0;
  let activeRuleCategory = rulesData.categories[0].id;
  let slideSyncHandler = () => {};
  let audioController;
  let audioState = { mode: "manual", playback: "stopped" };
  let lockMessageTimer;
  let showSortDemo = () => {};
  let showSortDemoFrame = () => {};
  const autoLockMessage = "Для ручного управления презентацией отключите режим «Авто».";

  function showAutoLockMessage() {
    audioStatus.textContent = autoLockMessage;
    clearTimeout(lockMessageTimer);
    lockMessageTimer = setTimeout(() => {
      if (audioStatus.textContent === autoLockMessage) audioStatus.textContent = audioController?.error || "";
    }, 2600);
  }

  function handleTrackStart(track, screenId) {
    if (screenId === "slide-08") {
      const cue = window.SORT_1998_DEMO_TTS.cueTracks.find(item => item.audioTrackId === track.id);
      transcriptContent.textContent = cue?.ttsText ?? data.slides[current].transcript;
      if (cue && audioController?.autoplay) showSortDemoFrame(cue.frame);
      return;
    }
    if (!audioController?.autoplay || screenId !== "slide-10") return;
    if (track.id === "slide-10-approval") setRules(true, true);
    else if (track.id === "slide-10-application") setRules(false, true);
  }

  function blockInAuto(event) {
    if (!audioController?.autoplay) return false;
    event?.preventDefault();
    event?.stopPropagation();
    showAutoLockMessage();
    return true;
  }

  const decisionResults = {
    requirement: {
      accept: ["Использовать дальше", "Требование входит в проверенный набор."],
      exclude: ["Не входит в проверенный набор", "Требование исключается из дальнейшего процесса."]
    },
    finding: {
      exclude: ["Можно продолжить", "Проблема не подтверждена человеком."],
      accept: ["Исправить БА / СА", "Проблема подтверждена: документы нужно исправить, затем повторить анализ."]
    }
  };

  const roleDetails = {
    customer: ["Бизнес-заказчик", ["Раньше получает обратную связь по противоречиям, пробелам и неоднозначностям."]],
    sdm: ["Service Delivery Manager", ["Получает более понятное состояние Story.", "Видит, что уже проверено и где есть проблема.", "Понимает, можно ли переходить дальше."]],
    analyst: ["БА / СА", ["Получает структурированный набор требований.", "Видит противоречия, неоднозначности, пробелы и расхождения между БА и СА.", "Подтверждённые проблемы возвращаются в исходную аналитику."]],
    developer: ["Разработчик", ["Получает проверенную и согласованную основу для реализации."]],
    qa: ["QA", ["Работает с проверенными требованиями, тест-кейсами и матрицей покрытия.", "Видит связи тест-кейсов с требованиями и требования без покрытия."]],
    support: ["Пострелизная поддержка", ["Сохраняет прослеживаемость.", "Может восстановить, какое поведение было заложено и какими тестами оно проверялось."]]
  };

  function clamp(value) {
    return Math.max(0, Math.min(data.slides.length - 1, value));
  }

  function render(index, updateHash = true) {
    if (rulesOverlay.dataset.autoDemo === "true") setRules(false, true);
    current = clamp(index);
    const slide = data.slides[current];
    stage.className = `stage ${slide.className || ""}`;
    stage.innerHTML = `<div class="slide-canvas">${slide.html}</div>`;
    stage.dataset.slideId = slide.id;
    currentNumber.textContent = String(current + 1).padStart(2, "0");
    totalNumber.textContent = String(data.slides.length).padStart(2, "0");
    screenTitle.textContent = slide.title;
    transcriptContent.textContent = slide.transcript;
    transcriptPanel.dataset.slideId = slide.id;
    progress.style.width = `${((current + 1) / data.slides.length) * 100}%`;
    prev.disabled = current === 0;
    next.disabled = current === data.slides.length - 1;
    menu.querySelectorAll("button").forEach((button, i) => {
      button.classList.toggle("active", i === current);
      if (i === current) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (updateHash) history.replaceState(null, "", `#${current + 1}`);
    stage.focus({ preventScroll: true });
    bindSlideInteractions(slide.id);
    audioController?.loadScreen(slide.id);
  }

  function bindSlideInteractions(slideId) {
    slideSyncHandler = syncKey => {
      stage.querySelectorAll(".audio-sync-active").forEach(element => element.classList.remove("audio-sync-active"));
      if (!syncKey) return;
      stage.querySelector(`[data-sync-key='${syncKey}']`)?.classList.add("audio-sync-active");
    };
    showSortDemo = () => {};
    showSortDemoFrame = () => {};
    if (slideId === "slide-08") {
      const demo = window.SORT_1998_DEMO;
      const intro = stage.querySelector("#sort-demo-intro");
      const player = stage.querySelector("#sort-demo");
      const image = stage.querySelector("#sort-demo-image");
      const count = stage.querySelector("#sort-demo-count");
      const title = stage.querySelector("#sort-demo-title");
      const group = stage.querySelector("#sort-demo-group");
      const frameProgress = stage.querySelector("#sort-demo-progress");
      const focusView = stage.querySelector("#sort-demo-focus");
      const focusCrop = stage.querySelector("#sort-demo-focus-crop");
      const focusLabel = stage.querySelector("#sort-demo-focus-label");
      const previousFrame = stage.querySelector("#sort-demo-prev");
      const nextFrame = stage.querySelector("#sort-demo-next");
      const restart = stage.querySelector("#sort-demo-restart");
      let frameIndex = 0;

      const renderFrame = (nextIndex, force = false) => {
        const clampedIndex = Math.max(0, Math.min(demo.frames.length - 1, nextIndex));
        if (!force && frameIndex === clampedIndex && !player.hidden) return;
        frameIndex = clampedIndex;
        const frame = demo.frames[frameIndex];
        const frameGroup = demo.groups.find(item => item.id === frame.group);
        image.src = frame.image;
        image.alt = `SORT-1998: ${frame.title}`;
        count.textContent = `${String(frame.order).padStart(2, "0")} / ${demo.frames.length}`;
        title.textContent = frame.title;
        group.textContent = frameGroup.label;
        frameProgress.style.width = `${(frame.order / demo.frames.length) * 100}%`;
        previousFrame.disabled = frameIndex === 0;
        nextFrame.disabled = frameIndex === demo.frames.length - 1;
        focusView.hidden = !frame.focus;
        player.classList.toggle("has-focus-view", Boolean(frame.focus));
        if (frame.focus) {
          focusView.dataset.kind = frame.focus.kind;
          focusLabel.textContent = frame.focus.label;
          focusCrop.style.backgroundImage = `url("${frame.image}")`;
          focusCrop.style.backgroundSize = frame.focus.zoomAxis === "height"
            ? `auto ${frame.focus.zoom * 100}%`
            : `${frame.focus.zoom * 100}% auto`;
          focusCrop.style.backgroundPosition = `${frame.focus.x} ${frame.focus.y}`;
        } else {
          focusView.removeAttribute("data-kind");
          focusLabel.textContent = "";
          focusCrop.style.backgroundImage = "";
        }
      };

      showSortDemo = () => {
        intro.hidden = true;
        player.hidden = false;
        renderFrame(0, true);
        player.focus({ preventScroll: true });
      };
      showSortDemoFrame = frameNumber => {
        intro.hidden = true;
        player.hidden = false;
        renderFrame(frameNumber - 1);
      };
      stage.querySelector("#sort-demo-launch").addEventListener("click", showSortDemo);
      previousFrame.addEventListener("click", () => renderFrame(frameIndex - 1));
      nextFrame.addEventListener("click", () => renderFrame(frameIndex + 1));
      restart.addEventListener("click", () => renderFrame(0));
      player.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        if (audioController?.autoplay) { blockInAuto(event); return; }
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "ArrowLeft") renderFrame(frameIndex - 1);
        else if (event.key === "ArrowRight") renderFrame(frameIndex + 1);
        else if (event.key === "Home") renderFrame(0);
        else renderFrame(demo.frames.length - 1);
      });
      renderFrame(0);
    }
    if (slideId === "slide-04") {
      const buttons = [...stage.querySelectorAll("[data-workflow-step]")];
      const description = stage.querySelector("#workflow-description");
      const figure = stage.querySelector("#workflow-figure");
      const workflow = stage.querySelector("#native-workflow");
      const model = data.workflow;
      const nodeMarkup = nodeId => {
        const node = model.nodes[nodeId];
        return `<article id="${nodeId}" class="wf-node wf-node-${node.kind}" data-node-id="${nodeId}" data-sync-key="${node.syncKey}"><b>${node.label}</b>${node.detail ? `<small>${node.detail}</small>` : ""}</article>`;
      };
      const edge = (type = "next") => `<svg class="wf-edge wf-edge-${type}" viewBox="0 0 36 18" preserveAspectRatio="none" aria-hidden="true"><path d="M1 9 H30 M25 3 L31 9 L25 15"/></svg>`;
      const detailsMarkup = workflowStage => `<div class="wf-stage-details" data-stage-description="${workflowStage.id}" data-sync-key="${workflowStage.syncKey}-description"><p><b>Что происходит</b><span>${workflowStage.happens}</span></p><p><b>Результат</b><span>${workflowStage.result}</span></p>${workflowStage.condition ? `<p class="wf-stage-condition"><b>Условие перехода</b><span>${workflowStage.condition}</span></p>` : ""}</div>`;
      const stageMarkup = (workflowStage, focus = false) => `<section id="${workflowStage.id}" class="wf-stage wf-stage-${workflowStage.number.replace('a', '-a')}${workflowStage.group === "remediation" ? " wf-stage-remediation" : ""}${workflowStage.condition ? " wf-stage-has-condition" : ""}" data-workflow-stage="${workflowStage.id}" data-workflow-group="${workflowStage.group}" data-sync-key="${workflowStage.syncKey}"><header><span>${workflowStage.number}</span><b>${workflowStage.title}</b></header><div class="wf-stage-content"><div class="wf-node-row">${workflowStage.nodes.map((id, index) => `${index ? edge() : ""}${nodeMarkup(id)}`).join("")}</div>${workflowStage.returnLabel ? `<div class="wf-return" aria-label="${workflowStage.returnLabel}"><b class="wf-return-marker" aria-label="Этап 2">2</b><svg viewBox="0 0 560 34" preserveAspectRatio="none" aria-hidden="true"><path d="M550 28 H24 Q6 28 6 12 V5 M1 11 L6 4 L12 11"/></svg><span>${workflowStage.returnLabel}</span></div>` : ""}${focus ? detailsMarkup(workflowStage) : ""}</div></section>`;
      const groupMarkup = group => `<section class="wf-focus-group wf-focus-group-${group.id}" data-workflow-group="${group.id}" data-sync-key="group-${group.id}">${group.stages.map(stageId => stageMarkup(model.stages.find(item => item.id === stageId), true)).join("")}</section>`;
      const renderWorkflow = active => {
        workflow.classList.toggle("has-focus", Boolean(active));
        workflow.innerHTML = active
          ? `<div class="wf-focus-head"><button type="button" data-workflow-reset aria-label="Вернуться к полной схеме">Показать всю схему</button></div>${groupMarkup(model.groups.find(group => group.id === active), true)}`
          : `<div class="wf-overview">${model.stages.map(workflowStage => stageMarkup(workflowStage)).join("")}</div>`;
        workflow.querySelector("[data-workflow-reset]")?.addEventListener("click", () => select(null));
      };
      const select = (key, toggle = true) => {
        const currentKey = figure.dataset.step || null;
        const nextKey = toggle && key === currentKey ? null : key;
        const group = model.groups.find(item => item.id === nextKey);
        buttons.forEach(button => {
          const active = button.dataset.workflowStep === nextKey;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        if (nextKey) figure.dataset.step = nextKey;
        else delete figure.dataset.step;
        description.innerHTML = group ? `<b>${group.label}</b><span>${group.description}</span>` : `<b>Полный workflow</b><span>Выберите этап для увеличения. Повторный выбор или Escape возвращает полную схему.</span>`;
        renderWorkflow(nextKey);
      };
      buttons.forEach((button, index) => {
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => select(button.dataset.workflowStep));
        button.addEventListener("keydown", event => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === "Escape") return select(null);
          const targetIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[targetIndex].focus();
        });
      });
      renderWorkflow(null);
      select(null);
      slideSyncHandler = syncKey => {
        stage.querySelectorAll(".audio-sync-active").forEach(element => element.classList.remove("audio-sync-active"));
        const section = {
          "section-documents": "documents",
          "section-requirements": "requirements",
          "section-logic": "logic",
          "section-remediation": "remediation",
          "section-coverage": "coverage"
        }[syncKey] || null;
        select(section, false);
      };
    }

    if (slideId === "slide-05") {
      const decisionSetters = {};
      const resetDecisions = () => {
        stage.querySelectorAll("[data-decision-card]").forEach(card => {
          card.querySelectorAll("[data-decision]").forEach(button => {
            button.classList.remove("active");
            button.setAttribute("aria-pressed", "false");
          });
          delete card.dataset.choice;
          card.querySelector(".decision-result").innerHTML = "<small>Результат решения</small><strong>Выберите решение</strong><span>Принять или исключить результат ручной проверки.</span>";
        });
      };
      stage.querySelectorAll("[data-decision-card]").forEach(card => {
        const type = card.dataset.decisionCard;
        const result = card.querySelector(".decision-result");
        const choose = value => {
          card.querySelectorAll("[data-decision]").forEach(button => {
            const active = button.dataset.decision === value;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
          });
          result.innerHTML = `<small>Результат решения</small><strong>${decisionResults[type][value][0]}</strong><span>${decisionResults[type][value][1]}</span>`;
          card.dataset.choice = value;
        };
        decisionSetters[type] = choose;
        card.querySelectorAll("[data-decision]").forEach(button => button.addEventListener("click", () => choose(button.dataset.decision)));
      });
      resetDecisions();
      slideSyncHandler = syncKey => {
        stage.querySelectorAll(".audio-sync-active").forEach(element => element.classList.remove("audio-sync-active"));
        const state = {
          "requirement-accept": ["requirement", "accept"],
          "requirement-exclude": ["requirement", "exclude"],
          "problem-exclude": ["finding", "exclude"],
          "problem-accept": ["finding", "accept"]
        }[syncKey];
        if (!state) return resetDecisions();
        const [type, choice] = state;
        decisionSetters[type](choice);
        stage.querySelector(`[data-decision-card='${type}']`)?.classList.add("audio-sync-active");
      };
    }

    if (slideId === "slide-06") {
      const buttons = [...stage.querySelectorAll("[data-role]")];
      const detail = stage.querySelector("#role-detail");
      const resetRoles = () => {
        buttons.forEach((button, index) => {
          button.classList.remove("active");
          button.setAttribute("aria-selected", "false");
          button.tabIndex = index === 0 ? 0 : -1;
        });
        detail.innerHTML = "<span class=\"phase\">Эффект для команды</span><h3>Результат для всех ролей</h3><ul><li>Выберите роль, чтобы посмотреть её результат.</li></ul>";
      };
      const select = role => {
        buttons.forEach(button => {
          const active = button.dataset.role === role;
          button.classList.toggle("active", active);
          button.setAttribute("aria-selected", String(active));
          button.tabIndex = active ? 0 : -1;
        });
        const [title, items] = roleDetails[role];
        detail.innerHTML = `<span class="phase">Эффект для роли</span><h3>${title}</h3><ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
      };
      buttons.forEach((button, index) => {
        button.addEventListener("click", () => select(button.dataset.role));
        button.addEventListener("keydown", event => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const offset = event.key === "ArrowRight" ? 1 : -1;
          const target = buttons[(index + offset + buttons.length) % buttons.length];
          select(target.dataset.role); target.focus();
        });
      });
      resetRoles();
      slideSyncHandler = syncKey => {
        const roleMap = { business: "customer", sdm: "sdm", "ba-sa": "analyst", developer: "developer", qa: "qa", support: "support" };
        if (roleMap[syncKey]) select(roleMap[syncKey]);
        else resetRoles();
      };
    }

    if (slideId === "slide-10") {
      stage.querySelector("#open-rules").addEventListener("click", () => setRules(true, false));
      slideSyncHandler = syncKey => {
        stage.querySelectorAll(".audio-sync-active").forEach(element => element.classList.remove("audio-sync-active"));
        const selector = { "rules-origin": ".rule-process.discovery", "human-approval": ".human-approval", "rules-application": ".rule-process.application", "formulated-rules": ".rules-cta" }[syncKey];
        if (selector) stage.querySelector(selector)?.classList.add("audio-sync-active");
      };
    }

    if (slideId === "questions") {
      const discussion = stage.querySelector(".discussion-link");
      if (discussion) {
        discussion.firstChild.textContent = `${data.discussion.label} `;
        if (data.discussion.url) {
          discussion.disabled = false;
          discussion.removeAttribute("aria-disabled");
          discussion.title = "";
          discussion.addEventListener("click", () => window.open(data.discussion.url, "_blank", "noopener"));
        }
      }
    }
  }

  data.slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>${slide.title}`;
    button.addEventListener("click", event => { if (blockInAuto(event)) return; render(index); setMenu(false); });
    menu.appendChild(button);
  });

  function setMenu(force) {
    const shouldOpen = typeof force === "boolean" ? force : menu.hidden;
    menu.hidden = !shouldOpen;
    openMenu.setAttribute("aria-expanded", String(shouldOpen));
  }

  function setTech(open) {
    techOverlay.hidden = !open;
    techOverlay.dataset.slideId = data.techMeta.id;
    document.body.classList.toggle("overlay-open", open);
    if (open) {
      transcriptContent.textContent = data.techMeta.transcript;
      transcriptPanel.dataset.slideId = data.techMeta.id;
      audioController?.loadScreen("tech");
    } else {
      transcriptContent.textContent = data.slides[current].transcript;
      transcriptPanel.dataset.slideId = data.slides[current].id;
      audioController?.loadScreen(data.slides[current].id);
    }
    if (open) closeTech.focus(); else openTech.focus();
  }

  function renderRulesCategory(categoryId) {
    activeRuleCategory = categoryId;
    const category = rulesData.categories.find(item => item.id === categoryId);
    rulesCategories.querySelectorAll("button").forEach(button => {
      const active = button.dataset.category === categoryId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const rules = category.ruleNumbers.map(number => rulesData.rules.find(rule => rule.number === number));
    rulesList.innerHTML = `<header><span class="eyebrow">${rules.length} правил</span><h3>${category.title}</h3><p>${category.summary}</p></header>${rules.map(rule => `<article class="rule-item"><button type="button" aria-expanded="false"><span>${String(rule.number).padStart(2, "0")}</span><b>${rule.title}</b><i>+</i></button><div class="rule-body" hidden><p>${rule.requirement}</p><div class="examples"><section><small>Хорошо</small><p>${rule.good}</p></section><section><small>Плохо</small><p>${rule.bad}</p></section></div><details><summary>Статусы проверенных наборов</summary><p><b>Проверенный набор 1:</b> ${rule.sort1997}<br><b>Проверенный набор 2:</b> ${rule.sort1998}</p></details></div></article>`).join("")}`;
    rulesList.querySelectorAll(".rule-item > button").forEach(button => button.addEventListener("click", () => {
      const body = button.nextElementSibling;
      const open = body.hidden;
      body.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      button.querySelector("i").textContent = open ? "−" : "+";
    }));
  }

  function setRules(open, autoDemo = false) {
    rulesOverlay.hidden = !open;
    if (open && autoDemo) rulesOverlay.dataset.autoDemo = "true";
    else delete rulesOverlay.dataset.autoDemo;
    rulesOverlay.setAttribute("aria-readonly", String(open && autoDemo));
    document.body.classList.toggle("overlay-open", open);
    if (open) {
      renderRulesCategory(activeRuleCategory);
      if (!autoDemo) closeRules.focus();
    } else if (!autoDemo) stage.querySelector("#open-rules")?.focus();
  }

  rulesData.categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.category = category.id;
    button.innerHTML = `<span>${category.ruleNumbers.length}</span><b>${category.title}</b>`;
    button.addEventListener("click", () => renderRulesCategory(category.id));
    rulesCategories.appendChild(button);
  });

  document.getElementById("tech-content").innerHTML = data.tech;
  prev.addEventListener("click", event => { if (!blockInAuto(event)) render(current - 1); });
  next.addEventListener("click", event => { if (!blockInAuto(event)) render(current + 1); });
  openMenu.addEventListener("click", event => { if (!blockInAuto(event)) setMenu(); });
  openTech.addEventListener("click", event => { if (!blockInAuto(event)) setTech(true); });
  closeTech.addEventListener("click", () => setTech(false));
  closeRules.addEventListener("click", () => { if (rulesOverlay.dataset.autoDemo !== "true") setRules(false, false); });
  rulesOverlay.addEventListener("click", event => { if (event.target === rulesOverlay && rulesOverlay.dataset.autoDemo !== "true") setRules(false, false); });
  rulesOverlay.addEventListener("click", event => {
    if (rulesOverlay.dataset.autoDemo === "true") { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  rulesOverlay.addEventListener("wheel", event => {
    if (rulesOverlay.dataset.autoDemo === "true") event.preventDefault();
  }, { capture: true, passive: false });
  techOverlay.addEventListener("click", event => { if (event.target === techOverlay) setTech(false); });
  document.querySelector("[data-go='0']").addEventListener("click", event => { if (!blockInAuto(event)) render(0); });

  function updateAudioControls(state) {
    audioState = state;
    audioControls.classList.toggle("is-playing", state.playing);
    audioControls.classList.toggle("is-muted", state.muted);
    audioPlay.setAttribute("aria-label", state.playing ? "Приостановить озвучку" : "Воспроизвести озвучку");
    audioPlay.title = state.playing ? "Пауза" : "Воспроизвести";
    audioMute.setAttribute("aria-label", state.muted ? "Включить звук" : "Выключить звук");
    audioMute.title = state.muted ? "Включить звук" : "Выключить звук";
    audioAutoplay.setAttribute("aria-pressed", String(state.autoplay));
    audioAutoplay.setAttribute("aria-label", state.autoplay ? "Выключить автопросмотр" : "Включить автопросмотр");
    audioTranscript.setAttribute("aria-expanded", String(state.transcriptOpen));
    audioRate.value = String(state.playbackRate);
    document.body.classList.toggle("is-auto-mode", state.mode === "auto");
    document.body.classList.toggle("is-auto-playing", state.mode === "auto" && state.playback === "playing");
    prev.disabled = state.mode === "manual" && current === 0;
    next.disabled = state.mode === "manual" && current === data.slides.length - 1;
    [prev, next, openMenu, openTech, audioReplay, audioMute, audioTranscript, audioRate, document.getElementById("fullscreen"), document.querySelector("[data-go='0']"), audioStart].forEach(control => {
      control?.setAttribute("aria-disabled", String(state.mode === "auto"));
      control?.classList.toggle("auto-locked", state.mode === "auto");
    });
    transcriptPanel.hidden = !state.transcriptOpen;
    audioStatus.textContent = state.error || "";
    audioStart.textContent = state.enabled ? "Озвучка включена" : "Начать презентацию";
  }

  audioController = new window.PresentationAudioController({
    manifest: window.PRESENTATION_AUDIO_MANIFEST,
    onAdvance: () => {
      if (current >= data.slides.length - 1) {
        audioController.setAutoplay(false);
        return;
      }
      render(current + 1);
      audioController.play();
    },
    onComplete: screenId => {
      if (screenId !== "slide-08" || stage.dataset.slideId !== "slide-08") return true;
      if (audioController.autoplay) return true;
      showSortDemo();
      return false;
    },
    onSync: syncKey => {
      slideSyncHandler(syncKey);
    },
    onTrackStart: handleTrackStart,
    onState: updateAudioControls,
    onError: message => { audioStatus.textContent = message; }
  });

  audioStart.addEventListener("click", event => { if (!blockInAuto(event)) audioController.play(); });
  audioPlay.addEventListener("click", () => audioController.togglePlay());
  audioReplay.addEventListener("click", event => { if (!blockInAuto(event)) audioController.replay(); });
  audioMute.addEventListener("click", event => { if (!blockInAuto(event)) audioController.setMuted(!audioController.muted); });
  audioAutoplay.addEventListener("click", () => {
    if (audioController.autoplay) {
      if (rulesOverlay.dataset.autoDemo === "true") setRules(false, true);
      audioController.setAutoplay(false);
      audioController.pause();
      return;
    }
    setMenu(false);
    setRules(false, false);
    if (!techOverlay.hidden) setTech(false);
    if (audioController.transcriptOpen) audioController.setTranscriptOpen(false);
    audioController.setAutoplay(true);
    render(current, false);
    audioController.play();
  });
  audioTranscript.addEventListener("click", event => { if (!blockInAuto(event)) audioController.setTranscriptOpen(!audioController.transcriptOpen); });
  audioRate.addEventListener("change", event => {
    if (blockInAuto(event)) { audioRate.value = String(audioController.playbackRate); return; }
    audioController.setPlaybackRate(audioRate.value);
  });
  closeTranscript.addEventListener("click", () => { audioController.setTranscriptOpen(false); audioTranscript.focus(); });

  const fullscreenButton = document.getElementById("fullscreen");
  function syncFullscreenControl() {
    const active = Boolean(document.fullscreenElement);
    const label = active ? "Выйти из полноэкранного режима" : "Перейти в полноэкранный режим";
    fullscreenButton.textContent = active ? "↓" : "↗";
    fullscreenButton.setAttribute("aria-label", label);
    fullscreenButton.title = label;
  }

  fullscreenButton.addEventListener("click", async event => {
    if (blockInAuto(event)) return;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) { /* Fullscreen may be unavailable on file:// in some browsers. */ }
  });
  document.addEventListener("fullscreenchange", syncFullscreenControl);
  syncFullscreenControl();

  document.addEventListener("keydown", event => {
    if (!transcriptPanel.hidden && event.key === "Escape") {
      audioController.setTranscriptOpen(false);
      audioTranscript.focus();
      return;
    }
    if (!rulesOverlay.hidden) {
      if (rulesOverlay.dataset.autoDemo === "true") event.preventDefault();
      else if (event.key === "Escape") setRules(false, false);
      return;
    }
    if (!techOverlay.hidden) {
      if (event.key === "Escape") setTech(false);
      return;
    }
    if (!menu.hidden && event.key === "Escape") { setMenu(false); return; }
    if (audioController.autoplay && ["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", "Space"].includes(event.code === "Space" ? "Space" : event.key)) {
      blockInAuto(event);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.code === "Space") {
      event.preventDefault(); render(current + 1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault(); render(current - 1);
    } else if (event.key === "Home") render(0);
    else if (event.key === "End") render(data.slides.length - 1);
    else if (event.key === "Escape") setMenu(false);
  });

  stage.addEventListener("click", event => {
    if (audioState.mode === "auto" && event.target.closest("button, a, input, select")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showAutoLockMessage();
    }
  }, true);

  const hashIndex = Number.parseInt(location.hash.slice(1), 10) - 1;
  render(Number.isFinite(hashIndex) ? hashIndex : 0, false);
}());
