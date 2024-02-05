"use strict";

// Global to track if we can use promises or not
var canUsePromises = false;
if (typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1){
    canUsePromises = true;
}
var json_reqs = [];

// Define API key
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwZTg5YWQ4MC1lYjRiLTQ5MTItODZmYS01MTUzMzI0ODc5NDMiLCJpZCI6MTkzNTA3LCJpYXQiOjE3MDY4NDk3MzR9.TRMsdXhzoDwuo6OGLTF0JdJA0aOePU52H-mKy0ZgihI";

// Handy function to capitalize words in strings
String.prototype.ucwords = function(){
    return this.toLowerCase().replace(/\b[a-z]/g, function(letter) { return letter.toUpperCase(); });
};

// Get the default list of available imagery providers.
var availableBaseLayers = Cesium.createDefaultImageryProviderViewModels();
// Select the second entry, Bing maps with Labels turned on.
var defaultImageryProviderViewModel = availableBaseLayers[1];

// Top-level var for working with the Cesium viewer
var viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
	imageryProviderViewModels: availableBaseLayers,
	selectedImageryProviderViewModel: defaultImageryProviderViewModel
});

// Add Cesium OSM Buildings, a global 3D buildings layer.
//const buildingTileset = await Cesium.createOsmBuildingsAsync();
//viewer.scene.primitives.add(buildingTileset);   

// Turn on day/night lighting
viewer.scene.globe.enableLighting = true;

// Whether we've tried to load the view state from the hash. Only ever do this exactly
// once on page load _and_ don't also do a "fly-to" when doing it.
var hasTriedToLoadUrlHash = false;
var urlLoadHashSucceeded = undefined;
var hasDeferredMoveEndFromUrlHashLoad = false;

