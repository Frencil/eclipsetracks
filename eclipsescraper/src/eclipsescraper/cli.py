"""Command line interface.

Scraping and generation are separate steps:
    fetch     download NASA pages (path tables, Besselian elements) into the page cache
    elements  parse cached Besselian elements pages into the committed elements file
    czml      generate CZML/JSON from the cache and elements file (never hits the network)
"""

import argparse
import datetime
import json
import sys
import traceback
from pathlib import Path

from .besselian import BesselianElements, beselm_url, parse_beselm_html
from .common import DEFAULT_CACHE_DIR, DEFAULT_CZML_DIR, DEFAULT_ELEMENTS_FILE, download, read_cached, read_events
from .shadow import shadow_window, umbral_shadow_compact
from .track import EclipseTrack

# Events that get the Besselian-modeled umbral shadow. Pilot: all events in the 2020s;
# widen to all events once the rendering approach is settled.
def has_umbral_shadow(iso):
    return "2020" <= iso[:4] <= "2029"


# Per-event output files in the czml directory. Each component is its own CZML document so
# the site can load them independently; the umbral track's document carries the clock.
def umbral_track_path(czml_dir, iso):
    return czml_dir / (iso + ".umbral_track.czml")


# The umbral shadow is a compact sampled polygon (JSON) that the site expands into CZML
def umbral_shadow_path(czml_dir, iso):
    return czml_dir / (iso + ".umbral_shadow.json")


# One index of every event for the site's navigation (and which components each has), so
# the site makes one request rather than one per event
def events_index_path(czml_dir):
    return czml_dir / "events.json"


def load_events_index(path):
    """Existing index entries by iso (empty if there's no index yet)."""
    return {e["iso"]: e for e in json.loads(path.read_text())} if path.exists() else {}


def write_events_index(path, all_events, entries):
    """Write the index for every event in events.txt (in its order), from entries by iso.

    Entries for events no longer listed are dropped, and the bad flag always comes from
    events.txt. Returns (number written, isos in events.txt with no entry yet, i.e. never
    generated).
    """
    rows, missing = [], []
    for iso, _url, flags in all_events:
        if iso not in entries:
            missing.append(iso)
            continue
        entry = {k: v for k, v in entries[iso].items() if k != "bad"}
        if "bad" in flags:
            entry["bad"] = True
        rows.append(json.dumps(entry))
    # One event per line keeps diffs readable
    path.write_text("[\n" + ",\n".join(rows) + "\n]\n")
    return len(rows), missing


def load_elements(path):
    return json.loads(Path(path).read_text()) if Path(path).exists() else {}


def _each(events, action):
    """Run action(iso, url) per event, reporting (not raising) errors; returns error count."""
    errors = 0
    for iso, url, _flags in events:
        try:
            action(iso, url)
        except Exception:
            errors += 1
            print("Error on ISO: " + iso, file=sys.stderr)
            traceback.print_exc()
    return errors


def cmd_fetch(args, events):
    """Download path tables and Besselian elements pages into the cache."""
    counts = {"downloaded": 0, "cached": 0}

    def fetch(iso, url):
        for page in (url, beselm_url(url)):
            hit = download(page, args.cache_dir, delay=args.delay, refresh=args.refresh)
            counts["downloaded" if hit else "cached"] += 1
            if hit:
                print("Downloaded " + page)

    errors = _each(events, fetch)
    print("%(downloaded)d pages downloaded, %(cached)d already cached" % counts)
    return errors


def cmd_elements(args, events):
    """Parse cached Besselian elements pages into the elements JSON file (merging)."""
    all_elements = load_elements(args.elements_file)

    def parse(iso, url):
        el_url = beselm_url(url)
        all_elements[iso] = {"url": el_url, **parse_beselm_html(read_cached(el_url, args.cache_dir))}
        print("Parsed Besselian elements for " + iso)

    errors = _each(events, parse)
    args.elements_file.parent.mkdir(parents=True, exist_ok=True)
    # One event per line keeps diffs readable
    lines = ["  %s: %s" % (json.dumps(iso), json.dumps(all_elements[iso])) for iso in sorted(all_elements)]
    args.elements_file.write_text("{\n" + ",\n".join(lines) + "\n}\n")
    print("Wrote %d events to %s" % (len(all_elements), args.elements_file))
    return errors


