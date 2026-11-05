# Landing story artwork

Generated with the built-in ImageGen tool for the pothole near-miss story. No CLI fallback was used. Both assets were inspected before integration. The car alpha channel is preserved in the WebP delivery version.

## Final workspace assets

- Road used by the page: [story-road.webp](<C:/Users/user/Desktop/Master Piece/screens/landing-page/assets/story-road.webp>), 1672 × 941, 554,832 bytes.
- Car used by the page: [story-car.webp](<C:/Users/user/Desktop/Master Piece/screens/landing-page/assets/story-car.webp>), 1536 × 1024, 217,760 bytes, transparent background.
- Original road: [story-road.png](<C:/Users/user/Desktop/Master Piece/screens/landing-page/assets/story-road.png>).
- Original car: [story-car.png](<C:/Users/user/Desktop/Master Piece/screens/landing-page/assets/story-car.png>).

## Prompt set (condensed)

Road: A landscape 16:9 orthographic aerial view of a straight two-lane municipal road running horizontally, with dashed center markings, pale sidewalks and greenery above and below. A single damaged pothole sits in the lower lane around 72% across and 61% down. Keep the approach from the left clear, with no cars, people, lettering, labels or interface elements. Soft daylight, restrained natural colors and sufficient asphalt texture to match a polished municipal landing page.

Car: A separate teal passenger-car sprite viewed directly from above at 90 degrees. The front points right. Deep petrol-teal body, dark panoramic roof, realistic proportions and shading consistent with soft light from the top left. Center the full vehicle, with a genuinely transparent background and no road, lettering, interface elements or shadow beyond the vehicle. It must composite naturally onto the separately generated road.

## Implementation

CSS positions the car in the lower lane and animates its wrapper from the left to a halt before the pothole. The raster assets contain no captions. All text, the hazard highlight and the location marker belong to the accessible HTML/CSS interface. The existing landing-page headline SVGs were retained.

The native timeline follows the [CSS animation-range documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-range).
