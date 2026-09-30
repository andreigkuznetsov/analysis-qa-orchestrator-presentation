from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
VIEWPORTS = [(1366, 768), (1600, 900), (1920, 1080)]


def validate_files():
    images = ROOT / "assets" / "demo" / "sort-1998"
    missing = [str(images / f"{index}.png") for index in range(1, 28) if not (images / f"{index}.png").is_file()]
    assert not missing, f"Missing demo images: {missing}"


def validate_browser():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors = []
            page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(f"{(ROOT / 'index.html').as_uri()}#8", wait_until="networkidle")
            page.locator("#sort-demo-launch").click()
            assert page.locator("#sort-demo-count").inner_text() == "01 / 27"
            assert page.locator("#sort-demo-prev").is_disabled()
            assert page.locator("#sort-demo-image").evaluate("image => image.complete && image.naturalWidth > 0")
            assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
            frame = page.locator("#sort-demo-image").bounding_box()
            assert frame and frame["width"] > width * 0.8 and frame["height"] > height * 0.6
            for _ in range(26):
                number = int(page.locator("#sort-demo-count").inner_text().split()[0])
                focus_expected = number in {12, 13, 15, 17, 18, 26, 27}
                assert page.locator("#sort-demo-focus").is_visible() == focus_expected
                page.locator("#sort-demo-next").click()
            assert page.locator("#sort-demo-count").inner_text() == "27 / 27"
            assert page.locator("#sort-demo-focus").is_visible()
            assert page.locator("#sort-demo-next").is_disabled()
            page.locator("#sort-demo-restart").click()
            assert page.locator("#sort-demo-count").inner_text() == "01 / 27"
            assert not errors, f"Browser errors at {width}x{height}: {errors}"
            page.close()

            auto_page = browser.new_page(viewport={"width": width, "height": height})
            auto_errors = []
            auto_page.on("console", lambda message: auto_errors.append(message.text) if message.type == "error" else None)
            auto_page.on("pageerror", lambda error: auto_errors.append(str(error)))
            auto_page.add_init_script("""
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
                  fail() { this.listeners.error?.(); }
                }
                window.Audio = TestAudio;
            """)
            auto_page.goto(f"{(ROOT / 'index.html').as_uri()}#8", wait_until="networkidle")
            auto_page.locator("#audio-rate").select_option("1.2")
            auto_page.locator("#audio-autoplay").click()
            auto_page.wait_for_function("window.__testAudioInstances.length === 1")
            assert auto_page.evaluate("window.__testAudioInstances.at(-1).src.endsWith('slide-08-intro.ogg')")
            assert auto_page.evaluate("window.__testAudioInstances.at(-1).playbackRate === 1.2")
            assert auto_page.locator("#sort-demo-intro").is_visible()

            auto_page.evaluate("window.__testAudioInstances.at(-1).end()")
            auto_page.wait_for_function("document.querySelector('#sort-demo-count')?.textContent === '01 / 27'")
            assert auto_page.locator("#sort-demo").is_visible()
            assert auto_page.locator("#transcript-content").inner_text() == auto_page.evaluate("window.SORT_1998_DEMO_TTS.cueTracks[0].ttsText")

            auto_page.locator("#audio-play").click()
            auto_page.locator("#sort-demo-next").click(force=True)
            assert auto_page.locator("#sort-demo-count").inner_text() == "01 / 27"
            assert auto_page.locator("#audio-status").inner_text() == "Для ручного управления презентацией отключите режим «Авто»."
            auto_page.locator("#audio-play").click()
            assert auto_page.locator("#sort-demo-count").inner_text() == "01 / 27"

            for cue_number in range(1, 27):
                auto_page.evaluate("window.__testAudioInstances.at(-1).end()")
                expected_frame = cue_number + 1
                auto_page.wait_for_function("frame => document.querySelector('#sort-demo-count')?.textContent === String(frame).padStart(2, '0') + ' / 27'", arg=expected_frame)
                assert auto_page.locator("#sort-demo-focus").is_visible() == (expected_frame in {12, 13, 15, 17, 18, 26, 27})

            frame_27_src = auto_page.locator("#sort-demo-image").get_attribute("src")
            auto_page.evaluate("window.__testAudioInstances.at(-1).end()")
            auto_page.wait_for_function("window.__testAudioInstances.at(-1).src.endsWith('cue-28.ogg')")
            assert auto_page.locator("#sort-demo-count").inner_text() == "27 / 27"
            assert auto_page.locator("#sort-demo-image").get_attribute("src") == frame_27_src
            assert auto_page.locator("#transcript-content").inner_text() == auto_page.evaluate("window.SORT_1998_DEMO_TTS.cueTracks[27].ttsText")

            auto_page.evaluate("window.__testAudioInstances.at(-1).end()")
            auto_page.wait_for_function("document.querySelector('#stage')?.dataset.slideId === 'slide-09'")
            assert auto_page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")
            assert not auto_errors, f"Auto browser errors at {width}x{height}: {auto_errors}"
            auto_page.close()
        browser.close()


if __name__ == "__main__":
    validate_files()
    validate_browser()
    print("SORT-1998 demo validation passed for 1366x768, 1600x900 and 1920x1080.")
