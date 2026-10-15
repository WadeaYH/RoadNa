# RoadNa JO — Flow 01: Users, roles, permissions and operational governance

**Status:** this is the authoritative specification, confirmed by the project owner on 2026-10-14.

It combines two sources:
- the owner's Flow 01 brief;
- the owner's answers to every open question (decision log, §24).

Where an older document (`COMMAND-CITY-CYCLE.md`, `COMMAND-CITY-PROMPT.md`, `CITYWORLD-HANDOFF.md` §8) disagrees, **this file wins**. Those documents are rewritten to match during run 01-A.

**Builder:** Claude, working in this project, in three runs (§21). The owner reviews the result between runs.

**Rule for the builder:** if something is not decided here, ask the owner. Do not choose silently.

---

## 1. Principles

1. **A simple, reliable, maintainable MVP for a solo developer.** When in doubt, choose the simpler option and record the richer one as Version 2.
2. Automate routine work, and keep humans accountable for sensitive decisions.
3. Clear responsibilities, separation of duties, and an audit trail for every sensitive action.
4. Internal operations stay internal. Citizens get a simple, honest, public view.
5. Nothing is hardcoded that a municipality should configure: calendars, SLA numbers, thresholds, checklists.
6. **The preview is honest.** No real authentication, network APIs (map tiles excepted), storage, uploads, AI or municipal operations. Every simulated action is labelled as a preview.
7. Build so that ASP.NET can later enforce every rule on the server. Hiding a button is never security.

## 2. Project context

- **Root:** `C:\Users\user\Desktop\Master Piece\RoadNa`. This is a git repository with a remote.
- **No git actions.** The owner handles all commits, branches and pushes.
- **Stack:** static HTML, CSS and vanilla JavaScript, with no build step.
  - Screens live in `screens/<name>/{index.html,style.css,script.js}`.
  - Shared code lives in `shared/`: `ui.js`, `map.js` (Leaflet with OpenStreetMap, locked to Jordan), and `cityworld/` (Three.js).
- **Checks:** `npm run check` must pass. The new rule tests use `node --test`, run through `npm test`, with no new packages.
- **Keep:**
  - the landing page's cinematic scroll story;
  - the real Irbid maps;
  - the no-login navigation;
  - the help page.
- **Do not** migrate to a framework.

## 3. Organisation and scope

- **Structure:** RoadNa JO Platform → Central Platform Administration (Super Admin) → Municipalities. Each municipality has a manager, dispatch staff, department supervisors, and crews with leaders and members.
- **Launch:** Greater Irbid Municipality only. The data and permissions must still support more municipalities without a rewrite.
- **Possible ministry operator:** a future operator such as the Ministry of Local Administration is a *possible* governance model, not a fact. Do not hardcode the operator.
- **Scopes are separate from roles.** A role assignment = role + municipality + department (optional) + service area (optional). Every operational record belongs to exactly one municipality.
- **One person may hold several roles,** for example a supervisor who also dispatches. Independence rules are still checked **per action**: nobody verifies work they took part in, submitted or dispatched.
- **Cover for absent staff:**
  - **Backup supervisor:** each department names one. While acting, they hold the supervisor's permissions, and the log records "acting for".
  - **Deputy team leader:** each crew names one, with the leader's completion and reassignment powers. The log records it.
  - **On-call rota:** each department keeps a weekly on-call supervisor for nights, the Friday–Saturday weekend and holidays.

## 4. Roles

