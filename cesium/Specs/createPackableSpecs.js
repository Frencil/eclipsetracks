/*global define*/
define([
        'Core/defaultValue',
        'Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function createPackableSpecs(packable, instance, packedInstance, namePrefix) {
        instance = JSON.parse(JSON.stringify(instance));
        packedInstance = JSON.parse(JSON.stringify(packedInstance));
        namePrefix = defaultValue(namePrefix, '');

        it(namePrefix + ' can pack', function() {
            var packedArray = [];
            packable.pack(instance, packedArray);
            var packedLength = defined(packable.packedLength) ? packable.packedLength : instance.packedLength;
            expect(packedArray.length).toEqual(packedLength);
            expect(packedArray).toEqual(packedInstance);
        });

        it(namePrefix + ' can roundtrip', function() {
            var packedArray = [];
            packable.pack(instance, packedArray);
            var result = packable.unpack(packedArray);
            expect(instance).toEqual(result);
        });

        it(namePrefix + ' can unpack', function() {
            var result = packable.unpack(packedInstance);
            expect(result).toEqual(instance);
        });

        it(namePrefix + ' can pack with startingIndex', function() {
            var packedArray = [0];
            var expected = packedArray.concat(packedInstance);
            packable.pack(instance, packedArray, 1);
            expect(packedArray).toEqual(expected);
        });

        it(namePrefix + ' can unpack with startingIndex', function() {
            var packedArray = [0].concat(packedInstance);
            var result = packable.unpack(packedArray, 1);
            expect(instance).toEqual(result);
        });

        it(namePrefix + ' pack throws with undefined value', function() {
            var array = [];
            expect(function() {
                packable.pack(undefined, array);
            }).toThrowDeveloperError();
        });

        it(namePrefix + ' pack throws with undefined array', function() {
            expect(function() {
                packable.pack(instance, undefined);
            }).toThrowDeveloperError();
        });

        it(namePrefix + ' unpack throws with undefined array', function() {
            expect(function() {
                packable.unpack(undefined);
            }).toThrowDeveloperError();
        });
    }

    return createPackableSpecs;
});
