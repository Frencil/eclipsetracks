/*global defineSuite*/
defineSuite([
        'Core/PolylineVolumeOutlineGeometry',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/CornerType',
        'Core/Ellipsoid',
        'Specs/createPackableSpecs'
    ], function(
        PolylineVolumeOutlineGeometry,
        Cartesian2,
        Cartesian3,
        CornerType,
        Ellipsoid,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var shape;

    beforeAll(function() {
        shape = [new Cartesian2(-10000, -10000), new Cartesian2(10000, -10000), new Cartesian2(10000, 10000), new Cartesian2(-10000, 10000)];
    });

    it('throws without polyline positions', function() {
        expect(function() {
            return new PolylineVolumeOutlineGeometry({});
        }).toThrowDeveloperError();
    });

    it('throws without shape positions', function() {
        expect(function() {
            return new PolylineVolumeOutlineGeometry({
                polylinePositions: [new Cartesian3()]
            });
        }).toThrowDeveloperError();
    });

    it('createGeometry returnes undefined without 2 unique polyline positions', function() {
        var geometry = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions: [new Cartesian3()],
            shapePositions: shape
        }));
        expect(geometry).not.toBeDefined();
    });

    it('createGeometry returnes undefined without 3 unique shape positions', function() {
        var geometry = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions: [Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
            shapePositions: [Cartesian2.UNIT_X, Cartesian2.UNIT_X, Cartesian2.UNIT_X]
        }));
        expect(geometry).not.toBeDefined();
    });

    it('computes positions', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            shapePositions: shape,
            cornerType: CornerType.MITERED
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 6 * 4);
        expect(m.indices.length).toEqual(2 * 24 + 8);
    });

    it('computes positions, clockwise shape', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -35.0
            ]),
            shapePositions: shape.reverse(),
            cornerType: CornerType.MITERED
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 6 * 4);
        expect(m.indices.length).toEqual(2 * 24 + 8);
    });

    it('computes right turn', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                91.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 5 * 4);
        expect(m.indices.length).toEqual(2 * 24);
    });

    it('computes left turn', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0
            ]),
            cornerType: CornerType.MITERED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 5 * 4);
        expect(m.indices.length).toEqual(2 * 24);
    });

    it('computes with rounded corners', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                90.0, -30.0,
                90.0, -31.0,
                89.0, -31.0,
                89.0, -32.0
            ]),
            cornerType: CornerType.ROUNDED,
            shapePositions: shape
        }));

        var corners = 90/5*2;
        expect(m.attributes.position.values.length).toEqual(3 * (corners * 4 + 7 * 4));
        expect(m.indices.length).toEqual(2 * (corners * 4 + 6 * 4 + 8));
    });

    it('computes with beveled corners', function() {
        var m = PolylineVolumeOutlineGeometry.createGeometry(new PolylineVolumeOutlineGeometry({
            polylinePositions : Cartesian3.fromDegreesArray([
                 90.0, -30.0,
                 90.0, -31.0,
                 89.0, -31.0,
                 89.0, -32.0
            ]),
            cornerType: CornerType.BEVELED,
            shapePositions: shape
        }));

        expect(m.attributes.position.values.length).toEqual(3 * 20 * 2);
        expect(m.indices.length).toEqual(2 * 20 * 2 + 8);
    });

    var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
    var volumeShape = [new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)];
    var volume = new PolylineVolumeOutlineGeometry({
        polylinePositions : positions,
        cornerType: CornerType.BEVELED,
        shapePositions: volumeShape,
        ellipsoid : Ellipsoid.UNIT_SPHERE,
        granularity : 0.1
    });
    var packedInstance = [3.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 3.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.1];
    createPackableSpecs(PolylineVolumeOutlineGeometry, volume, packedInstance);
});