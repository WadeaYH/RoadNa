# RoadNa CityWorld — Option B

CityWorld is a working 3D navigation prototype for the existing RoadNa JO frontend. It depicts an original stylized neighborhood inspired by warm limestone buildings and contemporary Jordanian urban details; it is not a model of a real city. CityLite / Option A is reserved for a later iteration.

## Run and preview

Run `npm start` from the project root, then open http://127.0.0.1:4173/screens/landing-page/index.html. No install or build step is needed. ES modules need the local HTTP server. The root screen directory and the other 19 screens are preserved.

Run `npm run check` for syntax, assets, anchors, routes and relative module imports. Network/storage checks apply to application code; the unchanged vendored Three.js library includes unused loader APIs.

## Changes and files

Modified:

- `screens/landing-page/index.html`: CityWorld stage, semantic story copy, landmark links, mobile selector, explanation dialog, transcript, fallback and existing lower sections.
- `screens/landing-page/style.css`: CityWorld layout, scoped palette, native progress property/timeline, responsive styling and reduced-motion support. Imports the saved original stylesheet for the retained lower sections.
- `screens/landing-page/script.js`: loads the local city module and handles initialization failure.
- `tools/check.mjs`: supports ES-module syntax and validates local module imports; keeps network/storage restrictions on application code.
- `README.md`: current implementation, preview and rollback documentation.

Created:

- `city/three.js`: local Three.js re-export.
- `city/geometry.js`: reusable rounded geometry, material cache and static geometry batching.
- `city/world.js`: terrain, limestone buildings, City Hall, map center, residences, park, roads, furniture, hazard, markers and six landmark hit volumes.
- `city/vehicles.js`: three looping traffic vehicles, the story car and a parked decorative car.
- `city/pedestrians.js`: five small walkers on predefined sidewalk/park paths.
- `city/camera.js`: orthographic isometric framing, story focus, bounded panning/zoom and reset.
- `city/scene.js`: renderer, lighting, shadows, simulation updates and GPU resource cleanup.
- `city/hotspots.js`: raycasting, hover/focus halos, projected HTML labels, keyboard links, mobile selector and dialog entry.
- `city/intro.js`: native timeline progress, story chapters, one animation loop, pause/resume, reduced motion and UI controls.
- `vendor/three/three.module.min.js`, `three.core.min.js`, `LICENSE`, `README.md`: pinned Three.js 0.180.0 / r180 and provenance.
- `assets/city/city-overview.webp`: a 60,778-byte snapshot rendered from the actual scene for graceful fallback.
- `original.html`, `original-style.css`, `original-script.js`: the previous landing experience, still reachable.
- `CITYWORLD.md`: these implementation notes.
- `checkpoints/pre-cityworld-2026-10-11/`: original files, restore notes and hashes of the other screens.
- `.verification/cityworld/`: screenshots and recorded browser results.

City-module paths above are relative to `screens/landing-page/`. All other screen HTML/CSS/JS files matched their pre-change SHA-256 hashes.

## World structure

The diorama has intersecting roads, crosswalks, sidewalks, a small parking area, traffic signals, streetlights, bins, signs, benches, trees and planted paths. Residential silhouettes include balconies, parapets, solar panels and rooftop tanks. City Hall has a colonnade and glazed teal tower; the map center has a canopy and map monument.

Most static detail is baked into 35 material batches. Geometry and materials are reused. A hemisphere light and one directional light provide soft daylight, with one bounded shadow map. There is no postprocessing, physics engine, third-party model download or remote texture request.

The traffic loop follows connected roads away from the hazard lane. The teal story car stops with its front at x=3.95 before the pothole edge at x=4.16. Pedestrians walk separate predefined paths with simple arm and leg movement. Two trees move gently. The pin floats slightly when motion is allowed. This is decorative activity, not traffic simulation or municipal action.

## Cinematic intro

The native CSS view timeline animates a registered numeric progress property. The shared render loop reads that value to advance or reverse the camera, teal car and narrative. There is no wheel hijacking or new scroll-event listener.

1. Overview: “Every city has a story.” Traffic and pedestrians are visible.
2. Problem: the camera moves into the road and the car approaches the orange-marked pothole.
3. Report: the car stops safely, a location pin appears and an HTML overlay shows sample reporting information. The original small headline pothole illustration appears in the narrative.
4. Hub: the camera returns to the overview; the six landmarks and controls become available.

Skip Intro and Explore City jump immediately to the hub. Users can continue scrolling to ordinary page content. The camera remains above ground with fixed rotation, bounded panning and bounded zoom. Mouse dragging pans; touch keeps normal vertical browser scrolling. Zoom and reset have explicit buttons. Page links use a brief camera focus and a 360 ms transition when motion is allowed, or ordinary immediate navigation with reduced motion. Modifier-click behavior is retained for HTML links.

