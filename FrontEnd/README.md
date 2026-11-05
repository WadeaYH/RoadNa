# RoadNa JO frontend

Twenty-seven responsive frontend screens for a municipal issue-reporting portal, based on [Orange_Design_Task in Figma](https://www.figma.com/design/3zWfidyuAT7SUeZR03IaJ2/Orange_Design_Task?node-id=64-36&m=draw). Each screen has its own HTML, CSS and JavaScript files. There is no framework or build step.

## Preview

The latest [frontend review](archive/notes/REVIEW-2026-10-15.md) lists the fixes, remaining workflow gaps and prioritized 3D map recommendations.

**Account experience:** [Login](pages/account/login/login.html) and [Register](pages/account/register/register.html) use a formal municipal portal layout: a restrained teal identity panel, white forms, clear labels and responsive spacing. Both forms appear immediately, with no introductory scene, animation, photos or 3D dependencies. On phones, the form takes priority in a single-column layout. The existing registration fields, accessible inline validation, password controls, resident/staff login routes, recovery links and preview destinations remain intact. Shared account styling and validation live in `shared/account.css` and `shared/account.js`. The registration office module and its unused illustration have been removed.

Run `npm start` (or `node tools/serve.mjs`) from this folder and open [the screen directory](http://127.0.0.1:4173). The local server serves only the frontend files. You can also open `index.html` directly for a basic preview; the local server is preferable for fonts and clipboard controls.

**Open it on a phone or another computer.** Run `npm run share` instead of `npm start`. It prints an address such as `http://192.168.8.55:4173`; type it into the browser of any device on the same Wi-Fi. Windows may ask to allow Node.js through the firewall: allow it for private networks. Everyone on that network can open the preview while the window runs, so press Ctrl+C to stop sharing. `npm start` stays on this computer only. To share outside your network, publish the files to a static host; the site is plain HTML, CSS and JS.

Run `npm run check` (or `node tools/check.mjs`) to check screen structure, JavaScript syntax, local assets, cross-screen links and anchors, and the absence of storage or API calls. The preview server and checker use Node's built-in modules; no installation step is required.

## Structure

- `index.html` + `shared/directory.css` — directory grouped into public, account, resident, team and administration pages.
- `pages/<package>/<page>/` — one folder per page, grouped by who uses it. Each folder holds exactly three files named after the page, for example `pages/account/login/login.html`, `login.css` and `login.js`, plus `assets/` where a page has artwork.
  - `pages/public/` — landing, public-map, help
  - `pages/account/` — login, register, forgot-password, check-email, reset-password, password-updated
  - `pages/resident/` — home, create-report, report-submitted, my-reports, report-details, notifications, profile, community, donations
  - `pages/team/` — tasks, task
  - `pages/admin/` — dashboard, ops-map, review-assign, check-work, community, sla-orders, heatmap, accounts, funding, archive
  - `pages/docs/` — database (ER diagram, schema diagram, tables and the SQL Server script, all drawn from `database-data.js`)
- No inline CSS or JS: no `<style>` blocks, `style=""` attributes, inline `<script>` code or `on…=""` handlers. `npm run check` fails if any come back.
- `archive/` — parked and old material, kept but not linked: the 3D city page, the landing page backups, old checkpoints and planning notes.
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

Mockup and wireframe variants share one page folder. The original ResetPasseord name is normalized to `reset-password`.

## Screens

| Screen | Area | Files |
| --- | --- | --- |
| Landing page | Public | [pages/public/landing/](pages/public/landing/landing.html) |
| Public report map | Public | [pages/public/public-map/](pages/public/public-map/public-map.html) |
| Help and policies | Public | [pages/public/help/](pages/public/help/help.html) |
| Login | Account | [pages/account/login/](pages/account/login/login.html) |
| Register | Account | [pages/account/register/](pages/account/register/register.html) |
| Forgot password | Account | [pages/account/forgot-password/](pages/account/forgot-password/forgot-password.html) |
| Check email | Account | [pages/account/check-email/](pages/account/check-email/check-email.html) |
| Reset password | Account | [pages/account/reset-password/](pages/account/reset-password/reset-password.html) |
| Password updated | Account | [pages/account/password-updated/](pages/account/password-updated/password-updated.html) |
| Resident home | Resident | [pages/resident/home/](pages/resident/home/home.html) |
| Create report (4-step wizard) | Resident | [pages/resident/create-report/](pages/resident/create-report/create-report.html) |
| Report submitted | Resident | [pages/resident/report-submitted/](pages/resident/report-submitted/report-submitted.html) |
| My reports | Resident | [pages/resident/my-reports/](pages/resident/my-reports/my-reports.html) |
| Report details | Resident | [pages/resident/report-details/](pages/resident/report-details/report-details.html) |
| Notifications | Resident | [pages/resident/notifications/](pages/resident/notifications/notifications.html) |
| Community votes | Resident | [pages/resident/community/](pages/resident/community/community.html) |
| Donations | Resident | [pages/resident/donations/](pages/resident/donations/donations.html) |
| Profile | Resident | [pages/resident/profile/](pages/resident/profile/profile.html) |
| My tasks | Field team | [pages/team/tasks/](pages/team/tasks/tasks.html) |
| Task page | Field team | [pages/team/task/](pages/team/task/task.html) |
| Admin dashboard | Administration | [pages/admin/dashboard/](pages/admin/dashboard/dashboard.html) |
| Operations map | Administration | [pages/admin/ops-map/](pages/admin/ops-map/ops-map.html) |
| Review and assign | Administration | [pages/admin/review-assign/](pages/admin/review-assign/review-assign.html) |
| Check work | Administration | [pages/admin/check-work/](pages/admin/check-work/check-work.html) |
| Community proposals | Administration | [pages/admin/community/](pages/admin/community/community.html) |
| SLA and work orders | Administration | [pages/admin/sla-orders/](pages/admin/sla-orders/sla-orders.html) |
| Heatmap | Administration | [pages/admin/heatmap/](pages/admin/heatmap/heatmap.html) |
| Accounts and teams | Administration (super admin) | [pages/admin/accounts/](pages/admin/accounts/accounts.html) |
| Funding campaigns | Administration (manager) | [pages/admin/funding/](pages/admin/funding/funding.html) |
| Finance | Administration (manager) | [pages/admin/finance/](pages/admin/finance/finance.html) |
| Archive | Administration | [pages/admin/archive/](pages/admin/archive/archive.html) |

## Main flow in the preview

1. A resident reports an issue (four steps). The category is suggested from the description.
2. Residents see only Received, In progress and Fixed, or Rejected with a reason.
3. **Review and assign:** the municipality confirms type and priority, then gives the report to a free team. If no team is free, the report waits on the *Waiting for a team* list.
4. The team works from **My tasks** (On my way, I have arrived, Start work, photos and notes). The list marks the next job with its distance and a Directions button that opens the phone's maps app; the task page has Get directions, a Take the before photo button, one-tap quick notes and a sticky next-step button. The team leader submits the work, and the list explains that it now waits for the supervisor.
5. **Check work:** a supervisor compares before and after photos, then approves or sends it back with a reason.
6. **Community:** the municipality publishes a proposal with an end date; residents vote once (changeable until it closes); results show only after closing; the municipality posts its decision.
7. **Operations map:** reviewers, supervisors and municipality heads see reports and teams on one map (role views are a preview). A simulated clock moves teams to their tasks and changes report statuses (Live); the time slider and Play replay the morning from 06:00. The 3D version of this view (`archive/city-world/index.html?view=ops`) still exists but is parked and not linked from any screen.
8. **Donations (funding campaigns):** when a valid, non-critical repair has no budget, the reviewer requests funding with a cost estimate. The manager approves it with a target, the municipality's share and an end date (or declines). Residents give to that repair only (the last gift is capped at what is still needed). A funded report goes to the front of Review & assign. If a campaign falls short, the manager first covers the rest; if the municipality cannot, each donor chooses a refund or another open campaign within 14 days, and anyone who does not choose is refunded. After the repair, the ledger shows the real cost and any leftover goes back to the donors' choice. Critical repairs are never left waiting for donations.

9. **Finance and RoadNa AI (manager):** the Finance page shows spending by month against an even plan, budget by department with a December forecast, the average cost per fixed report, who paid for each campaign, what each repair cost, an AI summary and suggestions. On every manager screen a floating roundabout opens RoadNa AI, a chat that answers questions from the same sample data (`shared/finance-data.js`, `shared/ai-chat.js`). Nothing is sent anywhere; ASP.NET will connect a real model later. Only the manager opens funding campaigns; a reviewer can only suggest one.

**Closing the gaps in the cycles.**
- A resident can edit or withdraw a report until a reviewer picks it up.
- Reviewers can merge a duplicate, add a staff report (also from a "go ahead" community decision), and see jobs a team returned.
- A critical report can pull a busy team, with a banner at the top of Review & assign.
- A team leader can return a job they cannot finish (wrong department, needs equipment, weather or access, not safe) to the reviewer. Crews can report a problem they find on site as a staff report.
- Work sent back a second time is also escalated to the manager.
- Supervisors can reassign a job to another team from SLA & orders.
- Turning off a team leader or supervisor first asks who takes over.
- A "go ahead" community decision links to creating the report or opening a funding campaign.

## Frontend behavior

Navigation, mobile menus, keyboard focus, input hints, password visibility, sample-data filters, illustration views, counters, temporary image previews and reduced-motion support are implemented.

Report, notification and SLA filters support arrow keys, Home and End. Mobile navigation opens as a dialog with an internal close button, focus containment and background controls disabled while open. Landing-page section links close the mobile menu and move focus into the selected content.

Heatmap category and district filters update the sample density clusters, incident markers, forecast circles, crew markers and hotspot ranking together. Empty combinations have a clear message. Tooltips remain readable inside the map and clear of the zoom controls on mobile and desktop.

**Real map.**
- Every 2D map is a real map of Jordan that opens on Irbid. That covers the public report map, resident home, report details, the report form's location picker, the admin heatmap and the operations map.
- The maps use [Leaflet 1.9.4](shared/vendor/leaflet/) (vendored, BSD-2) through [shared/map.js](shared/map.js), with OpenStreetMap street tiles locked to Jordan's borders.
- Sample reports, hotspots and crews sit at real Irbid places checked on OpenStreetMap: University Street by Yarmouk University, Al-Hashemi Street downtown, Emaar Irbid Park, Irbid Camp, Al-Andalus, Bayt Ras, Al Bariha and King Abdullah II Park.
- The tiles load live, so the maps need an internet connection. Offline, they show a note and the pins remain. The free OpenStreetMap tile service is only suitable for this preview, so the production build needs its own or a paid tile provider.

**Preview roles.** Logging in (or the *Explore the frontend preview* buttons on the login page) picks a role: resident, reviewer, team leader, team member, supervisor, manager or super admin. `shared/access.js` remembers it in the current tab only (`window.name`, no storage) and applies the access table from the RoadNa workflow page: screens outside the role show a notice with a link home, read-only screens show a banner, and the sidebar hides what the role cannot open. With no role chosen every screen stays open. Real permissions will come from ASP.NET.

Each role has its own sidebar, listing only its own step of the flow:

| Role | Sidebar (full access unless marked) | Can also view |
|---|---|---|
| Reviewer | Review & assign, Operations map | |
| Team leader / member | My tasks, task page (only the leader submits) | |
| Supervisor | Check work, Operations map, Team tasks (view), SLA & orders (view, can escalate), Archive | Dashboard, Review & assign |
| Manager | Dashboard (with Escalated to you), Operations map, SLA & orders, Heatmap, Community votes, Funding, Archive | Review & assign, Check work, team tasks, resident votes, resident donations |
| Super admin | Accounts & teams | Every other staff screen, linked from Accounts & teams |

**No-login navigation.**
- Every page is reachable, and no link is a dead end. Footer and policy links open [Help & policies](pages/public/help/help.html).
- Valid forms go straight to the next screen in their flow.
- On Login you choose *Resident* or *Municipal staff*. The expandable frontend preview section also links directly to Resident, Municipal staff, Field team and Supervisor screens.
- The landing page's "Report an Issue" opens the report form directly.
- Pressing Enter in the search box in the admin top bar opens Review and assign with the query filled in; on My reports the search box filters the list.
- Comments, saving decisions, votes, exports and account deletion still need the backend, so they show preview feedback.

JavaScript does not use local storage, session storage, authentication logic or API requests; the only network traffic is map tiles. Image selections use temporary object URLs only and are never uploaded. Report image previews accept up to three JPG/PNG files, no larger than 10 MB each.

## RoadNa CityWorld (v2) — parked

**Status (2026-11-02): the 3D city is parked.** It is still in `archive/city-world/` and `shared/cityworld/` and works if you open its address directly, but no screen links to it. The landing page story still uses its engine. The operations map is now the 2D map only.

The landing page tells the RoadNa story as a scroll-directed film inside a 3D miniature city, from a pothole to a repaired street. [CityWorld](archive/city-world/index.html) is a full-window city where every building opens one of the screens, with a live sandbox: potholes slow traffic, open reports anger residents, and crews fix problems. Both use the shared engine in `shared/cityworld/` (Three.js r180, vendored, MIT). There is no build step, CDN, storage or API.

In the staff-only operations view, a compact statistics strip shows open reports, unassigned reports older than two hours and available crews. **Statistics** opens a breakdown in the existing panel: visible and verified-fixed counts, average dispatch/repair durations, department workload bars and crew phases. The figures are derived from the shared operations snapshot, selected department, shown statuses and simulated clock through `shared/ops-metrics.js`. Returning crews count as unavailable; incomplete timing records are excluded. The two-hour queue warning is a preview threshold, not an SLA. Charts use ordinary HTML and CSS. Area-card counts and repair durations use the same calculations. The normal sandbox is unchanged.

Full notes, file map, tuning values, verification tips and open decisions: [CITYWORLD-HANDOFF.md](CITYWORLD-HANDOFF.md). Rollback to Codex's v1: [checkpoints/pre-cityworld-v2-2026-10-11/](checkpoints/pre-cityworld-v2-2026-10-11/RESTORE.md). The pre-CityWorld landing page is still at [original.html](pages/public/landing/original.html).

## ASP.NET integration

Replace the sample records and success-state content with server-provided data. Connect the forms, identity and authorization, notifications, report uploads, geolocation/maps, AI suggestions, administrative actions and exports to ASP.NET. Map screen links to the eventual routes. HTML validation is a presentation aid; the backend must validate submissions.

Legal/help links await their real destinations. Arabic controls currently preview layout direction while the copy remains English. Map artwork, metrics and AI suggestions are samples.

## Verification and design coverage

The project browser scan covered all 27 screens at 1280×900 and 375×900 with no runtime exceptions, horizontal overflow, duplicate IDs, missing local images or SVG references. The formal Login and Register pages were additionally checked at 1440×900, 1280×720, 1024×768, 768×1024, 375×812 and 320×740. Account checks cover immediate form visibility, no graphics resources or animations, validation, password visibility, resident/staff routes, recovery, keyboard controls, preview links, no WebGL and JavaScript disabled. External map tiles depend on network availability and are reported separately from local assets. See [the review](REVIEW-2026-10-15.md) for remaining functional gaps; a passing structure check does not imply shared state or backend integration.

Original Figma artwork remains in the project. Login and Register now use the formal account layout described above. The existing landing cinematic story and CityWorld engine were preserved. Real-device graphics for the city and a complete Arabic content review remain follow-up work.
