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

Events are listed in `../czml/events.txt` as `<iso date>,<path table url>[,bad]` (events flagged `bad` are still generated but flagged in `events.json` so the site hides them). The event date must match the date in the URL. For a new event: add it to `events.txt`, then run all three commands for its date.

* **Page cache**: `fetch` saves each page under `.cache/`, mirroring NASA's URL paths (e.g. `.cache/eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Feb06Apath.html`), and waits `--delay` seconds (default 1) before each download. Pages already cached are never re-downloaded unless you pass `fetch --refresh`. `elements` and `czml` fail with a "run `eclipsescraper fetch`" error if a page they need isn't cached.
* **Tracks** (northern/southern limits and central line) come from each event's NASA path table, e.g. [SE2027Feb06Apath.html](https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Feb06Apath.html).
* **Besselian elements** come from the companion page, e.g. [SE2027Feb06Abeselm.html](https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Feb06Abeselm.html). They're parsed into `data/besselian_elements.json` (committed; one event per line).
* **Umbral shadow**: for events selected by `has_umbral_shadow()` (`src/eclipsescraper/cli.py`; currently all of them), the shadow is modeled from the Besselian elements on the WGS-84 ellipsoid (`src/eclipsescraper/shadow.py`): the umbral cone intersected with the sunlit side of the Earth, bounded by the sunrise/sunset line where it hangs off the limb. It's rendered as a polygon whose vertices move over time, for the whole time any of the umbra is on the Earth. The model reproduces NASA's tabulated limits and central line to their rounding (~0.2 km). Generating it takes about a minute per event; `czml --tracks-only` skips it, keeping existing shadow files.
* **Penumbral shadow**: for events selected by `has_penumbral_shadow()` (currently just 2027-02-06 as a pilot), the same model with the penumbral cone (l1, tan f1): the region where the eclipse is at least partial, from first to last contact of the penumbra (several hours). NASA's polynomial elements are fitted over 6 hours, which can end a few minutes before the penumbra's first/last contact, so they're evaluated up to 15 minutes past their validity period while a shadow is still on the Earth there. Its interpolation tolerance is 5 km (vs 0.5 km for the umbra): at ~7000 km across, 48 vertices already put its outline within ~10 km of the true boundary. Besides the penumbra's outer edge (eclipse magnitude 0), it has polygons for the contours of magnitude 25%, 50% and 75% (the fraction of the Sun's diameter covered), each also a cone in the Besselian model (see `Cone` in `shadow.py`). All four are drawn in the umbra's black at alpha 32, nested, so the shading deepens toward the umbra in steps. Its polygons use a 3 degree granularity (Cesium's default is 1), since moving polygons are re-tessellated every frame. Generating it takes about four minutes per event.

Each event gets these files in `../czml/`, one document per component so the site can load them independently:

* `<iso>.umbral_track.czml`: limits and central line, plus the document clock, which also covers the whole time any shadow is shown (the penumbra's, where there is one).
* `<iso>.umbral_shadow.json`: the umbral shadow as a compact "sampled polygon": sample times stored once and vertex coordinates as integer deltas, about a third the size of the equivalent CZML. The site expands it into CZML packets (with no clock) using `../sampled_polygon.js`; `expand_sampled_polygon()` in `shadow.py` is the matching Python reference. Only for events with a modeled shadow.
* `<iso>.penumbral_shadow.json`: the penumbral shadow, in the same format's version 2: a document holding several polygons (the outer edge and each magnitude contour, outermost first), each with the same fields as a version 1 file plus a name. Only for events with a modeled penumbral shadow.
Plus one file for all events:

* `events.json`: the site's event list, one event per line in `events.txt` order: type, regions, camera position, `"umbral_shadow"` and `"penumbral_shadow"` (true/false: whether to load each shadow; a missing flag means false), and `"bad": true` for events flagged bad (the site hides them). Each `czml` run updates the entries of the events it generates and keeps the others, so generating a single event leaves the index complete; events removed from `events.txt` are dropped and `bad` flags always come from `events.txt`.

See `poetry run eclipsescraper --help` for all options.

After regenerating data, run `npm run build` from the repository root to update the cache key so browsers fetch the new files.

## Run Tests

```
poetry run pytest
```

Tests run against saved fixtures in `tests/fixtures/` and never touch the network. They include checking the Besselian shadow model against NASA's tabulated central line and limits for 2027-02-06.
