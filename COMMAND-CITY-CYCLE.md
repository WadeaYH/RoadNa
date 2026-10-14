# RoadNa JO — Government service cycle, roles, and the Command City prompt

Written 2026-10-13. Builds on `CITYWORLD-HANDOFF.md` §8 (the role proposal) and `AUDIT-2026-10-13.md`.

- **Part 1** is the best-practice cycle.
- **Part 2** describes what each role does.
- **Part 3** covers what the 2.5D map is really for.
- **Part 4** is the full prompt to hand to an AI or a developer.

---

## Part 1 — The best-practice municipal service cycle

The cycle follows how mature city "311" systems and highway-maintenance codes work, adapted for a Jordanian municipality.

### Five rules that make it work

1. **A report is not a job.**
   - A resident's report is a **Service Request**. A crew's job is a **Work Order**.
   - Many requests about the same pothole merge into **one** work order. Every reporter still gets their own updates.
2. **Two clocks, not one.**
   - **Response:** make it safe, such as cones, a barrier or a warning sign.
   - **Resolution:** the permanent fix.
   - A deep pothole on a main road must be made safe in hours, even if the resurfacing takes days.
3. **Priority comes from risk, not from who shouts loudest.**
   - Priority = **severity × location risk**.
   - Location risk is higher on a main road, or near a school, hospital or mosque.
   - Many "me too" votes raise *confidence and urgency*, but they never skip the rules.
4. **Nobody approves their own work.**
   - The crew marks the job "work done".
   - Someone else verifies it with before and after photos.
   - The resident confirms it, or reopens it.
5. **Every step leaves a trace.**
   - Each change of status records who, when, what and why in an audit log that cannot be edited.
   - Reasons are mandatory for rejecting, merging, transferring or blocking a report.

### The lifecycle (a state machine)

```
                ┌──────────── Rejected (reason)            ┌── Transferred (external owner + reference)
                │                                          │
Submitted ──► Triage ──► Validated ──► Assigned ──► En route ──► On site ──► Made safe ──► Work done ──► Verified/Resolved ──► Closed
   │            │                         ▲                                    │              │                 │
   │            └── Duplicate (merged      └──────── Blocked (materials, permit,─┘              └─ Sent back ◄────┤
   │                into the original)               another department)                        (reason)        └─ Reopened (by resident, within 7 days)
   └── EMERGENCY fast lane (open manhole, fallen pole or live wire, flooding, road collapse):
       skips triage → P1 → nearest suitable crew suggested straight away → "call 911 if life is at risk" shown to the reporter
```

| Status | Who can move it there | What it needs |
|---|---|---|
| Submitted | Resident, crew (found in the field), dispatcher (phone call) | Category, location, at least 1 photo (residents) |
| Validated / Rejected / Duplicate | Dispatcher (triage) | Priority set; a reason for Rejected; a link to the original for Duplicate |
| Transferred | Dispatcher | The external owner and a reference number (see below) |
| Assigned | Dispatcher (or auto-assign) | A crew with the right skill and vehicle |
| En route → On site → Made safe → Work done | Field crew | A *before* photo when on site, an *after* photo for Work done, materials used |
| Blocked | Field crew | A reason: materials, permit, utility clearance, or another department |
| Verified / Resolved | **Supervisor** for Critical and High, dispatcher for Medium and Low, never the same crew | Before and after photos reviewed |
| Closed | Resident confirms, or automatically 7 days after Resolved | Optional rating from 1 to 5 |
| Reopened | Resident, within 7 days | A reason, plus an optional photo |

### Priorities and SLA targets

These match `screens/admin-sla-orders`.