| Role | Can | Cannot |
|---|---|---|
| **Guest** | Landing page; public map and lists; public statuses; help | Report; see anything internal |
| **Resident** (signed in) | Submit reports (photo mandatory); track their own reports; "Me too" (follow + count); withdraw a report before assignment; see public statuses and notes; submit a new report if a problem returns | Approve or reject repairs; see internal notes, files, staff or worker identities; reach Command City or staff screens |
| **Dispatcher / triage officer** | Work the **exception queue only**; correct classification and routing; mark "Possible duplicate"; reject with a reason; transfer; adjust priority within limits (§10); handle dispatch exceptions; monitor queues | Review every routine report; verify work they dispatched |
| **Department supervisor** | Department queue; technical-assessment flags; sensitive priority changes; approve or reject reassignments; **verify** completed work; send work back for rework; reopen archived work (≤ 30 days); approve exceptional dispatch | Act outside their municipality or department; verify work they took part in |
| **Field crew member** | See assigned work orders as soon as they are assigned; add photos, files, notes and field reports; remove **their own** items until completion is submitted (hidden, logged); raise urgent safety concerns | Close or verify work; approve reassignment; remove other people's items; see citizen identity |
| **Field team leader** (and named deputy) | Everything a member can do; coordinate the job; choose the **official before and after evidence**; mark work completed and submit it for verification; request reassignment with a reason | Approve their own work. *Work completed ≠ Verified ≠ Closed.* |
| **Municipality manager** | Performance, delays and escalations; summaries of work orders (the full workspace only when a case is escalated to them); **request** access changes and track them | Create accounts or grant access; approve their own elevation; verify repairs, unless separately granted |
| **Platform Super Admin** | Create staff accounts; assign and change roles; suspend, deactivate and revoke; municipality configuration; access request queue; access audit | Dispatch, verify or change operational decisions; self-approve; grant privileged access alone (four-eyes, §15) |

**Special powers are permissions on roles, not extra roles:**

| Permission | Allows |
|---|---|
| `OVERRIDE_P1` | Lowering or overriding P1 |
| `EMERGENCY_DISPATCH` | Emergency dispatch powers (on-call) |
| `EXPEDITED_REVOKE` | Emergency security suspension |
| `TECHNICAL_ASSESSMENT` | Engineer or assessor work |
| `VERIFY_MAINTENANCE_WORK` | Verifying completed work |

## 5. Permission catalogue (centralised in one module)

**Intake and routing**
- `REPORT_CREATE`, `REPORT_WITHDRAW_OWN`, `REPORT_FOLLOW`
- `EXCEPTION_REVIEW`, `ROUTE_CORRECT`, `MARK_POSSIBLE_DUPLICATE`
- `REPORT_REJECT`, `REPORT_TRANSFER`

**Priority**
- `PRIORITY_RAISE`, `PRIORITY_LOWER_P3_P4`, `PRIORITY_LOWER_P2`, `OVERRIDE_P1`

**Dispatch and crews**
- `DISPATCH_EXCEPTION_APPROVE`, `EMERGENCY_DISPATCH`
- `REASSIGN_REQUEST`, `REASSIGN_APPROVE`

**Workspace and verification**
- `WORKSPACE_CONTRIBUTE`, `WORKSPACE_HIDE_OWN`, `EVIDENCE_SELECT`, `COMPLETION_SUBMIT`
- `VERIFY_MAINTENANCE_WORK`, `SEND_BACK_REWORK`, `REOPEN_ARCHIVED`
- `TECHNICAL_ASSESSMENT`

**Management and access**
- `MUNICIPAL_OVERVIEW`, `ACCESS_REQUEST_SUBMIT`
- `ACCESS_MANAGE`, `ACCESS_APPROVE_PRIVILEGED`, `EXPEDITED_REVOKE`
- `PLATFORM_CONFIGURE`, `AUDIT_VIEW_ACCESS`

**How a permission check works**

A check considers, in this order:
1. identity;
2. role assignment;
3. explicit permission;
4. municipality;
5. department;
6. area (when applicable);
7. resource assignment or ownership;
8. current workflow status;
9. separation of duties.

Every check returns `{ allowed, reason }`. The reason is shown in the UI when an action is disabled.

```
canVerify(actor, wo) =
  has VERIFY_MAINTENANCE_WORK
  AND same municipality and department scope
  AND not a member of the performing crew
  AND not the submitter
  AND not the dispatcher of this work order
  AND wo.status == PendingVerification
```

## 6. Data model (MVP)

**Entities**
- **Organisation:** `Municipality`, `Department`, `AdministrativeArea`.
- **People and access:** `User`, `Role`, `Permission`, `UserRoleAssignment` (role + scopes + acting-for).
- **Access governance:** `AccessManagementRequest`.
- **Reports and work:** `CitizenReport`, `WorkOrder`.
- **Crews:** `Crew`, `CrewMembership` (member / leader / deputy).
- **Workspace:** `WorkAttachment`, `WorkNote`, `FieldReport`, `CompletionEvidence`.
- **Decisions:** `VerificationDecision`, `ReassignmentRequest`, `PriorityAssessment`, `TechnicalAssessmentFlag`.
- **Records and configuration:** `AuditEvent`, `Notification`, `SlaPolicy`, `WorkingCalendar`.

