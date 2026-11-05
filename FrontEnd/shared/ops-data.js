"use strict";

// Operations data and clock shared by the 2D operations map and the 3D city view, so both show the
// same reports, teams, statuses and time of day. Everything here is sample data at sample positions
// and a simulated clock; ASP.NET will supply live reports, team positions and role permissions.
(() => {
  const NOW = 360; // minutes after 06:00, so 12:00
  const LIVE_END = 400; // the live simulation runs from NOW to this, then starts over
  const DEPOT = [32.5547, 35.8566];

  const STATUS = {
    review: { label: "To review", tone: "slate", chip: "chip--submitted", color: "#64748b" },
    waiting: { label: "Waiting for a team", tone: "red", chip: "chip--critical", color: "#ba1a1a" },
    progress: { label: "In progress", tone: "amber", chip: "chip--progress", color: "#d97706" },
    check: { label: "To check", tone: "teal", chip: "chip--assigned", color: "#0e7c86" },
    fixed: { label: "Fixed", tone: "green", chip: "chip--resolved", color: "#059669" },
  };
  const ROLES = {
    // city3d: who may open the 3D city view. Reviewers work in Review & Assign and the 2D map only.
    reviewer: { label: "Reviewer", blurb: "New reports to review and the ones waiting for a team.", statuses: ["review", "waiting"], teams: false, heat: false, city3d: false },
    supervisor: { label: "Supervisor", blurb: "Your department's teams, the work in progress and the work waiting to be checked.", statuses: ["waiting", "progress", "check"], teams: true, heat: false, city3d: true, dept: "Roads Department" },
    head: { label: "Manager", blurb: "The whole municipality: where problems are, who is on them, and how each area is doing.", statuses: ["review", "waiting", "progress", "check", "fixed"], teams: true, heat: true, city3d: true },
    admin: { label: "Super admin", blurb: "Everything a manager sees, for every municipality on the platform (this preview has one: Greater Irbid).", statuses: ["review", "waiting", "progress", "check", "fixed"], teams: true, heat: true, city3d: true },
  };
  // events: [minute, status]. A report exists from its first event on.
  const REPORTS = [
    { id: "RN-2025-0431", title: "Pothole near school gate", place: "Bayt Ras", lat: 32.5712, lng: 35.8421, dept: "Roads Department", events: [[356, "review"], [366, "progress"]] },
    { id: "RN-2025-0430", title: "Traffic signal stuck on red", place: "Al-Hashemi St, Downtown", lat: 32.5565, lng: 35.852, dept: "Roads Department", events: [[351, "review"]] },
    { id: "RN-2025-0428", title: "Broken glass on the cycle path", place: "Al-Andalus", lat: 32.5489, lng: 35.8712, dept: "Sanitation Department", events: [[339, "review"]] },
    { id: "RN-2025-0425", title: "Fallen branch blocking the bike lane", place: "University St", lat: 32.5398, lng: 35.8535, dept: "Parks Department", events: [[312, "review"], [372, "waiting"]], note: "No parks team is free." },
    { id: "RN-2025-0424", title: "Cracked pavement outside the clinic", place: "Bayt Ras", lat: 32.5705, lng: 35.8433, dept: "Roads Department", events: [[300, "review"]] },
    { id: "RN-2025-0429", title: "Storm drain overflowing", place: "Near Irbid Camp", lat: 32.5585, lng: 35.8478, dept: "Drainage & Water Authority", events: [[346, "review"], [352, "waiting"]], note: "No drainage team is free." },
    { id: "RN-2025-0422", title: "Streetlight cluster is dark", place: "Downtown", lat: 32.5602, lng: 35.8561, dept: "Lighting Division", events: [[240, "review"], [246, "waiting"]], note: "No lighting team is free." },
    { id: "RN-2025-0412", title: "Severe asphalt pothole", place: "University St", lat: 32.5392, lng: 35.852, dept: "Roads Department", events: [[30, "review"], [60, "progress"]] },
    { id: "RN-2025-0409", title: "Flickering street lamp", place: "Al-Hashemi St", lat: 32.5572, lng: 35.8499, dept: "Lighting Division", events: [[40, "review"], [120, "progress"]] },
    { id: "RN-2025-0388", title: "Collapsed storm drain cover", place: "Al-Manara", lat: 32.5521, lng: 35.8442, dept: "Drainage & Water Authority", events: [[10, "review"], [50, "progress"]] },
    { id: "RN-2025-0390", title: "Leaning tree over the pavement", place: "Park area", lat: 32.5451, lng: 35.8561, dept: "Parks Department", events: [[100, "review"], [250, "progress"]] },
    { id: "RN-2025-0401", title: "Speed limit sign replaced", place: "Emaar Irbid Park", lat: 32.5511, lng: 35.8604, dept: "Roads Department", events: [[20, "review"], [40, "progress"], [300, "check"], [375, "fixed"]] },
    { id: "RN-2025-0371", title: "Damaged curb ramp rebuilt", place: "Al-Hashemi St", lat: 32.5558, lng: 35.8495, dept: "Roads Department", events: [[0, "fixed"]] },
    { id: "RN-2025-0344", title: "Blocked storm drain cleared", place: "Irbid Camp", lat: 32.5535, lng: 35.8588, dept: "Drainage & Water Authority", events: [[0, "fixed"]] },
  ];
  // trips: the team leaves the depot (or its last place) at `start`, arrives at `arrive`, and works on
  // the task until `release` (never, if omitted). A trip without a task is the drive back to the depot.
  const TEAMS = [
    { name: "Roads Crew 4", kind: "roads", vehicle: "patch", plate: "24-61873", supervisor: "Eng. Rana Al-Khatib", leader: "Omar Haddad", members: ["Khaled Al-Momani", "Yousef Bani Hani"], dept: "Roads Department", trips: [{ task: "RN-2025-0412", start: 60, arrive: 80 }] },
    { name: "Roads Crew 6", kind: "roads", vehicle: "patch", plate: "24-58210", supervisor: "Eng. Rana Al-Khatib", leader: "Ahmad Al-Zoubi", members: ["Mahmoud Obeidat", "Bilal Shdeifat"], dept: "Roads Department", trips: [{ task: "RN-2025-0401", start: 40, arrive: 60, release: 300 }, { task: null, start: 300, arrive: 315 }, { task: "RN-2025-0431", start: 366, arrive: 386 }] },
    { name: "Lighting Crew 2", kind: "lighting", vehicle: "bucket", plate: "24-33417", supervisor: "Eng. Hiba Al-Masri", leader: "Fadi Al-Rousan", members: ["Samer Tawalbeh", "Anas Gharaibeh"], dept: "Lighting Division", trips: [{ task: "RN-2025-0409", start: 120, arrive: 150 }] },
    { name: "Sanitation Crew 1", kind: "sanitation", vehicle: "compactor", plate: "24-70952", supervisor: "Eng. Sami Al-Omari", leader: "Hasan Al-Momani", members: ["Ziad Bataineh", "Tareq Al-Qudah"], dept: "Sanitation Department", trips: [] },
    { name: "Parks Crew 1", kind: "parks", vehicle: "compactor", plate: "24-66135", supervisor: "Eng. Sami Al-Omari", leader: "Nour Al-Shboul", members: ["Ali Freihat", "Majed Al-Smadi"], dept: "Parks Department", trips: [{ task: "RN-2025-0390", start: 250, arrive: 270 }] },
    { name: "Drainage Crew 3", kind: "drainage", vehicle: "jetter", plate: "24-41588", supervisor: "Eng. Laila Haddad", leader: "Mohammad Al-Khasawneh", members: ["Omar Jaradat", "Rami Al-Azzam"], dept: "Drainage & Water Authority", trips: [{ task: "RN-2025-0388", start: 50, arrive: 70 }] },
  ];
  const HOTSPOTS = [
    { lat: 32.5565, lng: 35.851, radius: 520, level: "hot" },
    { lat: 32.5392, lng: 35.852, radius: 420, level: "warm" },
    { lat: 32.571, lng: 35.843, radius: 450, level: "mild" },
  ];
  const DEPARTMENTS = ["Roads Department", "Lighting Division", "Sanitation Department", "Parks Department", "Drainage & Water Authority"];
  // Sample resident sentiment per area: average rating of fixes, reports reopened by residents this
  // month, the problem residents report most often, and neighbours who voted on community proposals.
  const AREAS = {
    nw: { name: "Bayt Ras", rating: 4.5, reopened: 0, repeat: "Potholes near the schools", votes: 312 },
    ne: { name: "Downtown", rating: 3.6, reopened: 2, repeat: "Dark streetlights on Al-Hashemi St", votes: 540 },
    sw: { name: "Al-Nuzha", rating: 4.1, reopened: 1, repeat: "Fallen branches on the bike lane", votes: 228 },
    se: { name: "Al-Andalus", rating: 4.3, reopened: 0, repeat: "Litter on the cycle path", votes: 190 },
  };
  // What each crew does and what it drives. The 3D city uses the same vehicle shapes.
  const CREW_KIND = { roads: "Roads crew", lighting: "Lighting crew", sanitation: "Sanitation crew", parks: "Parks crew", drainage: "Drainage crew" };
  const VEHICLE = {
    patch: { name: "Asphalt patch truck", does: "Fills potholes and seals cracks" },
    bucket: { name: "Bucket truck", does: "Lifts a worker up to streetlights and signals" },
    compactor: { name: "Compactor truck", does: "Collects rubbish, debris and branches" },
    jetter: { name: "Jetter tanker", does: "Clears blocked drains with high-pressure water" },
  };
  // Small side views of each vehicle, drawn with simple shapes so they read at card size.
  const VEHICLE_SVG = {
    patch: '<rect x="4" y="20" width="62" height="20" rx="3" fill="#3f4b4e"/><path d="M8 20l8-10h46l4 10z" fill="#2f3b3e"/><rect x="68" y="14" width="30" height="26" rx="4" fill="#0e7c86"/><rect x="80" y="18" width="14" height="10" rx="2" fill="#d6f3f1"/><rect x="2" y="38" width="100" height="5" rx="2" fill="#1f2933"/>',
    bucket: '<rect x="4" y="24" width="60" height="16" rx="3" fill="#e8d9b0"/><rect x="66" y="14" width="32" height="26" rx="4" fill="#0e7c86"/><rect x="79" y="18" width="15" height="10" rx="2" fill="#d6f3f1"/><path d="M22 24L48 4" stroke="#55606a" stroke-width="4" stroke-linecap="round"/><rect x="44" y="0" width="14" height="10" rx="2" fill="#f2b33d"/><rect x="2" y="38" width="100" height="5" rx="2" fill="#1f2933"/>',
    compactor: '<path d="M4 40V18q0-6 6-6h52v28z" fill="#2f7d5a"/><rect x="10" y="18" width="46" height="4" rx="2" fill="#256a4b"/><rect x="64" y="14" width="34" height="26" rx="4" fill="#0e7c86"/><rect x="77" y="18" width="16" height="10" rx="2" fill="#d6f3f1"/><rect x="2" y="38" width="100" height="5" rx="2" fill="#1f2933"/>',
    jetter: '<rect x="6" y="14" width="58" height="22" rx="11" fill="#2f6f9e"/><rect x="12" y="20" width="46" height="3" rx="1.5" fill="#bcd8ec"/><rect x="66" y="14" width="32" height="26" rx="4" fill="#0e7c86"/><rect x="79" y="18" width="15" height="10" rx="2" fill="#d6f3f1"/><rect x="2" y="38" width="100" height="5" rx="2" fill="#1f2933"/>',
  };
  const PHASE_TEXT = { route: "On the way", site: "On site, working", returning: "Driving back to the depot", free: "Free at the depot" };

  const reportById = new Map(REPORTS.map((r) => [r.id, r]));
  const fmtTime = (m) => { const t = 360 + Math.round(m); return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const statusAt = (report, T) => { let s = null; for (const [m, st] of report.events) if (m <= T) s = st; return s; };
  const teamFor = (taskId) => TEAMS.find((t) => t.trips.some((trip) => trip.task === taskId));
  const coordsOf = (id) => { const r = reportById.get(id); return r ? [r.lat, r.lng] : DEPOT; };

  // Where a team is, and what it is doing, at minute T.
  function teamStateAt(team, T) {
    let at = DEPOT;
    let task = null;
    let phase = "free";
    let heading = null;
    for (const trip of team.trips) {
      if (T < trip.start) break;
      const to = trip.task ? coordsOf(trip.task) : DEPOT;
      if (T < trip.arrive) {
        const k = (T - trip.start) / (trip.arrive - trip.start);
        heading = [to[0] - at[0], to[1] - at[1]];
        at = [at[0] + (to[0] - at[0]) * k, at[1] + (to[1] - at[1]) * k];
        task = trip.task;
        phase = trip.task ? "route" : "returning";
        break;
      }
      at = to;
      if (trip.task && (trip.release == null || T < trip.release)) { task = trip.task; phase = "site"; }
      else { task = null; phase = "free"; }
    }
    return { at, task, phase, heading };
  }

  // Everything at minute T: each existing report's status, and each team's position and state.
  function snapshot(T) {
    const reports = new Map();
    REPORTS.forEach((r) => { const st = statusAt(r, T); if (st) reports.set(r.id, st); });
    const teams = new Map(TEAMS.map((t) => [t.name, teamStateAt(t, T)]));
    return { reports, teams };
  }

  // The clock both views share. "live" runs a short simulation past 12:00; "replay" is the morning.
  function createClock(opts = {}) {
    const reduce = Boolean(opts.reduceMotion);
    const replay = opts.mode === "replay";
    const c = {
      min: Number.isFinite(opts.t) ? Math.max(replay ? 0 : NOW, Math.min(replay ? NOW : LIVE_END, opts.t)) : NOW,
      mode: replay ? "replay" : "live",
      playing: false,
      reduce,
      tick(dt) {
        if (reduce) return;
        if (c.playing) { c.min += dt * 24; if (c.min >= NOW) { c.min = NOW; c.playing = false; c.mode = "replay"; } }
        else if (c.mode === "live") { c.min += dt * 1.3; if (c.min > LIVE_END) c.min = NOW; }
      },
      scrub(m) { c.mode = "replay"; c.playing = false; c.min = m; },
      live() { c.mode = "live"; c.playing = false; c.min = NOW; },
      play() {
        if (c.playing) { c.playing = false; return; }
        if (c.reduce) { c.min = NOW; c.mode = "replay"; return; }
        c.mode = "replay";
        if (c.min >= NOW) c.min = 0;
        c.playing = true;
      },
      shown() { return Math.min(c.min, NOW); },
      label() { return c.mode === "live" ? `Live · simulated ${fmtTime(c.min)}` : `${fmtTime(c.min)}${c.min >= NOW ? " · now" : ""}`; },
    };
    return c;
  }

  // The 2D map and the 3D city hand their state to each other in the link, so switching keeps the role and the time.
  const parse = (search) => {
    const p = new URLSearchParams(search);
    const role = ROLES[p.get("role")] ? p.get("role") : "reviewer";
    const mode = p.get("mode") === "replay" ? "replay" : "live";
    const value = p.get("t");
    const t = value == null || value.trim() === "" ? NOW : Number(value);
    return { role, mode, t: Number.isFinite(t) ? t : NOW };
  };
  const query = (role, clock) => `?view=ops&role=${encodeURIComponent(role)}&mode=${clock.mode}&t=${Math.round(clock.min * 1000) / 1000}`;

  // The detail card, identical in both views.
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const addRow = (dl, term, text) => { const div = document.createElement("div"); div.append(el("dt", "", term), el("dd", "", text)); dl.append(div); };
  const link = (href, text, primary = true) => { const a = el("a", `btn ${primary ? "btn--primary" : "btn--outline"}`, text); a.href = href; return a; };
  // Who is handling a job: the crew, what it does, its vehicle, its supervisor, leader and members.
  function crewBlock(team, st, title) {
    const box = el("section", "ops-crew");
    box.append(el("h3", "ops-crew__title", title));
    const head = el("div", "ops-crew__head");
    const pic = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pic.setAttribute("viewBox", "0 0 104 46");
    pic.setAttribute("class", "ops-crew__vehicle");
    pic.setAttribute("role", "img");
    pic.setAttribute("aria-label", VEHICLE[team.vehicle].name);
    pic.innerHTML = `${VEHICLE_SVG[team.vehicle]}<circle cx="22" cy="42" r="5" fill="#1f2933"/><circle cx="84" cy="42" r="5" fill="#1f2933"/><circle cx="22" cy="42" r="2" fill="#c9cfd3"/><circle cx="84" cy="42" r="2" fill="#c9cfd3"/>`;
    const who = el("div", "ops-crew__who");
    who.append(el("strong", "", team.name), el("span", "", `${CREW_KIND[team.kind]} · ${team.dept}`));
    if (st) who.append(el("span", `chip ${st.task ? "chip--progress" : "chip--resolved"}`, PHASE_TEXT[st.phase]));
    head.append(pic, who);
    const dl = el("dl", "ops-card__facts");
    addRow(dl, "Vehicle", `${VEHICLE[team.vehicle].name} · ${team.plate}`);
    addRow(dl, "What it does", VEHICLE[team.vehicle].does);
    addRow(dl, "Supervisor", team.supervisor);
    addRow(dl, "Team leader", team.leader);
    addRow(dl, "Members", team.members.join(", "));
    box.append(head, dl);
    return box;
  }

  function renderCard(body, selection, snap, role, api = {}) {
    body.textContent = "";
    const empty = () => {
      const h = el("h2", "panel__title", "Nothing selected");
      h.id = "card-title";
      body.append(h, el("p", "ops-card__hint", "Select a pin on the map, or a report in the list below, to see it here."));
    };
    if (!selection) { empty(); return; }
    if (selection.kind === "report") {
      const report = selection.item;
      const status = snap.reports.get(report.id);
      if (!status) { empty(); return false; }
      const info = STATUS[status];
      const h = el("h2", "panel__title ops-card__title", report.title);
      h.id = "card-title";
      const dl = el("dl", "ops-card__facts");
      addRow(dl, "Place", report.place);
      addRow(dl, "Department", report.dept);
      addRow(dl, "Reported", fmtTime(report.events[0][0]));
      const team = teamFor(report.id);
      const handled = team && ["progress", "check", "fixed"].includes(status);
      if (status === "waiting" && report.note) addRow(dl, "Why it waits", report.note);
      const actions = el("div", "ops-card__actions");
      if (status === "review") actions.append(role !== "supervisor" ? link("../../admin/review-assign/review-assign.html", "Review & assign") : link("../../admin/review-assign/review-assign.html", "See in Review & Assign", false));
      else if (status === "waiting") actions.append(link("../../admin/review-assign/review-assign.html", "Open the waiting list"));
      else if (status === "check") actions.append(link("../../admin/check-work/check-work.html", "Check this work"));
      body.append(el("span", `chip ${info.chip}`, info.label), h, el("p", "mono ops-card__id", report.id), dl);
      if (handled) body.append(crewBlock(team, snap.teams.get(team.name), status === "progress" ? "Crew handling it" : "Crew that did the work"));
      else body.append(el("p", "ops-crew__none", status === "waiting" ? `No crew yet: every ${report.dept} team is busy.` : "No crew yet: the report is waiting for review and assignment."));
      if (handled && api.onFollow) {
        const follow = el("button", "btn btn--outline", "Follow the van");
        follow.type = "button";
        follow.addEventListener("click", () => api.onFollow(team));
        actions.prepend(follow);
      }
      if (actions.children.length) body.append(actions);
      return true;
    }
    const team = selection.item;
    const st = snap.teams.get(team.name);
    const h = el("h2", "panel__title ops-card__title", team.name);
    h.id = "card-title";
    const dl = el("dl", "ops-card__facts");
    addRow(dl, "Now", PHASE_TEXT[st.phase]);
    if (st.task) addRow(dl, "Task", `${st.task} · ${reportById.get(st.task)?.title ?? ""}`);
    body.append(el("span", `chip ${st.task ? "chip--progress" : "chip--resolved"}`, st.task ? "Busy" : "Free"), h, dl, crewBlock(team, null, "The crew"));
    const open = st.task && reportById.get(st.task);
    if (open && api.onShowTask) {
      const b = el("button", "btn btn--outline", "Show its task");
      b.type = "button";
      b.addEventListener("click", () => api.onShowTask(open));
      const actions = el("div", "ops-card__actions");
      actions.append(b);
      body.append(actions);
    }
    return true;
  }

  window.RoadNaOps = { NOW, LIVE_END, DEPOT, STATUS, ROLES, DEPARTMENTS, AREAS, CREW_KIND, VEHICLE, REPORTS, TEAMS, HOTSPOTS, PHASE_TEXT, reportById, fmtTime, statusAt, teamFor, coordsOf, teamStateAt, snapshot, createClock, parse, query, renderCard };
})();
