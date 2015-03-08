/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/LinearSpline',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/QuaternionSpline',
        './getModelAccessor'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        LinearSpline,
        Matrix4,
        Quaternion,
        QuaternionSpline,
        getModelAccessor) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var ModelAnimationCache = function() {
    };

    function getAccessorKey(model, accessor) {
        var gltf = model.gltf;
        var buffers = gltf.buffers;
        var bufferViews = gltf.bufferViews;

        var bufferView = bufferViews[accessor.bufferView];
        var buffer = buffers[bufferView.buffer];

        var byteOffset = bufferView.byteOffset + accessor.byteOffset;
        var byteLength = accessor.count * getModelAccessor(accessor).componentsPerAttribute;

        // buffer.path will be undefined when animations are embedded.
        return model.cacheKey + '//' + defaultValue(buffer.path, '') + '/' + byteOffset + '/' + byteLength;
    }

    var cachedAnimationParameters = {
    };

    var axisScratch = new Cartesian3();

    ModelAnimationCache.getAnimationParameterValues = function(model, accessor) {
        var key = getAccessorKey(model, accessor);
        var values = cachedAnimationParameters[key];

        if (!defined(values)) {
            // Cache miss
            var buffers = model._loadResources.buffers;
            var gltf = model.gltf;
            var bufferViews = gltf.bufferViews;

            var bufferView = bufferViews[accessor.bufferView];

            var componentType = accessor.componentType;
            var type = accessor.type;
            var count = accessor.count;

            // Convert typed array to Cesium types
            var typedArray = getModelAccessor(accessor).createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + accessor.byteOffset, count);
            var i;

            if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'SCALAR')) {
                values = typedArray;
            }
            else if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC3')) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    values[i] = Cartesian3.fromArray(typedArray, 3 * i);
                }
            } else if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC4')) {
                values = new Array(count);
                for (i = 0; i < count; ++i) {
                    var byteOffset = 4 * i;
                    values[i] = Quaternion.fromAxisAngle(Cartesian3.fromArray(typedArray, byteOffset, axisScratch), typedArray[byteOffset + 3]);
                }
            }
            // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142

            if (defined(model.cacheKey)) {
                // Only cache when we can create a unique id
                cachedAnimationParameters[key] = values;
            }
        }

        return values;
    };

    var cachedAnimationSplines = {
    };

    function getAnimationSplineKey(model, animationName, samplerName) {
        return model.cacheKey + '//' + animationName + '/' + samplerName;
    }

 // GLTF_SPEC: https://github.com/KhronosGroup/glTF/issues/185
    var ConstantSpline = function(value) {
        this._value = value;
    };

    ConstantSpline.prototype.evaluate = function(time, result) {
        return this._value;
    };
 // END GLTF_SPEC

    ModelAnimationCache.getAnimationSpline = function(model, animationName, animation, samplerName, sampler, parameterValues) {
        var key = getAnimationSplineKey(model, animationName, samplerName);
        var spline = cachedAnimationSplines[key];

        if (!defined(spline)) {
            var times = parameterValues[sampler.input];
            var accessor = model.gltf.accessors[animation.parameters[sampler.output]];
            var controlPoints = parameterValues[sampler.output];

// GLTF_SPEC: https://github.com/KhronosGroup/glTF/issues/185
            if ((times.length === 1) && (controlPoints.length === 1)) {
                spline = new ConstantSpline(controlPoints[0]);
            } else {
// END GLTF_SPEC
                var componentType = accessor.componentType;
                var type = accessor.type;

                if (sampler.interpolation === 'LINEAR') {
                    if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC3')) {
                        spline = new LinearSpline({
                            times : times,
                            points : controlPoints
                        });
                    } else if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'VEC4')) {
                        spline = new QuaternionSpline({
                            times : times,
                            points : controlPoints
                        });
                    }
                    // GLTF_SPEC: Support more parameter types when glTF supports targeting materials. https://github.com/KhronosGroup/glTF/issues/142
                }
                // GLTF_SPEC: Support new interpolators. https://github.com/KhronosGroup/glTF/issues/156
            }

            if (defined(model.cacheKey)) {
                // Only cache when we can create a unique id
                cachedAnimationSplines[key] = spline;
            }
        }

        return spline;
    };

    var cachedSkinInverseBindMatrices = {
    };

    ModelAnimationCache.getSkinInverseBindMatrices = function(model, accessor) {
        var key = getAccessorKey(model, accessor);
        var matrices = cachedSkinInverseBindMatrices[key];

        if (!defined(matrices)) {
            // Cache miss

            var buffers = model._loadResources.buffers;
            var gltf = model.gltf;
            var bufferViews = gltf.bufferViews;

            var bufferView = bufferViews[accessor.bufferView];

            var componentType = accessor.componentType;
            var type = accessor.type;
            var count = accessor.count;
            var typedArray = getModelAccessor(accessor).createArrayBufferView(buffers[bufferView.buffer], bufferView.byteOffset + accessor.byteOffset, count);
            matrices =  new Array(count);

            if ((componentType === WebGLRenderingContext.FLOAT) && (type === 'MAT4')) {
                for (var i = 0; i < count; ++i) {
                    matrices[i] = Matrix4.fromArray(typedArray, 16 * i);
                }
            }

            cachedSkinInverseBindMatrices[key] = matrices;
        }

        return matrices;
    };

    return ModelAnimationCache;
});