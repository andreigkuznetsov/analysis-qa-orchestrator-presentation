import contextlib
import functools
import http.server
import json
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "dist-pages"
VIEWPORTS = [(1366, 768), (1600, 900), (1920, 1080)]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def local_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_address[1]}/dist-pages/"
        finally:
            server.shutdown()
            thread.join()


def attach_error_collection(page):
    errors = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("requestfailed", lambda request: errors.append(f"request failed: {request.url}"))
    return errors


def install_mock_audio(page):
    page.add_init_script("""
        window.__testAudioInstances = [];
        class TestAudio {
          constructor(src) {
            this.src = src; this.currentTime = 0; this.listeners = {}; this.muted = false;
            this.playbackRate = 1; this.preload = ""; window.__testAudioInstances.push(this);
          }
          addEventListener(name, callback) { this.listeners[name] = callback; }
          play() { this.listeners.play?.(); return Promise.resolve(); }
          pause() { this.listeners.pause?.(); }
          removeAttribute(name) { if (name === "src") this.src = ""; }
          load() {}
          end() { this.listeners.ended?.(); }
        }
        window.Audio = TestAudio;
    """)


def validate_manual(browser, base_url, width, height, check_media=False):
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = attach_error_collection(page)
    page.goto(base_url, wait_until="networkidle")
    assert page.locator("#stage").get_attribute("data-slide-id") == "slide-01"

    for number in range(1, 12):
        page.goto(f"{base_url}?validation={number}#{number}", wait_until="networkidle")
        assert page.locator("#stage").get_attribute("data-slide-id") == ("questions" if number == 11 else f"slide-{number:02d}")
        assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")

    page.goto(f"{base_url}?validation=workflow#4", wait_until="networkidle")
    page.locator("[data-workflow-step='remediation']").click()
    assert page.locator(".native-workflow.has-focus").is_visible()

    page.goto(f"{base_url}?validation=decisions#5", wait_until="networkidle")
    page.locator("[data-decision-card='requirement'] [data-decision='exclude']").click()
    assert page.locator("[data-decision-card='requirement'] [data-decision='exclude']").get_attribute("class") == "active"

    page.goto(f"{base_url}?validation=demo#8", wait_until="networkidle")
    page.locator("#sort-demo-launch").click()
    for _ in range(26):
        page.locator("#sort-demo-next").click()
    assert page.locator("#sort-demo-count").inner_text() == "27 / 27"

    page.goto(f"{base_url}?validation=rules#10", wait_until="networkidle")
    page.locator("#open-rules").click()
    assert page.locator("#rules-overlay").is_visible()
    page.locator("#close-rules").click()
    assert page.locator("#rules-overlay").is_hidden()

    page.goto(f"{base_url}?validation=final#11", wait_until="networkidle")
    assert page.locator(".questions-content h1").inner_text() == "Спасибо за внимание!"
    page.locator("#open-tech").click()
    assert page.locator("#tech-overlay").is_visible()

    page.goto(f"{base_url}?debug=screen10#10", wait_until="networkidle")
    assert page.locator("#screen10-debug").count() == 0

    assert page.locator("img").evaluate_all("images => images.every(image => image.complete && image.naturalWidth > 0)")
    if check_media:
        audio_paths = page.evaluate("Object.values(window.PRESENTATION_AUDIO_MANIFEST.screens).flatMap(screen => screen.tracks.map(track => track.audioSrc))")
        assert len(audio_paths) == 59
        for audio_path in audio_paths:
            response = page.request.get(base_url + audio_path)
            assert response.ok, f"Missing audio: {audio_path}"
            assert len(response.body()) > 0
    assert not errors, f"Manual browser errors at {width}x{height}: {errors}"
    page.close()


def validate_auto(browser, base_url, width, height):
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = attach_error_collection(page)
    install_mock_audio(page)
    page.goto(base_url, wait_until="networkidle")
    page.locator("#audio-autoplay").click()
    page.wait_for_function("window.__testAudioInstances.length === 1")
    assert page.evaluate("window.__testAudioInstances[0].src.endsWith('slide-01/title.ogg')")
    seen = []
    for _ in range(100):
        current_src = page.evaluate("window.__testAudioInstances.at(-1).src")
        seen.append(current_src)
        if page.locator("#stage").get_attribute("data-slide-id") == "questions" and current_src.endswith("questions.ogg"):
            break
        previous_count = page.evaluate("window.__testAudioInstances.length")
        page.evaluate("window.__testAudioInstances.at(-1).end()")
        page.wait_for_function("count => window.__testAudioInstances.length > count", arg=previous_count)
    else:
        raise AssertionError("Auto flow did not reach questions")

    assert seen[1].endswith("slide-01/body.ogg")
    assert sum("slide-08/demo/cue-" in item for item in seen) == 28
    assert page.locator("#stage").get_attribute("data-slide-id") == "questions"
    page.evaluate("window.__testAudioInstances.at(-1).end()")
    assert page.locator("#audio-autoplay").get_attribute("aria-pressed") == "false"
    assert not errors, f"Auto browser errors at {width}x{height}: {errors}"
    page.close()


def main():
    assert (PUBLISH / "index.html").is_file(), "Run node scripts/build-pages.js first."
    with local_server() as base_url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for index, (width, height) in enumerate(VIEWPORTS):
            validate_manual(browser, base_url, width, height, check_media=index == 0)
            validate_auto(browser, base_url, width, height)
        browser.close()
    print(json.dumps({"viewports": VIEWPORTS, "manual": "PASS", "auto": "PASS", "subpath": "/dist-pages/"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
