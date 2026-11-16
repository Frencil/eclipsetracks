"""Shared constants and helpers for the eclipse scraper."""

import csv
import datetime
import hashlib
import re
import time
import urllib.request
from pathlib import Path

from czml3.properties import Color, SolidColorMaterial

CZML_VERSION = "1.1"

# Repo layout: eclipsetracks/eclipsescraper/src/eclipsescraper/common.py
SCRAPER_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CZML_DIR = SCRAPER_DIR.parent / "czml"
DEFAULT_CACHE_DIR = SCRAPER_DIR / ".cache"
DEFAULT_ELEMENTS_FILE = SCRAPER_DIR / "data" / "besselian_elements.json"

USER_AGENT = "eclipsescraper (+https://github.com/Frencil/eclipsetracks)"

# Colors (RGBA, 0-255)
TRACK_FILL_RGBA = [0, 0, 0, 90]
TRACK_LIMIT_RGBA = [232, 72, 68, 255]
TRACK_CENTRAL_RGBA = [241, 226, 57, 255]
# Same black/alpha used by the original approximated umbral shadow ellipse
UMBRAL_SHADOW_RGBA = [0, 0, 0, 160]


def solid(rgba):
    return SolidColorMaterial(color=Color(rgba=rgba))


def fetch_url(url, cache_dir=None, delay=0.0):
    """Fetch a URL as text, optionally via an on-disk cache keyed by URL."""
    cache_file = None
    if cache_dir is not None:
        cache_dir = Path(cache_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / (hashlib.sha1(url.encode()).hexdigest() + ".html")
        if cache_file.exists():
            return cache_file.read_text(encoding="utf-8")
    if delay:
        time.sleep(delay)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        if r.status != 200:
            raise Exception("Unable to load URL: %s (HTTP %s)" % (url, r.status))
        text = r.read().decode("utf-8", "ignore")
    if cache_file is not None:
        cache_file.write_text(text, encoding="utf-8")
    return text


def read_events(events_file):
    """Yield (iso, path_table_url, flags) for each row of events.txt.

    Raises ValueError if an event's date doesn't match the date in its NASA URL.
    """
    with open(events_file, newline="") as f:
        for row in csv.reader(f):
            if len(row) < 2 or not re.match(r"^\d{4}-\d{2}-\d{2}$", row[0]):
                continue
            m = re.search(r"SE(\d{4})([A-Za-z]{3})(\d{2})[A-Z]path\.html$", row[1])
            if not m:
                raise ValueError("Unrecognized NASA path table URL for %s: %s" % (row[0], row[1]))
            url_iso = datetime.datetime.strptime("".join(m.groups()), "%Y%b%d").date().isoformat()
            if url_iso != row[0]:
                raise ValueError("Event date %s doesn't match its URL date %s" % (row[0], url_iso))
            yield row[0], row[1], row[2:]
