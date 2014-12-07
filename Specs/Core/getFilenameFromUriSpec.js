/*global defineSuite*/
defineSuite([
        'Core/getFilenameFromUri'
    ], function(
        getFilenameFromUri) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works as expected', function() {
        var result = getFilenameFromUri('http://www.mysite.com/awesome?makeitawesome=true');
        expect(result).toEqual('awesome');

        result = getFilenameFromUri('http://www.mysite.com/somefolder/awesome.png#makeitawesome');
        expect(result).toEqual('awesome.png');
    });

    it('throws with undefined parameter', function() {
        expect(function() {
            getFilenameFromUri(undefined);
        }).toThrowDeveloperError();
    });
});
