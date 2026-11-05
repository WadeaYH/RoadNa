# Command City — detailed implementation prompt

> **For the user:**
> - Copy everything below the line into Codex or Claude, or say "run COMMAND-CITY-PROMPT.md".
> - It is self-contained: it explains the *why* behind every rule, points to the real files and functions, and works in 7 phases with a checkpoint after each one.
> - It replaces Part 4 of `COMMAND-CITY-CYCLE.md`. Parts 1–3 of that file are the human-readable background.
>
> Written 2026-10-13.

---

# PROMPT

## 0. Who you are and what you are building

You are a senior front-end engineer and product designer working on **RoadNa JO**. RoadNa JO is a citizen-reporting and municipal-operations platform for Jordanian municipalities, and the pilot is the Greater Irbid Municipality. The project is a **static, front-end-only preview**: 21 HTML screens plus a shared Three.js city engine, with no backend. It is used to demonstrate the product to the municipality and to guide the later ASP.NET build.

Project root: `C:\Users\user\Desktop\Master Piece`

**Your mission:** turn today's public, game-like "CityWorld" explorer into **Command City**, a staff-only 2.5D operations view. A dispatcher, a department supervisor and a municipality admin use it to run the **complete municipal service cycle** for one morning shift on sample data:

> a resident reports → staff triage → a crew is dispatched → the crew makes it safe and fixes it → someone else verifies → the resident confirms → closed, with every step on an audit timeline.

The result must feel like a **real government operations room**: calm, clear, accountable and explainable. Keep the charm of the living city (traffic, people, crews driving out), but every playful element must now *mean* something operational. When a visual cannot be explained to a municipal manager in one sentence, it does not belong in Live mode.

Before writing code, read:
- `CITYWORLD-HANDOFF.md`: engine, file map, coordinates, verification tricks.
- `AUDIT-2026-10-13.md`: known issues; do not make them worse.

---

## 1. Background: the government service cycle and why each rule exists

These rules come from how mature municipal "311" service systems and highway-maintenance codes work. Each rule explains **why** it exists and **where it shows in the UI**. Implement all of them.

### 1.1 A report is not a job
- A resident's report is a **Service Request (SR)**. The internal job is a **Work Order (WO)**.
- When three residents report the same pothole, staff must not send three crews. The three SRs are **merged**:
  - one stays the *primary*,
  - the others become *Duplicate* and point to it,
  - each reporter still receives updates.
- One WO can also bundle several nearby SRs of the same department ("while you're there").
- **UI:**
  - A merged SR shows "3 reporters".
  - A WO shows the SR codes it covers.
  - On the map, possible duplicates are joined by a dashed line.

### 1.2 Two clocks, not one
- **Response** = the time to *make it safe* (cones, a barrier, a warning sign, a temporary cover).
- **Resolution** = the time to *fix it permanently*.
- A deep pothole on a main road cannot wait 3 days unprotected, but resurfacing can.
- **UI:**
  - Every SR shows both deadlines.
  - The map ring tracks whichever clock is currently running: response until "Made safe", then resolution.

### 1.3 Priority comes from risk, not from noise
- Priority = **severity × location risk**. It is calculated, it shows its reasons, and only a human can override it, with a reason.
- "Me too" votes increase confidence, but they cannot skip the rules. Otherwise the loudest neighbourhood always wins, which is unfair and politically dangerous for a municipality.
- **UI:** reason chips such as "Main road", "School 60 m", "3 reporters" and "Getting worse" next to the suggested priority.

### 1.4 Nobody approves their own work (separation of duties)
- The crew marks a job **Work done**. A **different person** verifies it from before and after photos. The **resident** confirms it or reopens it.
- This prevents false closures, which are the biggest trust-killer in public service apps.
- **UI:** disabled buttons explain why, for example: "Supervisor (Roads) verifies P1/P2 work".

### 1.5 Every step leaves a trace
- Every status change writes a timeline entry: when (sim time), who (name and role), what, and why.
- Reasons are **mandatory** for Reject, Duplicate, Transfer, Blocked, Send back, Reopen and Priority override.
- The timeline cannot be edited. In the real product it is a legal record and the basis for audits and public trust.
- **UI:**
  - A Timeline tab (the audit log) in the panel.
  - A per-SR timeline in the card.
  - A "Resident notified: …" line wherever the resident would receive a message.

### 1.6 Staff only see what has been reported
- In reality, the municipality does not know about a pothole until someone reports it. The current sim has problems that exist before anyone reports them.
- **Rule:** in Command City Live mode, unreported problems are **invisible** to staff.
- **Training mode** has a "Show unreported problems" toggle. It teaches *why* resident reporting matters.