def cmd_czml(args, events):
    """Generate CZML/JSON for events from cached path tables and the elements file: the
    umbral track, and the umbral shadow (unless --tracks-only, which keeps existing shadow
    files)."""
    all_elements = load_elements(args.elements_file)
    index_file = events_index_path(args.czml_dir)
    index = load_events_index(index_file)

    def generate(iso, url):
        track = EclipseTrack(datetime.date.fromisoformat(iso))
        track.loadFromCache(url, args.cache_dir)

        written = []
        window = None
        shadow_file = umbral_shadow_path(args.czml_dir, iso)
        if has_umbral_shadow(iso):
            if iso not in all_elements:
                raise Exception("No Besselian elements for %s; run `eclipsescraper elements %s`" % (iso, iso))
            elements = BesselianElements(all_elements[iso])
            if args.tracks_only:
                window = shadow_window(elements)
            else:
                compact, window = umbral_shadow_compact(iso, elements)
                if compact is not None:
                    shadow_file.write_text(json.dumps(compact, separators=(",", ":")))
                    written.append(shadow_file.name)
        if window is None and shadow_file.exists():
            shadow_file.unlink()
            print("Removed " + shadow_file.name)

        # The track's clock covers the shadow, since the shadow document has no clock
        track_file = umbral_track_path(args.czml_dir, iso)
        track_file.write_text(track.czml(extra_interval=window).dumps())
        # The index entry tells the site which component documents to load
        index[iso] = {**track.json(), "umbral_shadow": window is not None}
        print("Wrote " + ", ".join([track_file.name] + written))

    errors = _each(events, generate)
    count, missing = write_events_index(index_file, list(read_events(args.czml_dir / "events.txt")), index)
    print("Wrote %s (%d events)" % (index_file.name, count))
    if missing:
        print("Not yet generated, so not in %s: %s" % (index_file.name, " ".join(missing)), file=sys.stderr)
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Scrape NASA eclipse data into EclipseTracks.org CZML/JSON files. "
                    "`fetch` is the only command that contacts NASA; `elements` and `czml` work "
                    "entirely from the page cache and elements file."
    )
    parser.add_argument("--czml-dir", type=Path, default=DEFAULT_CZML_DIR,
                        help="Directory containing events.txt and receiving CZML/JSON (default: %(default)s)")
    parser.add_argument("--elements-file", type=Path, default=DEFAULT_ELEMENTS_FILE,
                        help="Parsed Besselian elements (default: %(default)s)")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR,
                        help="Downloaded NASA pages (default: %(default)s)")
    sub = parser.add_subparsers(dest="command", required=True)
    commands = {
        "fetch": (cmd_fetch, "Download NASA pages for events into the cache (skipping cached pages)"),
        "elements": (cmd_elements, "Parse cached Besselian elements pages into the elements file"),
        "czml": (cmd_czml, "Generate CZML and JSON files from the cache and elements file"),
    }
    for name, (_command, help_text) in commands.items():
        p = sub.add_parser(name, help=help_text)
        p.add_argument("isos", nargs="*", help="Only process these event dates (YYYY-MM-DD)")
        if name == "fetch":
            p.add_argument("--refresh", action="store_true", help="Re-download pages even if cached")
            p.add_argument("--delay", type=float, default=1.0,
                           help="Seconds to wait before each download (default: %(default)s)")
        if name == "czml":
            p.add_argument("--tracks-only", action="store_true",
                           help="Skip (slow) umbral shadow generation, keeping existing shadow files")
    args = parser.parse_args(argv)

    events = [e for e in read_events(args.czml_dir / "events.txt") if not args.isos or e[0] in args.isos]
    return 1 if commands[args.command][0](args, events) else 0
