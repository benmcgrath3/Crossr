"""Crossr browser smoke test. Start npm run dev; requires Python Playwright and Chromium."""
import json
import os
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get('CROSSR_TEST_URL', 'http://127.0.0.1:5173')
ROWS = ['ATARI#DEFAT', 'SOLON#ARISE', 'PUBLICWORKS', 'ISEE#ODDEST',
        'CLI#VOLE###', 'SETAE#EDITS', '###GNUS#CHA', 'USURER#FEES',
        'SCREENPLAYS', 'EAGER#EAGLE', 'DRESS#AXELS']
ACROSS = [word for row in ROWS for word in row.split('#') if word]

def menu_click(page, selector):
    if not page.locator('#game-menu').get_attribute('open') == '':
        page.get_by_label('Puzzle menu', exact=True).click()
    page.locator(selector).click()

def assert_square_grid(page):
    bounds = page.locator('#grid').bounding_box()
    assert abs(bounds['width'] - bounds['height']) < 1
    cells = page.locator('.cell').all()
    widths = [cell.bounding_box()['width'] for cell in cells]
    heights = [cell.bounding_box()['height'] for cell in cells]
    assert max(widths) - min(widths) < 1
    assert max(heights) - min(heights) < 1

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True)
    context = browser.new_context(viewport={'width': 1632, 'height': 1525})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.goto(BASE_URL).status == 200
    assert page.locator('#page-title').inner_text() == 'Midi Crossword'
    assert page.locator('.cell').count() == 121
    assert page.locator('.cell.black').count() == 15
    assert page.locator('.cell.black:disabled').count() == 15
    assert page.locator('#across-clues .clue-button').count() == 20
    assert page.locator('#down-clues .clue-button').count() == 22
    assert 'Phil Fraas' in page.locator('#puzzle-byline').inner_text()
    assert_square_grid(page)
    assert page.locator('#grid').bounding_box()['width'] > 800
    assert page.locator('.clue-panel').bounding_box()['x'] > page.locator('#grid').bounding_box()['x']
    page.screenshot(path='/tmp/crossr-midi-desktop.png', full_page=True)

    page.locator('#across-clues button').first.click()
    page.keyboard.type('X')
    menu_click(page, '[data-action="check-puzzle"]')
    assert page.locator('.cell.wrong').count() == 1
    page.locator('.cell').nth(0).click()
    page.keyboard.type('A')
    assert page.locator('.cell.wrong').count() == 0
    menu_click(page, '#pencil')
    page.keyboard.press('t')
    assert page.locator('.cell.penciled').count() == 1
    page.reload()
    assert page.locator('.cell').nth(0).locator('.letter').inner_text() == 'A'
    assert page.locator('.cell').nth(1).locator('.letter').inner_text() == 'T'
    assert page.locator('.cell.penciled').count() == 1

    page.locator('.cell').nth(1).click()
    page.keyboard.press('Space')
    assert page.locator('.clue-indicator').inner_text() == '2 Down'
    page.keyboard.press('Tab')
    assert page.locator('.clue-indicator').inner_text() == '3 Down'
    page.keyboard.press('Shift+Tab')
    assert page.locator('.clue-indicator').inner_text() == '2 Down'
    page.locator('.cell').nth(4).click()
    page.keyboard.press('ArrowRight')
    assert page.locator('.cell[aria-pressed="true"]').get_attribute('data-index') == '6'
    assert not page.locator('.cell').nth(5).is_enabled()
    page.keyboard.press('Escape')
    assert page.get_by_label('Puzzle menu', exact=True).evaluate('(e) => e === document.activeElement')

    page.locator('#timer').click()
    frozen = page.locator('#timer-value').inner_text()
    assert page.locator('#pause-overlay').is_visible()
    assert page.locator('.cell:not(.black):disabled').count() == 106
    page.wait_for_timeout(1200)
    assert page.locator('#timer-value').inner_text() == frozen
    page.locator('#resume').click()
    assert not page.locator('#pause-overlay').is_visible()
    menu_click(page, '#reset')
    page.locator('#confirm-cancel').click()
    assert page.locator('.cell').nth(0).locator('.letter').inner_text() == 'A'
    menu_click(page, '#reset')
    page.locator('#confirm-ok').click()
    assert page.locator('#progress-text').inner_text() == '0 / 106'

    page.locator('#open-settings').click()
    page.locator('#setting-timer').uncheck()
    page.locator('#setting-highlight').uncheck()
    page.locator('#setting-large').check()
    page.locator('#settings-dialog .dialog-done').click()
    assert not page.locator('#timer').is_visible()
    assert page.locator('.cell.in-word').count() == 0
    assert page.locator('body').evaluate('(e) => e.classList.contains("large-clues")')
    page.reload()
    assert not page.locator('#timer').is_visible()
    page.locator('#open-settings').click()
    page.locator('#setting-timer').check()
    page.locator('#setting-highlight').check()
    page.locator('#setting-large').uncheck()
    page.locator('#setting-skip').check()
    page.locator('#settings-dialog .dialog-done').click()
    page.locator('#across-clues button').first.click()
    page.keyboard.type('AT')
    page.locator('.cell').nth(0).click()
    page.keyboard.type('A')
    assert page.locator('.cell[aria-pressed="true"]').get_attribute('data-index') == '2'
    page.locator('#open-settings').click()
    page.locator('#setting-skip').uncheck()
    page.locator('#settings-dialog .dialog-done').click()
    menu_click(page, '#reset')
    page.locator('#confirm-ok').click()

    for index, answer in enumerate(ACROSS):
        page.locator('#across-clues button').nth(index).click()
        page.keyboard.type(answer)
    assert page.locator('#completion').is_visible()
    assert page.locator('#timer').is_disabled()
    assert page.locator('#progress-text').inner_text() == '106 / 106'
    assert page.locator('.cell.in-word').count() == 0
    assert page.locator('.cell.selected').count() == 0
    for index, letter in enumerate(''.join(ROWS)):
        if letter != '#':
            assert page.locator('.cell').nth(index).locator('.letter').inner_text() == letter
    # A completed isolated test state allows visual comparison with the filled reference.
    page.wait_for_timeout(4100)
    page.locator('#across-clues').evaluate('(e) => e.scrollTop = 0')
    page.locator('#down-clues').evaluate('(e) => e.scrollTop = 0')
    page.evaluate('document.activeElement.blur()')
    page.mouse.move(0,0)
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path='/tmp/crossr-midi-solved.png', full_page=True)
    page.reload()
    assert page.locator('#completion').is_visible()
    page.locator('#open-result').click()
    assert 'complete!' in page.locator('#result-status').inner_text()
    assert page.locator('#result-filled').inner_text() == '106 / 106'
    page.locator('#result-dialog .dialog-done').click()
    page.locator('#open-help').click()
    assert 'reference screenshot' in page.locator('#puzzle-source').inner_text()
    page.locator('#help-dialog .dialog-done').click()
    page.evaluate('window.print = () => window.__printCalled = true')
    page.locator('#print').click()
    assert page.evaluate('window.__printCalled')
    page.emulate_media(media='print')
    assert not page.locator('.toolbar').is_visible()
    assert page.locator('#grid').is_visible()
    assert page.locator('#down-clues').evaluate('(e) => getComputedStyle(e).overflowY') == 'visible'
    page.pdf(path='/tmp/crossr-midi-print.pdf', format='A4', print_background=True)
    page.emulate_media(media='screen')
    page.locator('#share').click()
    assert 'hosted online' in page.locator('#toast').inner_text()

    page.locator('#next-puzzle').click()
    page.locator('.library-puzzle').nth(2).click()
    assert page.locator('.cell').count() == 16
    assert page.locator('#page-title').inner_text() == 'Mini Crossword'
    menu_click(page, '[data-action="reveal-letter"]')
    assert page.locator('.cell').nth(0).locator('.letter').inner_text() == 'B'
    menu_click(page, '[data-action="reveal-puzzle"]')
    page.locator('#confirm-ok').click()
    assert page.locator('#completion').is_visible()
    assert 'with revealed letters' in page.locator('#completion-copy').inner_text()
    assert context.request.get(BASE_URL + '/package.json').status == 404
    assert context.request.post(BASE_URL + '/').status == 405
    print('PASS desktop: 11x11 reference grid, crossing answers, check/reveal, pencil, persistence, black-square navigation, pause, restart, complete solve, result/info/print/settings, library')

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    phone = mobile.new_page()
    phone.on('pageerror', lambda error: errors.append(str(error)))
    phone.goto(BASE_URL)
    assert phone.locator('.touch-keyboard').is_visible()
    phone.locator('#across-clues button').first.tap()
    for letter in 'ATARI':
        phone.get_by_role('button', name=f'Enter {letter}', exact=True).tap()
    assert phone.locator('#progress-text').inner_text() == '5 / 106'
    phone.get_by_role('button', name='Erase letter', exact=True).tap()
    assert phone.locator('#progress-text').inner_text() == '4 / 106'
    phone.get_by_role('button', name='Switch direction', exact=True).tap()
    assert 'Down' in phone.locator('.clue-indicator').inner_text()
    assert_square_grid(phone)
    phone.evaluate('window.scrollTo(0,0)')
    phone.screenshot(path='/tmp/crossr-midi-mobile.png', full_page=True)
    for width in [320, 390, 768, 1024]:
        phone.set_viewport_size({'width': width, 'height': 1000})
        assert phone.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow at {width}px'
        assert_square_grid(phone)
    phone.reload()
    assert phone.locator('#progress-text').inner_text() == '4 / 106'
    print('PASS touch: entry, erase, direction, square cells, reload persistence; responsive widths 320, 390, 768, 1024')

    # An existing installation should switch to the midi layout without deleting saved mini progress.
    legacy = browser.new_context()
    legacy.add_init_script("""if (!localStorage.getItem('legacy-test')) {
        localStorage.setItem('crossr:last-puzzle', JSON.stringify('heart-of-the-matter'));
        localStorage.setItem('crossr:v1:heart-of-the-matter', JSON.stringify({letters:['H',...Array(24).fill('')]}));
        localStorage.setItem('legacy-test','yes');
    }""")
    old_page = legacy.new_page()
    old_page.goto(BASE_URL)
    assert old_page.locator('.cell').count() == 121
    old_page.locator('#open-library').click()
    old_page.locator('.library-puzzle').nth(1).click()
    assert old_page.locator('.cell').nth(0).locator('.letter').inner_text() == 'H'
    print('PASS migration: upgraded default puzzle, preserved old progress')
    assert not errors, json.dumps(errors)
    print('PASS no JavaScript errors')
    browser.close()
