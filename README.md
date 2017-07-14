# EclipseTracks.org

This repository is the source code for [EclipseTracks.org](http://eclipsetracks.org) - Interactive solar eclipse track modeling with Cesium.

![Total Solar Eclipse on August 21, 2017](https://i.imgur.com/uIQSDPK.jpg)

## Composition

[Cesium](https://github.com/AnalyticalGraphicsInc/cesium) powers the application and is loaded viaa CDN links.

In the `czml` directory are generated CZML and JSON files for all eclipse events described (by ISO data and link to tabular data) in `czml/events.txt`. The python script `scraper/scraper.py` transforms [NASA eclipse data](https://eclipse.gsfc.nasa.gov/solar.html) into usable CZML files depicting tracks and shadows. Run from the scraper directory like so:

`python scraper.py`
