# RoadNa CityWorld v2 — handoff notes

Last updated 2026-10-12. Read this first instead of re-reading the code. It covers what exists, where it lives, how it works, how to verify it, what is left, and the open decisions about roles.

## 1. Status in one paragraph

Claude rebuilt Codex's CityWorld v1. Codex's v1 is saved in `checkpoints/pre-cityworld-v2-2026-10-11/`, and `RESTORE.md` there explains how to roll back. There are now two experiences built on one shared Three.js engine in `shared/cityworld/`:

1. **The landing page** (`screens/landing-page/`). It is a scroll-directed story that runs in five chapters inside the 3D city:
   - The story opens at blue hour, and the sun rises as you scroll.
   - A chase shot follows a car down the avenue, with letterbox bars. The car stops at a pothole and the cars behind it queue up.
   - A resident photographs the pothole and a pin drops on it. A report card fills in, and a signal arcs to City Hall.
   - A crew van arrives and a worker repairs the road.
   - Cars park, and a golden-hour overview shows six clickable landmarks and an "Enter CityWorld" button.
   - The whole story plays in reverse when you scroll back up.
2. **CityWorld** (`screens/city-world/`). It is a full-window city where every building is one of the 20 screens. It runs a live simulation:
   - Potholes slow traffic and cause jams.
   - Open reports lower resident mood, and a very low mood brings a protest to City Hall.
   - Residents report problems with their phones, and crews drive out from the depot to fix them.
   - It also has a day/night cycle, issue tools, a directory drawer, a help dialog and photo mode.

`npm run check` passes with 21 screens. The other 19 screens were not edited. The root `index.html` has a new "Explore as a city (CityWorld)" link.

## 2. Run and verify

- Run `npm start` and open `http://127.0.0.1:4173/screens/landing-page/index.html` and `/screens/city-world/index.html`.
- Run `npm run check`.
- `.claude/launch.json` defines `roadna-static`, which runs `node tools/serve.mjs` on port 4173.
- **Hidden browser pane:** when the Claude Desktop browser pane is hidden, `requestAnimationFrame` stops firing, so nothing animates. Drive frames from JavaScript instead with `engine.advance(seconds, fps)`. Screenshots often show the previous frame, so take two.
- **Diagnostics, landing page:** `window.RoadNaStory` exposes `progress`, `target`, `scrolly`, `chapter`, `engine`, `actors`, `seek(p)`, and `simulateReducedMotion(on)`. `simulateReducedMotion` runs the same code path as `prefers-reduced-motion`, which the browser tool cannot emulate.
- **Scroll the story for real:** compute `top = scrollY + story.rect.top - headerH + (story.offsetHeight - stage.offsetHeight) * p`, call `scrollTo(0, top)`, then `engine.advance(2.5, 20)`.
- **Diagnostics, CityWorld:** `window.RoadNaCityWorld` exposes `stats`, `engine`, `sim`, `selected`, `tool` and `metrics`.
- **Fallback snapshot:** `screens/landing-page/assets/city/cityworld-overview.jpg` was made with headless Edge:
  - Command: `msedge --headless=new --window-size=1200,900 --virtual-time-budget=20000 --use-angle=swiftshader --enable-unsafe-swiftshader --screenshot=out.png http://127.0.0.1:4173/screens/city-world/index.html#photo`
  - The PNG was converted to JPEG with .NET `System.Drawing`. This machine has no Python or WebP encoder.
  - `#photo` skips the intro and assembles the city instantly.
- **Performance:** about 120 draw calls and about 190,000 triangles on desktop. Frame rates have not been measured on real hardware yet.

## 3. File map

### Shared engine: `shared/cityworld/`

