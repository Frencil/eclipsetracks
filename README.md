# EclipseTracks.org

This repository is the source code for [EclipseTracks.org](http://eclipsetracks.org) - Interactive solar eclipse track modeling with Cesium.

It presently uses [NASA data](http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html) to render the track of the great [North American Total Solar Eclipse of 2017](http://eclipse.gsfc.nasa.gov/SEgoogle/SEgoogle2001/SE2017Aug21Tgoogle.html). Its ultimate purpose is model all future solar eclipses as data becomes available.

![Screenshot of the EclipseTracks.org, December 7, 2014](http://i.imgur.com/F7EJeya.jpg)

## Composition

[Cesium](https://github.com/AnalyticalGraphicsInc/cesium) powers the application and it is installed as a subtree in the top-level directory `cesium`.

Presently only one eclipse track (August 21, 2017 - North America) is modeled. This is done in CZML in the `data` directory in `2017-08-21.czml`.

## Data import

The data set used comes from [NASA](http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html) but lacks easily importable formatting. Presently the data is manually reworked into a parseable CSV with regular expressions (the output for this can be seen in `data/2017-08-21.csv`).

From there some quick and dirty JavaScript was used to provide the array values for the CZML document.

## Trajectory

See the [issues](https://github.com/Frencil/eclipsetracks/issues) page for a list of things to do next.

In general, the app is still in its infancy. It still needs to more robustly model a single eclipse event, then it needs the scaffolding for modeling *n* eclipse events, past and future.