### 1.7 Not everything belongs to the municipality
- Water mains, electricity poles and national highways belong to other bodies. Staff **Transfer** the SR, with the receiving body and its reference number. The resident is told who owns it, and the SR stays on the timeline.
- Use these **example** names, always labelled "example" in the UI, because they must be confirmed with the municipality:
  - Yarmouk Water Company (water and sewer),
  - Irbid District Electricity Company (IDECO) (electricity network),
  - Ministry of Public Works and Housing (national roads).

### 1.8 Emergencies skip the queue
- Life-safety subtypes skip triage: open manhole, fallen pole or exposed wire, flooding on a road, and road collapse.
- They become **P1, Validated** immediately, with a red pulsing beacon and the nearest suitable crew preselected for one-click dispatch.
- The resident side (out of scope here) would show "If life is at risk, call 911".

### 1.9 Humans decide, automation suggests
- The current sim auto-dispatches. In Live mode, auto-assign becomes **"Suggest"**: the system preselects the best crew and the dispatcher confirms with one click or key.
- Full auto-assign exists only in Training mode.
- **Why:** accountability. A named person dispatched each crew.

---

## 2. What already exists (extend it, do not rebuild it)

### Engine: `shared/cityworld/`, shared with the landing page story

| Module | What it gives you |
|---|---|
| `layout.js` | `BOARD` (66×50), `DISTRICTS` (4 blocks: Public SE, Resident SW, Municipal NE, Civic NW), `PLACES` (20 buildings, each mapped to a screen), `SPOTS`, `STREETS`. The cross streets are **Al-Zaytoun Avenue** (z = 0) and **Al-Yasmeen Street** (x = 0). |
| `roads.js` | Lane graph, `route()`, `nearest()`, signals. |
| `vehicles.js` | Traffic, `routeTo`, the `jammed()` / flow index, and the truck models `patch`, `bucket`, `compactor`, `jetter`. |
| `people.js` | Walkers, plus the modes `react` (phone up to report), `worker`, `protest` and `cheer`. |
| `issues.js` | `ISSUE_TYPES` (pothole, light, trash, drain), `createIssues()` with `spawn`, `spawnNear`, `setStatus`, `workSpot`, `startWork` (cones and a worker), `finish` (patch and confetti), potholes growing in severity, and a `ringGeo`. Issue statuses today: `new` (unreported), `reported`, `assigned`, `fixed`. |
| `sim.js` | `createSim(engine, opts)` returns `{ state, crews, tick, stats, dispatch, report, addIssue, addIssueAt, hireCrew, canDo, idleFor, eta, crewStatus, maxCrews, on, setSpeed, setWear, setRoadNa, setAuto, types }`. It also exports `CREW_TYPES` (roads → asphalt patch truck, lighting → bucket truck, sanitation → compactor, drainage → jetter), `CREW_FOR` and `MOOD_LABELS`. Crew states are `idle → leaving → enroute → working → returning → entering → idle`. Events emitted through `on()`: `crew`, `dispatch`, `working`, `fixed`, `home`, `reported`, `spawn`, `spotted`, `waiting`, `protest`, `calm`, `jam`. Each carries `title`, `detail` and `tone`. Mood is **city-wide** today. |
| `overlay.js` | HTML elements pinned to 3D positions. Use it for markers, SLA rings and badges. |
| `camera.js` / `engine.js` | Camera rig (`fit`, `focus`, pan, zoom, rotation, view offset), `createEngine`, day/night, picking, `project`, and `advance(seconds, fps)`. |
| `textures.js` / `signs.js` | Building sign text (`SIGN_TEXT`) and the sign atlas. |

### Page: `screens/city-world/` (`index.html`, `style.css`, `script.js`, about 770 lines)
- **Top bar** with stats.
- **Operations panel** `#cw-panel`:
  - tabs Reports, Crews and Activity,
  - filters `open | needs | active | fixed`,
  - can be minimised; becomes a bottom sheet on phones.
- **Cards:**
  - `renderIssueCard` / `renderIssueLive`, with the "Send a crew" picker that shows the best match and the reasons a crew cannot go;
  - `renderCrewCard`, with members, vehicle, waiting jobs and Follow.
- **Toasts:** at most 2, deduplicated.
- **Activity log** (`logActivity`).
- **Dock** groups: Navigate, "Training: create a problem", Crews, Time, Scenario.
- **Other parts:** directory drawer, help dialog, welcome card, photo mode, deep links (`#hall`, `#photo`).
- **Diagnostics:** `window.RoadNaCityWorld` (`stats`, `engine`, `sim`, `selected`, `tool`, `metrics`).

### Existing admin screens
- `screens/admin-dashboard`, `admin-incident-triage`, `admin-dispatch-units`, `admin-sla-orders` and `admin-heatmap` share a sidebar.
- SLA targets shown on `admin-sla-orders`: Critical 4 h, High 72 h, Medium 7 days, Low 14 days.

