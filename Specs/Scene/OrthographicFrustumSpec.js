/*global defineSuite*/
defineSuite([
        'Scene/OrthographicFrustum',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Math',
        'Core/Matrix4'
    ], function(
        OrthographicFrustum,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        CesiumMath,
        Matrix4) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var frustum, planes;

    beforeEach(function() {
        frustum = new OrthographicFrustum();
        frustum.near = 1.0;
        frustum.far = 3.0;
        frustum.right = 1.0;
        frustum.left = -1.0;
        frustum.top = 1.0;
        frustum.bottom = -1.0;
        planes = frustum.computeCullingVolume(new Cartesian3(), Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), Cartesian3.UNIT_Y).planes;
    });

    it('left greater than right causes an exception', function() {
        frustum.left = frustum.right + 1.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('bottom greater than top throws an exception', function() {
        frustum.bottom = frustum.top + 1.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('out of range near plane throws an exception', function() {
        frustum.near = -1.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();

        frustum.far = 3.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('negative far plane throws an exception', function() {
        frustum.far = -1.0;
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('computeCullingVolume with no position throws an exception', function() {
        expect(function() {
            return frustum.computeCullingVolume();
        }).toThrowDeveloperError();
    });

    it('computeCullingVolume with no direction throws an exception', function() {
        expect(function() {
            return frustum.computeCullingVolume(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('computeCullingVolume with no up throws an exception', function() {
        expect(function() {
            return frustum.computeCullingVolume(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('get frustum left plane', function() {
        var leftPlane = planes[0];
        var expectedResult = new Cartesian4(1.0, 0.0, 0.0, 1.0);
        expect(leftPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
    });

    it('get frustum right plane', function() {
        var rightPlane = planes[1];
        var expectedResult = new Cartesian4(-1.0, 0.0, 0.0, 1.0);
        expect(rightPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
    });

    it('get frustum bottom plane', function() {
        var bottomPlane = planes[2];
        var expectedResult = new Cartesian4(0.0, 1.0, 0.0, 1.0);
        expect(bottomPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
    });

    it('get frustum top plane', function() {
        var topPlane = planes[3];
        var expectedResult = new Cartesian4(0.0, -1.0, 0.0, 1.0);
        expect(topPlane).toEqual(expectedResult, CesiumMath.EPSILON4);
    });

    it('get frustum near plane', function() {
        var nearPlane = planes[4];
        var expectedResult = new Cartesian4(0.0, 0.0, -1.0, -1.0);
        expect(nearPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
    });

    it('get frustum far plane', function() {
        var farPlane = planes[5];
        var expectedResult = new Cartesian4(0.0, 0.0, 1.0, 3.0);
        expect(farPlane).toEqualEpsilon(expectedResult, CesiumMath.EPSILON4);
    });

    it('get orthographic projection matrix', function() {
        var projectionMatrix = frustum.projectionMatrix;
        var expected = Matrix4.computeOrthographicOffCenter(frustum.left, frustum.right, frustum.bottom, frustum.top, frustum.near, frustum.far, new Matrix4());
        expect(projectionMatrix).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('get pixel size throws without canvas dimensions', function() {
        expect(function() {
            return frustum.getPixelSize();
        }).toThrowDeveloperError();
    });

    it('get pixel size throws without canvas width less than or equal to zero', function() {
        expect(function() {
            return frustum.getPixelSize(new Cartesian2(0.0, 1.0));
        }).toThrowDeveloperError();
    });

    it('get pixel size throws without canvas height less than or equal to zero', function() {
        expect(function() {
            return frustum.getPixelSize(new Cartesian2(1.0, 0.0));
        }).toThrowDeveloperError();
    });

    it('get pixel size', function() {
        var pixelSize = frustum.getPixelSize(new Cartesian2(1.0, 1.0));
        expect(pixelSize.x).toEqual(2.0);
        expect(pixelSize.y).toEqual(2.0);
    });

    it('throws with undefined frustum parameters', function() {
        var frustum = new OrthographicFrustum();
        expect(function() {
            return frustum.projectionMatrix;
        }).toThrowDeveloperError();
    });

    it('clone', function() {
        var frustum2 = frustum.clone();
        expect(frustum).toEqual(frustum2);
    });

    it('clone with result parameter', function() {
        var result = new OrthographicFrustum();
        var frustum2 = frustum.clone(result);
        expect(frustum2).toBe(result);
        expect(frustum).toEqual(frustum2);
    });
});
