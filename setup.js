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

// Define camera
viewer.camera = new Cesium.Camera(viewer.scene);

// Module for loading and working with eclipses from local storage
eclipses = {

    isos: new Array(),
    events: new Object(),
    current_event_idx: -1,

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

    loadEvents: function() {

        // Initialize variables, read local storage
        var frame = document.getElementById("czml_events");
        var raw   = frame.contentWindow.document.body.childNodes[0].innerHTML;
        var lines = raw.split("\n");
        
        // Parse czml event data into usable array of objects
        for (var i = 0; i < lines.length; i++) {

            if (lines[i].indexOf(",") == -1) { continue; }

            // Parse the line into a fully formed object
            var parts = lines[i].split(",");
            var date  = new Date(parts[0]);
            var iso   = date.toISOString().substr(0,10);
            var czml  = 'czml/' + iso + '.czml';
            var json  = 'czml/' + iso + '.json';
            var json_req = new XMLHttpRequest();
            var event = { iso: iso, date: date, url: parts[1], czml_path: czml,
                          json_path: json, json_req: json_req, json: {} };
            var region_string = "";

            // Store events in an associative array with an iso index for walking
            this.isos.push(iso);
            this.events[iso] = event;

            // Load JSON metadata
            for (var j = 0; j < this.isos.length; j++){
                var iso = this.isos[j];
                this.events[iso].json_req.onreadystatechange = function(iso){
                    var req = eclipses.events[iso].json_req;
                    if (req.status == 200 && eclipses.isos.indexOf(iso) != -1){
                        try {
                            eclipses.events[iso].json = JSON.parse(req.responseText);
                            eclipses.events[iso].region_string = eclipses.formatRegionString(eclipses.events[iso].json.regions);
                        } catch(err) {
                            console.log("Unable to load " + iso + " JSON: " + err.message);
                        }
                    }
                    return false;
                }(iso);
                this.events[iso].json_req.open("GET", this.events[iso].json_path + '?t=' + new Date().getTime(), false);
                this.events[iso].json_req.send();
            }

        }

        // Render the most current event
        this.render(this.current());
        
    },

    current: function(){
        // TEMP: just return the 2015-03-20 event
        this.current_event_idx = 4;
        return this.isos[4];
    },

    render: function(iso){
        document.getElementById("now_showing").innerHTML = "<i>Loading...</i><br><br>";
        var eclipse = this.events[iso];
        if (viewer.dataSources.length > 0){
            viewer.dataSources.removeAll(true);
        }
        var czml_path = eclipse.czml_path;
        var czmlDataSource = new Cesium.CzmlDataSource();
        czmlDataSource.loadUrl(czml_path);
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
        document.getElementById("now_showing").innerHTML = html;
        this.nav();
    },

    nav: function(){
        var html = '<table class="table table-striped table-hover">';
        for (var e = 0; e < this.isos.length; e++){
            var iso = this.isos[e];
            var eclipse = this.events[iso];
            if (eclipse == undefined || eclipse.json.type == undefined){
                continue;
            }
            var date = this.formatDate(eclipse.date);
            var type = eclipse.json.type.ucwords();
            var row_class = '';
            if (e == this.current_event_idx){
                row_class = ' class="row-warning"';
            }
            html += '<tr' + row_class + '>'
                 +  '<td><b>' + date + '</b><br><div class="label label-primary"><span class="icon-type"></span> ' + type + '</div></td>'
                 +  '<td><small>' + eclipse.region_string + '</small></td>'
                 +  '</tr>';
        }
        html += '</table>';
        document.getElementById("other_eclipses").innerHTML = html;
    }
    
};

