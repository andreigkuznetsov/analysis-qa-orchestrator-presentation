from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = [(1366, 768), (1600, 900), (1920, 1080)]


def assert_no_overflow(page, label):
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), f"Horizontal overflow: {label}"


def validate_browser():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors = []
            page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: errors.append(str(error)))

            page.goto(f"{(ROOT / 'index.html').as_uri()}#1", wait_until="networkidle")
            assert page.locator("#audio-transcript").is_hidden()
            smartds_logo = page.locator(".hero-client img")
            assert smartds_logo.get_attribute("src") == "assets/logo-smartds.svg"
            assert smartds_logo.evaluate("image => image.complete && image.naturalWidth === 266 && image.naturalHeight === 56")
            nodes = page.locator(".hero-flow .flow-node")
            assert nodes.count() == 5
            assert [nodes.nth(index).inner_text().split("\n", 1)[1].replace("\n", " ") for index in range(5)] == ["Документы", "Контекст", "Требования", "Проверка аналитики", "Тестовое покрытие"]
            widths = [round(nodes.nth(index).bounding_box()["width"], 1) for index in range(5)]
            assert max(widths) - min(widths) <= 1, f"Unequal hero nodes at {width}x{height}: {widths}"
            assert_no_overflow(page, f"slide-01 {width}x{height}")

            page.goto(f"{(ROOT / 'index.html').as_uri()}#3", wait_until="networkidle")
            story = page.locator(".story-tag")
            story_box = story.bounding_box()
            radius = story.evaluate("node => parseFloat(getComputedStyle(node).borderRadius)")
            assert story_box and story_box["width"] <= 142 and story_box["height"] < 60
            assert radius < 20
            assert story.evaluate("node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight")
            assert "ручной проверки" in page.locator(".process-notes").inner_text()
            assert_no_overflow(page, f"slide-03 {width}x{height}")

            page.goto(f"{(ROOT / 'index.html').as_uri()}#4", wait_until="networkidle")
            return_box = page.locator(".wf-stage-remediation .wf-return svg").bounding_box()
            finding_box = page.locator("#wf-confirmed-finding").bounding_box()
            assert return_box and finding_box and return_box["x"] < finding_box["x"], "Overview return arrow does not extend left of confirmed finding"
            page.locator("[data-workflow-step='remediation']").click()
            nodes = page.locator(".wf-stage-remediation .wf-node-row .wf-node")
            assert nodes.count() == 3
            assert [nodes.nth(index).locator("b").inner_text() for index in range(3)] == ["Подтверждённая проблема", "Исправить БА / СА", "Обновить документы"]
            node_boxes = [nodes.nth(index).bounding_box() for index in range(3)]
            return_box = page.locator(".wf-stage-remediation .wf-return").bounding_box()
            marker = page.locator(".wf-stage-remediation .wf-return-marker")
            assert return_box and all(node_boxes) and return_box["y"] >= max(box["y"] + box["height"] for box in node_boxes)
            assert return_box["width"] < page.locator(".wf-stage-remediation .wf-stage-content").bounding_box()["width"] * .9
            assert marker.is_visible() and marker.inner_text() == "2"
            assert page.locator(".wf-stage-remediation .wf-return span").inner_text() == "Возврат к извлечению требований"
            details = page.locator(".wf-stage-remediation .wf-stage-details > p")
            assert details.count() == 3
            assert [details.nth(index).locator("b").inner_text() for index in range(3)] == ["Что происходит", "Результат", "Условие перехода"]
            detail_boxes = [details.nth(index).bounding_box() for index in range(3)]
            assert abs(detail_boxes[0]["height"] - detail_boxes[1]["height"]) <= 1
            assert detail_boxes[2]["width"] >= detail_boxes[0]["width"] + detail_boxes[1]["width"]
            assert detail_boxes[0]["y"] > return_box["y"] and detail_boxes[2]["y"] > detail_boxes[0]["y"]
            assert_no_overflow(page, f"slide-04 {width}x{height}")

            page.goto(f"{(ROOT / 'index.html').as_uri()}#10", wait_until="networkidle")
            assert page.locator(".status-badge").inner_text() == "Будущее развитие инструмента"
            assert_no_overflow(page, f"slide-10 {width}x{height}")

            page.goto(f"{(ROOT / 'index.html').as_uri()}#11", wait_until="networkidle")
            assert page.locator(".questions-content h1").inner_text() == "Спасибо за внимание!"
            assert page.locator(".discussion-link").count() == 0
            assert "URL будет добавлен позже" not in page.locator(".questions-content").inner_text()
            assert_no_overflow(page, f"questions {width}x{height}")
            assert not errors, f"Browser errors at {width}x{height}: {errors}"
            page.close()
        browser.close()


if __name__ == "__main__":
    validate_browser()
    print("Final polish validation passed for 1366x768, 1600x900 and 1920x1080.")