| File | Purpose |
| --- | --- |
| `three.js` | Re-exports the vendored Three.js r180 from `shared/vendor/three/` (MIT). |
| `kit.js` | Palette `C`, seeded `rng`, easing helpers, and the cached-primitive `Builder`. The builder bakes many vertex-coloured pieces into one mesh per "kind" (solid, glass, foliage, lamp, water, metal, sign). `createMaterials()` adds shader patches: foliage sway (`aExt`), glass windows that light up at night (`aExt` lit flag, `uNight`), and signs that glow at night. |
| `signs.js` | A 2048² canvas atlas for all signs, emblems and custom art. It also holds the icon glyphs and `loadSignFonts()`. |
| `textures.js` | `SIGN_TEXT` (title, subtitle, icon and colour per building), `EMBLEMS`, and `CUSTOM` art: city map, notices, triage screen, clock face, heatmap, ID card, billboard, bus ad. |
| `layout.js` | `BOARD` (66×50), `RING` (ring road at ±25/±17, corner radius 5), `ROAD`, `DISTRICTS` (4 districts with colours), `PLACES` (20 buildings: id, screen, footprint box, front side), `SPOTS` (story pothole at (15, 0.85), depot doors, parking, park), `STREETS`. |
| `roads.js` | The lane graph: 9 nodes (C, E, W, N, S, and the four corners); lanes are named like `C>E`. Includes Bezier turn curves with arc-length tables, adaptive one-approach-at-a-time signals, BFS `route()`, `nearest()`, road meshes, crosswalks, and instanced signal lamps. |
| `props.js` | Olive, cypress, palm and round trees, lamps (which register glow points), benches, bins and dumpsters, bus stop, kiosk, umbrellas, fountain, flags, playground, billboard, cones. |
| `buildings.js` | A generic Levantine limestone building (parapets, windows, balconies, shutters, rooftop water tanks and solar heaters, stair huts, laundry), `LANDMARKS` with one builder per place, a decorative `mosque`, and edge `filler` houses. |
| `world.js` | `buildWorld()`: board, roads, street furniture, four district dressings, the city edge, and the 20 building meshes. Each building gets its own material clone so it can be tinted on hover. Also pick proxies, hover/select outline shaders, and the moving details (clock hands, radar, beacons, bell). |
| `vehicles.js` | Instanced car models (compact, sedan, taxi, SUV, van, bus). The traffic model covers car following, signals, and potholes: cars hesitate, crawl and swerve, and the delay grows with `severity`. Also `routeTo`, curved `maneuver`s, a flow index and `jammed()`. |
| `people.js` | Instanced walkers on sidewalk loops (about 30% wear hijab). Modes: walk, react (phone up to report), worker, protest (with sign), and cheer. Also `addScripted` and `walkTo`. |
| `fx.js` | GPU particles (dust, sparkle, confetti, splash, stink), ground ripples, lamp glow plus light pools, and the `makePin()` 3D pin. |
| `issues.js` | Issue types pothole, light, trash and drain. Covers visuals, traffic hazards, `workSpot`, `startWork` (cones and a worker), `finish` (patch and confetti), and potholes growing over time. Exports `makePotholeMesh`, `makePatchMesh`, `makeConesMesh`. |
| `sim.js` | The sandbox: game clock, issue spawning by road wear, resident or municipal reporting, auto-dispatch, the crew lifecycle (depot → route → hold at the curb → work → home), mood, protest, traffic density rising with potholes and rush hour, and events. |
| `camera.js` | Camera rig with target, distance, azimuth, elevation, field of view, and screen offset `sx`/`sy` via `setViewOffset`. Provides `fit(radius, fov, aspect)`, pan, zoom, 90° rotation, focus, and lifts the camera when it would clip a building. |
| `engine.js` | `createEngine(canvas, opts)`: renderer (NeutralToneMapping, PCF soft shadows), sky lighting from a generated environment map, day/night presets (`setDaylight(night, warm)`, `daylightFromClock`), sRGB sky colours via `onSky`, assembly animation, adaptive pixel ratio, picking, `project`, the frame loop, and `advance`. |
| `overlay.js` | HTML elements pinned to 3D positions. |

### Pages

- **`screens/city-world/`** (`index.html`, `style.css`, `script.js`): the HUD, cards, tools, input handling, bubbles and feed. The directory is static HTML, so it still works without JavaScript or WebGL.
- **`screens/landing-page/`**:
  - `index.html`: the story section, the explore section, then the original How it works, Recent reports, CTA and footer.
  - `style.css`: imports `original-style.css` for the lower sections.
  - `script.js`: checks for WebGL and boots `city/story.js`.
  - `original.html`: the pre-CityWorld page.
- `screens/landing-page/CITYWORLD.md` and the README's CityWorld section were updated to point here.

## 4. Coordinates and city plan

The y axis is up, x points east and z points south. The default camera azimuth is π/4, which places the camera south-east of the city.