// Module for loading and working with eclipses from local storage
var eclipses = {

    isos: new Array(),
    events: new Object(),
    selected_iso: null,

    // Thanks for making me define this for you, Javascript. =/
    formatDate: function(date) {
        var months = ["January", "February", "March", "April",
                      "May", "June", "July", "August",
                      "September", "October", "November", "December"];
        return months[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
    },

    formatRegionString: function(regions) {
        if (regions.length > 0){
            var region_string = "";
            for (var r = 0; r < regions.length; r++){
                if (r > 0 && regions.length > 2){
                    region_string += ", ";
                }
                if ((r == regions.length - 1) && (regions.length > 1)){
                    region_string += " and ";
                }
                region_string += regions[r].ucwords();
            }
        } else {
            var region_string = "None";
        }
        return region_string;
    },

    loadJSONPromise: function(url) {
        return new Promise(function(resolve, reject) {
            var req = new XMLHttpRequest();
            req.open('GET', url);
            
            req.onload = function() {
                if (req.status == 200) {
                    resolve(req.response);
                } else {
                    reject(Error(req.statusText));
                }
            };
            
            req.onerror = function() {
                reject(Error("Network Error"));
            };
            
            req.send();
        });
    },

    loadJSONnoPromise: function(iso) {
        var req = new XMLHttpRequest();
        req.onload = function(){
            if (req.status == 200){
                try {
                    var json = JSON.parse(req.responseText);
                    var iso  = json.iso;
                    eclipses.events[iso].type = json.type;
                    eclipses.events[iso].regions = json.regions;
                    eclipses.events[iso].camera_position = json.camera_position;
                    eclipses.events[iso].region_string = eclipses.formatRegionString(eclipses.events[iso].regions);
                    eclipses.loadCurrentAndNavNoPromise();
                } catch(err) {
                    console.warn("Unable to load " + iso + " JSON: " + err.message);
                }
            }
        };
        req.open("GET", this.events[iso].json_path + '?t=' + new Date().getTime());
        req.send();
        json_reqs.push(req);
    },

    loadCurrentAndNavNoPromise: function() {
        var all_loaded = true;
        for (var i = 0; i < eclipses.isos.length; i++){
            if (typeof json_reqs[i] == "undefined"){
                all_loaded = false;
                break;
            } else if (json_reqs[i].status != 200){
                all_loaded = false;
                break;
            }
        }
        if (all_loaded){
            // Determine the target to load first (from URL or the next occurring event)
            var target_iso = eclipses.getIsoToShow();
            if (!target_iso){ target_iso = eclipses.getNearestFutureIso(); }
            // Render eclipse navigation
            this.renderNav(target_iso);
            // Scroll the nav to the current event
            this.navCenterScroll(target_iso);
            // Render the most current event
            this.renderEclipse(target_iso);
        }
    },

    loadEvents: function() {
        var promises = [];

        // Initialize variables, read local storage
        var frame = document.getElementById("czml_events");
        var raw   = frame.contentWindow.document.body.childNodes[0].innerHTML;
        var lines = raw.split("\n");
        
        // Parse czml event data into usable array of objects
        for (var i = 0; i < lines.length; i++) {

            if (lines[i].indexOf(",") == -1) { continue; }

            var parts = lines[i].split(",");

            // Some events are known bad (they freeze Cesium) so let's skip those
            if (parts[2] == 'bad'){ continue; }

            // Parse the line into a fully formed object
            var date  = new Date(parts[0]);
            var iso   = date.toISOString().substr(0,10);
            var czml_path = 'czml/' + iso + '.czml';
            var json_path = 'czml/' + iso + '.json';
            var json_req = new XMLHttpRequest();
            var event = { iso: iso, date: date, url: parts[1], region_string: '',
                          czml_path: czml_path, json_path: json_path, json_req: json_req };

            // Store events in an associative array with an iso index for walking
            this.isos.push(iso);
            this.events[iso] = event;

            // Load JSON for the event
            if (canUsePromises){
                promises.push(this.loadJSONPromise(json_path));
            } else {
                this.loadJSONnoPromise(iso);
            }

        }

        if (canUsePromises){

            Promise.all(promises).then(function(dataArray) {
            
                dataArray.forEach(function(data) {
                    var json = JSON.parse(data);
                    var iso  = json.iso;
                    eclipses.events[iso].type = json.type;
                    eclipses.events[iso].regions = json.regions;
                    eclipses.events[iso].camera_position = json.camera_position;
                    eclipses.events[iso].region_string = eclipses.formatRegionString(eclipses.events[iso].regions);
                });

                // Determine the target to load first (from URL or the next occurring event)
                var target_iso = eclipses.getIsoToShow();
                if (!target_iso){ target_iso = eclipses.getNearestFutureIso(); }
                
                // Render eclipse navigation
                eclipses.renderNav(target_iso);

                // Scroll the nav to the current event
                eclipses.navCenterScroll(target_iso);
                
                // Render the most current event
                eclipses.renderEclipse(target_iso);
                
            }).catch(function(err) {
                console.error(err);
            });

        }

    },

    getNearestFutureIso: function() {
        var today = new Date().toISOString().substr(0,10);
        var current = null;

        for (var i = 0; i < this.isos.length; i++){
            if (this.isos[i] > today && current == null){
                current = this.isos[i];
            }
        }
        if (current == null){
            current = this.isos[this.isos.length-1];
        }

        return current;

    },

    getIsoToShow: function() {
        // For many years the URL format was `#<iso>`. Now with URL camera/clock state
        // hashing it's `?<iso>#<stateHash>`. This logic here handles legacy URLs using
        // the hash for the iso.
        var legacyMatch = document.location.hash.match(/^#([\d]{4}-[\d]{2}-[\d]{2})$/);
        if (legacyMatch && eclipses.isos.indexOf(legacyMatch[1]) != -1) {
            window.history.pushState(
                legacyMatch[1],
                "EclipseTracks.org | " + legacyMatch[1] + " Solar Eclipse",
                "?show=" + legacyMatch[1]
            );
            return legacyMatch[1];
        }
        // Look for the iso where we expect it in the search.
        var searchMatch = document.location.search.match(/show=([\d]{4}-[\d]{2}-[\d]{2})/);
        if (searchMatch && eclipses.isos.indexOf(searchMatch[1]) != -1) {
            return searchMatch[1];
        }
        return null;
    },

    renderEclipse: function(iso){

        if (!this.events[iso]){
            console.error('Unable to render iso: ' + iso);
            return false;
        }
        if (this.selected_iso == iso){
            return false;
        }

        // Visually deselect/dehighlight everything
        if (iso){
            var qs = document.querySelectorAll("tr.warning");
            for (var row in qs) if (qs.hasOwnProperty(row)) {
                qs[row].className = "eclipse";
            }
            document.getElementById("now_showing").innerHTML = "<h4>Loading...</h4>";
        }
        viewer.dataSources.removeAll(true);

        // Set the new eclipse as selected
        var eclipse = this.events[iso];
        this.selected_iso = iso;

        // Load CZML into the viewer and set viewer camera/clock from hash if necessary
        var czml_path = eclipse.czml_path;
        var czmlDataSource = new Cesium.CzmlDataSource();
        czmlDataSource.load(czml_path).then(function() {
            var shouldFlyTo = true;
            if (!hasTriedToLoadUrlHash) {
                hashToViewer();
                if (urlLoadHashSucceeded) { shouldFlyTo = false; }
            }
            if (shouldFlyTo) {
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                        eclipse.camera_position[0],
                        eclipse.camera_position[1],
                        eclipse.camera_position[2]
                    )
                });
                // Start the clock when flying to a new event
                viewer.clock.shouldAnimate = true;
            }
        });
        viewer.dataSources.add(czmlDataSource);

        // Visually select/highlight everything
        var type = eclipse.type.ucwords();
        var date = this.formatDate(eclipse.date);
        var html = '<div class="row">'
                 + '<div class="col-xs-4"><h4><div class="label label-danger"><span class="icon-date"></span> Date</div></h4></div>'
                 + '<div class="col-xs-8"><h4><b>' + date + '</b></h4></div>'
                 + '</div><div class="row">'
                 + '<div class="col-xs-4"><h4><div class="label label-success"><span class="icon-type"></span> Type</div></div>'
                 + '<div class="col-xs-8"><h4>' + type + '</h4></div>'
                 + '</div><div class="row">'
                 + '<div class="col-xs-4"><h4><div class="label label-info"><span class="icon-regions"></span> Regions</div></div>'
                 + '<div class="col-xs-8" style="font-size: 13px;">' + eclipse.region_string + '</div>'
                 + '</div>';
        document.getElementById("now_showing").innerHTML = html;
        document.getElementById("tr-"+iso).className = "warning";

        // Write the iso to the document's search
        window.history.pushState(
            iso,
            "EclipseTracks.org | " + iso + " " + type + " Solar Eclipse",
            "?show=" + iso + document.location.hash
        );

        // Log the event in Piwik
        _paq.push(['trackPageView', '[Eclipse ISO] ' + iso]);

        return true;
    },

    renderNav: function(target_iso) {

        var leave_expanded = parseInt(new Date().toISOString().substr(0,3)) * 10; // Curent decade
        if (typeof target_iso != "undefined"){ leave_expanded = parseInt(target_iso.substr(0,3)) * 10; }
        var collapse_decades = {};
        collapse_decades[leave_expanded] = false;

        var html = '<table class="table table-striped table-hover">';
        var rendering_decade = null;
        this.isos.forEach(function(iso){
            var eclipse = this.events[iso];
            if (eclipse == undefined || eclipse.type == undefined){
                return;
            }

            // Resolve decade and render decade header if necessary
            var event_decade = parseInt(iso.substr(0,3)) * 10;
            collapse_decades[event_decade] = (collapse_decades[event_decade] === false ? false : true);
            if (event_decade != rendering_decade){
                var event_decade_title = event_decade + " - " + (event_decade + 9);
                rendering_decade = event_decade;
                html += '<tr id="tr-decade-' + event_decade + '" class="active decade expanded" onclick="eclipses.toggleDecade(\'' + event_decade + '\')">'
                     +  '<td colspan="2"><span>' + event_decade_title + '</span></td>'
                     +  '</tr>';
            }            

            // Format and render event row
            var date = this.formatDate(eclipse.date);
            var type = eclipse.type.ucwords();
            var tr_class = 'eclipse';
            var tr_onclick = 'eclipses.renderEclipse(\'' + iso + '\');';
            if (iso == this.selected_iso){
                tr_class = 'warning';
            }
            html += '<tr id="tr-' + iso + '" class="' + tr_class + '" data-decade="' + event_decade + '" onclick="' + tr_onclick + '" >'
                 +  '<td><b>' + date + '</b><br><div class="label label-primary"><span class="icon-type"></span> ' + type + '</div></td>'
                 +  '<td><small>' + eclipse.region_string + '</small></td>'
                 +  '</tr>';
        }.bind(this));
        html += '</table>';
        document.getElementById("other_eclipses").innerHTML = html;

        // Collapse all the decades that should be collapsed
        for (var decade in collapse_decades){
            if (collapse_decades[decade]){ this.toggleDecade(decade); }
        }

    },

    navCenterScroll: function(iso) {
        if (!this.events[iso]){
            return false;
        }
        var row = document.getElementById("tr-" + iso);
        var nav = document.getElementById("other_eclipses");
        nav.scrollTop = (row.offsetTop + row.offsetHeight) - Math.round(nav.clientHeight / 2);
    },

    toggleDecade: function(decade) {
        if (!decade){ return null; }
        var header = document.getElementById("tr-decade-" + decade);
        if (!header){ return null; }
        var status = header.className.indexOf("expanded") == -1 ? "collapsed" : "expanded";
        var qs = document.querySelectorAll("[data-decade='" + decade + "']");
        if (status == "expanded"){
            header.className = "active decade collapsed";
            for (var row in qs) if (qs.hasOwnProperty(row)) {
                qs[row].style.display = "none";
            }
        } else {
            header.className = "active decade expanded";
            for (var row in qs) if (qs.hasOwnProperty(row)) {
                qs[row].style.display = "table-row";
            }
        }
    }
    
};

