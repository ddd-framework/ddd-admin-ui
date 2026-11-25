import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fittedImageScaleOf, IMAGE_ZOOM_STEPS, imageBaseSizeOf, imageZoomBaseOf, nextImageZoom, VECTOR_IMAGE_CLICK_ZOOM } from './imageZoom.ts';

describe('imageZoom', () => {
  it('steps up and down and stops at the ends', () => {
    assert.equal(nextImageZoom(1, 1), 1.5);
    assert.equal(nextImageZoom(1, -1), 0.75);
    assert.equal(nextImageZoom(0.4, 1), 0.5, 'from a fitted scale between two steps');
    assert.equal(nextImageZoom(0.4, -1), 0.25);
    assert.equal(nextImageZoom(4, 1), IMAGE_ZOOM_STEPS[IMAGE_ZOOM_STEPS.length - 1]);
    assert.equal(nextImageZoom(0.25, -1), IMAGE_ZOOM_STEPS[0]);
  });

  it('counts from the size a picture is drawn at when it names none', () => {
    assert.deepEqual(imageBaseSizeOf({ width: 640, height: 480 }, { width: 320, height: 240 }), { width: 640, height: 480 });
    // an SVG without width and height: some browsers report 0
    assert.deepEqual(imageBaseSizeOf({ width: 0, height: 0 }, { width: 320, height: 240 }), { width: 320, height: 240 });
    assert.deepEqual(imageBaseSizeOf({ width: 300, height: 0 }, { width: 320, height: 240 }), { width: 320, height: 240 });
  });

  it('measures the fitted scale by the tighter side', () => {
    assert.equal(fittedImageScaleOf({ width: 400, height: 200 }, { width: 200, height: 100 }), 0.5);
    // a vector picture stretched over its box (`object-fit: contain`): the element is wider than the drawing
    assert.equal(fittedImageScaleOf({ width: 100, height: 100 }, { width: 800, height: 300 }), 3);
    assert.equal(fittedImageScaleOf({ width: 0, height: 0 }, { width: 800, height: 300 }), 1);
    assert.equal(fittedImageScaleOf({ width: 100, height: 100 }, { width: 0, height: 0 }), 1);
  });

  it('counts the steps of a vector picture from its fitted size', () => {
    // a raster picture: 100 % is its own pixels, wherever it is drawn
    assert.deepEqual(imageZoomBaseOf({ width: 4000, height: 3000 }, { width: 800, height: 600 }, false), { width: 4000, height: 3000 });
    // an icon of 24 px fills a box of 1000 × 600 when fitted: 100 % is 600 × 600, so "zoom in" enlarges what is seen
    const base = imageZoomBaseOf({ width: 24, height: 24 }, { width: 1000, height: 600 }, true);
    assert.deepEqual(base, { width: 600, height: 600 });
    assert.equal(fittedImageScaleOf(base, { width: 1000, height: 600 }), 1, 'fitted is 100 %');
    assert.equal(nextImageZoom(fittedImageScaleOf(base, { width: 1000, height: 600 }), 1), 1.5);
    assert.equal(nextImageZoom(fittedImageScaleOf(base, { width: 1000, height: 600 }), -1), 0.75);
    assert.equal(VECTOR_IMAGE_CLICK_ZOOM, 2);
    // an element that is not laid out yet: the picture's own size
    assert.deepEqual(imageZoomBaseOf({ width: 320, height: 180 }, { width: 0, height: 0 }, true), { width: 320, height: 180 });
  });
});
