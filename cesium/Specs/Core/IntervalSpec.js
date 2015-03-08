/*global defineSuite*/
defineSuite([
        'Core/Interval'
    ], function(
        Interval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs without arguments', function() {
        var interval = new Interval();
        expect(interval.start).toEqual(0.0);
        expect(interval.stop).toEqual(0.0);
    });

    it('constructs with arguments', function() {
        var start = 1.0;
        var stop = 2.0;
        var interval = new Interval(start, stop);
        expect(interval.start).toEqual(start);
        expect(interval.stop).toEqual(stop);
    });
});