**Rules**
- **No `Incident` layer in the MVP.** One citizen report leads to at most one work order. The Incident layer and merging arrive in Version 2.
- **Only valid reports that need maintenance create a `WorkOrder`.** Rejected, withdrawn, transferred and invalid reports never do.
- **No automatic merging.** Each report keeps its own ID, status and lifecycle. Staff may set a **Possible duplicate** flag for review.
- **"Me too"** adds a follower and increments a count. It never creates or merges a report.
- **Report IDs** use the format `RN-2026-0412`. Work order IDs use `WO-2026-0118`.

## 7. Report lifecycle and what the citizen sees

| Internal report status | Meaning | Public status |
|---|---|---|
| Submitted | Received; automatic processing running | **Received** |
| InExceptionReview | Routing uncertain, or flagged spam or duplicate; waiting for the dispatcher | **Under review** |
| Routed | In the department queue; a work order exists | **Scheduled** (until work starts) |
| (work order active) | Assigned, in progress, made safe, completed, pending verification, needs rework | **In progress** |
| Resolved / Closed | Work verified and approved | **Fixed** |
| Rejected | Invalid, spam, offensive, or already reported; reason required | **Rejected** + reason |
| Transferred | Owned by another body; receiving body and reference required | **Transferred** + body |
| Withdrawn | Withdrawn by the resident before assignment; reason required | **Withdrawn** |

**Public notes**
- **Needs rework or reopened:** the public status returns to **In progress** with the note "Additional work is needed". No internal details are shown.
- **Reopen notifications:** only the **original reporter** is notified when archived work is reopened.
- **Delays:** a significant delay shows a short public note. Notes come from templates; staff may edit them.

## 8. Intake and routing

- **Photo mandatory, always.** No exceptions in the normal workflow.
- **Safety warning:** before the form starts, the report screen shows "If anyone is in danger, call 911 first. Do not approach the hazard."
- **The AI evaluates:** category, subtype, municipality, department, preliminary priority, emergency signs and spam signs.
  - In the preview, all of this is simulated with sample data.
- **Clear reports:** confidence ≥ **85%** (configurable per municipality) → routed automatically to the department queue, with a preliminary priority.
- **Ambiguous reports:** below the threshold → exception queue, showing the reasons. The report keeps its submission time and urgency and is never dropped.
- **Emergencies:** the 4 emergency types below skip the queue, become **P1** and are auto-dispatched (§12). A low AI confidence never downgrades a suspected emergency.
  - open or missing manhole cover;
  - fallen pole or exposed wire;
  - flooding blocking a road;
  - road collapse or sinkhole.
- **Spam (MVP):** the AI only *flags* suspected spam. A human rejects it, picking a reason from a list.
  - Reasons: not a public-space problem / already reported (RN-…) / insufficient information / offensive content.
- **Transfers:**
  - **Another authority:** the report is marked Transferred, naming the receiving body and a reference. Examples, to be confirmed with the municipality: Yarmouk Water Company, the Irbid District Electricity Company, the Ministry of Public Works.
  - **Another municipality on RoadNa:** the report moves there automatically.
- **Withdrawal:** the resident may withdraw a report until a crew is assigned.

## 9. Technical assessment

- **When the department is clear but the method needs expertise:** route the report normally, keep it active and prioritised, and add a **Needs Technical Assessment** flag that the supervisor can see.
- **Who clears it:** the department supervisor, or a holder of `TECHNICAL_ASSESSMENT`. They record the method and the reason.
- **What it blocks:** only unsafe operations that need a permit, an inspection or an engineering approval. It never blocks the whole report.
- **AI suggestions for tools and materials** are informational only. They never block anything.

## 10. Priority

- **Levels:** P1 Critical, P2 High, P3 Medium, P4 Low.
- **Calculation:** rules, evidence and risk, with reasons always shown.
  - Inputs: severity, road importance, nearby sensitive places, public-safety risk, time left before the deadline, verified changes.
  - Votes and "Me too" counts **never** override safety risk.
- **Automatic reprioritisation:** when new evidence arrives, the change is recorded with the old and new priority, the trigger, the reasons, the time, and whether it was automatic or approved by a person.
- **Who can change priority, and in which direction:**

  | Change | Who may make it |
  |---|---|
  | Raise any priority | Dispatcher or supervisor, with a reason |
  | Lower P3 → P4 | Dispatcher, with a reason |
  | Lower from P2 | Supervisor |
  | Lower from P1 | `OVERRIDE_P1` |

