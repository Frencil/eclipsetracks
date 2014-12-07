/*global defineSuite*/
defineSuite([
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/FeatureDetection',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Scene/OrthographicFrustum',
        'Scene/PerspectiveFrustum',
        'Scene/RectanglePrimitive',
        'Scene/SceneMode',
        'Specs/createScene',
        'Specs/destroyScene'
    ], 'Scene/Pick', function(
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        FeatureDetection,
        CesiumMath,
        Matrix4,
        Rectangle,
        OrthographicFrustum,
        PerspectiveFrustum,
        RectanglePrimitive,
        SceneMode,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var primitives;
    var camera;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.primitives;
        camera = scene.camera;
    });

    afterAll(function() {
        destroyScene(scene);
    });

    beforeEach(function() {
        camera.position = new Cartesian3(1.03, 0.0, 0.0);
        camera.direction = new Cartesian3(-1.0, 0.0, 0.0);
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);
        camera.transform = Matrix4.clone(Matrix4.IDENTITY);

        camera.frustum = new PerspectiveFrustum();
        camera.frustum.near = 0.01;
        camera.frustum.far = 2.0;
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;

        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);
    });

    afterEach(function() {
        primitives.removeAll();
    });

    function createRectangle() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        var e = new RectanglePrimitive({
            ellipsoid : ellipsoid,
            granularity : CesiumMath.toRadians(20.0),
            rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
            asynchronous : false
        });

        primitives.add(e);

        return e;
    }

    it('pick (undefined window position)', function() {
        expect(function() {
            scene.pick(undefined);
        }).toThrowDeveloperError();
    });

    it('is picked', function() {
        if (FeatureDetection.isInternetExplorer()) {
            // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
            return;
        }

        var rectangle = createRectangle();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle);
    });

    it('is not picked (show === false)', function() {
        var rectangle = createRectangle();
        rectangle.show = false;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject).not.toBeDefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        var rectangle = createRectangle();
        rectangle.material.uniforms.color.alpha = 0.0;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject).not.toBeDefined();
    });

    it('is picked (top primitive only)', function() {
        createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;

        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle2);
    });

    it('drill pick (undefined window position)', function() {
        expect(function() {
            scene.pick(undefined);
        }).toThrowDeveloperError();
    });

    it('drill pick (all picked)', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(2);
        expect(pickedObjects[0].primitive).toEqual(rectangle2);
        expect(pickedObjects[1].primitive).toEqual(rectangle1);
    });

    it('drill pick (show === false)', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;
        rectangle2.show = false;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(rectangle1);
    });

    it('drill pick (alpha === 0.0)', function() {
        var rectangle1 = createRectangle();
        var rectangle2 = createRectangle();
        rectangle2.height = 0.01;
        rectangle2.material.uniforms.color.alpha = 0.0;

        var pickedObjects = scene.drillPick(new Cartesian2(0, 0));
        expect(pickedObjects.length).toEqual(1);
        expect(pickedObjects[0].primitive).toEqual(rectangle1);
    });

    it('pick in 2D', function() {
        var ellipsoid = scene.mapProjection.ellipsoid;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);

        var rectangle = createRectangle();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle);
    });

    it('pick in 2D when rotated', function() {
        var ellipsoid = scene.mapProjection.ellipsoid;
        var maxRadii = ellipsoid.maximumRadius;

        camera.position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        camera.direction = Cartesian3.normalize(Cartesian3.negate(camera.position, new Cartesian3()), new Cartesian3());
        camera.up = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                       1.0, 0.0, 0.0, 0.0,
                                       0.0, 1.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0, 1.0);

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);

        var rectangle = createRectangle();
        var pickedObject = scene.pick(new Cartesian2(0, 0));
        expect(pickedObject.primitive).toEqual(rectangle);
    });
}, 'WebGL');