### Tooling
- `npm start` serves on port 4173.
- `npm run check` must pass. It verifies that scripts parse, links resolve, and nothing uses storage or the network.

---

## 3. Hard constraints (never break these)

1. **Vanilla only:** HTML, CSS and JS ES modules. No build step, no framework, no CDN at runtime. Three.js r180 is vendored (`shared/vendor/three/`) and imported via `shared/cityworld/three.js`.
2. **Simulated only.** Do not use:
   - real authentication,
   - `fetch` or XHR,
   - a database,
   - `localStorage` or `sessionStorage`,
   - cookies,
   - email,
   - uploads,
   - real geolocation,
   - real AI.

   Everything is in memory. Roles are simulated **only** through the URL query (`?role=…&dept=…`), and the UI always shows: "Preview: real access is enforced by the server."
3. **Do not break the 20 existing screens** or the landing page scroll story. The landing story uses the same engine. Any engine change must be **opt-in** through options, for example `buildWorld({ mode: 'command' })` or a sign-override map, so the landing story looks exactly the same as before.
4. **Accessibility is a requirement, not a polish step:**
   - full keyboard operation,
   - visible focus,
   - `aria-live` announcements,
   - a list or table equivalent for every map action,
   - `prefers-reduced-motion` (no camera flights; instant transitions),
   - a no-WebGL fallback.
5. **Copy style:**
   - Sentence case, active voice, numerals ("3 reporters").
   - Times as "due in 2 h 10 m".
   - Format numbers and dates with `Intl`.
   - Keep strings in one object per page so Arabic can be added later.
6. `npm run check` passes after every phase.

---

## 4. Roles and permissions

Roles are simulated through `?role=` and `&dept=`. The default is `dispatcher`. Show the active role as a chip in the top bar: "Dispatcher · All departments" or "Supervisor · Roads", with a menu that switches role by changing the URL. A role menu is acceptable in a *preview* only, so label it "Preview role".

| Action | Dispatcher | Supervisor (`dept`) | Municipality admin |
|---|---|---|---|
| View everything | ✓ | ✓ (other departments dimmed) | ✓ |
| Validate / Reject / Merge / Transfer | ✓ | ✓ own dept | — |
| Override priority (reason required) | ✓ | ✓ own dept | — |
| Assign / Reassign crew, bundle jobs | ✓ | ✓ own dept | — |
| Verify **P3/P4** work done | ✓ | ✓ own dept | — |
| Verify **P1/P2** work done | — | ✓ own dept | — |
| Send back (reason required) | ✓ for P3/P4 | ✓ own dept | — |
| Escalate a ward or SR | ✓ | ✓ | ✓ |
| Open Training mode | ✓ | ✓ | ✓ |
| Edit SLA targets, hire crews | Training only | Training only | Training only |

- **Disabled controls** stay visible, use `aria-disabled`, and show the reason in text, not only in a tooltip.
- **A resident or crew role** opening Command City is redirected to `../home-menu/index.html?notice=staff-only`, and that page shows "This area is for municipal staff".

---

## 5. Lifecycle (one state machine; the only way a status can change)

Create **`shared/cityworld/requests.js`**, a pure module with no Three.js and no DOM, so it can be tested in Node. It owns SRs, WOs, priority, SLA and transitions. `sim.js` keeps handling physics: crews, traffic and people. It calls `requests.js` when something happens. `script.js` only calls `transition()`.

```js
transition(sr, action, { actor, role, dept, reason, crewId, target, now }) → { ok: true, sr } | { ok: false, why }
```