| Item | Location |
| --- | --- |
| Board | Grass top at y = 0 |
| Asphalt | Top at 0.06 (`ROAD_Y`) |
| Sidewalks and lots | Top at 0.22 (`LOT`) |
| Parking surface | About 0.245 |
| Cross streets | z = 0 is Al-Zaytoun Avenue; x = 0 is Al-Yasmeen Street |
| Lanes | Right-hand traffic, lane offset 0.85. For example, `C>E` is eastbound at z = +0.85 and `E>C` is westbound at z = −0.85. |

Districts:

| District | Block | Buildings |
| --- | --- | --- |
| Public (green) | South-east | Visitor Centre (landing page), Map Centre (public map), Community Centre (report details), park with the "How it works" pavilion, café, parking |
| Resident (orange) | South-west | Apartments (profile), Resident Home (dashboard), Reports Archive (my reports), Bell Tower (notifications), Report Kiosk (create report), Drop Office (report submitted) |
| Municipal (teal) | North-east | City Hall (admin dashboard), Triage Centre, Crew Depot (dispatch; vans use door x = 18.65), Clock Tower (SLA), Data Observatory (heatmap) |
| Civic (blue) | North-west | Civic ID Centre (login), Welcome Office (register), Post Office (check email), Lost & Found (forgot password), Locksmith (reset password), Secure Vault (password updated) |

The edge of the board has a mosque in the north-west corner, filler houses along the north and west edges, an olive grove on the east, palms and a billboard on the south, and bus stops.

## 5. CityWorld simulation knobs (`sim.js`, `vehicles.js`)

- **Road wear:** a new issue every 24 s (calm), 14 s (normal) or 6.5 s (storm), up to 14 open issues.
- **Report delay:** 3–7 s when RoadNa is on, 24–40 s when it is off. A nearby walker visibly reports the problem.
- **Mood target:** 94 − 6.5 × reported − 2.5 × unreported − min(28, age term) − max(0, 0.82 − flow) × 60. A protest starts below 28 and ends above 44.
- **Traffic density:** base 18 cars on desktop or 12 on phones, + 1.3 per pothole, + 4 during rush hour, capped at base + 13.
- **Potholes:** severity grows by 1/110 per second, up to 1.8. A car's hesitation is its patience (1.1–2.3 s) × severity.
- **Crews:** 2 at the start, up to 4. Work time is 4.5–7 s depending on the issue type. A crew parks at the curb (`holdLateral` 0.72) so traffic squeezes past.
- **Controls:**
  - Tool keys 1–5, Space to pause, Q/E to rotate, +/− to zoom, arrow keys to pan, R to reset, D for the directory, H for photo mode, Esc to close.
  - Double-click a building to enter it. On touch, tap once to select and tap again to enter.
  - `#hall` (and similar ids) deep-links to a building card. `#photo` opens photo mode.

### UI pass on 2026-10-12: operations panel and specialised crews

**Crews.** `sim.js` exports `CREW_TYPES`. Each crew can only take matching jobs:

| Crew | Vehicle model | Fixes | Colour |
| --- | --- | --- | --- |
| Roads | `patch` asphalt patch truck | Potholes | Orange |
| Lighting | `bucket` bucket truck | Streetlights | Yellow |
| Sanitation | `compactor` compactor truck | Bins | Green |
| Drainage | `jetter` jetter tanker | Drains | Blue |

- The city starts with one crew of each type. You can add more, up to 6 in total.
- Each crew has a code (for example `R-1`), a plate, and three named members: supervisor, technician and driver.
- `sim.dispatch(issue, crew)` returns `{ ok, reason }`.
- Other helpers: `sim.canDo`, `sim.idleFor`, `sim.eta`, `sim.crewStatus`.
- Events carry a `title`, `detail` and `tone` for the UI.
- Reports get a code like `RN-1041`.
- A `waiting` event fires only when no matching crew is free.

**Operations panel** (`#cw-panel`, on the left):
- Tabs: **Reports** (filters: All open, Needs a crew, In progress, Fixed), **Crews** (rows plus a block for adding a crew) and **Activity** (full log with Show buttons and an unread badge).
- It can be minimised. It starts minimised under 1000px, and on phones it docks as a tab bar above the toolbar.
- The pin-colour legend sits under the reports list.

**Cards:**
- A report card shows the crew type it needs and a **Send a crew** picker. The best match is highlighted, and crews that can't take the job are disabled with the reason.
- A crew card shows the vehicle, status, current job, what the crew fixes, its team, matching waiting jobs, and "Follow on the map".