// URL State Hashing
// =================
// The following functions and definitions set up hashing of particular viewer state to
// the URL whenever a move event ends. In turn when the page is first loaded we parse
// any hash present and, if valid, set applicable viewer state with no transitioning.

function viewerToHash() {
    // Supported types:
    // - Integer: apply as precision to numeric value
    // - Function: use output of function with raw value as input
    var viewerToHashValueMap = [
        6, // position.x
        6, // position.y
        6, // position.z
        7, // direction.x
        7, // direction.y
        7, // direction.z
        7, // up.x
        7, // up.y
        7, // up.z
        null, // _currentTime.dayNumber
        function(v){ return Math.round(v); }, // _currentTime.secondsOfDay
        function(v){ return v ? 1 : 0; }, // shouldAnimate
    ];
    return LZString.compressToEncodedURIComponent(
        JSON.stringify(
            [
                viewer.camera.position.x,
                viewer.camera.position.y,
                viewer.camera.position.z,
                viewer.camera.direction.x,
                viewer.camera.direction.y,
                viewer.camera.direction.z,
                viewer.camera.up.x,
                viewer.camera.up.y,
                viewer.camera.up.z,
                viewer.clock._currentTime.dayNumber,
                viewer.clock._currentTime.secondsOfDay,
                viewer.clock.shouldAnimate ? 1 : 0,
            ].map(function(value, idx) {
                var mapValue = viewerToHashValueMap[idx];
                if (Number.isInteger(mapValue)) {
                    return value.toPrecision(mapValue);
                }
                if (typeof mapValue == "function") {
                    return mapValue(value);
                }
                return value;
            })
        )
    );
}