| From | Action → To | Allowed | Guard (otherwise `ok:false` with `why`) | Side effects | Resident notified (timeline line) |
|---|---|---|---|---|---|
| — | `submit` → **Submitted** | resident / crew / phone (simulated) | category, location; resident needs a photo | Duplicate check within 40 m, same category | "We received your report RN-…" |
| Submitted | `validate` → **Validated** | dispatcher, supervisor (dept) | priority set (suggested or override with reason) | SLA clocks start | "Confirmed. Priority High. Made safe by 11:30." |
| Submitted | `reject` → **Rejected** | same | reason | closes | "We could not act on this: {reason}" |
| Submitted | `merge` → **Duplicate** | same | `target` is an open SR | reporters move to the target | "Already reported as RN-… — you'll get its updates" |
| Submitted / Validated | `transfer` → **Transferred** | same | body and reference | leaves the active list | "Handled by {body}, ref {ref}" |
| (emergency submit) | auto → **Validated P1** | system | emergency subtype | beacon, crew preselected | "Emergency team alerted" |
| Validated / Blocked / Sent back / Reopened | `assign` → **Assigned** | dispatcher, supervisor (dept) | the crew has the skill; the crew is idle or queues the job | WO created or extended | "A crew is scheduled" |
| Assigned | (crew leaves) → **En route** | sim | — | route line | — |
| En route | (crew arrives) → **On site** | sim | before photo (generated) | cones placed | "Crew on site" |
| On site | (crew) → **Made safe** | sim | — | response clock stops, resolution clock continues | "Made safe" |
| Made safe | (crew) → **Work done** | sim | after photo (generated) | waits for verification | — |
| On site / Made safe | (crew) → **Blocked** | sim (scripted or Training) | reason | crew returns; SR needs reassignment | "Delayed: {reason}" |
| Work done | `verify` → **Resolved** | P1/P2: supervisor (dept); P3/P4: dispatcher or supervisor | never the crew; role and dept allowed | patch and confetti (`issues.finish`) | "Fixed. Please confirm or reopen within 7 days." |
| Work done | `sendBack` → **Sent back** | same as verify | reason | crew re-dispatched | — |
| Resolved | (resident) `confirm` → **Closed** | simulated resident (~80%) | — | optional rating 1–5 | — |
| Resolved | (resident) `reopen` → **Reopened** | simulated resident (~10%) | reason | goes back to the triage queue with "Reopened" | — |
| Resolved | 7 sim days without an answer → **Closed** | system | — | — | — |

Every successful transition pushes `{ at, actor, role, action, from, to, note }` to `sr.timeline` and a global `audit` array. Never mutate the timeline entries.

### Map visual for each status (via `overlay.js` markers plus the existing 3D pieces)

| Status | Visual |
|---|---|
| Submitted | Grey marker with "?" |
| Validated | Marker in the category colour, with a P-badge |
| P1 | Red pulsing beacon (reduced motion: static red ring) |
| Assigned / En route | Crew code badge on the marker, and a dashed route line on the roads |
| On site / Made safe | The existing cones; the marker shows "Made safe" |
| Work done | Marker with an hourglass and "Verify" |
| Resolved | `issues.finish()` (patch and confetti); the marker fades out after 3 s |
| Transferred | Purple outline marker with the body's initials; hidden unless the "Show transferred" layer is on |
| Blocked | Marker with "!"; the crew van drives home |

---

## 6. Priority and SLA (put this in `requests.js`; it is pure and testable)

### 6.1 Suggested priority

```
base by severity: 1 → P4, 2 → P3, 3 → P2      (emergency subtype → P1, no bumps needed)
bump one level (towards P1) for each, and record the reason:
  - on a main road (Al-Zaytoun Ave or Al-Yasmeen St)  → "Main road"
  - within 100 m of a school, health centre or mosque → "School 60 m" (the nearest one, with its distance)
  - 3 or more reporters                               → "3 reporters"
  - severity grew since the report                    → "Getting worse"
cap: non-emergency suggestions stop at P2. Only a human override (with a reason) can make it P1.
```

- An override shows "Priority set by {name}: {reason}" on the timeline.
- When a pothole grows in severity (already simulated in `issues.js`), recalculate the suggestion. If it rises, emit an actionable event: "RN-… is getting worse, suggested P2 (was P3)".

### 6.2 Targets (editable only in Training)

| Priority | Response (made safe) | Resolution | Calendar |
|---|---|---|---|
| P1 Critical | 1 h | 4 h | 24/7 |
| P2 High | 4 h | 72 h | 24/7 |
| P3 Medium | 1 working day | 7 working days | Sunday–Thursday, 08:00–15:00 |
| P4 Low | 3 working days | 14 working days | Sunday–Thursday, 08:00–15:00 |

- Friday and Saturday are the weekend in Jordan. Working-day clocks pause outside working hours.
- Keep a `HOLIDAYS` array (sample dates) and a `ramadanHours` option (for example 09:00–14:00).

### 6.3 Escalation ladder

| Time used | What happens |
|---|---|
| Under 50% | Green ring |
| 50–80% | Amber ring |
| ≥ 80% | Red ring, plus an actionable toast to the supervisor of that department: "RN-… will breach in 25 m" |
| ≥ 100% | Pulsing red ring (reduced motion: thick static ring). **Breach** logged on the timeline and in `audit`, and the department head is notified (timeline line) |
| 3 breaches in one ward within 7 sim days | **Ward escalation** card for the municipality admin, which every role can see |

### 6.4 Sim time
- Show a shift clock in the top bar: "Tue 07:42".
- **Live:** 1 sim minute = 2 real seconds, and it can be paused.
- **Training:** speed control 1× / 5× / 20×.
- Display durations in sim time, with the note "Time is compressed in this preview".

