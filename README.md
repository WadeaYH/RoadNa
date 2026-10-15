# RoadNa JO frontend

Twenty-seven responsive frontend screens for a municipal issue-reporting portal, based on [Orange_Design_Task in Figma](https://www.figma.com/design/3zWfidyuAT7SUeZR03IaJ2/Orange_Design_Task?node-id=64-36&m=draw). Each screen has its own HTML, CSS and JavaScript files. There is no framework or build step.

## Preview

The latest [frontend review](REVIEW-2026-10-15.md) lists the fixes, remaining workflow gaps and prioritized 3D map recommendations.

**Account experience:** [Login](screens/login/index.html) and [Register](screens/register/index.html) use a formal municipal portal layout: a restrained teal identity panel, white forms, clear labels and responsive spacing. Both forms appear immediately, with no introductory scene, animation, photos or 3D dependencies. On phones, the form takes priority in a single-column layout. The existing registration fields, accessible inline validation, password controls, resident/staff login routes, recovery links and preview destinations remain intact. Shared account styling and validation live in `shared/account.css` and `shared/account.js`. The registration office module and its unused illustration have been removed.

Run `npm start` (or `node tools/serve.mjs`) from this folder and open [the screen directory](http://127.0.0.1:4173). The local server serves only the frontend files. You can also open `index.html` directly for a basic preview; the local server is preferable for fonts and clipboard controls.

Run `npm run check` (or `node tools/check.mjs`) to check screen structure, JavaScript syntax, local assets, cross-screen links and anchors, and the absence of storage or API calls. The preview server and checker use Node's built-in modules; no installation step is required.

## Structure

- `index.html` — directory grouped into public, account, resident and administration screens.
- `screens/<screen>/index.html` — semantic screen markup and sample content.
- `screens/<screen>/style.css` — screen-specific layout and responsive styling.
- `screens/<screen>/script.js` — presentation-only interactions and animations.
- `screens/<screen>/assets/` — local artwork where available.
- `shared/base.css` — local fonts, colors, typography, buttons and form controls.
- `shared/auth.css` — account-screen layout.
- `shared/app.css` — administration layouts and components shared by every signed-in screen.
- `shared/resident.css` — resident shell (slim top bar on desktop, bottom tab bar on phones) and the Home cards.
- `shared/community.css` — proposal cards, vote options, results bars and decision boxes.
- `shared/team.css`, `shared/sample-work.js` — field team screens and their sample work orders.
- `shared/logo.svg` — the RoadNa favicon: a teal tile with an R built from a road (amber lane dashes). In the interface the logo is a wordmark: the same R glyph (`.r-glyph`, sized in em) followed by "oadNa", so the glyph is the letter R.
- `shared/ops-data.js`, `shared/ops.css` — the sample reports, teams, statuses, role presets, shared clock and detail card used by both the 2D operations map and the 3D operations view.
- `shared/map.js`, `shared/map.css` — the Leaflet map helper used by every 2D map.
- `shared/ui.js` — shared navigation, password visibility, preview feedback and motion.
- `tools/` — dependency-free development server and checks.

Mockup and wireframe variants share one screen folder. The original ResetPasseord name is normalized to `reset-password`.

## Screens

| Screen | Area | Files |
| --- | --- | --- |
| Landing page | Public | [screens/landing-page/](screens/landing-page/index.html) |
| Public report map | Public | [screens/public-guest-menu/](screens/public-guest-menu/index.html) |
| Help and policies | Public | [screens/help/](screens/help/index.html) |
| Login | Account | [screens/login/](screens/login/index.html) |
| Register | Account | [screens/register/](screens/register/index.html) |
| Forgot password | Account | [screens/forgot-password/](screens/forgot-password/index.html) |
| Check email | Account | [screens/check-email/](screens/check-email/index.html) |
| Reset password | Account | [screens/reset-password/](screens/reset-password/index.html) |
| Password updated | Account | [screens/password-updated/](screens/password-updated/index.html) |
| Resident home | Resident | [screens/home-menu/](screens/home-menu/index.html) |
| Create report (4-step wizard) | Resident | [screens/create-report/](screens/create-report/index.html) |
| Report submitted | Resident | [screens/report-submitted/](screens/report-submitted/index.html) |
| My reports | Resident | [screens/my-reports/](screens/my-reports/index.html) |
| Report details | Resident | [screens/report-details/](screens/report-details/index.html) |
| Notifications | Resident | [screens/notifications/](screens/notifications/index.html) |
| Community votes | Resident | [screens/community/](screens/community/index.html) |
| Profile | Resident | [screens/profile/](screens/profile/index.html) |
| My tasks | Field team | [screens/team-tasks/](screens/team-tasks/index.html) |
| Task page | Field team | [screens/team-task/](screens/team-task/index.html) |
| Admin dashboard | Administration | [screens/admin-dashboard/](screens/admin-dashboard/index.html) |
| Operations map | Administration | [screens/admin-ops-map/](screens/admin-ops-map/index.html) |
| Review and assign | Administration | [screens/admin-incident-triage/](screens/admin-incident-triage/index.html) |
| Check work | Administration | [screens/supervisor-review/](screens/supervisor-review/index.html) |
| Community proposals | Administration | [screens/admin-community/](screens/admin-community/index.html) |
| SLA and work orders | Administration | [screens/admin-sla-orders/](screens/admin-sla-orders/index.html) |
| Heatmap | Administration | [screens/admin-heatmap/](screens/admin-heatmap/index.html) |
| CityWorld (3D, optional view) | Administration | [screens/city-world/](screens/city-world/index.html) |

## Main flow in the preview

1. A resident reports an issue (four steps). The category is suggested from the description.
2. Residents see only Received, In progress and Fixed, or Rejected with a reason.
3. **Review and assign:** the municipality confirms type and priority, then gives the report to a free team. If no team is free, the report waits on the *Waiting for a team* list.
4. The team works from **My tasks** (On my way, I have arrived, Start work, photos and notes). The list marks the next job with its distance and a Directions button that opens the phone's maps app; the task page has Get directions, a Take the before photo button, one-tap quick notes and a sticky next-step button. The team leader submits the work, and the list explains that it now waits for the supervisor.
5. **Check work:** a supervisor compares before and after photos, then approves or sends it back with a reason.
6. **Community:** the municipality publishes a proposal with an end date; residents vote once (changeable until it closes); results show only after closing; the municipality posts its decision.
7. **Operations map:** reviewers, supervisors and municipality heads see reports and teams on one map (role views are a preview). A simulated clock moves teams to their tasks and changes report statuses (Live); the time slider and Play replay the morning from 06:00. The same data and clock drive the 3D city: open `screens/city-world/index.html?view=ops` (or use *Open 3D city view* on the map) to see each report as a real city problem (pothole, dark lamp, overflowing bin or flooded drain) with the city's pin coloured by status, each team as a real crew van that drives the streets to its job and back, hotspots, the same detail card and the same role views. The role and the time travel in the link between the 2D map and the 3D city. The 3D view is only for supervisors (their department by default), managers and super admins; reviewers get a notice pointing to the 2D map. Managers also get area cards (open, overdue, average fix time, resident rating), live headquarters numbers, Neighbourhood health in the Resident Quarter, and a wall display mode. Without `?view=ops`, CityWorld stays the public sandbox.

## Frontend behavior

Navigation, mobile menus, keyboard focus, input hints, password visibility, sample-data filters, illustration views, counters, temporary image previews and reduced-motion support are implemented.

Report, notification and SLA filters support arrow keys, Home and End. Mobile navigation opens as a dialog with an internal close button, focus containment and background controls disabled while open. Landing-page section links close the mobile menu and move focus into the selected content.

Heatmap category and district filters update the sample density clusters, incident markers, forecast circles, crew markers and hotspot ranking together. Empty combinations have a clear message. Tooltips remain readable inside the map and clear of the zoom controls on mobile and desktop.

**Real map.**
- Every 2D map is a real map of Jordan that opens on Irbid. That covers the public report map, resident home, report details, the report form's location picker, the admin heatmap and the operations map.
- The maps use [Leaflet 1.9.4](shared/vendor/leaflet/) (vendored, BSD-2) through [shared/map.js](shared/map.js), with OpenStreetMap street tiles locked to Jordan's borders.
- Sample reports, hotspots and crews sit at real Irbid places checked on OpenStreetMap: University Street by Yarmouk University, Al-Hashemi Street downtown, Emaar Irbid Park, Irbid Camp, Al-Andalus, Bayt Ras, Al Bariha and King Abdullah II Park.
- The tiles load live, so the maps need an internet connection. Offline, they show a note and the pins remain. The free OpenStreetMap tile service is only suitable for this preview, so the production build needs its own or a paid tile provider.

**No-login navigation.**
- Every page is reachable, and no link is a dead end. Footer and policy links open [Help & policies](screens/help/index.html).
- Valid forms go straight to the next screen in their flow.
- On Login you choose *Resident* or *Municipal staff*. The expandable frontend preview section also links directly to Resident, Municipal staff, Field team and Supervisor screens.
- The landing page's "Report an Issue" opens the report form directly.
- Pressing Enter in the search box in the admin top bar opens Review and assign with the query filled in; on My reports the search box filters the list.
- Comments, saving decisions, votes, exports and account deletion still need the backend, so they show preview feedback.

JavaScript does not use local storage, session storage, authentication logic or API requests; the only network traffic is map tiles. Image selections use temporary object URLs only and are never uploaded. Report image previews accept up to three JPG/PNG files, no larger than 10 MB each.

## RoadNa CityWorld (v2)

The landing page tells the RoadNa story as a scroll-directed film inside a 3D miniature city, from a pothole to a repaired street. [CityWorld](screens/city-world/index.html) is a full-window city where every building opens one of the screens, with a live sandbox: potholes slow traffic, open reports anger residents, and crews fix problems. Both use the shared engine in `shared/cityworld/` (Three.js r180, vendored, MIT). There is no build step, CDN, storage or API.

Full notes, file map, tuning values, verification tips and open decisions: [CITYWORLD-HANDOFF.md](CITYWORLD-HANDOFF.md). Rollback to Codex's v1: [checkpoints/pre-cityworld-v2-2026-10-11/](checkpoints/pre-cityworld-v2-2026-10-11/RESTORE.md). The pre-CityWorld landing page is still at [original.html](screens/landing-page/original.html).

## ASP.NET integration

Replace the sample records and success-state content with server-provided data. Connect the forms, identity and authorization, notifications, report uploads, geolocation/maps, AI suggestions, administrative actions and exports to ASP.NET. Map screen links to the eventual routes. HTML validation is a presentation aid; the backend must validate submissions.

Legal/help links await their real destinations. Arabic controls currently preview layout direction while the copy remains English. Map artwork, metrics and AI suggestions are samples.

## Verification and design coverage

The project browser scan covered all 27 screens at 1280×900 and 375×900 with no runtime exceptions, horizontal overflow, duplicate IDs, missing local images or SVG references. The formal Login and Register pages were additionally checked at 1440×900, 1280×720, 1024×768, 768×1024, 375×812 and 320×740. Account checks cover immediate form visibility, no graphics resources or animations, validation, password visibility, resident/staff routes, recovery, keyboard controls, preview links, no WebGL and JavaScript disabled. External map tiles depend on network availability and are reported separately from local assets. See [the review](REVIEW-2026-10-15.md) for remaining functional gaps; a passing structure check does not imply shared state or backend integration.

Original Figma artwork remains in the project. Login and Register now use the formal account layout described above. The existing landing cinematic story and CityWorld engine were preserved. Real-device graphics for the city and a complete Arabic content review remain follow-up work.