| Priority | Example | Response (make safe) | Resolution | Clock runs |
|---|---|---|---|---|
| **P1 Critical** | Open manhole, live wire, flooding on a main road | 1 h | 4 h | 24/7 |
| **P2 High** | Deep pothole on Al-Zaytoun Ave; a whole street dark | 4 h | 72 h | 24/7 |
| **P3 Medium** | Pothole on a side street, overflowing bin | 1 working day | 7 working days | Sunday–Thursday |
| **P4 Low** | Faded marking, a leaning sign | 3 working days | 14 working days | Sunday–Thursday |

- **Auto-suggested priority** starts from the category and severity. It goes **up one level** for:
  - a main road,
  - within about 100 m of a school, hospital or mosque,
  - 3 or more reporters,
  - or a defect that has grown worse since it was reported.

  The dispatcher always sees the reasons and can override them, but must give a reason for the override.
- **Escalation ladder:**
  - At 50% of the SLA, the marker turns amber.
  - At 80%, the supervisor is notified.
  - At 100% (a breach), the department head is notified and the breach is logged.
  - Three breaches in one ward in a week are reported to the municipality admin.
- **Calendar:** Jordan's weekend is Friday and Saturday. The working-day clocks pause then and on public holidays, and Ramadan working hours are configurable. P1 and P2 never pause.

### When it is not the municipality's job

Some problems belong to another body, for example a water main, an electricity pole or a national highway. Examples for Irbid, to confirm with the municipality:

| Problem | Owner |
|---|---|
| Water and sewer networks | **Yarmouk Water Company** |
| Electricity network | **Irbid District Electricity Company (IDECO)** |
| National roads | **Ministry of Public Works and Housing** |

The request becomes **Transferred**, with the receiving body and its reference number. The resident is told who now owns it, and it stays visible on their timeline.

Some complaints may also need to sync with the national government complaints platform (Bekhedmetkom). Check this with the municipality.

### Governance and privacy, for the real build

- **Access is enforced on the server** (ASP.NET role and policy authorization).
  - Each role has the least privilege it needs.
  - **Department** (Roads, Lighting, Sanitation, Drainage) and **ward** are *scopes* on a role, not separate roles.
- **Hide the reporter's identity from crews and the public.** Crews see the location, the description and the photos, not the person.
- **Blur faces and number plates in public photos.** Keep the original photos staff-only, and set a retention period.
- **Separation of duties:**
  - A super admin manages users and settings but cannot dispatch or close work.
  - A crew cannot verify its own job.
- **Legal:** Jordan's Personal Data Protection Law (2023) applies to residents' names, phone numbers and locations. Confirm with the municipality's legal team.
- **Close the loop:**
  - Publish a public performance report every month: requests received, median fix time per category, and SLA compliance per ward.
  - When the same road segment is repaired 3 or more times in 6 months, recommend resurfacing (preventive maintenance) instead of more patching.

---

## Part 2 — What each role does in the cycle

