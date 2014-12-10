// Define API key
Cesium.BingMapsApi.defaultKey = "AmsUN3rpnZqwZnpvigSSuP0Xox53w8lgonqh8pORPGtD5R1qMrwnzotPwzr5eUVq";

// Top-level var for working with the Cesium viewer
var viewer = new Cesium.Viewer('cesiumContainer');

// Load 2017-08-21 eclipse track data
var czmlDataSource = new Cesium.CzmlDataSource();
czmlDataSource.loadUrl('data/2017-08-21.czml');
viewer.dataSources.add(czmlDataSource);