- **Priority is not queue position.** Scheduling order never changes the official priority.
- **Active field work is never silently reshuffled.** Changes go through the reassignment rules.
- **After rework or reopening,** priority reflects the **remaining risk**. It is never lowered automatically just because some work was done.

## 11. SLA and calendar (all configurable per municipality — never hardcode)

**Two clocks per work order**
- **Response:** until the site is made safe. A **Made safe** status stops this clock.
- **Resolution:** until the fix is verified.

**SLA numbers**
- The numbers are set by the municipality.
- The preview uses these clearly labelled *placeholders*: P1 1 h / 4 h · P2 4 h / 72 h · P3 1 / 7 working days · P4 3 / 14 working days.

**Default working calendar**
- Sunday to Thursday, 08:00–15:00.
- Official holidays are excluded.
- Ramadan hours are configurable. The placeholder is 09:00–14:00.

**Which clock each priority uses**

| Priority | Clock |
|---|---|
| P1 | 24/7 |
| P2 | Working calendar, unless the municipality switches P2 to 24/7 |
| P3 / P4 | Working days |

**Other deadlines**
- **Access requests:** 2 business days on the same calendar. The UI shows the target, the time remaining and an overdue state.
- **Verification:** target of 1 working day. When overdue, the backup supervisor is alerted, then the department head.
- **Reopened from history:** a new clock starts. Earlier breaches stay on record.
- **Repeated rework:** after **2 failed verifications**, the department head is alerted, and a technical assessment becomes mandatory before more work.

## 12. Dispatch

- **Routine assignment is automatic.** The system checks skill, department, equipment, availability, location, travel and conflicts, then creates and assigns the work order.
  - The job appears in the crew's task list immediately.
  - **The crew does not accept it.** Assignment is separate from departure and from work starting.
- **Exceptional dispatch needs approval.** This covers special equipment, extra authorisation, high-risk procedures and exceptional resources.
  - The system suggests a crew, a time and its reasons.
  - A supervisor approves.
  - A high priority alone is **not** exceptional.
- **P1 emergencies:** the nearest qualified crew is auto-assigned to make the site safe, and the **on-call supervisor is alerted** and can redirect. There is no approval delay.
- **No eligible crew:** the job is never given to an unqualified crew.
  - It stays visibly **Queued**, with the reason and its deadline.
  - Supervisors are alerted when the deadline is at risk.
  - The job is re-evaluated whenever crew availability changes.
- **Reassignment:**
  1. The leader or deputy submits a request: work order, current crew, reason, and optional notes or files.
  2. The system ranks qualified, available alternatives, with reasons.
  3. The supervisor or backup approves one of them, picks another crew, or rejects with a reason and a required next step.

  **Rules:**
  - History is kept.
  - Both crews are notified.
  - Urgent safety concerns can always be raised immediately, without waiting for a transfer.

## 13. Crew workspace

- **When it opens:** as soon as the job is assigned, before work starts. The workspace is internal only.
- **Tabs:**
  - Overview (incl. location, priority, flags and safety);
  - Evidence & attachments;
  - Team notes;
  - Field reports;
  - Activity history;
  - Completion, for the leader or deputy.
- **Every item records:** its ID, author, author's role, time, work order and a description.
- **Removing items:**
  - Members may hide their **own** items until completion is submitted. Items are hidden, never deleted, and the action is audited.
  - Nobody removes other people's items.
- **Official evidence:** the leader or deputy picks official **before and after** photos from the workspace archive. No re-uploading. Both are mandatory to submit.
- **Not in Flow 01:** photo integrity checks (location, time, reuse) and offline mode. Offline mode is not needed.

## 14. Verification, rework and reopening

- **Every completed work order needs human verification.** There is no automatic approval.
- **Who verifies:** anyone with `VERIFY_MAINTENANCE_WORK`, within scope, and independent of the crew, the submitter and the dispatcher.
  - A dedicated inspector role is not required.
- **Checklist:** one **generic** checklist for every category, kept in config. The verifier must tick it before approving.
- **Never claim a photo proves structural quality.** The verifier can escalate to a technical assessment or a site visit.
- **Approve:** record the verifier and the time → **Resolved** → closed → archive. **No citizen confirmation is needed.**
- **Needs Rework** (never call it "Reopened"):
  - A reason is required, and the evidence is kept.
  - The decision is written to the audit log.
  - The job goes back into the workflow and needs a fresh verification.
  - An AI reassessment draft (§14.1) is produced.
