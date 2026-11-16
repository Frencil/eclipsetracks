const { src, dest, series, parallel, watch } = require('gulp');
const fs = require('fs');
const concat = require('gulp-concat');
const terser = require('gulp-terser');

// App-specific JS files to be watched and minified
const appJsFiles = ['./setup.js'];

// Vendor libraries come from node_modules and are bundled into vendor.min.js.
// Cesium is too large to bundle/commit, so it's served from Cesium's CDN at the
// exact version installed in node_modules (see stampVersions below).
const vendorJsFiles = ['./node_modules/lz-string/libs/lz-string.min.js'];

// Cache-busting key: local time to the second, e.g. 2026-11-02T16:57:04
function cacheKeyNow() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' +
        p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

// Cesium's CDN names releases major.minor (e.g. 1.147) unless there's a patch (e.g. 1.112.1)
function cesiumCdnVersion() {
    return require('cesium/package.json').version.replace(/\.0$/, '');
}

function cesiumCdnUrl(version) {
    return 'https://cesium.com/downloads/cesiumjs/releases/' + version + '/Build/Cesium/Cesium.js';
}

// Fail the build if the CDN doesn't have the installed Cesium version
async function checkCesiumCdn() {
    const url = cesiumCdnUrl(cesiumCdnVersion());
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) {
        throw new Error('Cesium CDN returned HTTP ' + res.status + ' for ' + url);
    }
}

function stamp(file, pattern, replacement) {
    const before = fs.readFileSync(file, 'utf8');
    if (!pattern.test(before)) {
        throw new Error('Pattern ' + pattern + ' not found in ' + file);
    }
    fs.writeFileSync(file, before.replace(pattern, replacement));
}

// Stamp a fresh cache key into setup.js (used for events/CZML/JSON fetches) and into
// the ?r= query strings in index.html, and stamp the installed Cesium version into the
// Cesium CDN URLs in index.html. Runs before the app bundle is built so the key is
// baked into eclipsetracks.min.js too.
function stampVersions(done) {
    const key = cacheKeyNow();
    const cesiumVersion = cesiumCdnVersion();
    stamp('./setup.js', /const cacheKey = "[^"]*";/, 'const cacheKey = "' + key + '";');
    stamp('./index.html', /(\.(?:css|js)\?r=)[^"']*/g, '$1' + key);
    stamp('./index.html', /(cesium\.com\/downloads\/cesiumjs\/releases\/)[^/]+/g, '$1' + cesiumVersion);
    console.log('Cache key: ' + key + ', Cesium: ' + cesiumVersion);
    done();
}

// Minify all app-specific JS into a single app file
function appJs() {
    return src(appJsFiles)
        .pipe(terser())
        .pipe(concat('eclipsetracks.min.js'))
        .pipe(dest('.'));
}

// Bundle vendor JS into a single vendor file
function vendorJs() {
    return src(vendorJsFiles)
        .pipe(concat('vendor.min.js'))
        .pipe(dest('.'));
}

// Rebuild the app file whenever its sources change
function watchApp() {
    watch(appJsFiles, appJs);
}

const build = series(checkCesiumCdn, stampVersions, parallel(appJs, vendorJs));

exports.app_js = appJs;
exports.vendor_js = vendorJs;
exports.stamp = stampVersions;
exports.build = build;
exports.watch = watchApp;
exports.default = series(build, watchApp);