| Role | Version | Main screen | Their loop |
|---|---|---|---|
| **Guest** | v1 | Public 2D map | Browse public, anonymised reports and the ward scorecard → sign in to report |
| **Resident** | v1 | 2D map of their area, My Reports | Report (photo, pin, category) → see "this may already be reported, add *me too*?" → follow the timeline with notifications → confirm the fix or reopen → rate |
| **Field crew** (lead and members) | v1 | Crew phone screen: today's jobs plus a 2D route | Accept → en route → on site (before photo) → made safe → work done (after photo, materials) → or Blocked with a reason → next job |
| **Dispatcher** (operations room) | v1 | **Command City** plus tables | Triage the queue (validate, merge, reject, transfer, set priority) → assign crews → watch SLA rings → rebalance → verify P3 and P4 |
| **Supervisor** (department scope, e.g. Roads) | v1 | Command City filtered to their department | Verify P1 and P2 work (photos) → handle Blocked jobs → approve overtime or extra crews → answer escalations |
| **Municipality admin** (city manager's office) | v1 | Dashboard plus Command City in read-mostly mode | Morning briefing → ward escalations → SLA rules, crews, users → monthly public report |
| **Super admin** (platform IT) | Later | Platform console | Municipalities, roles, audit log, integrations. **No** operational actions |
| **Auditor / council viewer** | Later | Read-only dashboards and the audit log | Review performance and decisions |

**Daily rhythm of the operations room:**
1. **07:30 briefing:** reports from overnight, P1s, and SLA risks.
2. **Triage:** clear the Submitted queue.
3. **Dispatch** in bundles, sending nearby jobs to one crew.
4. **Midday rebalance.**
5. **Afternoon verification.**
6. **End-of-day handover:** what stays open, what is blocked, and why.

---

## Part 3 — How the 2.5D map earns its place

The 2.5D city is **situational awareness for the operations room**. It is not a toy and not the only interface. It answers four questions faster than any table:
- *Where is it bad?*
- *Who is free and near?*
- *What will breach next?*
- *Which ward is losing patience?*

| Use case | What the map shows | Real-world meaning |
|---|---|---|
| **Morning briefing** | A 20-second fly-over of the wards, with a briefing card | Replaces reading 4 tables at 07:30 |
| **Triage in place** | Grey "unverified" markers. A dashed line links possible duplicates (same category, within about 40 m) | Merge and validate with the location context visible (school next door, main road) |
| **Dispatch** | Pick a crew (or drag its chip onto the marker) to see the route line, the ETA and "also nearby: RN-…" | Matching skill + vehicle + distance + bundling |
| **SLA watch** | A ring above each marker: green, then amber, then red, pulsing when breached | What breaches next, at a glance |
| **Road impact** | Traffic queues behind severe potholes (already simulated) | Why a pothole on a main road is P2 |
| **Ward satisfaction** | Residents' mood, and the protest at City Hall | Real inputs are report age, repeat reports, reopen rate and ratings. A protest means **escalation risk**: tell the municipality admin |
| **Deterioration** | Potholes grow over time (already simulated) | Late repairs cost more. This is the argument for the budget |
| **Training mode** | Today's sandbox: create problems, storm mode, speed | Train new dispatchers and rehearse a storm or Ramadan load safely |
| **Council or press presentation** | Photo mode, and (later) a replay of the week | Show performance visually |

**What the map must NOT do:**
- Be the only way to act. Every map action has a list or table equivalent (accessibility and speed).
- Be shown to residents.
- Invent problems in Live mode.
- Hold forms that need a lot of typing. Those belong in side cards and tables.

**The geography decision:** use the **schematic ward twin**. Each block is a ward, and markers sit on the correct street segment in the correct ward. The precise location lives on the 2D map, which is the source of truth, and staff can jump from any marker to "Open on 2D map".

---

## Part 4 — THE PROMPT (short version)

> Superseded by **`COMMAND-CITY-PROMPT.md`**, the detailed, self-contained version. Use that one. This short version is kept only for reference.

```text
You are working on RoadNa JO, a static, frontend-only preview of a municipal infrastructure
reporting platform for Jordanian municipalities (pilot: Irbid). Project root: "C:\Users\user\Desktop\Master Piece".

READ FIRST: CITYWORLD-HANDOFF.md (engine, file map, coordinates, sim knobs, verification tricks),
COMMAND-CITY-CYCLE.md Parts 1-3 (the service cycle, roles, priorities, SLA, map use cases),
and AUDIT-2026-10-13.md (known issues).

## Goal
Turn today's public CityWorld explorer (screens/city-world/) into a staff-only "Command City":
a 2.5D operations view where a dispatcher, a supervisor and a municipality admin can run the full
municipal service cycle, from a resident's report to a closed request, for one morning shift, on sample data.
It must feel like a real government operations room: clear, calm, accountable. Not a game.

## Hard constraints (unchanged from the original spec)
- Vanilla HTML/CSS/JS ES modules, no build step, no framework, no CDN at runtime. Three.js r180 is
  vendored at shared/vendor/three/ and imported via shared/cityworld/three.js.
- Do not use: real authentication, fetch/XHR/API calls, a database, localStorage/sessionStorage,
  email, uploads, real geolocation, or real AI. Everything is simulated in memory. Any "role" is
  simulated through the URL query (?role=…) only, with a visible note:
  "Preview: real access is enforced by the server".
- Do not rewrite or break the 20 existing screens. Do not migrate to a framework.
- Keep: reduced-motion support, full keyboard operation, a no-WebGL fallback, screen-reader
  equivalents (lists/tables), and phone layouts. `npm run check` must pass.
- Keep the existing engine (builder, traffic, vehicles, people, sim, camera rig). Extend; do not replace.

## 1. Access and entry
- Move the explorer to screens/admin-command-city/ (keep screens/city-world/index.html as a small
  page that says "CityWorld is now Command City for municipal staff" with links to the landing page and the login).
- Landing page: keep the cinematic scroll story as public marketing. Replace every public
  "Enter CityWorld" link with "Reports near you" (public-guest-menu, for now) and "For municipalities" (login).
  The root index.html keeps a link labelled "Command City (staff preview)".
- Admin dashboard: add an "Enter Command City" button in the page header and a sidebar item
  "Command City" under Operations, on all admin-* screens.
- Jump transition: on click, the dashboard's 4 KPI tiles animate into their HUD positions while the
  city canvas fades in and the camera flies from high above City Hall down to the overview (about 1.6 s).
  Reduced motion: an instant cross-fade. No WebGL: stay on the dashboard and show a toast
  linking to the Heatmap.
- Login preview: add "Preview as" chips (Resident · Field crew · Dispatcher · Supervisor (Roads) ·
  Municipality admin). They link to the right screen with ?role=… . Command City reads ?role= and
  &dept= and defaults to dispatcher. A resident role arriving at Command City is sent back to
  the resident home with the message "This area is for municipal staff".

## 2. Data model (in memory, in shared/cityworld/sim.js plus a new shared/sample-data.js)
ServiceRequest {
  id: "RN-2026-0412" style (one format everywhere), category: roads|lighting|sanitation|drainage,
  subtype (e.g. pothole, open-manhole, light-out, bin-overflow, blocked-drain), severity 1-3,
  ward, street, segment, nearby: school|hospital|mosque|null, onArterial: bool,
  reporters: [{ kind: resident|crew|phone, at }], duplicateOf, priority P1-P4,
  priorityReasons: [string], status (see section 3), sla: { responseDue, resolveDue, startedAt },
  workOrderId, crewId, photos: { before, after } (placeholder thumbnails drawn on canvas),
  blocker, transferredTo: { body, reference }, rating, timeline: [{ at, actor, role, action, note }]
}
WorkOrder { id: "WO-…", requestIds: [], crewId, bundle: [], materials }
Crew (already exists): type roads|lighting|sanitation|drainage, vehicle, members, plate, state.
Wards: rename the 4 city blocks to 4 sample wards with Jordanian names (e.g. Al-Zaytoun,
Al-Yasmeen, Al-Nakheel, Al-Rawda), labelled "sample". Main roads: Al-Zaytoun Avenue and
Al-Yasmeen Street. Nearby landmarks: put a school, a health centre and the existing mosque on the board.
Use a Jordanian sample cast (names, +962 numbers, km/h). Move all sample people and places into
shared/sample-data.js and reuse it in Command City.

## 3. State machine (one function, the only way a status changes)
transition(request, action, { role, reason, crew }) → { ok, reason }
Statuses: Submitted → Validated | Rejected | Duplicate | Transferred → Assigned → En route →
On site → Made safe → Work done → Resolved → Closed; also Blocked (back to Assigned), Sent back
(back to Assigned) and Reopened (back to Validated).
Rules:
- Rejected, Duplicate, Transferred, Blocked, Sent back, Reopened and any priority override need a reason.
- Work done needs a before and an after photo. Resolved for P1/P2 needs role supervisor (matching dept);
  P3/P4 may be resolved by a dispatcher. A crew can never resolve its own job.
- The municipality admin role is read-mostly: it can view everything, escalate, and change SLA targets in
  Training mode only. It cannot assign or resolve.
- Every transition appends to the timeline (actor, role, sim time, action, note). The timeline cannot be edited.
- EMERGENCY subtypes (open-manhole, fallen-pole, flooding) skip triage. They become P1 and Validated
  immediately, show a red pulsing beacon, and pre-select the nearest suitable crew for one-click dispatch.
- After Resolved, a simulated resident confirms (~80%), reopens (~10%) or does not reply (closes
  automatically after 7 sim days). Show this on the timeline.

## 4. Priorities and SLA
- Suggested priority = base(category, severity), raised one level for each of: on arterial, near
  school/hospital/mosque, 3 or more reporters, severity grew since the report. Show the reasons as chips.
  An override needs a reason.
- Targets (from admin-sla-orders): P1 1 h / 4 h, P2 4 h / 72 h, P3 1 / 7 working days,
  P4 3 / 14 working days (the first figure is response, the second is resolution).
  Working days are Sunday–Thursday; P1 and P2 run 24/7.
- Sim time: show a shift clock (starting Tuesday 07:30). Live mode runs at 1 sim minute per real second.
  Training mode has a speed control (1×, 5×, 20×). Show SLA times as "due in 2 h 10 m" and use Intl for
  number and date formatting.
- SLA ring above each marker: green under 50%, amber 50–80%, red over 80%, pulsing red when breached.
  At 80%, notify the supervisor (toast plus activity). At 100%, log the breach and notify the department head.
  Three breaches in one ward create a ward escalation card for the municipality admin.

## 5. Command City screen, by use case
A. Morning briefing (on entry; skippable with Esc or "Skip"; a still card under reduced motion):
   the camera visits each ward for about 4 s while a card counts "Overnight: 7 new · 2 P1 · 1 at risk of
   breach · 2 crews blocked", then settles on the overview. Afterwards, a "Briefing" button replays it.
B. Triage: Submitted requests show as grey markers with a "?" badge. The Reports tab opens on
   "Needs triage". The triage card shows the photo, location context (main road, school 60 m away),
   the reporter count, the suggested priority with reasons, and actions: Validate · Merge into… ·
   Reject · Transfer to… (Yarmouk Water Company / IDECO / Ministry of Public Works, labelled
   "examples"). Possible duplicates (same category within about 40 m) are linked by a dashed line on the map
   and listed in the card.
C. Dispatch: in the issue card, the crew picker ranks crews by skill + vehicle + ETA. Hovering or focusing
   a crew draws its route on the roads with an ETA. Dragging a crew chip from the Crews tab onto a marker
   assigns it; keyboard users use the picker. Bundling hint: "Also within 150 m: RN-2026-0415 (same
   department), add to this work order?"
D. Monitor: crew vans drive as today, with a state chip (En route / On site / Made safe / Work done).
   Layers toggle (a dock group named "Layers"): Status · Priority · Department · SLA risk · Ward
   satisfaction (district tint). The top bar shows Open, Needs triage, At risk, Breached, Crews free and
   Ward satisfaction.
E. Verify: a "Waiting for verification" filter. The card shows before and after placeholders side by side,
   with Approve (Resolved) and Send back (reason). The approval control is disabled with an explanation
   when the role or department does not allow it.
F. Ward satisfaction and escalation: keep the mood and protest simulation, but label it honestly as the
   "Ward satisfaction index" (inputs: request age, repeat reports, reopen rate, ratings). When it drops
   below the threshold, residents gather at City Hall and an escalation card lists the causes and
   suggested actions (reassign, add a temporary crew, publish a public notice).
G. Road impact: keep the pothole traffic slowdown. When a queue forms, the card says "Traffic delayed on
   Al-Zaytoun Ave", and it counts as a priority reason.
H. Building remap: City Hall = overview and KPIs, Triage Centre = triage queue, Crew Depot = crews,
   Clock Tower = SLA board, Data Observatory = layers and analytics. Resident and civic buildings stop
   linking to resident or auth pages. They become ward landmarks with a ward scorecard card.
I. Every map action has a panel or list equivalent. The panel tabs become: Reports (filters: Needs triage,
   Waiting for crew, In progress, Verify, Closed today) · Crews · Timeline (the audit log, filterable by
   ward, role and request).

## 6. Live mode vs Training mode
- Live (default): a deterministic, seeded "Tuesday morning shift" script from shared/sample-data.js
  (about 14 requests over 40 sim minutes, including 1 emergency, 2 duplicates, 1 transfer, 1 blocked job,
  1 reopen and 1 SLA breach if left alone). The create-a-problem tools are hidden. A "LIVE · sample data"
  badge is shown.
- Training: today's sandbox tools (create pothole/light/trash/drain, storm, wear speed, hire crews),
  the speed control, scenario presets (Storm night, Ramadan evening bins, School opening week) and
  editable SLA targets. Show a clear orange frame and "TRAINING — not real data" watermark.
  Switching modes asks for confirmation and resets the sim.
- Only dispatcher, supervisor and admin roles can open Training mode.

## 7. Notifications
Keep a maximum of 2 toasts, and only for things that need action (P1 arrived, SLA at 80% or breached,
crew blocked, verification waiting, ward escalation). Everything else goes only to the Timeline.
Every toast has one action button ("Open RN-2026-0412"). Announce through the existing aria-live region.

## 8. Phone and small screens
Command City is a desktop or tablet tool. Below 768 px, show the panel lists full-screen with a small
read-only city overview and the note "Command City works best on a larger screen". Do not cram the dock.

## 9. Acceptance scenarios (verify each in the browser; drive frames with engine.advance())
1. Happy path: 3 residents report the same pothole near the school on Al-Zaytoun Ave → one request
   with 3 reporters → validated with a suggested P2 (reasons: main road, near school, 3 reporters) →
   Roads crew assigned with a route and ETA → En route → On site (before photo) → Made safe → Work
   done (after photo) → a supervisor (Roads) approves → the resident confirms → Closed. The timeline shows
   every step with role and time, and the SLA ring stayed green.
2. Emergency: an open manhole skips triage, becomes P1, shows a beacon, and the nearest drainage crew is preselected.
3. Breach: leave a P3 unassigned in Training at 20× → amber → red with a supervisor toast at 80% →
   breach logged at 100% → 3 breaches in one ward → escalation card.
4. Separation of duties: as a dispatcher, Approve on a P2 is disabled with the reason "Supervisor (Roads) verifies P1/P2".
   As the municipality admin, Assign is disabled.
5. Transfer: a burst water main is transferred to "Yarmouk Water Company (example)" with a reference;
   it leaves the active list and stays on the timeline.
6. Blocked → reassigned → done, with reasons shown.
7. Keyboard only: triage, assign and verify scenario 1 without a mouse. Reduced motion: the briefing is a
   still card, with no camera flights.
8. Live mode never creates a problem from the dock; Training mode shows the frame and watermark.
9. `npm run check` passes. No storage, fetch or XHR. The 20 original screens still work. The landing page has
   no public link into Command City.

## 10. Deliverables
- The code changes above.
- Update CITYWORLD-HANDOFF.md (new paths, data model, state machine, how to run each scenario)
  and README.md.
- Screenshots of scenarios 1, 2 and 4 at 1440 px.
- A short list of anything you deferred, and why.

## Out of scope (separate prompts later)
The resident 2D map (Leaflet vendored plus an offline illustrated fallback), the field crew phone screen,
the real backend (ASP.NET roles, policies, audit table) and full Arabic/RTL.
```
