"""Regression for a new page being loaded alongside cached scripts from a previous deploy.
Run npm run build, then python tests/cache.py. Requires Playwright and Chromium.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import os
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
files = ['index.html', 'favicon.svg', 'src/app.js', 'src/crossword.js', 'src/style.css']
source = {name: (root / name).read_text() for name in files}
built = {name: (root / 'dist' / name).read_text() for name in files}
legacy = dict(source)
# The previous player bound a listener to an inline link that was later removed.
legacy['index.html'] = source['index.html'].replace('</header>', '<button id="browse-library">Old shortcut</button></header>')
legacy['src/app.js'] = source['src/app.js'].replace("const layoutUpdated =", "$('#browse-library').addEventListener('click', openLibrary);\nconst layoutUpdated =")
state = {'phase': 'old', 'script_requests': []}
mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml'}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def do_GET(self):
        file = urlsplit(self.path).path.removeprefix('/Crossr/') or 'index.html'
        content = {'old': legacy, 'broken': source, 'fixed': built}[state['phase']]
        if file not in content:
            self.send_response(404); self.end_headers(); return
        if file == 'src/app.js': state['script_requests'].append(self.path)
        body = content[file].encode()
        self.send_response(200)
        self.send_header('Content-Type', mime[Path(file).suffix])
        self.send_header('Cache-Control', 'no-store' if file == 'index.html' else 'public, max-age=31536000')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/Crossr/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True)
        for width in [1440, 390]:
            state['phase'] = 'old'; state['script_requests'] = []
            context = browser.new_context(viewport={'width': width, 'height': 1000}, is_mobile=width == 390, has_touch=width == 390)
            page = context.new_page(); errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(url + '?old', wait_until='networkidle')
            assert page.locator('.cell').count() == 121
            page.locator('#across-clues button').first.click()
            page.keyboard.type('ATARI')
            assert page.locator('#progress-text').inner_text() == '5 / 106'

            state['phase'] = 'broken'
            page.goto(url + '?unversioned-update', wait_until='networkidle')
            assert page.locator('.cell').count() == 0
            assert any('addEventListener' in e for e in errors)
            assert len(state['script_requests']) == 1, 'Old script should have come from the actual browser cache'

            state['phase'] = 'fixed'; errors.clear()
            page.goto(url + '?versioned-update', wait_until='networkidle')
            assert page.locator('.cell').count() == 121
            assert len(state['script_requests']) == 2
            assert '?v=' in state['script_requests'][-1]
            assert page.locator('#progress-text').inner_text() == '5 / 106'
            assert page.locator('.message-banner').is_hidden()
            assert 'Remember to share' not in page.locator('body').inner_text()
            assert page.locator('.other-crosswords').count() == 0
            page.locator('#across-clues button').nth(1).click()
            if width == 390:
                for letter in 'DEFAT':
                    page.get_by_role('button', name=f'Enter {letter}', exact=True).tap()
            else:
                page.keyboard.type('DEFAT')
            assert page.locator('#progress-text').inner_text() == '10 / 106'
            assert page.locator('.message-banner').is_visible()
            assert not errors, errors
            context.close()
            print(f'PASS {width}px: reproduced cached-script crash; versioned production assets restore play and saved progress')
        browser.close()
finally:
    server.shutdown()
