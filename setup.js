// Define API key
Cesium.BingMapsApi.defaultKey = "AmsUN3rpnZqwZnpvigSSuP0Xox53w8lgonqh8pORPGtD5R1qMrwnzotPwzr5eUVq";

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

    load_events: function() {

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

            // Store events in an associative array with an iso index for walking
            this.isos.push(iso);
            this.events[iso] = event;

            // Load JSON metadata
            for (var i = 0; i < this.isos.length; i++){
                var iso = this.isos[i];
                this.events[iso].json_req.onreadystatechange = function(iso){
                    var req = eclipses.events[iso].json_req;
                    if (req.status == 200 && eclipses.isos.indexOf(iso) != -1){
                        try {
                            eclipses.events[iso].json = JSON.parse(req.responseText);
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

    load_json: function() {
        
        

    },

    current: function(){
        // TEMP: just return the 2015-03-20 event
        return this.isos[3];
    },

    render: function(iso){
        var czml_path = this.events[iso].czml_path;
        var czmlDataSource = new Cesium.CzmlDataSource();
        czmlDataSource.loadUrl(czml_path);
        viewer.dataSources.add(czmlDataSource);
        viewer.camera.flyTo({
            destination : Cesium.Cartesian3.fromDegrees(this.events[iso].json.camera_position[0],
                                                        this.events[iso].json.camera_position[1],
                                                        this.events[iso].json.camera_position[2])
        });

    }
    
};

