# EclipseScraper

Scrape NASA's eclipse website to generate the EclipseTracks.org CZML and JSON files in `../czml/`.

Eclipse Predictions by Fred Espenak, NASA's GSFC: <https://eclipse.gsfc.nasa.gov/solar.html>

## Setup

Requires Python 3.10+ and [Poetry](https://python-poetry.org/) 2.x. From this directory:

```
poetry install
```

This creates a virtualenv in `.venv/` (see `poetry.toml`) with the `eclipsescraper` command and the dev dependencies.

## Run the Scraper

Scraping NASA and generating files are separate steps. Only `fetch` contacts NASA's site; everything after it runs from local copies, so CZML can be regenerated as often as the rendering logic changes. Each command can be limited to specific event dates:

```
poetry run eclipsescraper fetch [YYYY-MM-DD ...]     # download NASA pages into .cache/ (skips pages already there)
poetry run eclipsescraper elements [YYYY-MM-DD ...]  # parse cached Besselian elements into data/besselian_elements.json
poetry run eclipsescraper czml [YYYY-MM-DD ...]      # generate ../czml/ files from the cache and elements file
```

Events are listed in `../czml/events.txt` as `<iso date>,<path table url>[,bad]` (events flagged `bad` are still generated but hidden by the site). The event date must match the date in the URL. For a new event: add it to `events.txt`, then run all three commands for its date.

* **Page cache**: `fetch` saves each page under `.cache/`, mirroring NASA's URL paths (e.g. `.cache/eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Feb06Apath.html`), and waits `--delay` seconds (default 1) before each download. Pages already cached are never re-downloaded unless you pass `fetch --refresh`. `elements` and `czml` fail with a "run `eclipsescraper fetch`" error if a page they need isn't cached.
* **Tracks** (northern/southern limits and central line) come from each event's NASA path table, e.g. [SE2027Feb06Apath.html](https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Feb06Apath.html).
* **Besselian elements** come from the companion page, e.g. [SE2027Feb06Abeselm.html](https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Feb06Abeselm.html). They're parsed into `data/besselian_elements.json` (committed; one event per line).
* **Umbral shadow**: for events selected by `has_umbral_shadow()` (`src/eclipsescraper/cli.py`; currently the 2020s as a pilot), the shadow is modeled from the Besselian elements on the WGS-84 ellipsoid (`src/eclipsescraper/shadow.py`): the umbral cone intersected with the sunlit side of the Earth, bounded by the sunrise/sunset line where it hangs off the limb. It's rendered as a polygon whose vertices move over time, for the whole time any of the umbra is on the Earth. The model reproduces NASA's tabulated limits and central line to their rounding (~0.2 km). Generating it takes about a minute per event; `czml --tracks-only` skips it, keeping existing shadow files.

Each event gets these files in `../czml/`, one CZML document per component so the site can load them independently:

* `<iso>.umbral_track.czml`: limits and central line, plus the document clock, which also covers the whole umbral shadow.
* `<iso>.umbral_shadow.czml`: the umbral shadow, with no clock. Only for events with a modeled shadow.
* `<iso>.json`: metadata for the site's event list, including `"umbral_shadow": true/false` to say whether to load the shadow.

See `poetry run eclipsescraper --help` for all options.

After regenerating data, run `npm run build` from the repository root to update the cache key so browsers fetch the new files.

## Run Tests

```
poetry run pytest
```

Tests run against saved fixtures in `tests/fixtures/` and never touch the network. They include checking the Besselian shadow model against NASA's tabulated central line and limits for 2027-02-06.
