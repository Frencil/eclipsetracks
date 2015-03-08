/*global defineSuite*/
defineSuite([
        'DataSources/PolylineVolumeGraphics',
        'Core/Color',
        'Core/CornerType',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        PolylineVolumeGraphics,
        Color,
        CornerType,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            material : Color.BLUE,
            positions : [],
            shape : [],
            show : true,
            granularity : 1,
            fill : false,
            outline : false,
            outlineColor : Color.RED,
            outlineWidth : 2,
            cornerType : CornerType.BEVELED
        };

        var polylineVolume = new PolylineVolumeGraphics(options);
        expect(polylineVolume.material).toBeInstanceOf(ColorMaterialProperty);
        expect(polylineVolume.positions).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.show).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.shape).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.granularity).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.fill).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.outline).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(polylineVolume.cornerType).toBeInstanceOf(ConstantProperty);

        expect(polylineVolume.material.color.getValue()).toEqual(options.material);
        expect(polylineVolume.positions.getValue()).toEqual(options.positions);
        expect(polylineVolume.show.getValue()).toEqual(options.show);
        expect(polylineVolume.shape.getValue()).toEqual(options.shape);
        expect(polylineVolume.granularity.getValue()).toEqual(options.granularity);
        expect(polylineVolume.fill.getValue()).toEqual(options.fill);
        expect(polylineVolume.outline.getValue()).toEqual(options.outline);
        expect(polylineVolume.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(polylineVolume.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(polylineVolume.cornerType.getValue()).toEqual(options.cornerType);
    });

    it('merge assigns unassigned properties', function() {
        var source = new PolylineVolumeGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.shape = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.cornerType = new ConstantProperty();

        var target = new PolylineVolumeGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.positions).toBe(source.positions);
        expect(target.show).toBe(source.show);
        expect(target.shape).toBe(source.shape);
        expect(target.granularity).toBe(source.granularity);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.cornerType).toBe(source.cornerType);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PolylineVolumeGraphics();

        var material = new ColorMaterialProperty();
        var positions = new ConstantProperty();
        var show = new ConstantProperty();
        var shape = new ConstantProperty();
        var granularity = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var outlineWidth = new ConstantProperty();
        var cornerType = new ConstantProperty();

        var target = new PolylineVolumeGraphics();
        target.material = material;
        target.positions = positions;
        target.show = show;
        target.shape = shape;
        target.granularity = granularity;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.cornerType = cornerType;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.positions).toBe(positions);
        expect(target.show).toBe(show);
        expect(target.shape).toBe(shape);
        expect(target.granularity).toBe(granularity);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.cornerType).toBe(cornerType);
    });

    it('clone works', function() {
        var source = new PolylineVolumeGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.shape = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.cornerType = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.positions).toBe(source.positions);
        expect(result.show).toBe(source.show);
        expect(result.shape).toBe(source.shape);
        expect(result.granularity).toBe(source.granularity);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.cornerType).toBe(source.cornerType);
    });

    it('merge throws if source undefined', function() {
        var target = new PolylineVolumeGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new PolylineVolumeGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'positions', [], []);
        testDefinitionChanged(property, 'shape', [], []);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'granularity', 1, 2);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'cornerType', CornerType.BEVELED, CornerType.MITERED);
    });
});