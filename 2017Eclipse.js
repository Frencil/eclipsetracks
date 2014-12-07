var viewer = new Cesium.Viewer('cesiumContainer', {
    // Set the clock to loop over the duration of the August 21, 2017 eclipse
    clock: new Cesium.Clock({
        startTime:   Cesium.JulianDate.fromIso8601('2017-08-21T16:50:00Z'),
        currentTime: Cesium.JulianDate.fromIso8601('2017-08-21T16:50:00Z'),
        stopTime:    Cesium.JulianDate.fromIso8601('2017-08-21T20:02:00Z'),
        clockRange:  Cesium.ClockRange.LOOP_STOP,
        clockStep:   Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
        multiplier:  300   
    })
});

// CSV of eclipse track data from here: http://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2017Aug21Tpath.html
// Data set truncated to only include lat/lon values for northern/southern limits and central line of the track,
// in addition to times in UTC
var eclipseTrackCSV = 'Time,NorthLimitLat,NorthLimitLon,SouthLimitLat,SouthLimitLon,CentralLat,CentralLon\n16:50,41 29.7N,164 30.3W,41 25.2N,161 24.4W,41 29.2N,162 51.0W\n16:52,42 51.3N,156 56.2W,42 27.3N,155 01.1W,42 39.8N,155 57.2W\n16:54,43 35.6N,152 06.3W,43 04.3N,150 32.9W,43 20.2N,151 18.6W\n16:56,44 06.0N,148 15.4W,43 30.0N,146 54.5W,43 48.2N,147 34.2W\n16:58,44 28.3N,144 57.9W,43 48.8N,143 45.9W,44 08.8N,144 21.3W\n17:00,44 45.1N,142 02.8W,44 02.9N,140 57.8W,44 24.1N,141 29.7W\n17:02,44 57.8N,139 24.0W,44 13.2N,138 24.8W,44 35.6N,138 53.8W\n17:04,45 07.2N,136 57.8W,44 20.7N,136 03.7W,44 44.1N,136 30.2W\n17:06,45 14.0N,134 41.7W,44 25.7N,133 52.2W,44 49.9N,134 16.5W\n17:08,45 18.5N,132 34.1W,44 28.7N,131 48.8W,44 53.7N,132 11.0W\n17:10,45 21.0N,130 33.6W,44 30.0N,129 52.2W,44 55.6N,130 12.5W\n17:12,45 21.9N,128 39.3W,44 29.6N,128 01.6W,44 55.8N,128 20.0W\n17:14,45 21.3N,126 50.4W,44 28.0N,126 16.2W,44 54.7N,126 32.9W\n17:16,45 19.3N,125 06.3W,44 25.1N,124 35.5W,44 52.2N,124 50.5W\n17:18,45 16.2N,123 26.5W,44 21.0N,122 58.9W,44 48.6N,123 12.3W\n17:20,45 11.9N,121 50.6W,44 16.0N,121 26.0W,44 44.0N,121 38.0W\n17:22,45 06.6N,120 18.3W,44 10.0N,119 56.6W,44 38.3N,120 07.2W\n17:24,45 00.4N,118 49.2W,44 03.2N,118 30.4W,44 31.8N,118 39.5W\n17:26,44 53.3N,117 23.1W,43 55.6N,117 07.0W,44 24.4N,117 14.8W\n17:28,44 45.3N,115 59.8W,43 47.2N,115 46.3W,44 16.3N,115 52.8W\n17:30,44 36.7N,114 39.0W,43 38.2N,114 28.1W,44 07.4N,114 33.3W\n17:32,44 27.3N,113 20.7W,43 28.5N,113 12.2W,43 57.9N,113 16.2W\n17:34,44 17.3N,112 04.6W,43 18.2N,111 58.5W,43 47.7N,112 01.3W\n17:36,44 06.6N,110 50.5W,43 07.3N,110 46.8W,43 37.0N,110 48.5W\n17:38,43 55.4N,109 38.5W,42 55.8N,109 37.0W,43 25.6N,109 37.6W\n17:40,43 43.6N,108 28.3W,42 43.9N,108 29.0W,43 13.7N,108 28.5W\n17:42,43 31.3N,107 19.9W,42 31.4N,107 22.6W,43 01.3N,107 21.1W\n17:44,43 18.4N,106 13.1W,42 18.5N,106 17.9W,42 48.5N,106 15.4W\n17:46,43 05.1N,105 07.9W,42 05.2N,105 14.6W,42 35.1N,105 11.2W\n17:48,42 51.3N,104 04.2W,41 51.4N,104 12.8W,42 21.3N,104 08.4W\n17:50,42 37.1N,103 01.9W,41 37.2N,103 12.3W,42 07.1N,103 07.0W\n17:52,42 22.5N,102 00.9W,41 22.6N,102 13.1W,41 52.5N,102 06.9W\n17:54,42 07.4N,101 01.2W,41 07.7N,101 15.1W,41 37.5N,101 08.1W\n17:56,41 52.0N,100 02.6W,40 52.3N,100 18.2W,41 22.1N,100 10.4W\n17:58,41 36.2N,099 05.2W,40 36.7N,099 22.4W,41 06.4N,099 13.8W\n18:00,41 20.0N,098 08.9W,40 20.6N,098 27.7W,40 50.3N,098 18.3W\n18:02,41 03.5N,097 13.6W,40 04.3N,097 33.9W,40 33.9N,097 23.7W\n18:04,40 46.6N,096 19.3W,39 47.6N,096 41.0W,40 17.1N,096 30.1W\n18:06,40 29.4N,095 25.9W,39 30.7N,095 49.0W,40 00.0N,095 37.4W\n18:08,40 11.9N,094 33.3W,39 13.4N,094 57.8W,39 42.6N,094 45.6W\n18:10,39 54.1N,093 41.6W,38 55.8N,094 07.3W,39 24.9N,093 54.5W\n18:12,39 35.9N,092 50.6W,38 38.0N,093 17.6W,39 07.0N,093 04.2W\n18:14,39 17.5N,092 00.4W,38 19.9N,092 28.6W,38 48.7N,092 14.6W\n18:16,38 58.8N,091 10.9W,38 01.5N,091 40.3W,38 30.1N,091 25.6W\n18:18,38 39.8N,090 22.0W,37 42.8N,090 52.5W,38 11.3N,090 37.3W\n18:20,38 20.5N,089 33.7W,37 23.9N,090 05.3W,37 52.2N,089 49.6W\n18:22,38 00.9N,088 46.0W,37 04.7N,089 18.6W,37 32.8N,089 02.4W\n18:24,37 41.1N,087 58.8W,36 45.2N,088 32.5W,37 13.2N,088 15.7W\n18:26,37 21.0N,087 12.1W,36 25.5N,087 46.7W,36 53.3N,087 29.5W\n18:28,37 00.7N,086 25.9W,36 05.6N,087 01.4W,36 33.1N,086 43.7W\n18:30,36 40.1N,085 40.0W,35 45.4N,086 16.4W,36 12.7N,085 58.3W\n18:32,36 19.2N,084 54.6W,35 24.9N,085 31.8W,35 52.1N,085 13.3W\n18:34,35 58.1N,084 09.4W,35 04.2N,084 47.5W,35 31.2N,084 28.6W\n18:36,35 36.7N,083 24.6W,34 43.3N,084 03.5W,35 10.0N,083 44.1W\n18:38,35 15.1N,082 40.0W,34 22.1N,083 19.6W,34 48.6N,082 59.9W\n18:40,34 53.2N,081 55.6W,34 00.6N,082 36.0W,34 26.9N,082 15.9W\n18:42,34 31.1N,081 11.4W,33 39.0N,081 52.5W,34 05.0N,081 32.1W\n18:44,34 08.7N,080 27.4W,33 17.0N,081 09.2W,33 42.9N,080 48.4W\n18:46,33 46.0N,079 43.4W,32 54.9N,080 25.9W,33 20.5N,080 04.7W\n18:48,33 23.1N,078 59.5W,32 32.4N,079 42.6W,32 57.8N,079 21.2W\n18:50,32 59.9N,078 15.6W,32 09.8N,078 59.3W,32 34.9N,078 37.6W\n18:52,32 36.5N,077 31.7W,31 46.8N,078 16.0W,32 11.7N,077 54.0W\n18:54,32 12.7N,076 47.7W,31 23.6N,077 32.6W,31 48.2N,077 10.3W\n18:56,31 48.7N,076 03.6W,31 00.2N,076 49.0W,31 24.5N,076 26.5W\n18:58,31 24.5N,075 19.4W,30 36.4N,076 05.3W,31 00.5N,075 42.4W\n19:00,30 59.9N,074 34.9W,30 12.4N,075 21.3W,30 36.2N,074 58.2W\n19:02,30 35.1N,073 50.1W,29 48.1N,074 37.0W,30 11.6N,074 13.7W\n19:04,30 09.9N,073 05.0W,29 23.5N,073 52.4W,29 46.8N,073 28.8W\n19:06,29 44.4N,072 19.5W,28 58.6N,073 07.4W,29 21.6N,072 43.6W\n19:08,29 18.7N,071 33.6W,28 33.4N,072 21.9W,28 56.1N,071 57.9W\n19:10,28 52.5N,070 47.1W,28 07.9N,071 35.8W,28 30.3N,071 11.6W\n19:12,28 26.1N,070 00.1W,27 42.0N,070 49.2W,28 04.1N,070 24.8W\n19:14,27 59.2N,069 12.3W,27 15.8N,070 01.9W,27 37.6N,069 37.3W\n19:16,27 32.0N,068 23.9W,26 49.3N,069 13.8W,27 10.7N,068 49.0W\n19:18,27 04.4N,067 34.5W,26 22.3N,068 24.8W,26 43.5N,067 59.8W\n19:20,26 36.4N,066 44.2W,25 55.0N,067 34.9W,26 15.8N,067 09.7W\n19:22,26 08.0N,065 52.8W,25 27.2N,066 43.9W,25 47.7N,066 18.5W\n19:24,25 39.0N,065 00.2W,24 59.0N,065 51.7W,25 19.1N,065 26.1W\n19:26,25 09.6N,064 06.2W,24 30.3N,064 58.2W,24 50.0N,064 32.3W\n19:28,24 39.7N,063 10.7W,24 01.1N,064 03.1W,24 20.5N,063 37.1W\n19:30,24 09.1N,062 13.5W,23 31.3N,063 06.4W,23 50.3N,062 40.1W\n19:32,23 38.0N,061 14.4W,23 00.9N,062 07.7W,23 19.6N,061 41.2W\n19:34,23 06.1N,060 13.1W,22 29.9N,061 07.0W,22 48.1N,060 40.2W\n19:36,22 33.5N,059 09.3W,21 58.2N,060 03.7W,22 16.0N,059 36.7W\n19:38,22 00.1N,058 02.7W,21 25.8N,058 57.7W,21 43.1N,058 30.4W\n19:40,21 25.8N,056 52.8W,20 52.4N,057 48.5W,21 09.2N,057 20.8W\n19:42,20 50.4N,055 39.1W,20 18.1N,056 35.7W,20 34.4N,056 07.6W\n19:44,20 13.9N,054 21.0W,19 42.7N,055 18.5W,19 58.4N,054 49.9W\n19:46,19 36.0N,052 57.5W,19 05.9N,053 56.1W,19 21.1N,053 27.0W\n19:48,18 56.4N,051 27.6W,18 27.7N,052 27.6W,18 42.2N,051 57.8W\n19:50,18 14.8N,049 49.7W,17 47.6N,050 51.4W,18 01.4N,050 20.7W\n19:52,17 30.8N,048 01.4W,17 05.3N,049 05.4W,17 18.2N,048 33.6W\n19:54,16 43.5N,045 59.4W,16 20.0N,047 06.5W,16 31.9N,046 33.2W\n19:56,15 51.6N,043 37.6W,15 30.7N,044 49.6W,15 41.3N,044 14.0W\n19:58,14 52.6N,040 44.4W,14 35.2N,042 04.7W,14 44.2N,041 25.1W\n20:00,13 39.6N,036 48.6W,13 28.6N,038 28.0W,13 34.6N,037 39.5W';

