#!/usr/bin/env python3
"""Validate the self-contained GitBook language editions without network access."""
from pathlib import Path
import hashlib
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
LANGUAGES = ('en', 'de', 'zh-cn', 'zh-tw', 'ja', 'th', 'ne', 'hi')
LINK = re.compile(r'\]\(([^)]+)\)')


def targets(path):
    return LINK.findall(path.read_text())


def require(condition, message):
    if not condition:
        raise AssertionError(message)


source_pages = {target for target in targets(DOCS / 'SUMMARY.md') if not target.startswith('development/')}
require(len(source_pages) == 25, 'Expected 25 source guide pages')
# Files in another language directory belong to a separate GitBook space.
# An existing repository file does not imply that GitBook can resolve its link.
for file in DOCS.rglob('*.md'):
    base = DOCS if not file.is_relative_to(DOCS / 'languages') else DOCS / 'languages' / file.relative_to(DOCS / 'languages').parts[0]
    for target in targets(file):
        url = urlsplit(target)
        if url.scheme or target.startswith('#'):
            if url.hostname == 'docs.interaktifotel.com':
                require(not re.search(r'(?:^|/)(?:docs|languages|undefined(?:-\d+)?)(?:/|$)', url.path), f'{file}: invalid published URL: {target}')
            continue
        require(not target.startswith('/'), f'{file}: use a full published URL for links between spaces: {target}')
        resolved = (file.parent / url.path).resolve()
        require(resolved.is_relative_to(base.resolve()), f'{file}: link escapes language space: {target}')
        if base == DOCS:
            require(not resolved.is_relative_to((DOCS / 'languages').resolve()), f'{file}: use a published URL for another language space: {target}')
        require(resolved.exists(), f'{file}: broken link: {target}')

language_links = [target for target in targets(DOCS / 'README.md') if urlsplit(target).hostname == 'docs.interaktifotel.com']
require(set(language_links) == {f'https://docs.interaktifotel.com/{locale}/' for locale in LANGUAGES}, 'Expected published URLs for all eight language editions')
require(len(language_links) == len(LANGUAGES), 'Duplicate language edition link')
source_images = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (DOCS / 'images').glob('*') if p.is_file()}
require(len(source_images) == 15, 'Expected 15 source images')
page_total = 0
link_total = 0
for locale in LANGUAGES:
    base = DOCS / 'languages' / locale
    summary = base / 'SUMMARY.md'
    pages = targets(summary)
    require(len(pages) == len(set(pages)), f'{locale}: duplicate navigation entry')
    require(set(pages) == source_pages, f'{locale}: missing or extra guide page')
    actual = {p.relative_to(base).as_posix() for p in base.rglob('*.md') if p.name != 'SUMMARY.md'}
    require(actual == source_pages, f'{locale}: unlisted guide page')
    require((base / '.gitbook.yaml').read_text() == 'root: ./\nstructure:\n  readme: README.md\n  summary: SUMMARY.md\n', f'{locale}: invalid content root')
    for name, digest in source_images.items():
        image = base / 'images' / name
        require(image.is_file(), f'{locale}: missing image {name}')
        require(hashlib.sha256(image.read_bytes()).hexdigest() == digest, f'{locale}: image differs {name}')
    for name in ['SUMMARY.md'] + pages:
        file = base / name
        text = file.read_text()
        require(len(re.findall(r'^# ', text, re.M)) == 1, f'{file}: expected one title')
        require(not re.search(r'\b(?:TODO|TBD)\b', text), f'{file}: unfinished text')
        if locale != 'en':
            original = (DOCS / 'languages/en' / name).read_text()
            require(text != original, f'{file}: untranslated English page')
            require(targets(file) == targets(DOCS / 'languages/en' / name), f'{file}: changed link target/order')
            require(len(re.findall(r'^\d+\. ', text, re.M)) == len(re.findall(r'^\d+\. ', original, re.M)), f'{file}: missing numbered instruction')
            require(re.findall(r'`[^`]+`', text) == re.findall(r'`[^`]+`', original), f'{file}: changed literal configuration value')
        for target in targets(file):
            if target.startswith(('https://', 'http://', 'mailto:', '#')):
                continue
            resolved = (file.parent / target.split('#')[0]).resolve()
            require(resolved.is_relative_to(base.resolve()), f'{file}: link escapes language space: {target}')
            require(resolved.exists(), f'{file}: broken link: {target}')
            link_total += 1
    page_total += len(pages)
    print(f'PASS {locale}: {len(pages)} pages, {len(source_images)} images, navigation and instructions')

site = (ROOT / 'gitbook-docs.yaml').read_text()
keys = re.findall(r'^\s+key: (.+)$', site, re.M)
require(len(keys) == len(set(keys)) == 9, 'Expected nine unique GitBook space keys')
require('key: interactiveotel-user-guide-tr' in site and 'path: guide' in site, 'Original Turkish space changed')
require(site.count('default: true') == 1, 'Exactly one default language required')
for locale in LANGUAGES:
    require(f'directory: ./docs/languages/{locale}' in site, f'{locale}: missing site mapping')
    require(re.search(rf'key: interactiveotel-user-guide-{re.escape(locale)}\n\s+title: [^\n]+\n\s+path: {re.escape(locale)}\n', site), f'{locale}: published language URL does not match site path')
require('language: ne\n' not in site, 'GitBook does not accept the ne language enum; omit it for the Nepali space')
require('language: zh\n' in site and 'language: zh-tw\n' in site, 'Use GitBook Chinese language codes')
print(f'PASS: {page_total} translated guide pages, {link_total} local links, 9 configured spaces')
