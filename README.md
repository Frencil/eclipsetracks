# EclipseTracks.org

This repository is the source code for [EclipseTracks.org](http://eclipsetracks.org) - Interactive solar eclipse track modeling with Cesium.

It presently uses [NASA data](http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html) to render the track of the great [North American Total Solar Eclipse of 2017](http://eclipse.gsfc.nasa.gov/SEgoogle/SEgoogle2001/SE2017Aug21Tgoogle.html). Its ultimate purpose is model all future solar eclipses as data becomes available.

![Screenshot of the EclipseTracks.org, December 7, 2014](http://i.imgur.com/F7EJeya.jpg)

## Composition

[Cesium](https://github.com/AnalyticalGraphicsInc/cesium) powers the application and it is installed as a subtree in the top-level directory `cesium`.

Presently only one eclipse track (August 21, 2017 - North America) is modeled and is done so in JavaScript in `2017Eclipse.js`.

## Data import

The data set used comes from [NASA](http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html) but lacks importable formatting. Presently the data is manually reworked into a parseable CSV string and parsed into the `eclipseTracks` object in `2017Eclipse.js`.

## Next steps

### Cleaner data import

The data set for this and other eclipses lend themselves to formatting as distinct CZML documents.

### Animated moon shadow

Having the clock constrain to the time of the eclipse event is only useful with some animation. I've begun reading documentation regarding how I might animate a shadow running through the eclipse track. While the original data set from NASA does provide a track width value at each time interval, facilitating rendering an ellipse at each interval in the right spot at the right size, an accurate representation would also show the eccentricity of the shadow's ellipse as the phase angle changes (i.e. at the end of the tracks the shadow is stretched out, at the center of the track it's essentially circular.

### Additional information

Some guiding help text to orient first-time visitors. Also links to some choice third parties, such as [EclipseMaps.com](http://www.eclipse-maps.com/Eclipse-Maps/Welcome.html), [NASA](http://eclipse.gsfc.nasa.gov/SEgoogle/SEgoogle2001/SE2017Aug21Tgoogle.html), and info about solar eclipse viewing glasses and/or solar filters for telescopes.

### Multiple events and event switching

Import data for any other future solar eclipse event and expand the app to provide intuitive navigation between distinct events.