// Convert the CSV-formatted string for all eclipse track times and waypoints to an
// object that structures the data such that it can be easily passed into API methods
var eclipseTracks = {
    'csvData': [],
    'northPositions': [],
    'southPositions': [],
    'centralPositions': []
}
var csvRows = eclipseTrackCSV.split('\n');
var csvLabels = csvRows[0].split(',');
for (var i = 1; i < csvRows.length; i++){
    var csvRow = csvRows[i].split(',');
    var csvRowObject = new Object();
    for (var j = 0; j < csvLabels.length; j++){
        // In our data set we have time and lat/lon values. Only time can be copied to the
        // data object without interpretation; the lat/lon values need to be cleaned up.
        if (csvLabels[j] == 'Time'){
            csvRowObject[csvLabels[j]] = csvRow[j];
        } else {
            var waypointObject = csvRow[j].split(' ');
            var waypointValue  = parseFloat(waypointObject[0]) + (parseFloat(waypointObject[1])/60);
            if (waypointObject[1].indexOf('W') != -1){ waypointValue *= -1; }
            csvRowObject[csvLabels[j]] = waypointValue;
        }
    }
    eclipseTracks.csvData.push(csvRowObject);
    eclipseTracks.northPositions.push(csvRowObject.NorthLimitLon,csvRowObject.NorthLimitLat)
    eclipseTracks.southPositions.push(csvRowObject.SouthLimitLon,csvRowObject.SouthLimitLat)
    eclipseTracks.centralPositions.push(csvRowObject.CentralLon,csvRowObject.CentralLat)
}

// Build a polyline for each of the northern limit, southern limit, and central eclipse track lines.
var trackPolylines = viewer.scene.primitives.add(new Cesium.PolylineCollection());

var northLimitTrackPolyline = trackPolylines.add({
    positions: Cesium.Cartesian3.fromDegreesArray(eclipseTracks.northPositions),
    material: Cesium.Material.fromType('Color', {
        color: new Cesium.Color(1.0, 1.0, 1.0, 1.0)
    })
});

var southLimitTrackPolyline = trackPolylines.add({
    positions: Cesium.Cartesian3.fromDegreesArray(eclipseTracks.southPositions),
    material: Cesium.Material.fromType('Color', {
        color: new Cesium.Color(1.0, 1.0, 1.0, 1.0)
    })
});

var centralTrackPolyline = trackPolylines.add({
    positions: Cesium.Cartesian3.fromDegreesArray(eclipseTracks.centralPositions),
    width: 5,
    material: Cesium.Material.fromType(Cesium.Material.PolylineGlowType)
});
