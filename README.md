# RoadNa JO frontend

Twenty responsive frontend screens for a municipal issue-reporting portal, based on [Orange_Design_Task in Figma](https://www.figma.com/design/3zWfidyuAT7SUeZR03IaJ2/Orange_Design_Task?node-id=64-36&m=draw). Each screen has its own HTML, CSS and JavaScript files. There is no framework or build step.

## Preview

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
- `shared/app.css` — resident and administration layouts.
- `shared/ui.js` — shared navigation, password visibility, preview feedback and motion.
- `tools/` — dependency-free development server and checks.

Mockup and wireframe variants share one screen folder. The original ResetPasseord name is normalized to `reset-password`.

## Screens

| Screen | Area | Files |
| --- | --- | --- |
| Landing page | Public | [screens/landing-page/](screens/landing-page/index.html) |
| Public report map | Public | [screens/public-guest-menu/](screens/public-guest-menu/index.html) |
| Report details | Public | [screens/report-details/](screens/report-details/index.html) |
| Login | Account | [screens/login/](screens/login/index.html) |
| Register | Account | [screens/register/](screens/register/index.html) |
| Forgot password | Account | [screens/forgot-password/](screens/forgot-password/index.html) |
| Check email | Account | [screens/check-email/](screens/check-email/index.html) |
| Reset password | Account | [screens/reset-password/](screens/reset-password/index.html) |
| Password updated | Account | [screens/password-updated/](screens/password-updated/index.html) |
| Resident dashboard | Resident | [screens/home-menu/](screens/home-menu/index.html) |
| Create report | Resident | [screens/create-report/](screens/create-report/index.html) |
| Report submitted | Resident | [screens/report-submitted/](screens/report-submitted/index.html) |
| My reports | Resident | [screens/my-reports/](screens/my-reports/index.html) |
| Notifications | Resident | [screens/notifications/](screens/notifications/index.html) |
| Profile and settings | Resident | [screens/profile/](screens/profile/index.html) |
| Admin dashboard | Administration | [screens/admin-dashboard/](screens/admin-dashboard/index.html) |
| Incident triage | Administration | [screens/admin-incident-triage/](screens/admin-incident-triage/index.html) |
| Dispatch and units | Administration | [screens/admin-dispatch-units/](screens/admin-dispatch-units/index.html) |
| SLA and work orders | Administration | [screens/admin-sla-orders/](screens/admin-sla-orders/index.html) |
| Incident heatmap | Administration | [screens/admin-heatmap/](screens/admin-heatmap/index.html) |

## Frontend behavior

Navigation, mobile menus, keyboard focus, input hints, password visibility, sample-data filters, illustration views, counters, temporary image previews and reduced-motion support are implemented.

Report, notification and SLA filters support arrow keys, Home and End. Mobile navigation opens as a dialog with an internal close button, focus containment and background controls disabled while open. Landing-page section links close the mobile menu and move focus into the selected content.

Heatmap category and district filters update the sample density clusters, incident markers, forecast circles, crew markers and hotspot ranking together. Empty combinations have a clear message. Tooltips remain readable inside the map and clear of the zoom controls on mobile and desktop.

**Real map.**
- Every 2D map is a real map of Jordan that opens on Irbid. That covers the public report map, resident home, report details, the report form's location picker, the admin heatmap and dispatch.
- The maps use [Leaflet 1.9.4](shared/vendor/leaflet/) (vendored, BSD-2) through [shared/map.js](shared/map.js), with OpenStreetMap street tiles locked to Jordan's borders.
- Sample reports, hotspots and crews sit at real Irbid places checked on OpenStreetMap: University Street by Yarmouk University, Al-Hashemi Street downtown, Emaar Irbid Park, Irbid Camp, Al-Andalus, Bayt Ras, Al Bariha and King Abdullah II Park.
- The tiles load live, so the maps need an internet connection. Offline, they show a note and the pins remain. The free OpenStreetMap tile service is only suitable for this preview, so the production build needs its own or a paid tile provider.

**No-login navigation.**
- Every page is reachable, and no link is a dead end. Footer and policy links open [Help & policies](screens/help/index.html).
- Valid forms go straight to the next screen in their flow.
- On the login page you choose *Resident* or *Municipal staff*. You can also skip sign-in with "Continue as resident" or "Continue as municipal staff".
- The landing page's "Report an Issue" opens the report form directly.
- Pressing Enter in the top-bar search opens My Reports for residents or the incident queue for staff, with the query filled in.
- Comments, assignment, moderation, escalation, exports and account deletion still need the backend, so they show preview feedback.

JavaScript does not use local storage, session storage, authentication logic or API requests; the only network traffic is map tiles. Image selections use temporary object URLs only and are never uploaded. Report image previews accept up to three JPG/PNG files, no larger than 10 MB each.

## RoadNa CityWorld (v2)

The landing page tells the RoadNa story as a scroll-directed film inside a 3D miniature city, from a pothole to a repaired street. [CityWorld](screens/city-world/index.html) is a full-window city where every building opens one of the 20 screens, with a live sandbox: potholes slow traffic, open reports anger residents, and crews fix problems. Both use the shared engine in `shared/cityworld/` (Three.js r180, vendored, MIT). There is no build step, CDN, storage or API.

Full notes, file map, tuning values, verification tips and open decisions: [CITYWORLD-HANDOFF.md](CITYWORLD-HANDOFF.md). Rollback to Codex's v1: [checkpoints/pre-cityworld-v2-2026-10-11/](checkpoints/pre-cityworld-v2-2026-10-11/RESTORE.md). The pre-CityWorld landing page is still at [original.html](screens/landing-page/original.html).

## ASP.NET integration

Replace the sample records and success-state content with server-provided data. Connect the forms, identity and authorization, notifications, report uploads, geolocation/maps, AI suggestions, administrative actions and exports to ASP.NET. Map screen links to the eventual routes. HTML validation is a presentation aid; the backend must validate submissions.

Legal/help links await their real destinations. Arabic controls currently preview layout direction while the copy remains English. Map artwork, metrics and AI suggestions are samples.

## Verification and design coverage

Browser checks passed across all 20 screens at widths of 320, 375, 768 and 1280 pixels, with no horizontal overflow, broken image loads or JavaScript errors. Checks also covered form preview behavior, photo selection, filtering, gallery views, unchanged sample records after admin actions, and mobile drawer keyboard focus.

Local artwork from Figma was applied to the landing and registration screens. Existing screen implementations were retained and refined. Figma's tool quota prevented a fresh comparison of the remaining screens; a full visual comparison is still pending.
