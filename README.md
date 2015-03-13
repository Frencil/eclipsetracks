# EclipseTracks.org

This repository is the source code for [EclipseTracks.org](http://eclipsetracks.org) - Interactive solar eclipse track modeling with Cesium.

It presently uses [NASA data](http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2015Mar20Tpath.html) to render the track of this year's [Total Solar Eclipse](http://eclipse.gsfc.nasa.gov/SEgoogle/SEgoogle2001/SE2015Mar20Tgoogle.html). Its ultimate purpose is model all predicted solar eclipse events, past and future, with tools to easily navigate between them.

![Screenshot of the EclipseTracks.org, March 13, 2015](http://i.imgur.com/ezfdH04.png)

## Composition

[Cesium](https://github.com/AnalyticalGraphicsInc/cesium) powers the application and it is installed as a subtree in the top-level directory `cesium`.

In the `czml` directory are generated CZML and JSON files for all eclipse events described (by ISO data and link to tabular data) in `czml/events.txt`. The python script `czml/generator.py` uses [eclipsescraper](https://github.com/Frencil/eclipsescraper), a purpose-built python module, to transform NASA eclipse data into usable CZML files depicting tracks and shadows.
