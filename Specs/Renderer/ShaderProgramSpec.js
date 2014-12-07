/*global defineSuite*/
defineSuite([
        'Renderer/ShaderProgram',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Color',
        'Core/Matrix2',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/PrimitiveType',
        'Renderer/BufferUsage',
        'Renderer/ClearCommand',
        'Renderer/DrawCommand',
        'Renderer/ShaderSource',
        'Specs/createContext',
        'Specs/destroyContext'
    ], function(
        ShaderProgram,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Color,
        Matrix2,
        Matrix3,
        Matrix4,
        PrimitiveType,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        ShaderSource,
        createContext,
        destroyContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor,WebGLRenderingContext*/

    var context;
    var sp;
    var va;

    var injectedTestFunctions = {
        czm_circularDependency1 : 'void czm_circularDependency1() { czm_circularDependency2(); }',
        czm_circularDependency2 : 'void czm_circularDependency2() { czm_circularDependency1(); }',
        czm_testFunction3 : 'void czm_testFunction3(vec4 color) { czm_testFunction2(color); }',
        czm_testFunction2 : 'void czm_testFunction2(vec4 color) { czm_testFunction1(color); }',
        czm_testFunction1 : 'void czm_testFunction1(vec4 color) { gl_FragColor = color; }',
        czm_testDiamondDependency1 : 'vec4 czm_testDiamondDependency1(vec4 color) { return czm_testAddAlpha(color); }',
        czm_testDiamondDependency2 : 'vec4 czm_testDiamondDependency2(vec4 color) { return czm_testAddAlpha(color); }',
        czm_testAddAlpha : 'vec4 czm_testAddAlpha(vec4 color) { color.a = clamp(color.a + 0.1, 0.0, 1.0); return color; }',
        czm_testAddRed : 'vec4 czm_testAddRed(vec4 color) { color.r = clamp(color.r + 0.1, 0.0, 1.0); return color; }',
        czm_testAddGreen : 'vec4 czm_testAddGreen(vec4 color) { color.g = clamp(color.g + 0.1, 0.0, 1.0); return color; }',
        czm_testAddRedGreenAlpha : 'vec4 czm_testAddRedGreenAlpha(vec4 color) { color = czm_testAddRed(color); color = czm_testAddGreen(color); color = czm_testAddAlpha(color); return color; }',
        czm_testFunction4 : 'void czm_testFunction4(vec4 color) { color = czm_testAddAlpha(color); color = czm_testAddRedGreenAlpha(color); czm_testFunction3(color); }',
        czm_testFunctionWithComment : '/**\n czm_circularDependency1()  \n*/\nvoid czm_testFunctionWithComment(vec4 color) { czm_testFunction1(color); }'
    };

    beforeAll(function() {
        context = createContext();

        for ( var functionName in injectedTestFunctions) {
            if (injectedTestFunctions.hasOwnProperty(functionName)) {
                ShaderSource._czmBuiltinsAndUniforms[functionName] = injectedTestFunctions[functionName];
            }
        }

    });

    afterAll(function() {
        destroyContext(context);

        for ( var functionName in injectedTestFunctions) {
            if (injectedTestFunctions.hasOwnProperty(functionName)) {
                delete ShaderSource._czmBuiltinsAndUniforms[functionName];
            }
        }
    });

    function renderFragment(context, shaderProgram) {
        va = context.createVertexArray([{
            index : shaderProgram.vertexAttributes.position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        }]);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        var command = new DrawCommand({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : shaderProgram,
            vertexArray : va
        });
        command.execute(context);

        return context.readPixels();
    }

    it('has vertex and fragment shader source', function() {
        var vs = 'void main() { gl_Position = vec4(1.0); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        var expectedVSText = new ShaderSource({
            sources : [vs]
        }).createCombinedVertexShader();

        expect(sp._vertexShaderText).toEqual(expectedVSText);

        var expectedFSText = new ShaderSource({
            sources : [fs]
        }).createCombinedFragmentShader();

        expect(sp._fragmentShaderText).toEqual(expectedFSText);
    });

    it('has a position vertex attribute', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.numberOfVertexAttributes).toEqual(1);
        expect(sp.vertexAttributes.position.name).toEqual('position');
    });

    it('sets attribute indices', function() {
        var vs =
            'attribute vec4 position;' +
            'attribute vec3 normal;' +
            'attribute float heat;' +
            'void main() { gl_Position = position + vec4(normal, 0.0) + vec4(heat); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var attributes = {
            position : 3,
            normal : 2,
            heat : 1
        };
        sp = context.createShaderProgram(vs, fs, attributes);

        expect(sp.numberOfVertexAttributes).toEqual(3);
        expect(sp.vertexAttributes.position.name).toEqual('position');
        expect(sp.vertexAttributes.position.index).toEqual(attributes.position);
        expect(sp.vertexAttributes.normal.name).toEqual('normal');
        expect(sp.vertexAttributes.normal.index).toEqual(attributes.normal);
        expect(sp.vertexAttributes.heat.name).toEqual('heat');
        expect(sp.vertexAttributes.heat.index).toEqual(attributes.heat);
    });

    it('has a uniform', function() {
        var vs = 'uniform vec4 u_vec4; void main() { gl_Position = u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        var uniform = sp.allUniforms.u_vec4;

        expect(uniform.name).toEqual('u_vec4');
    });

    it('has an automatic uniform', function() {
        var vs = 'uniform vec4 u_vec4; void main() { gl_Position = u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.czm_viewport.name).toEqual('czm_viewport');

        expect(sp.manualUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.manualUniforms.czm_viewport).not.toBeDefined();
    });

    it('has uniforms', function() {
        var vs = 'uniform float u_float; uniform vec4 u_vec4; uniform mat4 u_mat4; void main() { gl_Position = u_mat4 * u_float * u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.allUniforms.u_float.name).toEqual('u_float');
        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.u_mat4.name).toEqual('u_mat4');
    });

    it('has uniforms of every datatype', function() {
        var d = context;
        var vs =
            'uniform float u_float;' +
            'uniform vec2 u_vec2;' +
            'uniform vec3 u_vec3;' +
            'uniform vec4 u_vec4;' +
            'uniform int u_int;' +
            'uniform ivec2 u_ivec2;' +
            'uniform ivec3 u_ivec3;' +
            'uniform ivec4 u_ivec4;' +
            'uniform bool u_bool;' +
            'uniform bvec2 u_bvec2;' +
            'uniform bvec3 u_bvec3;' +
            'uniform bvec4 u_bvec4;' +
            'uniform mat2 u_mat2;' +
            'uniform mat3 u_mat3;' +
            'uniform mat4 u_mat4;' +
            'void main() { gl_Position = vec4(u_float) * vec4((u_mat2 * u_vec2), 0.0, 0.0) * vec4((u_mat3 * u_vec3), 0.0) * (u_mat4 * u_vec4) * vec4(u_int) * vec4(u_ivec2, 0.0, 0.0) * vec4(u_ivec3, 0.0) * vec4(u_ivec4) * vec4(u_bool) * vec4(u_bvec2, 0.0, 0.0) * vec4(u_bvec3, 0.0) * vec4(u_bvec4); }';
        var fs =
            'uniform sampler2D u_sampler2D;' +
            'uniform samplerCube u_samplerCube;' +
            'void main() { gl_FragColor = texture2D(u_sampler2D, vec2(0.0)) + textureCube(u_samplerCube, vec3(1.0)); }';
        sp = d.createShaderProgram(vs, fs);

        expect(sp.allUniforms.u_float.name).toEqual('u_float');
        expect(sp.allUniforms.u_vec2.name).toEqual('u_vec2');
        expect(sp.allUniforms.u_vec3.name).toEqual('u_vec3');
        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.u_int.name).toEqual('u_int');
        expect(sp.allUniforms.u_ivec2.name).toEqual('u_ivec2');
        expect(sp.allUniforms.u_ivec3.name).toEqual('u_ivec3');
        expect(sp.allUniforms.u_ivec4.name).toEqual('u_ivec4');
        expect(sp.allUniforms.u_bool.name).toEqual('u_bool');
        expect(sp.allUniforms.u_bvec2.name).toEqual('u_bvec2');
        expect(sp.allUniforms.u_bvec3.name).toEqual('u_bvec3');
        expect(sp.allUniforms.u_bvec4.name).toEqual('u_bvec4');
        expect(sp.allUniforms.u_mat2.name).toEqual('u_mat2');
        expect(sp.allUniforms.u_mat3.name).toEqual('u_mat3');
        expect(sp.allUniforms.u_mat4.name).toEqual('u_mat4');
        expect(sp.allUniforms.u_sampler2D.name).toEqual('u_sampler2D');
        expect(sp.allUniforms.u_samplerCube.name).toEqual('u_samplerCube');

        expect(sp.allUniforms.u_float.datatype).toEqual(WebGLRenderingContext.FLOAT);
        expect(sp.allUniforms.u_vec2.datatype).toEqual(WebGLRenderingContext.FLOAT_VEC2);
        expect(sp.allUniforms.u_vec3.datatype).toEqual(WebGLRenderingContext.FLOAT_VEC3);
        expect(sp.allUniforms.u_vec4.datatype).toEqual(WebGLRenderingContext.FLOAT_VEC4);
        expect(sp.allUniforms.u_int.datatype).toEqual(WebGLRenderingContext.INT);
        expect(sp.allUniforms.u_ivec2.datatype).toEqual(WebGLRenderingContext.INT_VEC2);
        expect(sp.allUniforms.u_ivec3.datatype).toEqual(WebGLRenderingContext.INT_VEC3);
        expect(sp.allUniforms.u_ivec4.datatype).toEqual(WebGLRenderingContext.INT_VEC4);
        expect(sp.allUniforms.u_bool.datatype).toEqual(WebGLRenderingContext.BOOL);
        expect(sp.allUniforms.u_bvec2.datatype).toEqual(WebGLRenderingContext.BOOL_VEC2);
        expect(sp.allUniforms.u_bvec3.datatype).toEqual(WebGLRenderingContext.BOOL_VEC3);
        expect(sp.allUniforms.u_bvec4.datatype).toEqual(WebGLRenderingContext.BOOL_VEC4);
        expect(sp.allUniforms.u_mat2.datatype).toEqual(WebGLRenderingContext.FLOAT_MAT2);
        expect(sp.allUniforms.u_mat3.datatype).toEqual(WebGLRenderingContext.FLOAT_MAT3);
        expect(sp.allUniforms.u_mat4.datatype).toEqual(WebGLRenderingContext.FLOAT_MAT4);
        expect(sp.allUniforms.u_sampler2D.datatype).toEqual(WebGLRenderingContext.SAMPLER_2D);
        expect(sp.allUniforms.u_samplerCube.datatype).toEqual(WebGLRenderingContext.SAMPLER_CUBE);
    });

    it('has a struct uniform', function() {
        var vs = 'uniform struct { float f; vec4 v; } u_struct; void main() { gl_Position = u_struct.f * u_struct.v; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.allUniforms['u_struct.f'].name).toEqual('u_struct.f');
        expect(sp.allUniforms['u_struct.v'].name).toEqual('u_struct.v');
    });

    it('has a uniform array', function() {
        var vs = 'uniform vec4 u_vec4[2]; void main() { gl_Position = u_vec4[0] + u_vec4[1]; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        var uniform = sp.allUniforms.u_vec4;

        expect(uniform.name).toEqual('u_vec4');
        expect(uniform.value.length).toEqual(2);
    });

    it('has uniform arrays of every datatype', function() {
        var d = context;
        var vs =
            'uniform float u_float[2];' +
            'uniform vec2 u_vec2[2];' +
            'uniform vec3 u_vec3[2];' +
            'uniform vec4 u_vec4[2];' +
            'uniform int u_int[2];' +
            'uniform ivec2 u_ivec2[2];' +
            'uniform ivec3 u_ivec3[2];' +
            'uniform ivec4 u_ivec4[2];' +
            'uniform bool u_bool[2];' +
            'uniform bvec2 u_bvec2[2];' +
            'uniform bvec3 u_bvec3[2];' +
            'uniform bvec4 u_bvec4[2];' +
            'uniform mat2 u_mat2[2];' +
            'uniform mat3 u_mat3[2];' +
            'uniform mat4 u_mat4[2];' +
            'void main() { gl_Position = vec4(u_float[0]) * vec4(u_float[1]) * vec4((u_mat2[0] * u_vec2[0]), 0.0, 0.0) * vec4((u_mat2[1] * u_vec2[1]), 0.0, 0.0) * vec4((u_mat3[0] * u_vec3[0]), 0.0) * vec4((u_mat3[1] * u_vec3[1]), 0.0) * (u_mat4[0] * u_vec4[0]) * (u_mat4[1] * u_vec4[1]) * vec4(u_int[0]) * vec4(u_int[1]) * vec4(u_ivec2[0], 0.0, 0.0) * vec4(u_ivec2[1], 0.0, 0.0) * vec4(u_ivec3[0], 0.0) * vec4(u_ivec3[1], 0.0) * vec4(u_ivec4[0]) * vec4(u_ivec4[1]) * vec4(u_bool[0]) * vec4(u_bool[1]) * vec4(u_bvec2[0], 0.0, 0.0) * vec4(u_bvec2[1], 0.0, 0.0) * vec4(u_bvec3[0], 0.0) * vec4(u_bvec3[1], 0.0) * vec4(u_bvec4[0]) * vec4(u_bvec4[1]); }';
        var fs =
            'uniform sampler2D u_sampler2D[2];' +
            'uniform samplerCube u_samplerCube[2];' +
            'void main() { gl_FragColor = texture2D(u_sampler2D[0], vec2(0.0)) + texture2D(u_sampler2D[1], vec2(0.0)) + textureCube(u_samplerCube[0], vec3(1.0)) + textureCube(u_samplerCube[1], vec3(1.0)); }';
        sp = d.createShaderProgram(vs, fs);

        expect(sp.allUniforms.u_float.name).toEqual('u_float');
        expect(sp.allUniforms.u_vec2.name).toEqual('u_vec2');
        expect(sp.allUniforms.u_vec3.name).toEqual('u_vec3');
        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.u_int.name).toEqual('u_int');
        expect(sp.allUniforms.u_ivec2.name).toEqual('u_ivec2');
        expect(sp.allUniforms.u_ivec3.name).toEqual('u_ivec3');
        expect(sp.allUniforms.u_ivec4.name).toEqual('u_ivec4');
        expect(sp.allUniforms.u_bool.name).toEqual('u_bool');
        expect(sp.allUniforms.u_bvec2.name).toEqual('u_bvec2');
        expect(sp.allUniforms.u_bvec3.name).toEqual('u_bvec3');
        expect(sp.allUniforms.u_bvec4.name).toEqual('u_bvec4');
        expect(sp.allUniforms.u_mat2.name).toEqual('u_mat2');
        expect(sp.allUniforms.u_mat3.name).toEqual('u_mat3');
        expect(sp.allUniforms.u_mat4.name).toEqual('u_mat4');
        expect(sp.allUniforms.u_sampler2D.name).toEqual('u_sampler2D');
        expect(sp.allUniforms.u_samplerCube.name).toEqual('u_samplerCube');

        expect(sp.allUniforms.u_float.datatype).toEqual(WebGLRenderingContext.FLOAT);
        expect(sp.allUniforms.u_vec2.datatype).toEqual(WebGLRenderingContext.FLOAT_VEC2);
        expect(sp.allUniforms.u_vec3.datatype).toEqual(WebGLRenderingContext.FLOAT_VEC3);
        expect(sp.allUniforms.u_vec4.datatype).toEqual(WebGLRenderingContext.FLOAT_VEC4);
        expect(sp.allUniforms.u_int.datatype).toEqual(WebGLRenderingContext.INT);
        expect(sp.allUniforms.u_ivec2.datatype).toEqual(WebGLRenderingContext.INT_VEC2);
        expect(sp.allUniforms.u_ivec3.datatype).toEqual(WebGLRenderingContext.INT_VEC3);
        expect(sp.allUniforms.u_ivec4.datatype).toEqual(WebGLRenderingContext.INT_VEC4);
        expect(sp.allUniforms.u_bool.datatype).toEqual(WebGLRenderingContext.BOOL);
        expect(sp.allUniforms.u_bvec2.datatype).toEqual(WebGLRenderingContext.BOOL_VEC2);
        expect(sp.allUniforms.u_bvec3.datatype).toEqual(WebGLRenderingContext.BOOL_VEC3);
        expect(sp.allUniforms.u_bvec4.datatype).toEqual(WebGLRenderingContext.BOOL_VEC4);
        expect(sp.allUniforms.u_mat2.datatype).toEqual(WebGLRenderingContext.FLOAT_MAT2);
        expect(sp.allUniforms.u_mat3.datatype).toEqual(WebGLRenderingContext.FLOAT_MAT3);
        expect(sp.allUniforms.u_mat4.datatype).toEqual(WebGLRenderingContext.FLOAT_MAT4);
        expect(sp.allUniforms.u_sampler2D.datatype).toEqual(WebGLRenderingContext.SAMPLER_2D);
        expect(sp.allUniforms.u_samplerCube.datatype).toEqual(WebGLRenderingContext.SAMPLER_CUBE);
    });

    it('sets uniforms', function() {
        var d = context;
        var vs =
            'uniform float u_float;' +
            'uniform vec2 u_vec2;' +
            'uniform vec3 u_vec3;' +
            'uniform vec3 u_vec3color;' +
            'uniform vec4 u_vec4;' +
            'uniform vec4 u_vec4color;' +
            'uniform int u_int;' +
            'uniform ivec2 u_ivec2;' +
            'uniform ivec3 u_ivec3;' +
            'uniform ivec4 u_ivec4;' +
            'uniform bool u_bool;' +
            'uniform bvec2 u_bvec2;' +
            'uniform bvec3 u_bvec3;' +
            'uniform bvec4 u_bvec4;' +
            'uniform mat2 u_mat2;' +
            'uniform mat3 u_mat3;' +
            'uniform mat4 u_mat4;' +
            'void main() { gl_Position = vec4(u_float) * vec4((u_mat2 * u_vec2), 0.0, 0.0) * vec4((u_mat3 * u_vec3), 0.0) * vec4((u_mat3 * u_vec3color), 0.0) * (u_mat4 * u_vec4) * (u_mat4 * u_vec4color) * vec4(u_int) * vec4(u_ivec2, 0.0, 0.0) * vec4(u_ivec3, 0.0) * vec4(u_ivec4) * vec4(u_bool) * vec4(u_bvec2, 0.0, 0.0) * vec4(u_bvec3, 0.0) * vec4(u_bvec4); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);
        sp.allUniforms.u_float.value = 1.0;
        sp.allUniforms.u_vec2.value = new Cartesian2(1.0, 2.0);
        sp.allUniforms.u_vec3.value = new Cartesian3(1.0, 2.0, 3.0);
        sp.allUniforms.u_vec3color.value = new Color(1.0, 2.0, 3.0);
        sp.allUniforms.u_vec4.value = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        sp.allUniforms.u_vec4color.value = new Color(1.0, 2.0, 3.0, 4.0);
        sp.allUniforms.u_int.value = 1;
        sp.allUniforms.u_ivec2.value = new Cartesian2(1, 2);
        sp.allUniforms.u_ivec3.value = new Cartesian3(1, 2, 3);
        sp.allUniforms.u_ivec4.value = new Cartesian4(1, 2, 3, 4);
        sp.allUniforms.u_bool.value = true;
        sp.allUniforms.u_bvec2.value = new Cartesian2(true, true);
        sp.allUniforms.u_bvec3.value = new Cartesian3(true, true, true);
        sp.allUniforms.u_bvec4.value = new Cartesian4(true, true, true, true);
        sp.allUniforms.u_mat2.value = new Matrix2(1.0, 2.0, 3.0, 4.0);
        sp.allUniforms.u_mat3.value = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        sp.allUniforms.u_mat4.value = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_float._location)).toEqual(1.0);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec2._location)).toEqual(new Float32Array([1.0, 2.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec3._location)).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec3color._location)).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec4._location)).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec4color._location)).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_int._location)).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec2._location)).toEqual(new Int32Array([1, 2]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec3._location)).toEqual(new Int32Array([1, 2, 3]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec4._location)).toEqual(new Int32Array([1, 2, 3, 4]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bool._location)).toEqual(true);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec2._location)).toEqual([true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec3._location)).toEqual([true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec4._location)).toEqual([true, true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat2._location)).toEqual([1.0, 3.0, 2.0, 4.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat3._location)).toEqual([1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat4._location)).toEqual([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0]);
    });

    it('sets a struct uniform', function() {
        var d = context;
        var vs = 'uniform struct { float f; vec4 v; } u_struct; void main() { gl_Position = u_struct.f * u_struct.v; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);

        sp.allUniforms['u_struct.f'].value = 1;
        sp.allUniforms['u_struct.v'].value = new Cartesian4(1.0, 2.0, 3.0, 4.0);

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.allUniforms['u_struct.f']._location)).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.allUniforms['u_struct.v']._location)).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
    });

    it('sets a uniform array', function() {
        var d = context;
        var vs = 'uniform float u_float[2];' + 'void main() { gl_Position = vec4(u_float[0]) * vec4(u_float[1]); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);
        sp.allUniforms.u_float.value = new Float32Array([1, 2]);

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_float._locations[0])).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_float._locations[1])).toEqual(2);
    });

    it('sets uniform arrays', function() {
        var d = context;
        var vs =
            'uniform float u_float[2];' +
            'uniform vec2 u_vec2[2];' +
            'uniform vec3 u_vec3[2];' +
            'uniform vec3 u_vec3color[2];' +
            'uniform vec4 u_vec4[2];' +
            'uniform vec4 u_vec4color[2];' +
            'uniform int u_int[2];' +
            'uniform ivec2 u_ivec2[2];' +
            'uniform ivec3 u_ivec3[2];' +
            'uniform ivec4 u_ivec4[2];' +
            'uniform bool u_bool[2];' +
            'uniform bvec2 u_bvec2[2];' +
            'uniform bvec3 u_bvec3[2];' +
            'uniform bvec4 u_bvec4[2];' +
            'uniform mat2 u_mat2[2];' +
            'uniform mat3 u_mat3[2];' +
            'uniform mat4 u_mat4[2];' +
            'void main() { gl_Position = vec4(u_float[0]) * vec4(u_float[1]) * vec4((u_mat2[0] * u_vec2[0]), 0.0, 0.0) * vec4((u_mat2[1] * u_vec2[1]), 0.0, 0.0) * vec4((u_mat3[0] * u_vec3[0]), 0.0) * vec4((u_mat3[1] * u_vec3[1]), 0.0) * vec4((u_mat3[0] * u_vec3color[0]), 0.0) * vec4((u_mat3[1] * u_vec3color[1]), 0.0) * (u_mat4[0] * u_vec4[0]) * (u_mat4[1] * u_vec4[1]) * (u_mat4[0] * u_vec4color[0]) * (u_mat4[1] * u_vec4color[1]) * vec4(u_int[0]) * vec4(u_int[1]) * vec4(u_ivec2[0], 0.0, 0.0) * vec4(u_ivec2[1], 0.0, 0.0) * vec4(u_ivec3[0], 0.0) * vec4(u_ivec3[1], 0.0) * vec4(u_ivec4[0]) * vec4(u_ivec4[1]) * vec4(u_bool[0]) * vec4(u_bool[1]) * vec4(u_bvec2[0], 0.0, 0.0) * vec4(u_bvec2[1], 0.0, 0.0) * vec4(u_bvec3[0], 0.0) * vec4(u_bvec3[1], 0.0) * vec4(u_bvec4[0]) * vec4(u_bvec4[1]); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);

        sp.allUniforms.u_float.value = [1.0, 2.0];
        sp.allUniforms.u_vec2.value = [new Cartesian2(1.0, 2.0), new Cartesian2(3.0, 4.0)];
        sp.allUniforms.u_vec3.value = [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0)];
        sp.allUniforms.u_vec3color.value = [new Color(1.0, 2.0, 3.0), new Color(4.0, 5.0, 6.0)];
        sp.allUniforms.u_vec4.value = [new Cartesian4(1.0, 2.0, 3.0, 4.0), new Cartesian4(5.0, 6.0, 7.0, 8.0)];
        sp.allUniforms.u_vec4color.value = [new Color(1.0, 2.0, 3.0, 4.0), new Color(5.0, 6.0, 7.0, 8.0)];
        sp.allUniforms.u_int.value = [1, 2];
        sp.allUniforms.u_ivec2.value = [new Cartesian2(1, 2), new Cartesian2(3, 4)];
        sp.allUniforms.u_ivec3.value = [new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6)];
        sp.allUniforms.u_ivec4.value = [new Cartesian4(1, 2, 3, 4), new Cartesian4(5, 6, 7, 8)];
        sp.allUniforms.u_bool.value = [true, true];
        sp.allUniforms.u_bvec2.value = [new Cartesian2(true, true), new Cartesian2(true, true)];
        sp.allUniforms.u_bvec3.value = [new Cartesian3(true, true, true), new Cartesian3(true, true, true)];
        sp.allUniforms.u_bvec4.value = [new Cartesian4(true, true, true, true), new Cartesian4(true, true, true, true)];
        sp.allUniforms.u_mat2.value = [new Matrix2(1.0, 2.0, 3.0, 4.0), new Matrix2(5.0, 6.0, 7.0, 8.0)];
        sp.allUniforms.u_mat3.value = [new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0), new Matrix3(9.0, 6.0, 3.0, 8.0, 5.0, 2.0, 7.0, 4.0, 1.0)];
        sp.allUniforms.u_mat4.value = [new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0), new Matrix4(16.0, 15.0, 14.0, 13.0, 12.0, 11.0, 10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0)];

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_float._locations[0])).toEqual(1.0);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_float._locations[1])).toEqual(2.0);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec2._locations[0])).toEqual(new Float32Array([1.0, 2.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec2._locations[1])).toEqual(new Float32Array([3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec3._locations[0])).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec3._locations[1])).toEqual(new Float32Array([4.0, 5.0, 6.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec3color._locations[0])).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec3color._locations[1])).toEqual(new Float32Array([4.0, 5.0, 6.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec4._locations[0])).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec4._locations[1])).toEqual(new Float32Array([5.0, 6.0, 7.0, 8.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec4color._locations[0])).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_vec4color._locations[1])).toEqual(new Float32Array([5.0, 6.0, 7.0, 8.0]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_int._locations[0])).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_int._locations[1])).toEqual(2);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec2._locations[0])).toEqual(new Int32Array([1, 2]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec2._locations[1])).toEqual(new Int32Array([3, 4]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec3._locations[0])).toEqual(new Int32Array([1, 2, 3]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec3._locations[1])).toEqual(new Int32Array([4, 5, 6]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec4._locations[0])).toEqual(new Int32Array([1, 2, 3, 4]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_ivec4._locations[1])).toEqual(new Int32Array([5, 6, 7, 8]));
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bool._locations[0])).toEqual(true);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bool._locations[1])).toEqual(true);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec2._locations[0])).toEqual([true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec2._locations[1])).toEqual([true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec3._locations[0])).toEqual([true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec3._locations[1])).toEqual([true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec4._locations[0])).toEqual([true, true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_bvec4._locations[1])).toEqual([true, true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat2._locations[0])).toEqual([1.0, 3.0, 2.0, 4.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat2._locations[1])).toEqual([5.0, 7.0, 6.0, 8.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat3._locations[0])).toEqual([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat3._locations[1])).toEqual([9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat4._locations[0])).toEqual([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0]);
        expect(d._gl.getUniform(sp._program, sp.allUniforms.u_mat4._locations[1])).toEqual([16.0, 12.0, 8.0, 4.0, 15.0, 11.0, 7.0, 3.0, 14.0, 10.0, 6.0, 2.0, 13.0, 9.0, 5.0, 1.0]);
    });

    it('has predefined constants', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { ' +
            '  float f = ((czm_pi > 0.0) && \n' +
            '    (czm_oneOverPi > 0.0) && \n' +
            '    (czm_piOverTwo > 0.0) && \n' +
            '    (czm_piOverThree > 0.0) && \n' +
            '    (czm_piOverFour > 0.0) && \n' +
            '    (czm_piOverSix > 0.0) && \n' +
            '    (czm_threePiOver2 > 0.0) && \n' +
            '    (czm_twoPi > 0.0) && \n' +
            '    (czm_oneOverTwoPi > 0.0) && \n' +
            '    (czm_radiansPerDegree > 0.0) && \n' +
            '    (czm_degreesPerRadian > 0.0)) ? 1.0 : 0.0; \n' +
            '  gl_FragColor = vec4(f); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('has built-in constant, structs, and functions', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  czm_materialInput materialInput; \n' +
            '  czm_material material = czm_getDefaultMaterial(materialInput); \n' +
            '  material.diffuse = vec3(1.0, 1.0, 1.0); \n' +
            '  material.alpha = 1.0; \n' +
            '  material.diffuse = czm_hue(material.diffuse, czm_twoPi); \n' +
            '  gl_FragColor = vec4(material.diffuse, material.alpha); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('1 level function dependency', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  czm_testFunction1(vec4(1.0)); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('2 level function dependency', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  czm_testFunction2(vec4(1.0)); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('3 level function dependency', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  czm_testFunction3(vec4(1.0)); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('diamond dependency', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(1.0, 1.0, 1.0, 0.8); \n' +
            '  color = czm_testDiamondDependency1(color); \n' +
            '  color = czm_testDiamondDependency2(color); \n' +
            '  gl_FragColor = color; \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('diamond plus 3 level function dependency', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(1.0, 1.0, 1.0, 0.8); \n' +
            '  color = czm_testDiamondDependency1(color); \n' +
            '  color = czm_testDiamondDependency2(color); \n' +
            '  czm_testFunction3(color); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('big mess of function dependencies', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(0.9, 0.9, 1.0, 0.6); \n' +
            '  color = czm_testDiamondDependency1(color); \n' +
            '  color = czm_testDiamondDependency2(color); \n' +
            '  czm_testFunction4(color); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('doc comment with reference to another function', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(1.0, 1.0, 1.0, 1.0); \n' +
            '  czm_testFunctionWithComment(color); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        expect(renderFragment(context, sp)).toEqual([255, 255, 255, 255]);
    });

    it('compiles with #version at the top', function() {
        var vs =
            '#version 100 \n' +
            'attribute vec4 position; void main() { gl_Position = position; }';
        var fs =
            '#version 100 \n' +
            'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);
    });

    it('compiles with #version after whitespace and comments', function() {
        var vs =
            '// comment before version directive. \n' +
            '#version 100 \n' +
            'attribute vec4 position; void main() { gl_Position = position; }';
        var fs =
            '\n' +
            '#version 100 \n' +
            'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);
    });

    it('fails vertex shader compile', function() {
        var vs = 'does not compile.';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            sp._bind();
        }).toThrowRuntimeError();
    });

    it('fails fragment shader compile', function() {
        var vs = 'void main() { gl_Position = vec4(0.0); }';
        var fs = 'does not compile.';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            sp._bind();
        }).toThrowRuntimeError();
    });

    it('fails to link', function() {
        var vs = 'void nomain() { }';
        var fs = 'void nomain() { }';
        sp = context.createShaderProgram(vs, fs);

        expect(function() {
            sp._bind();
        }).toThrowRuntimeError();
    });

    it('fails with built-in function circular dependency', function() {
        var vs = 'void main() { gl_Position = vec4(0.0); }';
        var fs = 'void main() { czm_circularDependency1(); gl_FragColor = vec4(1.0); }';
        expect(function() {
            sp = context.createShaderProgram(vs, fs);
            sp._bind();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
