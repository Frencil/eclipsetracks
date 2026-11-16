"""Command line interface: scrape Besselian elements and generate CZML/JSON."""

import argparse
import datetime
import json
import sys
import traceback
from pathlib import Path

from .besselian import BesselianElements, beselm_url, parse_beselm_html
from .common import DEFAULT_CACHE_DIR, DEFAULT_CZML_DIR, DEFAULT_ELEMENTS_FILE, fetch_url, read_events
from .shadow import umbral_shadow_packets
from .track import EclipseTrack

# Events that get the Besselian-modeled umbral shadow. Pilot: all events in the 2020s;
# widen to all events once the rendering approach is settled.
def has_shadow(iso):
    return "2020" <= iso[:4] <= "2029"


def load_elements(path):
    return json.loads(Path(path).read_text()) if Path(path).exists() else {}


def cmd_elements(args, events, cache_dir):
    """Scrape Besselian elements for events into the elements JSON file (merging)."""
    all_elements = load_elements(args.elements_file)
    errors = 0
    for iso, url, _flags in events:
        try:
            el_url = beselm_url(url)
            data = parse_beselm_html(fetch_url(el_url, cache_dir=cache_dir, delay=args.delay))
            all_elements[iso] = {"url": el_url, **data}
            print("Parsed Besselian elements for " + iso)
        except Exception:
            errors += 1
            print("Error on ISO: " + iso, file=sys.stderr)
            traceback.print_exc()
    args.elements_file.parent.mkdir(parents=True, exist_ok=True)
    # One event per line keeps diffs readable
    lines = ["  %s: %s" % (json.dumps(iso), json.dumps(all_elements[iso])) for iso in sorted(all_elements)]
    args.elements_file.write_text("{\n" + ",\n".join(lines) + "\n}\n")
    print("Wrote %d events to %s" % (len(all_elements), args.elements_file))
    return errors


def cmd_czml(args, events, cache_dir):
    """Generate CZML/JSON for events from path tables (and elements, for shadows)."""
    all_elements = load_elements(args.elements_file)
    errors = 0
    for iso, url, _flags in events:
        try:
            track = EclipseTrack(datetime.date.fromisoformat(iso))
            track.loadFromURL(url, cache_dir=cache_dir, delay=args.delay)

            extra, extra_interval = [], None
            if has_shadow(iso):
                if iso not in all_elements:
                    raise Exception("No Besselian elements for %s; run `eclipsescraper elements %s`" % (iso, iso))
                extra, extra_interval = umbral_shadow_packets(iso, BesselianElements(all_elements[iso]))

            czml_filename = args.czml_dir / (iso + ".czml")
            czml_filename.write_text(track.czml(extra_packets=extra, extra_interval=extra_interval).dumps())
            json_filename = args.czml_dir / (iso + ".json")
            json_filename.write_text(json.dumps(track.json()))
            print("Wrote %s, %s" % (czml_filename.name, json_filename.name))
        except Exception:
            errors += 1
            print("Error on ISO: " + iso, file=sys.stderr)
            traceback.print_exc()
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Scrape NASA eclipse data into EclipseTracks.org CZML/JSON files."
    )
    parser.add_argument("--czml-dir", type=Path, default=DEFAULT_CZML_DIR,
                        help="Directory containing events.txt and receiving CZML/JSON (default: %(default)s)")
    parser.add_argument("--elements-file", type=Path, default=DEFAULT_ELEMENTS_FILE,
                        help="Scraped Besselian elements (default: %(default)s)")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR,
                        help="Cache for downloaded NASA pages (default: %(default)s)")
    parser.add_argument("--no-cache", action="store_true", help="Always re-download NASA pages")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="Seconds to wait before each uncached download (default: %(default)s)")
    sub = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (("elements", "Scrape Besselian elements into the elements file"),
                            ("czml", "Generate CZML and JSON files from path tables and elements")):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("isos", nargs="*", help="Only process these event dates (YYYY-MM-DD)")
    args = parser.parse_args(argv)

    cache_dir = None if args.no_cache else args.cache_dir
    events = [e for e in read_events(args.czml_dir / "events.txt") if not args.isos or e[0] in args.isos]
    command = {"elements": cmd_elements, "czml": cmd_czml}[args.command]
    return 1 if command(args, events, cache_dir) else 0
