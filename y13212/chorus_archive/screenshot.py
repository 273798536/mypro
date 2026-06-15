from pathlib import Path
from typing import Optional


def take_screenshot(html_path: str, output_path: str) -> Optional[str]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None

    html_file = Path(html_path).resolve()
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    file_url = f"file://{html_file}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.goto(file_url, wait_until="networkidle")
            page.wait_for_timeout(500)
            page.screenshot(path=str(output_file), full_page=True)
            browser.close()
        return str(output_file)
    except Exception:
        return None
