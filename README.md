# EclipseTracks.org

This repository is the source code for [EclipseTracks.org](https://eclipsetracks.org) - Interactive solar eclipse track modeling with [CesiumJS](https://cesium.com/platform/cesiumjs/).

![Total Solar Eclipse on August 21, 2017](https://i.imgur.com/uIQSDPK.jpg)

## Composition

EclipseTracks.org is an entirely static, client-side application (HTML, CSS, JavaScript, and pre-generated data files):

* `index.html`, `main.css`, `bootstrap.min.css` - page shell and styles
* `setup.js` - application source, minified into `eclipsetracks.min.js` by the build
* `vendor.min.js` - third party libraries from npm ([lz-string](https://github.com/pieroxy/lz-string)), bundled by the build
* `czml/` - one generated CZML file (tracks and shadow) and JSON file (metadata) per eclipse, for every event listed in `czml/events.txt`
* `eclipsescraper/` - Python tool that generates the contents of `czml/` from [NASA eclipse data](https://eclipse.gsfc.nasa.gov/solar.html). Not part of the website; see [eclipsescraper/README.md](eclipsescraper/README.md).

[CesiumJS](https://github.com/CesiumGS/cesium) is too large to bundle, so it is loaded from Cesium's CDN. Its version is pinned in `package.json` and stamped into the CDN URLs in `index.html` by the build.

## Building The Application

The build uses [Gulp](https://gulpjs.com/) (Node 22+). Install the build tooling with npm:

```
$ npm install
```

* `npm run build` - stamps the pinned Cesium version and a fresh cache-busting key into `index.html` and `setup.js`, then builds `eclipsetracks.min.js` and `vendor.min.js`. Run this after changing `setup.js`, upgrading dependencies, or regenerating `czml/` (the cache key also busts cached CZML/JSON files).
* `npm run watch` - build, then rebuild `eclipsetracks.min.js` whenever `setup.js` changes
* `npm run serve` - serve the site at <http://localhost:8000/>

To upgrade Cesium: `npm install cesium@latest`, then `npm run build` (the build fails if Cesium's CDN doesn't have the installed version).

## Deploying

Built files (`eclipsetracks.min.js`, `vendor.min.js`, stamped `index.html`) and generated data (`czml/`) are committed. Production deploys by pulling the latest `master`; no build tooling is needed on the server.

`eclipsescraper/.htaccess` denies all web access to the scraper. It only takes effect if the server allows `.htaccess` overrides for that directory (`AllowOverride AuthConfig` or `All`); otherwise deny `eclipsescraper/` in the vhost config.

## License

[Apache 2.0](LICENSE)
