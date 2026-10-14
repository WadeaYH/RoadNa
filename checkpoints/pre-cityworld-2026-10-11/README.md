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

Submitting a valid form shows preview feedback with a direct link to the next designed state. Preview links also remain available without completing the forms. Login connects to the resident dashboard and includes a separate admin-console preview, plus a return to the landing page. All 20 screens are reachable from the landing page without claiming that a login, email, password change or report submission happened. Comments, assignment, moderation, escalation, exports and account deletion require the backend and show preview feedback.

JavaScript does not use local storage, session storage, authentication logic or API requests. Image selections use temporary object URLs only and are never uploaded. Report image previews accept up to three JPG/PNG files, no larger than 10 MB each.

## Landing-page story

The original headline pothole illustration and hero remain intact. Immediately below the hero, a four-part story shows a car approaching a pothole, stopping safely, and marking the hazard. The conclusion introduces RoadNa JO and links to reporting and the public map.

The desktop animation uses a native CSS view timeline, follows normal page scrolling, and reverses when scrolling back. A Skip story link moves directly to the reporting conclusion. Mobile, short viewports, reduced-motion preferences and browsers without scroll-timeline support show the complete story as static, readable steps. No animation library or scroll listener was added.

Generated artwork and prompt directions are documented in [STORY-ASSETS.md](screens/landing-page/assets/STORY-ASSETS.md). The page uses WebP versions totaling about 755 KiB; original PNGs remain alongside them.

## ASP.NET integration

Replace the sample records and success-state content with server-provided data. Connect the forms, identity and authorization, notifications, report uploads, geolocation/maps, AI suggestions, administrative actions and exports to ASP.NET. Map screen links to the eventual routes. HTML validation is a presentation aid; the backend must validate submissions.

Legal/help links await their real destinations. Arabic controls currently preview layout direction while the copy remains English. Map artwork, metrics and AI suggestions are samples.

## Verification and design coverage

Browser checks passed across all 20 screens at widths of 320, 375, 768 and 1280 pixels, with no horizontal overflow, broken image loads or JavaScript errors. Checks also covered form preview behavior, photo selection, filtering, gallery views, unchanged sample records after admin actions, and mobile drawer keyboard focus.

Local artwork from Figma was applied to the landing and registration screens. Existing screen implementations were retained and refined. Figma's tool quota prevented a fresh comparison of the remaining screens; a full visual comparison is still pending.
