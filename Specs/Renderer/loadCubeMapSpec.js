/*global defineSuite*/
defineSuite([
        'Renderer/loadCubeMap',
        'Core/Cartesian3',
        'Core/defined',
        'Core/PrimitiveType',
        'Renderer/BufferUsage',
        'Renderer/DrawCommand',
        'Specs/createContext',
        'Specs/destroyContext',
        'ThirdParty/when'
    ], function(
        loadCubeMap,
        Cartesian3,
        defined,
        PrimitiveType,
        BufferUsage,
        DrawCommand,
        createContext,
        destroyContext,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('loads a cube map', function() {
        var cm;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Green.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Green.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Green.png',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
            cm = cubeMap;
        });

        waitsFor(function() {
            return defined(cm);
        }, 'The cube map should load.', 5000);

        runs(function() {
            expect(cm.width).toEqual(1);
            expect(cm.height).toEqual(1);

            var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
            var fs =
                'uniform samplerCube u_texture;' +
                'uniform mediump vec3 u_direction;' +
                'void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }';
            var sp = context.createShaderProgram(vs, fs, {
                position : 0
            });
            sp.allUniforms.u_texture.value = cm;

            var va = context.createVertexArray([{
                vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
                componentsPerAttribute : 4
            }]);

            var command = new DrawCommand({
                primitiveType : PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray : va
            });

            // +X is green
            sp.allUniforms.u_direction.value = new Cartesian3(1, 0, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 255, 0, 255]);

            // -X is blue
            sp.allUniforms.u_direction.value = new Cartesian3(-1, 0, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 255, 255]);

            // +Y is green
            sp.allUniforms.u_direction.value = new Cartesian3(0, 1, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 255, 0, 255]);

            // -Y is blue
            sp.allUniforms.u_direction.value = new Cartesian3(0, -1, 0);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 255, 255]);

            // +Z is green
            sp.allUniforms.u_direction.value = new Cartesian3(0, 0, 1);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 255, 0, 255]);

            // -Z is blue
            sp.allUniforms.u_direction.value = new Cartesian3(0, 0, -1);
            command.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 255, 255]);

            sp.destroy();
            va.destroy();
            cm.destroy();
        });
    });

    it('calls error function when positiveX does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : 'not.found',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('calls error function when negativeX does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Blue.png',
            negativeX : 'not.found',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('calls error function when positiveY does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : 'not.found',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('calls error function when negativeY does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : 'not.found',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('calls error function when positiveZ does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : 'not.found',
            negativeZ : './Data/Images/Blue.png'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('calls error function when negativeZ does not exist', function() {
        var exception = false;
        when(loadCubeMap(context, {
            positiveX : './Data/Images/Blue.png',
            negativeX : './Data/Images/Blue.png',
            positiveY : './Data/Images/Blue.png',
            negativeY : './Data/Images/Blue.png',
            positiveZ : './Data/Images/Blue.png',
            negativeZ : 'not.found'
        }), function(cubeMap) {
        }, function() {
            exception = true;
        });

        waitsFor(function() {
            return exception;
        }, 'The cube map should load.', 5000);
    });

    it('throws without a context', function() {
        expect(function() {
            loadCubeMap(undefined);
        }).toThrowDeveloperError();
    });

    it('throws without urls', function() {
        expect(function() {
            loadCubeMap(context);
        }).toThrowDeveloperError();
    });

    it('throws without positiveX', function() {
        expect(function() {
            loadCubeMap(context, {
                negativeX : 'any.image',
                positiveY : 'any.image',
                negativeY : 'any.image',
                positiveZ : 'any.image',
                negativeZ : 'any.image'
            });
        }).toThrowDeveloperError();
    });

    it('throws without negativeX', function() {
        expect(function() {
            loadCubeMap(context, {
                positiveX : 'any.image',
                positiveY : 'any.image',
                negativeY : 'any.image',
                positiveZ : 'any.image',
                negativeZ : 'any.image'
            });
        }).toThrowDeveloperError();
    });

    it('throws without positiveY', function() {
        expect(function() {
            loadCubeMap(context, {
                positiveX : 'any.image',
                negativeX : 'any.image',
                negativeY : 'any.image',
                positiveZ : 'any.image',
                negativeZ : 'any.image'
            });
        }).toThrowDeveloperError();
    });

    it('throws without negativeY', function() {
        expect(function() {
            loadCubeMap(context, {
                positiveX : 'any.image',
                negativeX : 'any.image',
                positiveY : 'any.image',
                positiveZ : 'any.image',
                negativeZ : 'any.image'
            });
        }).toThrowDeveloperError();
    });

    it('throws without positiveZ', function() {
        expect(function() {
            loadCubeMap(context, {
                positiveX : 'any.image',
                negativeX : 'any.image',
                positiveY : 'any.image',
                negativeY : 'any.image',
                negativeZ : 'any.image'
            });
        }).toThrowDeveloperError();
    });

    it('throws without negativeZ', function() {
        expect(function() {
            loadCubeMap(context, {
                positiveX : 'any.image',
                negativeX : 'any.image',
                positiveY : 'any.image',
                negativeY : 'any.image',
                positiveZ : 'any.image'
            });
        }).toThrowDeveloperError();
    });
}, 'WebGL');