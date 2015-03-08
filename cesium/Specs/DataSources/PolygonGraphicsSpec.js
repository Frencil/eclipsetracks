/*global defineSuite*/
defineSuite([
        'DataSources/PolygonGraphics',
        'Core/Color',
        'Core/PolygonHierarchy',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        PolygonGraphics,
        Color,
        PolygonHierarchy,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            material : Color.BLUE,
            show : true,
            hierarchy : new PolygonHierarchy(),
            height : 2,
            extrudedHeight : 3,
            granularity : 4,
            stRotation : 5,
            perPositionHeight : false,
            fill : false,
            outline : false,
            outlineColor : Color.RED,
            outlineWidth : 7
        };

        var polygon = new PolygonGraphics(options);
        expect(polygon.material).toBeInstanceOf(ColorMaterialProperty);
        expect(polygon.show).toBeInstanceOf(ConstantProperty);
        expect(polygon.hierarchy).toBeInstanceOf(ConstantProperty);
        expect(polygon.height).toBeInstanceOf(ConstantProperty);
        expect(polygon.extrudedHeight).toBeInstanceOf(ConstantProperty);
        expect(polygon.granularity).toBeInstanceOf(ConstantProperty);
        expect(polygon.stRotation).toBeInstanceOf(ConstantProperty);
        expect(polygon.perPositionHeight).toBeInstanceOf(ConstantProperty);
        expect(polygon.fill).toBeInstanceOf(ConstantProperty);
        expect(polygon.outline).toBeInstanceOf(ConstantProperty);
        expect(polygon.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(polygon.outlineWidth).toBeInstanceOf(ConstantProperty);

        expect(polygon.material.color.getValue()).toEqual(options.material);
        expect(polygon.show.getValue()).toEqual(options.show);
        expect(polygon.hierarchy.getValue()).toEqual(options.hierarchy);
        expect(polygon.height.getValue()).toEqual(options.height);
        expect(polygon.extrudedHeight.getValue()).toEqual(options.extrudedHeight);
        expect(polygon.granularity.getValue()).toEqual(options.granularity);
        expect(polygon.stRotation.getValue()).toEqual(options.stRotation);
        expect(polygon.perPositionHeight.getValue()).toEqual(options.perPositionHeight);
        expect(polygon.fill.getValue()).toEqual(options.fill);
        expect(polygon.outline.getValue()).toEqual(options.outline);
        expect(polygon.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(polygon.outlineWidth.getValue()).toEqual(options.outlineWidth);
    });

    it('merge assigns unassigned properties', function() {
        var source = new PolygonGraphics();
        source.material = new ColorMaterialProperty();
        source.hierarchy = new ConstantProperty();
        source.show = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.stRotation = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.perPositionHeight = new ConstantProperty();

        var target = new PolygonGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.hierarchy).toBe(source.hierarchy);
        expect(target.show).toBe(source.show);
        expect(target.height).toBe(source.height);
        expect(target.extrudedHeight).toBe(source.extrudedHeight);
        expect(target.granularity).toBe(source.granularity);
        expect(target.stRotation).toBe(source.stRotation);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.perPositionHeight).toBe(source.perPositionHeight);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PolygonGraphics();

        var material = new ColorMaterialProperty();
        var positions = new ConstantProperty();
        var show = new ConstantProperty();
        var height = new ConstantProperty();
        var extrudedHeight = new ConstantProperty();
        var granularity = new ConstantProperty();
        var stRotation = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var outlineWidth = new ConstantProperty();
        var perPositionHeight = new ConstantProperty();

        var target = new PolygonGraphics();
        target.material = material;
        target.hierarchy = positions;
        target.show = show;
        target.height = height;
        target.extrudedHeight = extrudedHeight;
        target.granularity = granularity;
        target.stRotation = stRotation;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.perPositionHeight = perPositionHeight;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.hierarchy).toBe(positions);
        expect(target.show).toBe(show);
        expect(target.height).toBe(height);
        expect(target.extrudedHeight).toBe(extrudedHeight);
        expect(target.granularity).toBe(granularity);
        expect(target.stRotation).toBe(stRotation);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.perPositionHeight).toBe(perPositionHeight);
    });

    it('clone works', function() {
        var source = new PolygonGraphics();
        source.material = new ColorMaterialProperty();
        source.hierarchy = new ConstantProperty();
        source.show = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.stRotation = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.perPositionHeight = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.hierarchy).toBe(source.hierarchy);
        expect(result.show).toBe(source.show);
        expect(result.height).toBe(source.height);
        expect(result.extrudedHeight).toBe(source.extrudedHeight);
        expect(result.granularity).toBe(source.granularity);
        expect(result.stRotation).toBe(source.stRotation);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.perPositionHeight).toBe(source.perPositionHeight);
    });

    it('merge throws if source undefined', function() {
        var target = new PolygonGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new PolygonGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'hierarchy', [], []);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'height', 3, 4);
        testDefinitionChanged(property, 'extrudedHeight', 4, 3);
        testDefinitionChanged(property, 'granularity', 1, 2);
        testDefinitionChanged(property, 'stRotation', 5, 6);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'perPositionHeight', false, true);
    });
});