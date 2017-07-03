"use strict";

// Global to track if we can use promises or not
var canUsePromises = false;
if (typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1){
    canUsePromises = true;
}
var json_reqs = [];

// Define API key
Cesium.BingMapsApi.defaultKey = "AmsUN3rpnZqwZnpvigSSuP0Xox53w8lgonqh8pORPGtD5R1qMrwnzotPwzr5eUVq";

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
	imageryProviderViewModels: availableBaseLayers,
	selectedImageryProviderViewModel: defaultImageryProviderViewModel
});

// Turn on day/night lighting
viewer.scene.globe.enableLighting = true;

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
                if (r == regions.length - 1){
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
                    eclipses.events[iso].json = JSON.parse(req.responseText);
                    eclipses.events[iso].region_string = eclipses.formatRegionString(eclipses.events[iso].json.regions);
                    eclipses.loadCurrentAndNavNoPromise();
                } catch(err) {
                    console.log("Unable to load " + iso + " JSON: " + err.message);
                }
            }
        };
        req.open("GET", this.events[iso].json_path + '?t=' + new Date().getTime());
        req.send();
        json_reqs.push(req);
    },

    loadCurrentAndNavNoPromise: function(){
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
            // Determine the target to load first (hash or the next occurring event)
            var target_iso = eclipses.hash();
            if (!target_iso){ target_iso = eclipses.current(); }
            // Render eclipse navigation
            this.renderNav(target_iso);
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
                          czml_path: czml_path, json_path: json_path, json: {}, json_req: json_req };

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
                    eclipses.events[iso].json = json;
                    eclipses.events[iso].region_string = eclipses.formatRegionString(eclipses.events[iso].json.regions);
                });

                // Determine the target to load first (hash or the next occurring event)
                var target_iso = eclipses.hash();
                if (!target_iso){ target_iso = eclipses.current(); }
                
                // Render eclipse navigation
                eclipses.renderNav(target_iso);
                
                // Render the most current event
                eclipses.renderEclipse(target_iso);
                
            }).catch(function(err) {
                console.log(err);
            });

        }

    },

    current: function(){

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

    hash: function(){
        var match = document.location.hash.match(/[\d-]+/);
        if (match != null && eclipses.isos.indexOf(match[0]) != -1){
            return match[0];
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

        // Load the new eclipse event
        var eclipse = this.events[iso];
        var czml_path = eclipse.czml_path;
        var czmlDataSource = new Cesium.CzmlDataSource();
        czmlDataSource.load(czml_path);
        viewer.dataSources.add(czmlDataSource);
        viewer.camera.flyTo({
            destination : Cesium.Cartesian3.fromDegrees(eclipse.json.camera_position[0],
                                                        eclipse.json.camera_position[1],
                                                        eclipse.json.camera_position[2])
        });
        var type = eclipse.json.type.ucwords();
        var date = this.formatDate(eclipse.date);
        var html = '<div class="row">'
                 + '<div class="col-xs-5"><h4><div class="label label-danger"><span class="icon-date"></span> Date</div></h4></div>'
                 + '<div class="col-xs-7"><h4><b>' + date + '</b></h4></div>'
                 + '</div><div class="row">'
                 + '<div class="col-xs-5"><h4><div class="label label-success"><span class="icon-type"></span> Eclipse Type</div></div>'
                 + '<div class="col-xs-7"><h4>' + type + '</h4></div>'
                 + '</div><div class="row">'
                 + '<div class="col-xs-5"><h4><div class="label label-info"><span class="icon-regions"></span> Regions</div></div>'
                 + '<div class="col-xs-7">' + eclipse.region_string + '</div>'
                 + '</div>';

        // Visually select/highlight everything
        document.getElementById("now_showing").innerHTML = html;
        document.getElementById("tr-"+iso).className = "warning";
        this.selected_iso = iso;

        // Write the hash to the document's location
        document.location.hash = "#" + iso;

        // Log the event in Piwik
        _paq.push(['trackPageView', '[Eclipse ISO] ' + iso]);

        return true;
    },

    renderNav: function(target_iso){

        var leave_expanded = parseInt(new Date().toISOString().substr(0,3)) * 10; // Curent decade
        if (typeof target_iso != "undefined"){ leave_expanded = parseInt(target_iso.substr(0,3)) * 10; }
        var collapse_decades = {};
        collapse_decades[leave_expanded] = false;

        var html = '<table class="table table-striped table-hover">';
        var rendering_decade = null;
        this.isos.forEach(function(iso){
            var eclipse = this.events[iso];
            if (eclipse == undefined || eclipse.json.type == undefined){
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
            var type = eclipse.json.type.ucwords();
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

        for (var decade in collapse_decades){
            if (collapse_decades[decade]){ this.toggleDecade(decade); }
        }
    },

    toggleDecade: function(decade){
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