- **Reopen from history:**
  - Only a supervisor can reopen, with a reason.
  - It is available **only within 30 days** of closure. After that the action is not shown, and it is never silently bypassed.
  - The original reporter is notified.
- **Workload tracking:** the number of jobs waiting for verification and how long each has waited, the load on each supervisor, rework frequency, and repeated failures.

### 14.1 AI reassessment draft

- **Inputs:** the original report, all evidence, notes, the rejection reasons, the earlier priority and the location context.
- **Output:**
  - a summary;
  - a remaining-risk priority, with reasons;
  - the likely remaining work;
  - suggested inspections;
  - an editable draft note.
- **Labelling:** it is always shown as an "AI suggestion". It never invents evidence. Residents never see it.

## 15. Central access management

1. The manager submits a request: new account, assign or change a role, department transfer, scope change, suspension, deactivation or revocation.
2. The request goes into the central queue.
3. A Super Admin reviews it and decides one of:
   - **Approve:** apply the change and notify the municipality.
   - **Reject:** record the reason and notify.
   - **Need information:** return it for clarification.

**What a request contains**
- ID, municipality, requester, type, target, the requested change and its scope.
- The justification.
- Times, status and reviewer.
- The outcome and the audit history.

**Rules**
- **Four-eyes:** granting Super Admin, `EXPEDITED_REVOKE`, `OVERRIDE_P1` or other privileged access needs a **second** Super Admin. Ordinary staff accounts need one approver.
- **No self-approval,** for Super Admins too.
- **Target:** 2 business days (§11). It is a service commitment, not a guarantee.
- **Security emergencies:** a holder of `EXPEDITED_REVOKE` can suspend an account immediately. The action is logged and reviewed afterwards.

## 16. Audit

Every sensitive action writes an event that can never be changed:
`{ id, entityType, entityId, action, actorId, actorRole, actingFor, municipalityId, previousState, newState, reason, timestamp, automated, ruleOrModel, metadata }`

- Automated decisions record which rule or model output drove them.
- The preview keeps events in memory only.
- Production needs storage that is durable and tamper-resistant.

## 17. Visibility, privacy and AI display

- **Public map and lists:**
  - Reports appear **after routing**, anonymised.
  - Rejected and withdrawn reports never appear.
  - Reports still under review stay hidden until they are cleared.
- **Photos:** **faces and number plates are auto-blurred** before any photo becomes public. This is in the MVP. Staff see the originals.
- **Never public:** worker names, crew notes, internal files, staff discussions and internal decisions.
  - **Remove the public comment thread** from report details. There will be no public comments.
- **Data retention:** a labelled setting, *"to be decided by the municipality's legal team under Jordan's Personal Data Protection Law"*. Do not invent a period.
- **AI display (staff only):** each suggestion shows its reasons, a confidence level (High / Medium / Low) and an "AI suggestion" label.

## 18. Notifications (MVP)

- **Channels:** in-app only, for residents and staff. SMS is Version 2.
- **The Notifications screen** shows public status changes, delays, and the reopen notice to the original reporter.
- **Staff in-app alerts:**
  - emergencies and on-call alerts;
  - overdue verifications;
  - deadline risks;
  - reassignment requests;
  - access request decisions;
  - security events.

## 19. Language

- Arabic and English everywhere, with a switch.
- **Arabic is the default for residents and crews,** with full right-to-left layout.
- All text lives in one string module from Flow 01 onwards, so Arabic is never retrofitted.
- **Preview scope:** the preview may ship English text first. The string module and the right-to-left layout must still be in place.

## 20. Preview mechanics

- **Role picker on the login page:** Resident, Crew member, Team leader, Dispatcher, Supervisor (Roads), Municipality manager, Super Admin. Guest = not signed in.
- **Carrying the role:**
  - The role travels in the URL (`?as=supervisor`).
  - A "Preview role" chip in the top bar switches it.
  - The text "Preview: real access is enforced by the server" is always visible.