## Hotspot routes

| Landmark | Label | Destination |
| --- | --- | --- |
| Road hazard / pin | Report an Issue | Login, then the existing resident preview flow |
| Map center | Explore Reports | Public Reports Map |
| Residential complex | Resident Area | Login, then Resident Dashboard preview |
| City Hall | Municipality | Login, then Admin Console preview |
| Notice board | Community Report | Existing sample Report Details |
| Park pavilion | How RoadNa Works | Local accessible explanation dialog; HTML href also targets the retained information section |

There is no fake login, role assignment, direct reporting or admin bypass. Six normal location links remain below the canvas, alongside header navigation and a footer link to the 20-screen directory. Mobile uses a labeled location selector instead of tiny projected labels.

## Accessibility and fallbacks

Projected labels are real HTML links; the canvas is hidden from assistive technology. Keyboard focus gives the same landmark feedback as hover. The information dialog supports Escape, native modal focus containment and focus restoration. Controls have visible focus styling and touch-sized targets.

Reduced motion turns off camera travel and vehicle, pedestrian, tree and pin loops; the camera and traffic were verified unchanged over time. All story text is available in an expanded transcript. Short viewports and unsupported timelines use an unpinned overview with the transcript open.

If WebGL fails, the city snapshot and normal location links remain. JavaScript-disabled navigation was also tested. No sound control is shown because no audio is implemented.

Rendering and simulation pause while offscreen or when the document is hidden. Pixel ratio is capped at 1.75 for larger viewports and 1.25 for small ones; small-screen shadows are disabled. Render cadence is capped around 60 FPS desktop / 30 FPS small screens. GPU resources are disposed when leaving the page. Back/forward cache restores reload the page to recreate a valid scene.

## Verification — 2026-10-11

- Baseline and final `npm run check`: passed, 20 screen folders, valid application scripts, assets, anchors and module imports.
- Responsive browser checks: all 20 screens at 320, 375, 768 and 1280 widths; 80 cases, no horizontal overflow, failed resource responses or page exceptions.
- City screenshots inspected at 320×740, 375×812, 768×1024, 1280×720 and 1440×1000.
- Four story stages and reverse scrolling: passed. The car stops before the pothole.
- All five page destinations through landmark links: passed. Actual WebGL raycast clicking into the map: passed.
- Mobile selector: reached the Public Reports Map.
- Zoom, bounded mouse panning and reset: passed.
- Keyboard opening, Escape closing and focus return for the explanation dialog: passed.
- Reduced motion: traffic, camera and simulation time unchanged; complete transcript visible.
- Forced WebGL failure, unsupported-timeline mode and disabled JavaScript: retained usable navigation.
- Short 1280×600 viewport: unpinned overview and complete transcript, no overflow.
- Offscreen pause and a simulated document-visibility event: simulation time stayed unchanged.
- Original page: headline pothole and prior scroll story present, no overflow.
- All 20 screens remain reachable; the other 19 screens have unchanged HTML/CSS/JS hashes.

Short headless Edge measurements on Intel UHD / Direct3D11 recorded about 55 rendered FPS at 1280×900 and 28 at a 375×812 viewport after the rendering caps. These are brief measurements on this machine, not physical-phone or cross-device performance guarantees. The smaller viewport measurement does not establish mobile-hardware performance.

Detailed results: `.verification/cityworld/results.json`.

## Rollback

Open `screens/landing-page/original.html` to use the previous landing page immediately. To restore the original default page, copy the checkpoint files back to their corresponding project-root paths, following `checkpoints/pre-cityworld-2026-10-11/RESTORE.md`.

The current folder was not a Git repository, so the rollback is file-based. Existing image assets and shared styles were preserved. No CityLite implementation was created.

## Limits and next iteration

The city is original procedural art, with simplified walkers and decorative traffic. It does not include collision physics, actual geography, live map services, authentication, reports, AI or municipal operations. All existing report content remains sample data. No storage or API calls were introduced.

Physical-device and cross-browser performance testing remains necessary. Native continuous scroll animation is progressively enhanced; unsupported browsers receive the interactive overview and readable story. This prototype uses WebGL2 through Three.js; unsupported devices get the static fallback.

Useful second-iteration work: refine landmark-specific architectural details, tune projected-label placement at intermediate camera positions, test midrange physical phones and tune rendering quality, and connect server-owned ASP.NET routes once backend work begins. The preserved original can later become CityLite if desired.

## Library references

Three.js r180 is MIT-licensed. The implementation follows the official [local module setup](https://threejs.org/manual/pages/installation.html), [orthographic camera](https://threejs.org/docs/pages/OrthographicCamera.html), and [raycasting](https://threejs.org/docs/pages/Raycaster.html) documentation. The vendored modules and license are local; no CDN is needed at runtime.