---

## 7. Data and wards

### 7.1 `shared/sample-data.js` (new; plain data, no logic)
- **People:**
  - a Jordanian sample cast for staff (dispatcher "Rana Al-Khatib", supervisor Roads "Omar Haddad", municipality admin "Dr. Lina Obeidat");
  - crew members (reuse the name generator in `sim.js`, but read the names from here);
  - reporters by first name only (privacy).
- **Wards:** rename the 4 blocks, labelled "sample" — NE **Wasat Al-Balad** (City Hall, Triage Centre, Depot, Clock Tower, Observatory), NW **Al-Rawda** (with the mosque), SE **Al-Nuzha** (school), SW **Al-Nakheel** (health centre).
- **Landmarks** (`school`, `health`, `mosque`) with board coordinates. Reuse existing buildings through a Command City sign override:
  - Visitor Centre → "Al-Nuzha Basic School";
  - Community Centre → "Al-Nakheel Health Centre";
  - the existing mosque.

  The landing story keeps its own signs.
- **Bodies for transfer**, each with `example: true`.
- **The Live scenario script** (§9).
- **Code format:** `RN-2026-0401` for SRs and `WO-2026-0118` for WOs. Use it everywhere.

### 7.2 The ServiceRequest shape

```js
{
  id: 'RN-2026-0401', category: 'roads', type: 'pothole', subtype: 'pothole' | 'open-manhole' | …,
  severity: 2, ward: 'al-nuzha', street: 'Al-Zaytoun Ave', lane, s,         // lane/s from issues.js for placement
  nearby: { kind: 'school', name: 'Al-Nuzha Basic School', metres: 60 } | null, onMainRoad: true,
  reporters: [{ kind: 'resident', name: 'Huda', at }], duplicateOf: null,
  priority: 'P2', suggested: { priority: 'P2', reasons: ['Main road', 'School 60 m', '3 reporters'] },
  status: 'Submitted', sla: { responseDue, resolveDue, clock: 'response' | 'resolution' | null, breached: false },
  workOrderId: null, crewId: null, photos: { before: null, after: null },
  blocker: null, transfer: null, rating: null, timeline: []
}
```

- Each SR links to an `issues.js` issue (`sr.issueId`) for its 3D presence.
- An issue that nobody has reported has no SR. That is how §1.6 is enforced.
- **Photos:** draw small canvas placeholders, for example a grey road texture with a pothole blob for "before" and a dark patch for "after". Label them "Sample photo". Never use real images of people.

### 7.3 Ward satisfaction (replaces the city-wide mood)
- **Per-ward index** from 0 to 100, from these inputs:
  - the age of open SRs in the ward,
  - repeat reports,
  - reopen rate,
  - breaches,
  - recent ratings.
- Reuse the existing mood formula as the starting point, but compute it per ward.
- The top bar shows the city average.
- **Visual:** ward ground tint on the "Ward satisfaction" layer.
- **When a ward drops below 30:** protest walkers gather at City Hall, as today. The escalation card names the ward, lists its causes ("4 requests older than target, 1 reopened") and suggests actions (reassign, add a temporary crew, publish a public notice). The protest ends above 45.

---

## 8. Command City screen: the use cases, step by step

New location: **`screens/admin-command-city/`**. Copy and adapt `screens/city-world/`; keep the shared engine.

**Layout:** top bar · map · right operations panel · dock · cards. The card stack is the same as today, with these changes:
- **Top bar:**
  - stats: Open · Needs triage · At risk · Breached · Crews free · Ward satisfaction (avg);
  - the shift clock;
  - the role chip;
  - a "LIVE · sample data" or "TRAINING" badge;
  - a "Back to dashboard" link.
- **Panel tabs:**
  - **Requests**, with filters: Needs triage · Waiting for crew · In progress · Verify · Closed today;
  - **Crews**;
  - **Timeline**, the audit log, filterable by ward, role and SR.
- **Dock groups:**
  - Navigate;
  - **Layers** (Status · Priority · Department · SLA risk · Ward satisfaction · Show transferred);
  - Time;
  - Mode (Live / Training);
  - Training tools, *visible only in Training*.

### A. Morning briefing (on entry)
1. The camera visits each ward for about 4 s (`camera.focus`). A briefing card shows: "Good morning, Rana. Overnight: 6 new · 1 P1 · 1 at risk of breach · 1 transferred · 0 crews blocked."
2. Esc or "Skip briefing" ends it. A "Briefing" button in the top bar replays it.
3. **Reduced motion:** a static card over the overview, with no flights.

