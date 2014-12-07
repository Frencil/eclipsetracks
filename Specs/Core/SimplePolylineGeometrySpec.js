/*global defineSuite*/
defineSuite([
        'Core/SimplePolylineGeometry',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/PrimitiveType'
    ], function(
        SimplePolylineGeometry,
        BoundingSphere,
        Cartesian3,
        Color,
        Ellipsoid,
        CesiumMath,
        PrimitiveType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws with no positions', function() {
        expect(function() {
            return new SimplePolylineGeometry();
        }).toThrowDeveloperError();
    });

    it('constructor throws with less than two positions', function() {
        expect(function() {
            return new SimplePolylineGeometry({
                positions : [Cartesian3.ZERO]
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with invalid number of colors', function() {
        expect(function() {
            return new SimplePolylineGeometry({
                positions : [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
                colors : []
            });
        }).toThrowDeveloperError();
    });

    it('constructor computes all vertex attributes', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var line = SimplePolylineGeometry.createGeometry(new SimplePolylineGeometry({
            positions : positions,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line.attributes.position.values).toEqualEpsilon([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0], CesiumMath.EPSILON10);
        expect(line.indices).toEqual([0, 1, 1, 2]);
        expect(line.primitiveType).toEqual(PrimitiveType.LINES);
        expect(line.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
    });

    it('constructor computes per segment colors', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var colors = [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0, 1.0)];
        var line = SimplePolylineGeometry.createGeometry(new SimplePolylineGeometry({
            positions : positions,
            colors : colors,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line.attributes.color).toBeDefined();

        var numVertices = (positions.length * 2 - 2);
        expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    });

    it('constructor computes per vertex colors', function() {
        var positions = [new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), new Cartesian3(0.0, 0.0, 1.0)];
        var colors = [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0, 1.0)];
        var line = SimplePolylineGeometry.createGeometry(new SimplePolylineGeometry({
            positions : positions,
            colors : colors,
            colorsPerVertex : true,
            granularity : Math.PI,
            ellipsoid: Ellipsoid.UNIT_SPHERE
        }));

        expect(line.attributes.color).toBeDefined();

        var numVertices = positions.length;
        expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    });


    it('constructor computes all vertex attributes, no subdivision', function() {
        var positions = [new Cartesian3(), new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(2.0, 0.0, 0.0)];
        var line = SimplePolylineGeometry.createGeometry(new SimplePolylineGeometry({
            positions : positions,
            followSurface: false
        }));

        expect(line.attributes.position.values).toEqual([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0]);
        expect(line.indices).toEqual([0, 1, 1, 2]);
        expect(line.primitiveType).toEqual(PrimitiveType.LINES);
        expect(line.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
    });

    it('constructor computes per segment colors, no subdivision', function() {
        var positions = [new Cartesian3(), new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(2.0, 0.0, 0.0)];
        var colors = [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0, 1.0)];
        var line = SimplePolylineGeometry.createGeometry(new SimplePolylineGeometry({
            positions : positions,
            colors : colors,
            followSurface: false
        }));

        expect(line.attributes.color).toBeDefined();

        var numVertices = (positions.length * 2 - 2);
        expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    });

    it('constructor computes per vertex colors, no subdivision', function() {
        var positions = [new Cartesian3(), new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(2.0, 0.0, 0.0)];
        var colors = [new Color(1.0, 0.0, 0.0, 1.0), new Color(0.0, 1.0, 0.0, 1.0), new Color(0.0, 0.0, 1.0, 1.0)];
        var line = SimplePolylineGeometry.createGeometry(new SimplePolylineGeometry({
            positions : positions,
            colors : colors,
            colorsPerVertex : true,
            followSurface: false
        }));

        expect(line.attributes.color).toBeDefined();

        var numVertices = positions.length;
        expect(line.attributes.color.values.length).toEqual(numVertices * 4);
    });
});