- **No storage:** no browser or other storage is used.
- **Sample data:** one shared file, `shared/sample-data.js`, holds **Jordanian** names, +962 numbers and Irbid places for every screen. It replaces Marcus Vance, Elena Kovacs, Tomas Okafor, @metropol.gov and +1 numbers.
- **CityWorld:** remove its public links from the landing page and the root index now. Show it to staff roles only. The landing page's cinematic story stays. Turning CityWorld into Command City is a later flow.

## 21. Build plan: 3 runs (no git actions)

After each run:
- `npm run check` and `npm test` must pass;
- verify in the browser;
- report the changed files;
- wait for the owner's review.

**01-A: rules foundation (no UI)**
- `shared/domain/`:
  - permissions and roles;
  - policy checks;
  - report and work-order state machines with the public status mapping;
  - routing;
  - priority;
  - SLA and calendar;
  - dispatch;
  - reassignment;
  - verification and rework;
  - reopening;
  - access requests;
  - audit.
- Config: `shared/config/`, holding thresholds, the calendar, SLA placeholders, the checklist and the emergency types.
- `shared/sample-data.js`.
- Tests in `tests/*.test.mjs`.
- Rewrite `COMMAND-CITY-CYCLE.md`, `COMMAND-CITY-PROMPT.md` and `CITYWORLD-HANDOFF.md` §8 so they agree with this file.

**01-B: workflow screens**
- **Adapt existing screens:**
  - **login:** role picker;
  - **create-report:** photo required, plus the 911 banner;
  - **report-details:** public view only; remove the public comments; replace the citizen "Reopen" with "Report it again"; show no worker names;
  - **my-reports** and **notifications:** public statuses;
  - **admin-incident-triage:** becomes the exception queue;
  - **admin-dispatch-units:** auto-dispatch log, exceptional approvals and the queue of unassignable jobs;
  - **admin-sla-orders:** the new work-order statuses, the two clocks and the 30-day reopen;
  - **admin-dashboard:** a manager overview;
  - **CityWorld links:** staff only.
- **New screens:**
  1. Crew: My tasks (phone-first).
  2. Crew: Work-order workspace.
  3. Supervisor: Department queue (flags, priority exceptions, reassignment requests, queued jobs).
  4. Supervisor: Verification review (checklist, approve or rework, AI draft).
  5. Work-order history (30-day reopen).
- **End-to-end preview scenario:** report → route → auto-dispatch → workspace → completion → verification → archive, plus the rework branch.

**01-C: access management**
- **New screens:**
  6. Manager: Access requests (submit and track).
  7. Super Admin: Platform overview.
  8. Super Admin: Staff and roles, including expedited suspension.
  9. Super Admin: Access request review queue, with the 2-business-day timer, four-eyes and an audit tab.

**Screen totals:** 22 screens exist today. 12 are ready, 10 need adapting, and 9 are new, for **31** in total.

## 22. Acceptance scenarios (all must pass)

1. **Routine report:** a clear report is routed to its department queue with no manual triage.
2. **Technical assessment:** a road report with a clear owner gets the technical flag, stays active and prioritised, and the supervisor sees the flag.
3. **Priority limits:** a dispatcher's ordinary change succeeds and is audited. A dispatcher lowering a P1 or P2 is refused, with the reason shown.
4. **Routine dispatch:** a routine job is auto-assigned and appears in the crew's tasks immediately, with no accept step.
5. **No crew:** with no qualified crew, the job is Queued with its reason and deadline, and an alert is raised.
6. **Reassignment:** a vehicle breaks down → the leader requests reassignment → only the supervisor or backup can approve or reject. A worker cannot transfer the job.
7. **Shared workspace:** several members contribute, each item records its author and time, a member can hide only their own items, and only until submission.
8. **Completion:** the leader picks before and after evidence → Pending Verification, never closed automatically.
9. **Verification:** only an independent holder of `VERIFY_MAINTENANCE_WORK` can approve. Nothing is approved automatically.
10. **Rework:** the job is rejected → Needs Rework, with the reason and evidence kept and a remaining-risk priority suggested. The public view shows In progress plus the note.
11. **Reopen window:** a supervisor can reopen within 30 days, with a reason, and the original reporter is notified. On day 31 the action is unavailable.
12. **Problem returns:** a resident submits a new report for a problem that came back. It is independent and goes through normal intake. No approval by the resident is needed.
13. **Access request:** a manager requests a staff account → central queue. The manager cannot grant anything.
14. **Access target:** the 2-business-day target is tracked and overdue requests are highlighted.
15. **Security emergency:** a compromised account is suspended at once by an `EXPEDITED_REVOKE` holder, logged and flagged for review.
16. **Public isolation:** a citizen sees public statuses and notes only. Notes, files, worker names and internal actions are never exposed.
17. **Emergency:** an open manhole report becomes P1, the nearest qualified crew is auto-assigned, and the on-call supervisor is alerted. A low AI confidence never downgrades it.
18. **Privileged grant:** granting `OVERRIDE_P1` needs two different Super Admins. Self-approval is refused.
19. **Spam:** suspected spam is only flagged. A human rejects it with a listed reason.
20. **Withdrawal:** a resident can withdraw before assignment and cannot after it.
21. **Repeated rework:** a second failed verification alerts the department head and makes a technical assessment mandatory.

