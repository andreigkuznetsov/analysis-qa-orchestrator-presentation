(function () {
  "use strict";

  const titles = [
    "Пустой Run",
    "Добавление системной аналитики",
    "Добавление бизнес-аналитики",
    "Все документы добавлены",
    "Story и область задачи",
    "Документы подготовлены",
    "Отправка в Doc2RAG",
    "Все документы отправлены",
    "Запуск извлечения требований",
    "Требования извлечены",
    "Карта области задачи",
    "Требование — принять",
    "Требование — исключить",
    "Проверка требований завершена",
    "Запуск проверки логики",
    "Найдены проблемы",
    "Проблема — принять",
    "Проблема — исключить",
    "Две проблемы подтверждены",
    "Исправленные документы и повторное извлечение",
    "Повторная ручная проверка требований",
    "Повторная проверка логики",
    "Подтверждённых проблем больше нет",
    "Запуск Test Design",
    "Тестовое покрытие сформировано",
    "Тест-кейс — принять",
    "Тест-кейс — исключить"
  ];

  const groups = [
    { id: "start-and-documents", label: "Старт и документы", from: 1, to: 8 },
    { id: "requirements-first-pass", label: "Первичная проверка требований", from: 9, to: 14 },
    { id: "logic-first-pass", label: "Первичная проверка логики", from: 15, to: 19 },
    { id: "analytics-fix-and-rerun", label: "Исправление аналитики и повторный запуск", from: 20, to: 23 },
    { id: "test-coverage", label: "Тестовое покрытие", from: 24, to: 27 }
  ];

  const focusViews = {
    12: { kind: "review", label: "Ручная проверка требования", x: "66%", y: "100%", zoom: 1.55 },
    13: { kind: "review", label: "Ручная проверка требования", x: "66%", y: "100%", zoom: 1.55 },
    15: { kind: "modal", label: "Запуск проверки логики", x: "50%", y: "50%", zoom: 1.6, zoomAxis: "height" },
    17: { kind: "review", label: "Ручная проверка проблемы", x: "67%", y: "100%", zoom: 1.55 },
    18: { kind: "review", label: "Ручная проверка проблемы", x: "67%", y: "100%", zoom: 1.55 },
    26: { kind: "review", label: "Ручная проверка тест-кейса", x: "67%", y: "100%", zoom: 1.55 },
    27: { kind: "review", label: "Ручная проверка тест-кейса", x: "67%", y: "100%", zoom: 1.55 }
  };

  window.SORT_1998_DEMO = {
    id: "sort-1998",
    groups,
    frames: titles.map((title, index) => {
      const order = index + 1;
      const group = groups.find(item => order >= item.from && order <= item.to);
      return {
        id: `sort-1998-${String(order).padStart(2, "0")}`,
        image: `assets/demo/sort-1998/${order}.png`,
        title,
        group: group.id,
        caption: null,
        focus: focusViews[order] || null,
        order,
        narratorText: null,
        ttsText: null
      };
    })
  };
}());
