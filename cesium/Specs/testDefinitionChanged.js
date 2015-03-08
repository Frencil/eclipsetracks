/*global define*/
define([
        'DataSources/ConstantProperty'
    ], function(
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function testDefinitionChanged(property, name, value1, value2) {
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property[name];
        property[name] = new ConstantProperty(value1);
        expect(listener).toHaveBeenCalledWith(property, name, property[name], oldValue);
        listener.reset();

        property[name].setValue(value2);
        expect(listener).toHaveBeenCalledWith(property, name, property[name], property[name]);
        listener.reset();

        property[name] = property[name];
        expect(listener.callCount).toEqual(0);
    }

    return testDefinitionChanged;
});