## 23. Deferred to Version 2 or the ASP.NET backend

**Version 2**
- The Incident layer and duplicate detection or merging. Linking a new report to an earlier repair.
- AI auto-rejection of spam (strict list, ≥ 95%), with a resident appeal and weekly spot checks.
- SMS for residents (key changes) and for urgent staff alerts.
- The P2 clock decided by issue type (hybrid).
- Photo integrity checks.
- Internal meetings.
- AI strategic planning.
- Community services.
- Command City.

**ASP.NET backend**
- Real identity and authentication.
- Server-side policy enforcement.
- Durable, tamper-resistant audit storage.
- Real AI.
- Real auto-blurring.
- Notification delivery.
- Calendar and holiday data.
- The retention policy.
- Multi-municipality data isolation.

## 24. Decision log (owner answers, 2026-10-14)

**Roles and authority**
- Special powers are permissions, not roles.
- One person may hold several roles, with independence checked on every action.
- Each department keeps a supervisor on-call rota.
- Each crew names a deputy leader.
- Each department names a backup supervisor.

**Governance**
- Four-eyes applies to privileged grants.
- The manager sees summaries only.
- The launch is Greater Irbid only.

**Reporting**
- The photo is always mandatory.
- An account is required to report.
- A resident can withdraw a report until a crew is assigned.
- "Me too" means follow + count.

**Public view**
- Residents see 5 public steps.
- Rework shows as In progress + a note.
- There are no public comments.
- A reopen notifies the original reporter only.

**Intake**
- Spam: the AI flags it and a human rejects. Auto-rejection is Version 2.
- There is no merging. Staff can set a "Possible duplicate" flag.
- Reports for other bodies are transferred with a reference.
- The AI auto-routes at 85% confidence.
- The emergency list has 4 types.
- Reports become public after routing.

**Time and priority**
- Two SLA clocks, with numbers set by each municipality (placeholders for now).
- The calendar default is Sunday–Thursday 08:00–15:00, all configurable, including holidays and Ramadan.
- P1 runs 24/7. P2 uses working hours unless switched (the hybrid is Version 2). P3 and P4 use working days.
- Access requests take 2 business days.
- Priority: easy to raise, hard to lower.
- A reopen starts a new clock and keeps earlier breaches.
- Verification within 1 working day, with backup escalation.
- Escalate after 2 failed verifications.

**Dispatch and field work**
- P1 is auto-dispatched and on-call is alerted.
- For reassignment, the system suggests a crew and the supervisor picks.
- The technical flag is cleared by a supervisor or an engineer.
- There are no evidence integrity checks in Flow 01.
- Members can hide their own items until submission.
- One generic checklist.
- Offline mode is not needed.

**Platform**
- Notifications are in-app only.
- Photos are auto-blurred.
- Retention is decided by the legal team.
- Arabic and English, with Arabic the default for residents and crews.
- The AI shows its reasons and a confidence level to staff.

**Delivery**
- Roles switch through a login picker plus a URL chip.
- Three runs.
- No git actions.
- Old documents are rewritten to match.
- CityWorld's public links are hidden now.
- Jordanian sample data.
- Tests use `node --test`.
- Claude builds.

### Small defaults the builder may use (shown to the owner; change them any time)

- **Confirmed duplicates** are closed as **Rejected**, with the reason "Already reported (RN-…)". The resident can tap "Me too" on the original. No data is merged.
- **Rejection reasons:** not a public-space problem, already reported, insufficient information, offensive content.
- **Ramadan placeholder hours:** 09:00–14:00.
- **SLA placeholder numbers:** as listed in §11.
