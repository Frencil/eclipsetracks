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

    czml_isos: new Array(),
    czml_events: new Object(),
    current_event_idx: -1,

    load: function() {

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
            var event = { date: date, url: parts[1], czml: czml };

            // Store events in an associative array with an iso index for walking
            this.czml_isos.push(iso);
            this.czml_events[iso] = event;

        }

        // Render the most current event
        this.render(this.current());
        
    },

    current: function(){
        return this.czml_isos[0];
    },

    render: function(iso){
        var czml = this.czml_events[iso].czml;
        var czmlDataSource = new Cesium.CzmlDataSource();
        czmlDataSource.loadUrl(czml);
        viewer.dataSources.add(czmlDataSource);
        // TODO: obtain these values from the data source (somehow)
        viewer.camera.flyTo({
            destination : Cesium.Cartesian3.fromDegrees(-6.422, 64.568, 10000000.0)
        });

    }
    
};

