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

```
poetry run eclipsescraper              # regenerate every event in ../czml/events.txt
poetry run eclipsescraper 2024-04-08   # regenerate only the given event(s)
```

Each event's path table is downloaded from the URL given in `events.txt` (`<iso date>,<url>[,bad]`; events flagged `bad` are still generated but hidden by the site). Downloads are cached in `.cache/` so reruns don't hit NASA again; pass `--no-cache` to force fresh downloads. See `poetry run eclipsescraper --help` for all options.

After regenerating data, run `npm run build` from the repository root to update the cache key so browsers fetch the new files.

## Run Tests

```
poetry run pytest
```

Tests run against saved fixtures in `tests/fixtures/` and never touch the network.
