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

The scraper has two steps, each optionally limited to specific event dates:

```
poetry run eclipsescraper elements [YYYY-MM-DD ...]  # scrape Besselian elements into data/besselian_elements.json
poetry run eclipsescraper czml [YYYY-MM-DD ...]      # generate ../czml/<date>.czml and .json for events
```

Events are listed in `../czml/events.txt` as `<iso date>,<path table url>[,bad]` (events flagged `bad` are still generated but hidden by the site). The event date must match the date in the URL.

* **Tracks** (northern/southern limits and central line) come from each event's NASA path table, e.g. [SE2027Feb06Apath.html](https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Feb06Apath.html).
* **Besselian elements** come from the companion page, e.g. [SE2027Feb06Abeselm.html](https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Feb06Abeselm.html). They're parsed into `data/besselian_elements.json` (committed; one event per line) so CZML generation doesn't depend on re-scraping.
* **Umbral shadow**: for events selected by `has_shadow()` (`src/eclipsescraper/cli.py`; currently the 2020s as a pilot), the shadow is modeled from the Besselian elements on the WGS-84 ellipsoid (`src/eclipsescraper/shadow.py`): the umbral cone intersected with the sunlit side of the Earth, bounded by the sunrise/sunset line where it hangs off the limb. It's rendered as a polygon whose vertices move over time, for the whole time any of the umbra is on the Earth, and the CZML clock is extended to cover that time. The model reproduces NASA's tabulated limits and central line to their rounding (~0.2 km).

Downloaded pages are cached in `.cache/` so reruns don't hit NASA again; pass `--no-cache` to force fresh downloads. See `poetry run eclipsescraper --help` for all options.

After regenerating data, run `npm run build` from the repository root to update the cache key so browsers fetch the new files.

## Run Tests

```
poetry run pytest
```

Tests run against saved fixtures in `tests/fixtures/` and never touch the network. They include checking the Besselian shadow model against NASA's tabulated central line and limits for 2027-02-06.