**Notifications** (`#cw-toasts`, top centre):
- At most two alerts at a time, each with a Show button.
- A new report only raises an alert when someone needs to act; reports that auto-assign handles go to the Activity log quietly.

**Layout fixes:**
- The top bar is truly centred (`1fr auto 1fr`).
- The dock groups have captions, and the problem tools are labelled "Training: create a problem".
- The hint text was removed. The welcome card moved to the top right.
- The floating district chips were removed because they collided with the dock. Each district heading in the Directory now has a "Show on map" button instead.
- Dock buttons are a uniform 50px tall. Captions have a 10px line height and sit in 16px of top padding, so they never touch the buttons.
- The camera controls stack vertically below 1440px.
- On the landing page, the scroll cue and chapter rail use `display: flex` again, so the mouse icon is centred.

**Keyboard:** L opens the reports list and C opens the crews list.

## 6. Landing story timeline (`city/story.js`)

The story's scroll height is 660vh, and the stage is sticky. Scroll progress `p` is smoothed with a damping factor of 5.5 (9 when the target is far away).

| p | Beat |
| --- | --- |
| 0–0.13 | Blue hour to sunrise (`SKY_STOPS`); chapter 1 |
| 0.20–0.378 | Hero car drives from x = −16 and stops at x = 13.25 |
| 0.25–0.43 | Followers queue at 11.25 and 9.15; letterbox bars from 0.235 to 0.425 |
| 0.425–0.505 | Resident's phone is up |
| 0.432–0.468 | Pin drops |
| 0.442–0.825 | Report card is shown; it becomes compact at 0.526 |
| 0.505–0.555 | Arc travels to City Hall, then a ripple and the bell rings |
| 0.562–0.628 | Van leaves the depot |
| 0.632–0.758 | Worker is on site |
| 0.645–0.756 | Cones are out |
| 0.70–0.722 | Pothole turns into the patch, with confetti |
| 0.745–0.885 | Cars drive into the parking lot |
| 0.775 onwards | Van goes north to its next job |
| 0.85–1 | Finale: golden light, labels from 0.90 to 0.95 |

Other details:
- **Camera keyframes** are stored as `[p, tx, ty, tz, radius, az, el, fov, sx, sy]` and interpolated with monotone cubic curves. The distance is `fit(radius, fov, aspect × (1 − 2|sx|))`, so the subject fits beside the text column.
- **Chapter windows** are kept in `CH`. Words are split into `.w > span` elements and revealed with CSS `--in`, `--out`, `--i` and `--n`.
- **Story lanes:** all cross-street lanes are reserved (`STORY_LANES`), so background traffic only uses the ring road.
- **Landmark labels** (six real links) are placed with collision avoidance. "How RoadNa Works" opens a dialog. The others navigate after a camera dolly and a fade.
- **Static mode:** reduced motion, very short screens and no WebGL get one still frame of the city plus the story chapters as text. The CSS for this is under `.story.is-ready:not(.is-scrolly)`.

## 7. Known issues and to-do

- The README's CityWorld section and `screens/landing-page/CITYWORLD.md` were brought up to date by pointing them here.
- Frame rates have not been measured on a real desktop or phone.
- Optional polish:
  - Give the Visitor Centre more character.
  - Vary the grass at the edges with patches, low stone walls and rocks.
  - Check framing at very wide sizes, at 1280×600, and in landscape on phones.
- The old `assets/city/city-overview.webp` (the v1 city) is kept only for the v1 rollback.
- CityWorld currently links directly to resident and admin preview screens, the same way the root directory does. This will change with the role plan below.

## 8. Proposal for tomorrow: role-based maps and flows

> **Update 2026-10-13:** the detailed government cycle, the role loops, the uses of the map, and the ready-to-use implementation prompt are in `COMMAND-CITY-CYCLE.md`. It supersedes the lifecycle below. It adds a Supervisor role for verifying P1/P2 work and separates response from resolution SLA clocks.

The user's idea:
- Keep the interactive 3D city for managers and admins only, as a "Command City" they jump into from the normal admin dashboard.
- Give residents a normal 2D map, like Google Maps, showing reports in their area. Clicking a pin opens the report details.
- Residents can never open the admin map.

### Roles

