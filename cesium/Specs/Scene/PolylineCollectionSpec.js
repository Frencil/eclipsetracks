/*global defineSuite*/
defineSuite([
        'Scene/PolylineCollection',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Math',
        'Renderer/ClearCommand',
        'Scene/Material',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/pick',
        'Specs/render'
    ], function(
        PolylineCollection,
        BoundingSphere,
        Cartesian3,
        Color,
        CesiumMath,
        ClearCommand,
        Material,
        SceneMode,
        createCamera,
        createContext,
        createFrameState,
        createScene,
        pick,
        render) {
    "use strict";
    /*global it,expect,beforeEach,afterEach,beforeAll,afterAll*/

    var context;
    var frameState;
    var polylines;
    var us;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        polylines = new PolylineCollection();

        us = context.uniformState;
        us.update(context, createFrameState(createCamera()));
    });

    afterEach(function() {
        if (!polylines.isDestroyed()) {
            polylines.destroy();
        }
        us = undefined;
    });

    it('default constructs a polyline', function() {
        var p = polylines.add();
        expect(p.show).toEqual(true);
        expect(p.positions.length).toEqual(0);
        expect(p.width).toEqual(1.0);
        expect(p.material.uniforms.color).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(p.id).not.toBeDefined();
        expect(p.loop).toEqual(false);
    });

    it('explicitly constructs a polyline', function() {
        var material = Material.fromType(Material.PolylineOutlineType);
        var p = polylines.add({
            show : false,
            positions : [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0), new Cartesian3(7.0, 8.0, 9.0)],
            loop : true,
            width : 2,
            material : material,
            id : 'id'
        });

        expect(p.show).toEqual(false);
        expect(p.positions[0]).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(p.positions[1]).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(p.positions[2]).toEqual(new Cartesian3(7.0, 8.0, 9.0));
        expect(p.positions.length).toEqual(3);
        expect(p.loop).toEqual(true);
        expect(p.width).toEqual(2);
        expect(p.material.uniforms.color).toEqual(material.uniforms.color);
        expect(p.material.uniforms.outlineColor).toEqual(material.uniforms.outlineColor);
        expect(p.material.uniforms.outlineWidth).toEqual(material.uniforms.outlineWidth);
        expect(p.id).toEqual('id');
    });

    it('sets polyline properties', function() {
        var material = Material.fromType(Material.PolylineOutlineType);
        var p = polylines.add();
        p.show = false;
        p.positions = [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0), new Cartesian3(7.0, 8.0, 9.0)];
        p.loop = true;
        p.width = 2;
        p.material = material;

        expect(p.show).toEqual(false);
        expect(p.positions[0]).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(p.positions[1]).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(p.positions[2]).toEqual(new Cartesian3(7.0, 8.0, 9.0));
        expect(p.positions.length).toEqual(3);
        expect(p.loop).toEqual(true);
        expect(p.width).toEqual(2);
        expect(p.material.uniforms.color).toEqual(material.uniforms.color);
        expect(p.material.uniforms.outlineColor).toEqual(material.uniforms.outlineColor);
        expect(p.material.uniforms.outlineWidth).toEqual(material.uniforms.outlineWidth);
    });

    it('constructor sets loop only when number of positions is greater than 2', function() {
        var p = polylines.add({
            positions : [new Cartesian3(0.0, 1.0, 2.0), new Cartesian3(3.0, 4.0, 5.0)],
            loop : true
        });

        expect(p.positions.length).toEqual(2);
    });

    it('sets loop only when number of positions is greater than 2', function() {
        var p = polylines.add({
            positions : [new Cartesian3(0.0, 1.0, 2.0), new Cartesian3(3.0, 4.0, 5.0)]
        });
        p.loop = true;

        expect(p.positions.length).toEqual(2);
    });

    it('sets removed polyline properties', function() {
        var p = polylines.add();
        polylines.remove(p);
        p.show = false;
        expect(p.show).toEqual(false);
    });

    it('has zero polylines when constructed', function() {
        expect(polylines.length).toEqual(0);
    });

    it('adds a polyline', function() {
        var p = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        expect(polylines.length).toEqual(1);
        expect(polylines.get(0) === p).toEqual(true);
    });

    it('removes the first polyline', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        expect(polylines.length).toEqual(2);

        expect(polylines.remove(one)).toEqual(true);

        expect(polylines.length).toEqual(1);
        expect(polylines.get(0) === two).toEqual(true);
    });

    it('removes the last polyline', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        expect(polylines.length).toEqual(2);

        expect(polylines.remove(two)).toEqual(true);

        expect(polylines.length).toEqual(1);
        expect(polylines.get(0) === one).toEqual(true);
    });

    it('removes the same polyline twice', function() {
        var p = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(1);

        expect(polylines.remove(p)).toEqual(true);
        expect(polylines.length).toEqual(0);

        expect(polylines.remove(p)).toEqual(false);
        expect(polylines.length).toEqual(0);
    });

    it('returns false when removing undefined', function() {
        polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            }, {
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(1);

        expect(polylines.remove(undefined)).toEqual(false);
        expect(polylines.length).toEqual(1);
    });

    it('adds and removes polylines', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(2);
        expect(polylines.get(0) === one).toEqual(true);
        expect(polylines.get(1) === two).toEqual(true);

        expect(polylines.remove(two)).toEqual(true);
        var three = polylines.add({
            positions : [{
                x : 7.0,
                y : 8.0,
                z : 9.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(2);
        expect(polylines.get(0) === one).toEqual(true);
        expect(polylines.get(1) === three).toEqual(true);
    });

    it('removes all polylines', function() {
        polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        expect(polylines.length).toEqual(2);

        polylines.removeAll();
        expect(polylines.length).toEqual(0);
    });

    it('can check if it contains a polyline', function() {
        var polyline = polylines.add();

        expect(polylines.contains(polyline)).toEqual(true);
    });

    it('returns false when checking if it contains a polyline it does not contain', function() {
        var polyline = polylines.add();
        polylines.remove(polyline);

        expect(polylines.contains(polyline)).toEqual(false);
    });

    it('does not contain undefined', function() {
        expect(polylines.contains(undefined)).toEqual(false);
    });

    it('does not contain random other objects', function() {
        expect(polylines.contains({})).toEqual(false);
        expect(polylines.contains(new Cartesian3())).toEqual(false);
    });

    it('does not render when constructed', function() {
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders polylines. one polyline with no positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        polylines.add();
        polylines.add({
            positions: positions
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('does not crash if polyline has one position', function() {
        polylines.add({
            positions : [{
                x : 1647745.6656519484,
                y : 4949018.87918947,
                z : 3661524.164064342
            }]
        });

        ClearCommand.ALL.execute(context);
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders polylines with duplicate positions at construction', function() {
        var p = polylines.add({
            positions : [
                         new Cartesian3(0.0, -1.0, 0.0),
                         new Cartesian3(0.0, 1.0, 0.0),
                         new Cartesian3(0.0, 1.0, 0.0),
                         new Cartesian3(0.0, 2.0, 0.0)
            ]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders polylines with duplicate positions after setting positions', function() {
        var p = polylines.add();
        p.positions = [
                       new Cartesian3(0.0, -1.0, 0.0),
                       new Cartesian3(0.0, 1.0, 0.0),
                       new Cartesian3(0.0, 1.0, 0.0),
                       new Cartesian3(0.0, 2.0, 0.0)
        ];

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('A polyline that used to cross the IDL but now does not, triggers vertex creation (This code used to crash)', function() {

        //Need to be in 2D or CV
        frameState.mode = SceneMode.SCENE2D;

        //These positions cross the IDL
        var positions = [];
        positions.push({
            x : 12163600,
            y : -47362500,
            z : 40812700
        });
        positions.push({
            x : -50442500,
            y : 83936900,
            z : 37992500
        });

        //Create a line
        var line = polylines.add({
            positions : positions
        });

        //Render it
        ClearCommand.ALL.execute(context);
        render(context, frameState, polylines);

        //We need to set positions and render it again
        //in order for BufferUsage.STREAM_DRAW to be
        //triggered, which ends up rebuilding vertex arrays.
        line.positions = positions;
        render(context, frameState, polylines);

        //Now set the second position which results in a line that does not cross the IDL
        positions[1] = {
            x : 19616100,
            y : -46499100,
            z : 38870500
        };
        line.positions = positions;

        //Render the new line.  The fact that the new position no longer crosses the IDL
        //is what triggers the vertex array creation.  If the vertex array were not
        //recreaated, an exception would be thrown do to positions having less data then expected.
        render(context, frameState, polylines);
        frameState.mode = SceneMode.SCENE3D;
    });

    it('renders 64K vertices of same polyline', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES / 2; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('creates two vertex arrays and renders', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES / 2; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        var p1 = polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p1.show = false;
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.add({
            positions : positions
        });

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

    });

    it('renders more than 64K vertices of same polyline', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }
        positions.push({
            x : 0,
            y : -1,
            z : 0
        });
        positions.push({
            x : 0,
            y : 1,
            z : 0
        });

        polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders a polyline with no positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        polylines.add({
            positions : []
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders an updated polyline with no positions using set positions', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        var p2 = polylines.add({
            positions : []
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        //recreates vertex array because buffer usage changed
        p2.positions = [];

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        //should call PolylineCollection.writePositionsUpdate
        p2.positions = [];

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders an updated polyline with no positions using show', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        var p2 = polylines.add({
            positions : []
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        //recreates vertex array because buffer usage changed
        p2.show = false;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        //should call PolylineCollection.writeMiscUpdate
        p2.show = true;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

    });

    it('renders an updated polyline with no positions using material', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        var p2 = polylines.add({
            positions : []
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        //recreates vertex array because buffer usage changed
        p2.material = Material.fromType(Material.PolylineOutlineType);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('changes buffer usage after 100 iterations of not changing', function() {
        var positions = [];
        for ( var i = 0; i < 100; ++i) {
            positions.push({
                x : 0,
                y : -1,
                z : 0
            });
            positions.push({
                x : 0,
                y : 1,
                z : 0
            });
        }

        var p = polylines.add({
            positions : positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        // changes buffer usage, recreates vertex arrays
        p.positions = positions;
        render(context, frameState, polylines);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        for(var j = 0; j < 101; ++j){
            render(context, frameState, polylines);
        }
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

    });

    it('renders more than 64K vertices of different polylines', function() {
        var positions = [];
        for ( var i = 0; i < CesiumMath.SIXTY_FOUR_KILOBYTES; ++i) {
            positions.push({
                x : -1,
                y : -1,
                z : 0
            });
            positions.push({
                x : -1,
                y : 1,
                z : 0
            });
        }

        polylines.add({
            positions : positions
        });
        positions = [];

        positions.push({
            x : 0,
            y : -1,
            z : 0
        });
        positions.push({
            x : 0,
            y : 1,
            z : 0
        });
        polylines.add({
           positions:positions
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        var p = scene.primitives.add(new PolylineCollection({
            debugShowBoundingVolume : true
        }));
        var material = Material.fromType('Color');
        material.uniforms.color = new Color(1.0, 1.0, 1.0, 0.0);
        p.add({
            positions : [Cartesian3.UNIT_Z, Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3())],
            material : material
        });

        var camera = scene.camera;
        camera.position = new Cartesian3(1.02, 0.0, 0.0);
        camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
        camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

        expect(scene.renderForSpecs()).toNotEqual([0, 0, 0, 0]);

        scene.destroyForSpecs();
    });

    it('does not render', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
        p.show = false;

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('modifies and removes a polyline, then renders', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        polylines.remove(p);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('renders a green polyline', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('adds and renders a polyline', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        polylines.add({
            positions : [{
                x : 0.5,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.5,
                y : 1.0,
                z : 0.0
            }]
        });

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('removes and renders a polyline', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        var bluePolyline = polylines.add({
            positions : [{
                x : 0.5,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.5,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.remove(bluePolyline);
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('removes all polylines and renders', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.removeAll();
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('removes all polylines, adds a polyline, and renders', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        polylines.removeAll();
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders using polyline positions property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.positions = [{
            x : -2.0,
            y : -1.0,
            z : 0.0
        }, {
            x : -2.0,
            y : 1.0,
            z : 0.0
        }]; // Behind viewer
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.positions = [{
            x : 0.0,
            y : -1.0,
            z : 0.0
        }, {
            x : 0.0,
            y : 1.0,
            z : 0.0
        }]; // Back in front of viewer
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders and updates one polyline from many polylines using show property', function() {
        var positions = [];
        for(var i = 0; i < 200; i++){
            positions.push({
                x : -1.0,
                y : -1.0,
                z : 0.0
            }, {
                x : -1.0,
                y : 1.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            width:2
        });

        polylines.add({
            positions : positions,
            width:2
        });

        polylines.add({
            positions : positions,
            width:2
        });

        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            width:2
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.show = false;
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.show = true;
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

    });

    it('renders using polyline show property', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            show:true
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.show = false;
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        // Update a second time since it goes through a different vertex array update path
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        p.show = true;
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders four polylines with different widths', function() {
        var positions = [];
        for(var i = 0; i < 200; ++i){
            positions.push({
                x : -1.0,
                y : 1.0,
                z : 0.0
            },{
                x : -1.0,
                y : -1.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            width : 3
        });
        polylines.add({
            positions : positions,
            width : 1
        });
        polylines.add({
            positions : positions,
            width : 2
        });
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            width : 7
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('renders three polylines with different widths and updates one', function() {
        var positions = [];
        for(var i = 0; i < 200; ++i){
            positions.push({
                x : -1.0,
                y : 1.0,
                z : 0.0
            },{
                x : -1.0,
                y : -1.0,
                z : 0.0
            });
        }
        polylines.add({
            positions : positions,
            width : 3
        });
        polylines.add({
            positions : positions,
            width : 4
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            width : 7
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        p2.material = Material.fromType(Material.PolylineOutlineType);
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        p2.material = Material.fromType(Material.ColorType);
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('does not render with width 0.0', function() {
        var line = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            width : 7
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        line.width = 0.0;
        render(context, frameState, polylines);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);
    });

    it('changes polyline position size recreates vertex arrays', function() {
        var positions = [];
        for(var i = 0; i < 20; ++i){
            positions.push({
                x : 0.0,
                y : 1.0,
                z : 0.0
            },{
                x : 0.0,
                y : -1.0,
                z : 0.0
            });
        }
        var p = polylines.add({
            positions : positions
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        p.positions = positions;

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        positions.push({
                x : 0.0,
                y : 1.0,
                z : 0.0
            });

        p.positions = positions;
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
    });

    it('changes polyline width property', function() {
        var p1 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        var p2 = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        p1.width = 2;
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        p2.width = 2;
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

        p1.width = 1;
        render(context, frameState, polylines);
        expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);

    });

    it('is picked', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            id : 'id'
        });

        var pickedObject = pick(context, frameState, polylines, 0, 0);
        expect(pickedObject.primitive).toEqual(p);
        expect(pickedObject.id).toEqual('id');
    });

    it('can change pick id', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            id : 'id'
        });

        var pickedObject = pick(context, frameState, polylines, 0, 0);
        expect(pickedObject.primitive).toEqual(p);
        expect(pickedObject.id).toEqual('id');

        p.id = 'id2';

        pickedObject = pick(context, frameState, polylines, 0, 0);
        expect(pickedObject.primitive).toEqual(p);
        expect(pickedObject.id).toEqual('id2');
    });

    it('is not picked (show === false)', function() {
        polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }],
            show : false
        });

        var pickedObject = pick(context, frameState, polylines, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('is not picked (alpha === 0.0)', function() {
        var p = polylines.add({
            positions : [{
                x : 0.0,
                y : -1.0,
                z : 0.0
            }, {
                x : 0.0,
                y : 1.0,
                z : 0.0
            }]
        });
        p.material.uniforms.color.alpha = 0.0;

        var pickedObject = pick(context, frameState, polylines, 0, 0);
        expect(pickedObject).toBeUndefined();
    });

    it('does not equal undefined', function() {
        var polyline = polylines.add();
        expect(polyline).toNotEqual(undefined);
    });

    it('throws when accessing without an index', function() {
        expect(function() {
            polylines.get();
        }).toThrowDeveloperError();
    });

    it('computes bounding sphere in 3D', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        var three = polylines.add({
            positions : [{
                x : 7.0,
                y : 8.0,
                z : 9.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });

        var commandList = [];
        polylines.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;

        expect(one._boundingVolume).toEqual(BoundingSphere.fromPoints(one.positions));
        expect(two._boundingVolume).toEqual(BoundingSphere.fromPoints(two.positions));
        expect(three._boundingVolume).toEqual(BoundingSphere.fromPoints(three.positions));
        expect(boundingVolume).toEqual(BoundingSphere.union(BoundingSphere.union(one._boundingVolume, two._boundingVolume), three._boundingVolume));
    });

    function test2DBoundingSphere(testMode) {
        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var one = polylines.add({
            positions : Cartesian3.fromDegreesArray([
                -50.0, -50.0,
                50.0, -50.0
            ])
        });
        var two = polylines.add({
            positions : Cartesian3.fromDegreesArray([
                50.0, 50.0,
                -50.0, 50.0
            ])
        });

        var mode = frameState.mode;
        frameState.mode = testMode;
        var commandList = [];
        polylines.update(context, frameState, commandList);
        var boundingVolume = commandList[0].boundingVolume;
        frameState.mode = mode;

        var positions = one.positions;
        var projectedPositions = [];
        var i;
        for (i = 0; i < positions.length; ++i) {
            projectedPositions.push(projection.project(ellipsoid.cartesianToCartographic(positions[i])));
        }
        var bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(bs.center.z, bs.center.x, bs.center.y);
        expect(one._boundingVolume2D.center).toEqualEpsilon(bs.center, CesiumMath.EPSILON8);
        expect(one._boundingVolume2D.radius).toEqualEpsilon(bs.radius, CesiumMath.EPSILON12);

        positions = two.positions;
        projectedPositions = [];
        for (i = 0; i < positions.length; ++i) {
            projectedPositions.push(projection.project(ellipsoid.cartesianToCartographic(positions[i])));
        }
        bs = BoundingSphere.fromPoints(projectedPositions);
        bs.center = new Cartesian3(bs.center.z, bs.center.x, bs.center.y);
        expect(two._boundingVolume2D.center).toEqualEpsilon(bs.center, CesiumMath.EPSILON8);
        expect(two._boundingVolume2D.radius).toEqualEpsilon(bs.radius, CesiumMath.EPSILON12);

        var expected = BoundingSphere.union(one._boundingVolume2D, two._boundingVolume2D);
        expect(boundingVolume.center).toEqualEpsilon(expected.center, CesiumMath.EPSILON8);
        expect(boundingVolume.radius).toEqualEpsilon(expected.radius, CesiumMath.EPSILON8);
    }

    it('computes bounding sphere in Columbus view', function() {
        test2DBoundingSphere(SceneMode.COLUMBUS_VIEW);
    });

    it('computes bounding sphere in 2D', function() {
        test2DBoundingSphere(SceneMode.SCENE2D);
    });

    it('computes optimized bounding volumes per material', function() {
        var one = polylines.add({
            positions : [{
                x : 1.0,
                y : 2.0,
                z : 3.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        one.material.uniforms.color = new Color(1.0, 0.0, 0.0, 1.0);

        var two = polylines.add({
            positions : [{
                x : 4.0,
                y : 5.0,
                z : 6.0
            },{
                x : 2.0,
                y : 3.0,
                z : 4.0
            }]
        });
        two.material.uniforms.color = new Color(0.0, 1.0, 0.0, 1.0);

        var commandList = [];
        polylines.update(context, frameState, commandList);

        expect(commandList[0].boundingVolume).toEqual(one._boundingVolume);
        expect(commandList[1].boundingVolume).toEqual(two._boundingVolume);
    });

    it('isDestroyed', function() {
        expect(polylines.isDestroyed()).toEqual(false);
        polylines.destroy();
        expect(polylines.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