### B. Triage
1. "Needs triage" shows a count badge, and the Requests tab opens on that filter.
2. Selecting a grey marker or a list row opens the **triage card**, which shows:
   - the sample photo, the category and subtype, and the severity;
   - the street and ward;
   - context chips (Main road · School 60 m · Traffic delayed);
   - the reporters ("3 residents, first at 22:14");
   - the suggested priority with reason chips;
   - possible duplicates.
3. Card actions:
   - **Validate** (Enter);
   - **Change priority** (requires a reason);
   - **Merge into…** (shows candidates);
   - **Reject** (reason list plus free text);
   - **Transfer to…** (the example bodies plus a reference field).
4. After an action, focus moves to the next SR that needs triage ("Next" with J/K).

### C. Dispatch
1. On a Validated SR, the **crew picker** ranks crews by skill, then vehicle, then ETA. It shows why a crew is ineligible ("Lighting crew — wrong skills", "Busy until 08:05").
2. Hovering or focusing a crew draws its **route preview** on the roads (`roads.route` → a polyline overlay) with an ETA.
3. **Suggest:** the best crew is preselected; Enter confirms.
4. **Drag** a crew row from the Crews tab onto a marker to assign it. **The keyboard alternative is required**: the picker.
5. **Bundling hint:** "Also within 150 m: RN-2026-0409 (Roads) — add to this work order?" Yes adds it to the WO, and the crew does both jobs in order.

### D. Monitor
- Crews drive as they do today. Each marker and crew row shows the state (En route · On site · Made safe · Work done).
- SLA rings run continuously.
- When a queue forms behind a severe pothole (`traffic.jammed()`), the SR gets a "Traffic delayed" chip, which feeds the priority reasons.
- The **Layers** dock group switches what the markers encode.

### E. Verify
1. The "Verify" filter lists Work done SRs, oldest first.
2. The card shows the before and after photos side by side, the materials used, and the crew's time on site.
3. **Approve** → Resolved.
4. **Send back** → reason → the crew is re-dispatched.
5. If the role or department cannot verify this priority, the buttons are disabled with the reason.

### F. Resident confirmation (simulated)
- After a request is Resolved, the simulated resident answers within 1–4 sim hours:
  - confirm (~80%, with a rating of 3–5),
  - reopen (~10%, "The patch sank again"),
  - or no answer, which closes it automatically after 7 sim days (Training shows this at 20×).
- Each answer appears on the timeline and in the Activity feed.

### G. Escalation
- The ward escalation card (§7.3) and the breach ladder (§6.3).
- The municipality admin role opens on the escalation view by default.