| Role | Main view | Can do |
| --- | --- | --- |
| Guest | Public 2D map, read-only | Browse public reports and details; must sign in to report |
| Resident | 2D map of their area plus "My reports" | Report with photo and location, add "me too" to existing reports, follow progress, confirm the fix or reopen |
| Field crew | Mobile job list plus 2D route map | Accept a job, start it, upload before and after photos, mark it done, flag a blocker |
| Dispatcher / supervisor | Command City (3D) plus dashboard tables | See live issues, assign crews (for example by dragging a crew onto an issue), watch SLA timers, rebalance crews |
| Department admin (roads, lighting, sanitation, drainage) | Command City filtered to their category | Triage, merge duplicates, set priority, manage their own crews |
| Municipality admin | Everything for one municipality | Users and crews, SLA rules, districts, exports |
| Super admin | Multi-municipality console | Each municipality is its own city board; roles, permissions, audit log |

### Report lifecycle

1. Submitted.
2. Triage: validate, merge duplicates, set category and priority. It can also end here as Rejected or Duplicate.
3. Assigned to a department.
4. Dispatched to a crew.
5. In progress.
6. Resolved, with a photo as proof.
7. The resident confirms (then Closed) or reopens it. Automatic closing after N days is an option.

### What the 3D view would mean for admins

- **Buildings become admin tools:** City Hall is the overview, the Triage Centre is the queue, the Depot is the crews, the Clock Tower is SLA, and the Observatory is the heatmap.
- **City blocks become real districts or wards.**
- **The sandbox tools** (dropping a pothole, breaking a light) move to a separate "Training mode". Live mode must never invent issues.

### Open decisions

1. **Geography.** Real coordinates cannot be placed on a fictional city. Three options:
   - A schematic "district twin": each block is a real ward, and issues are placed by street segment within it.
   - Generate the 3D city from OpenStreetMap buildings. Realistic, but heavy.
   - Keep the city as pure dashboard art: district health only, with no exact pins.

   The recommendation is the schematic district twin.
2. **The landing page and the public CityWorld explorer.** The cinematic story can stay as public marketing. The open question is whether to:
   - remove the public "Enter CityWorld" explorer, or
   - keep a limited demo.

   The current "every building is a page" explorer exposes admin screens to everyone.
3. **Resident map technology:**
   - Leaflet vendored locally, with OpenStreetMap tiles (the tiles need internet), or
   - an illustrated or static sample map for the frontend preview only.
4. **The "jump" transition** from the dashboard into Command City. For example, the dashboard's KPI tiles fly into the city HUD, or a zoom through the City Hall icon.
5. **Crew experience.** Should crews get a mobile list only, or also a simplified map?
6. **Whether Training mode stays,** and who can use it.
7. **Super admin across multiple cities.** Should the city picker show each municipality as its own board?
8. **Permissions enforcement.** The real enforcement must happen in ASP.NET with role and policy authorization. The frontend preview can only simulate it with separate entry links.

### Recommended answers (Claude, 2026-10-12, not yet confirmed by the user)

1. **Maps per audience.**
   - Guests, residents and crews get a real 2D map. The plan is Leaflet vendored locally with OpenStreetMap tiles, plus an illustrated offline fallback for the preview.
   - Staff get the 3D Command City as a schematic district twin: each block is a real ward, and issues are pinned by ward and street.
   - Staff can always switch between City, 2D map and table views. The 3D city is an overview layer, never the only interface.
2. **Roles for version 1:**
   - Guest
   - Resident
   - Field crew
   - Dispatcher (operations manager)
   - Municipality admin

   Department and district are scopes on a role, not separate roles. Add super admin only when there really are several municipalities.
3. **Report lifecycle as a server-side state machine.** Each role may only make certain transitions, every transition is written to an audit log, a photo is required to resolve, and reports auto-close 7 days after the resident is asked to confirm.
4. **Live mode vs Training mode.** Live mode only shows data. Training mode keeps today's sandbox and is clearly labelled.
5. **Public CityWorld.** The landing story stays as public marketing. The public explorer moves behind staff login and becomes Command City, for example `screens/admin-command-city/`, with its buildings remapped to admin tools. The landing calls to action change to "Reports near you" for the 2D map and "For municipalities" for login.
6. **Entry from the dashboard.** The admin dashboard stays the default. An "Enter Command City" button lazy-loads the 3D city with a fly-in transition.
7. **Build order:**
   1. Resident 2D map.
   2. Command City, remapped to live sample data with drag-to-dispatch and a Training mode toggle.
   3. Landing calls to action and navigation.
   4. A new crew mobile screen.
   5. A role picker on the preview login to simulate access.