function hashToViewer() {
    hasTriedToLoadUrlHash = true;
    var decompressedString = LZString.decompressFromEncodedURIComponent(
        document.location.hash.slice(1)
    );
    if (!decompressedString || !decompressedString.length) {
        urlLoadHashSucceeded = false;
        return;
    }
    try {
        var values = JSON.parse(decompressedString);
    } catch (e) {
        urlLoadHashSucceeded = false;
        return;
    }
    if (
        values.length != 12 ||
        values.some(function(v) { return !Number.isFinite(parseFloat(v)); })
    ) {
        urlLoadHashSucceeded = false;
        return;
    }

    var floats = values.map(function(v) {
        return parseFloat(v);
    });
    viewer.camera.setView({
        destination: new Cesium.Cartesian3(floats[0], floats[1], floats[2]),
        orientation: {
            direction: new Cesium.Cartesian3(floats[3], floats[4], floats[5]),
            up: new Cesium.Cartesian3(floats[6], floats[7], floats[8]),
        },
    });
    viewer.clock._currentTime.dayNumber = floats[9];
    viewer.clock._currentTime.secondsOfDay = floats[10];
    viewer.clock.shouldAnimate = (values[11] == 1);

    urlLoadHashSucceeded = true;
}

// Update the hash on any complete move of the camera
viewer.camera.moveEnd.addEventListener(function() {
    var currentTrack = eclipses.events[eclipses.selected_iso];
    if (currentTrack) {
        if (urlLoadHashSucceeded && !hasDeferredMoveEndFromUrlHashLoad) {
            hasDeferredMoveEndFromUrlHashLoad = true;
            return;
        }
        window.history.pushState(
            currentTrack.iso,
            "EclipseTracks.org | " +  + " " + currentTrack.type + " Solar Eclipse",
            "?show=" + currentTrack.iso + "#" + viewerToHash()
        );
    }
});