### H. Buildings in Command City
| Building | Opens |
|---|---|
| City Hall | KPI overview card (today's numbers, compliance per department) |
| Triage Centre | Requests filtered to Needs triage |
| Crew Depot | The Crews tab |
| Clock Tower | An SLA board card (at risk and breached, sorted by time left) |
| Data Observatory | The Layers menu |
| Other buildings | No longer link to resident or auth screens. They are ward landmarks: clicking one shows the **ward scorecard** (open SRs, breaches, satisfaction, top category) |

### I. Equivalence rule
Every map action has a panel or keyboard equivalent. A user who never touches the canvas can complete every scenario in §11.

### Keyboard
| Key | Action |
|---|---|
| J / K | Next / previous in the list |
| Enter | Primary action |
| V | Validate |
| A | Assign suggested |
| M | Merge |
| X | Reject |
| T | Transfer |
| Y | Approve |
| B | Send back |
| L | Layers |
| Esc | Close |

Add these to the help dialog.

---

## 9. Live mode vs Training mode

### Live (default)
- A **deterministic, seeded "Tuesday morning shift"** script from `shared/sample-data.js`.
- No problem-creation tools.
- Auto-assign is in "Suggest" mode.
- Unreported problems are invisible.

| Sim time | Event | What it demonstrates |
|---|---|---|
| 07:30 (carried over) | RN-0401 pothole, Al-Zaytoun Ave by Al-Nuzha school, severity 2, 3 reporters, Submitted | Suggested P2 with 3 reasons; a merge candidate |
| 07:30 (carried over) | RN-0402 same pothole, 30 m away, Submitted | Merge into 0401 |
| 07:30 (carried over) | RN-0403 whole street dark, Al-Rawda side street, severity 2, Submitted | P3, lighting crew |
| 07:30 (carried over) | RN-0404 water main leak, Al-Nakheel, Submitted | Transfer to Yarmouk Water Company (example) |
| 07:30 (carried over) | RN-0398 overflowing bin, Al-Rawda, **Validated Monday 09:40, still unassigned**, P3 | Already about 90% of response time: red ring, supervisor toast, breaches at 09:40 if ignored. Al-Rawda already has 2 breaches this week (sample), so a breach triggers the ward escalation |
| 07:30 (carried over) | RN-0395 pothole resolved yesterday | The resident **reopens** at 08:05 ("The patch sank again") |
| 07:31 | Morning briefing | §8 A |
| 07:36 | RN-0405 **open manhole** on Al-Yasmeen St (emergency) | Skips triage, P1, beacon, drainage crew preselected |
| 07:44 | RN-0406 pothole on an Al-Nakheel side street, severity 1, a resident reports it on camera (the `react` walker) | P4; reporting is visible |
| 07:52 | RN-0401's pothole severity grows | "Getting worse" reason; suggestion rises if not yet validated |
| 08:10 | The crew on RN-0403 reports **Blocked: "Replacement lamp not in stock"** | Blocked → reassign later |
| 08:20+ | Simulated resident confirmations as jobs are resolved | Confirm, rating, Closed |

Repeat from 08:30 with light random traffic (seeded) until the user stops.

### Training
- **Visual:** an orange 4 px frame around the viewport plus a "TRAINING — not real data" watermark.
- **Tools:** today's sandbox tools (create pothole, light, trash or drain; storm; wear speed; hire crews), "Show unreported problems", speed 1×/5×/20×, editable SLA targets and full auto-assign.
- **Scenario presets:**
  - **Storm night:** drain issues and flooding emergencies.
  - **Ramadan evenings:** bins fill after iftar, and working hours change.
  - **School opening week:** more traffic near schools.
- **Switching modes:** a confirmation dialog, then the sim resets. Live always restarts the same script.

---

## 10. Access, entry and the "jump"

1. **Move** the explorer to `screens/admin-command-city/`. Replace `screens/city-world/index.html` with a small page: "CityWorld is now Command City, a tool for municipal staff", with links to the landing page and the login.
2. **Landing page** (`screens/landing-page/index.html`, lines 47, 73, 97, 142 and 274): keep the cinematic story, and replace every "Enter CityWorld" or "CityWorld" link:
   - The primary CTA becomes **"See reports near you"** → `../public-guest-menu/index.html`.
   - The secondary CTA becomes **"For municipalities"** → `../login/index.html`.

   The root `index.html` keeps one link: "Command City (staff preview)".
3. **Admin screens** (all `admin-*`):
   - Add a sidebar item **"Command City"** under Operations, with a city icon.
   - Add an **"Enter Command City"** button in the dashboard page header.
4. **The jump transition** (dashboard → Command City):
   - Clicking the button captures the 4 KPI tiles' positions.
   - The next page starts with the same tiles in the same place; they animate (FLIP) into the Command City top-bar stats while the canvas fades in.
   - The camera flies from high above City Hall down to the overview (about 1.6 s).
   - Pass `?from=dashboard` so the page knows to play it. Without that query it does a normal entry.
   - **Reduced motion:** a 150 ms cross-fade.
   - **No WebGL:** the dashboard button shows a toast, "Command City needs 3D graphics. Open the Heatmap instead", with a link.
5. **Login preview chips** ("Preview as"): Resident · Field crew · Dispatcher · Supervisor (Roads) · Municipality admin. Each links to its home screen with `?role=` (the crew chip links to `my-reports` until the crew screen exists).

---

## 11. Acceptance scenarios (Given / When / Then — verify each in the browser)

1. **Happy path with merge.**
   - *Given* Live at 07:30 as the dispatcher.
   - *When* I merge RN-0402 into RN-0401 (reason "Same pothole"), validate RN-0401 at the suggested P2, and assign the suggested Roads crew.
   - *Then* RN-0401 shows 4 reporters and reasons [Main road, School 60 m, 3 reporters]. The van drives the previewed route and goes En route → On site (before photo) → Made safe (response clock stops, green) → Work done. Approve is **disabled** for me ("Supervisor (Roads) verifies P1/P2"). After switching to `?role=supervisor&dept=roads`, Approve works → Resolved → the resident confirms → Closed.
   - The SR timeline shows at least 10 entries, with role and time.
2. **Emergency.** At 07:36, RN-0405 appears as P1 Validated with a beacon. The drainage crew is preselected, and one Enter dispatches it.
3. **Breach and escalation.** If nobody touches RN-0398, its ring is red with a supervisor toast, it breaches at 09:40 (logged), and the Al-Rawda escalation card appears with its causes and suggested actions.
4. **Transfer.** RN-0404 is transferred to "Yarmouk Water Company (example)" with reference "YWC-55120". It leaves the active list and stays on the Timeline, with the resident-notified line.
5. **Blocked.** At 08:10, RN-0403 becomes Blocked with its reason. The crew returns, and the SR appears in "Waiting for crew" with a "Blocked" chip. Reassigning it works.
6. **Reopen.** At 08:05, RN-0395 is Reopened with the resident's reason and returns to Needs triage with a "Reopened" chip.
7. **Separation of duties.** As the municipality admin, Assign and Validate are disabled with reasons, and Escalate works.
8. **Keyboard only.** Complete scenario 1 without the mouse, using J/K, V, A, Y and Enter. Focus stays visible, and every change is announced through `aria-live`.
9. **Reduced motion.** The briefing is a still card, the jump is a cross-fade, beacons and rings are static, and nothing flies.
10. **Live honesty.** In Live there is no create-problem tool, and unreported problems are invisible. In Training, the frame and watermark show, the tools work, and "Show unreported problems" reveals hidden issues.
11. **Access.** The landing page has no link to Command City. `?role=resident` redirects with the staff-only notice. The admin sidebar link and dashboard button work, with the jump.
12. **Regression.** The landing story looks and behaves as before, at the start, middle and end of the scroll. The 19 other screens are unchanged except for the sidebar item and links. `npm run check` passes.

---

## 12. Work in phases (checkpoint after each)

After every phase:
- run `npm run check` and `node tools/test-cycle.mjs`;
- take a screenshot at 1440 px;
- add 3–5 lines to `CITYWORLD-HANDOFF.md` §1 describing what changed.

**Stop and report if a constraint would have to be broken.**

| Phase | Work | Done when |
|---|---|---|
| 1. Baseline | Read the docs. Run the check. Screenshot the landing story (start, middle, end) and CityWorld for later comparison | Baseline saved in `.verification/` |
| 2. Cycle core | `shared/sample-data.js`, `shared/cityworld/requests.js` (state machine, priority, SLA, audit), and `tools/test-cycle.mjs`, a Node script that replays scenarios 1–7 against the pure module and asserts each status, reason and guard | All Node assertions pass; no DOM involved |
| 3. Move and access | `screens/admin-command-city/`, the stub at `city-world`, landing CTAs, the root link, the admin sidebar item, the dashboard button, the role chip and redirect, the login preview chips | Scenario 11 passes |
| 4. Map layer | SR markers via `overlay.js`, status visuals, SLA rings, route preview, duplicate lines, ward tint layer, landmark sign overrides (opt-in), hiding unreported issues | Markers match §5 for every status |
| 5. Panel and cards | Triage, dispatch, verify, escalation and ward scorecard cards; the Requests, Crews and Timeline tabs; role-aware disabled states; keyboard map | Scenarios 1 and 4–8 pass |
| 6. Modes and script | The Live script (§9), Training mode with frame, tools and presets, the briefing, simulated resident answers | Scenarios 2, 3, 9 and 10 pass |
| 7. Jump, polish and docs | The FLIP jump, reduced motion, phone layout, the no-WebGL fallback, help dialog keys; update `README.md` and `CITYWORLD-HANDOFF.md` (new paths, data model, state machine, how to replay each scenario) | All 12 scenarios pass; landing regression screenshots match |

### Phone and small screens
- Command City is a desktop or tablet tool.
- Below 768 px: show the panel lists full-screen, with a small read-only city overview at the top and the note "Command City works best on a larger screen".
- Do not cram the dock onto the phone.

### Verification tips
- The Claude Desktop browser pane pauses `requestAnimationFrame` while hidden. Drive frames with `window.RoadNaCityWorld.engine.advance(seconds, 30)`.
- Screenshots can lag one frame, so take two.
- Expose `window.RoadNaCommandCity = { requests, audit, sim, engine, setRole, jumpTo(simTime) }` so the scenarios can be checked quickly.

---

## 13. Deliverables
1. The code changes above, with comments only where the code is not obvious, matching the surrounding style.
2. `tools/test-cycle.mjs`, plus a `"test:cycle"` script in `package.json`.
3. Screenshots at 1440 px of:
   - the triage card (scenario 1),
   - the emergency (2),
   - the disabled Approve with its reason (1 and 7),
   - the escalation card (3),
   - Training mode (10).
4. An updated `CITYWORLD-HANDOFF.md` and `README.md`.
5. A short "Deferred" list in the handoff doc: anything not done, why, and the suggested next step.

## 14. Out of scope (separate prompts later)
- The resident 2D map (Leaflet vendored locally, plus an offline illustrated fallback).
- The field crew phone screen.
- Full Arabic and right-to-left layout.
- The real backend: ASP.NET roles and policies, an audit table, notifications, photo storage with face and plate blurring, and the privacy rules of Jordan's Personal Data Protection Law (2023).
- Fixes from `AUDIT-2026-10-13.md` that are unrelated to this work.

## 15. When something is unclear
Prefer the rule in §1 that protects **accountability and honesty**: no invented data in Live mode, no self-approval, and a reason for every exception. If two rules conflict, or a constraint would have to be broken, stop and ask instead of guessing.
