import { clamp, rng } from './kit.js';
import { SPOTS } from './layout.js';
import { ROAD_Y } from './vehicles.js';
import { ISSUE_TYPES } from './issues.js';

// A small, honest sandbox: problems appear, residents report them, crews fix them.
// Nothing here is real data; it only drives the visuals and the HUD.
const WEAR = { calm: 24, normal: 14, storm: 6.5 };
const TYPE_MIX = ['pothole', 'pothole', 'pothole', 'light', 'trash', 'drain', 'pothole', 'trash'];
export const MOOD_LABELS = [[75, 'Delighted', 'happy'], [58, 'Content', 'ok'], [40, 'Frustrated', 'meh'], [22, 'Angry', 'angry'], [0, 'Furious', 'furious']];
export const moodLabel = (m) => MOOD_LABELS.find(([t]) => m >= t);

// Specialised crews: each vehicle carries the equipment for one kind of job.
export const CREW_TYPES = {
  roads: { name: 'Roads', code: 'R', vehicle: 'patch', vehicleName: 'Asphalt patch truck', skills: ['pothole'], color: '#e0862f', icon: 'pothole' },
  lighting: { name: 'Lighting', code: 'L', vehicle: 'bucket', vehicleName: 'Bucket truck', skills: ['light'], color: '#c99a1e', icon: 'light' },
  sanitation: { name: 'Sanitation', code: 'S', vehicle: 'compactor', vehicleName: 'Compactor truck', skills: ['trash'], color: '#3f8a62', icon: 'trash' },
  drainage: { name: 'Drainage', code: 'D', vehicle: 'jetter', vehicleName: 'Jetter tanker', skills: ['drain'], color: '#4f78a8', icon: 'drain' },
};
export const CREW_FOR = { pothole: 'roads', light: 'lighting', trash: 'sanitation', drain: 'drainage' };
const FIRST = ['Omar', 'Lina', 'Yousef', 'Rana', 'Khaled', 'Sara', 'Ahmad', 'Huda', 'Fadi', 'Maha', 'Bilal', 'Noor', 'Tareq', 'Dana', 'Zaid', 'Reem'];
const LAST = ['Haddad', 'Khatib', 'Odeh', 'Masri', 'Zoubi', 'Hijazi', 'Nasser', 'Azzam', 'Shboul', 'Tamimi', 'Qudah', 'Saleh', 'Rawashdeh', 'Bataineh'];
const ROLES = ['Supervisor', 'Technician', 'Driver'];
const MAX_CREWS = 6;

export function createSim(engine, opts = {}) {
  const { world, traffic, people, issues } = engine;
  const R = rng(opts.seed ?? 5);
  const listeners = new Set();
  const state = {
    clock: opts.clock ?? 8 * 60, speed: 1, paused: false, wear: 'normal', roadna: true, auto: true,
    mood: 80, moodTarget: 80, fixed: 0, reported: 0, spawnTimer: 4, protest: false, lastJam: -99, time: 0,
    responseTimes: [],
  };
  const emit = (type, data = {}) => listeners.forEach((fn) => fn({ type, ...data, clock: state.clock }));

  const laneEC = world.net.byId.get('E>C');
  const doors = SPOTS.depotDoors;
  const crews = [];
  const counters = {};
  function hireCrew(type = 'roads') {
    const t = CREW_TYPES[type];
    if (!t || crews.length >= MAX_CREWS) return null;
    const vehicle = traffic.create(t.vehicle, { mode: 'crew', speed: 3.3 });
    if (!vehicle) return null;
    vehicle.hidden = true; vehicle.mode = 'depot';
    counters[type] = (counters[type] || 0) + 1;
    const used = new Set();
    const members = ROLES.map((role) => {
      let first, last, tries = 0;
      do { first = R.pick(FIRST); last = R.pick(LAST); } while ((used.has(first) || used.has(last)) && tries++ < 30);
      used.add(first); used.add(last);
      return { name: `${first} ${last}`, role };
    });
    const crew = {
      id: crews.length + 1, type, info: t, code: `${t.code}-${counters[type]}`, name: `${t.name} crew ${counters[type]}`,
      members, plate: `${R.int(10, 39)}-${R.int(1000, 9999)}`, van: vehicle, state: 'idle', issue: null, jobs: 0,
      door: doors[crews.length % doors.length],
    };
    crews.push(crew);
    emit('crew', { crew, title: 'New crew on duty', detail: `${crew.name} (${t.vehicleName})`, tone: 'good' });
    return crew;
  }
  for (const type of opts.crews ?? ['roads', 'lighting', 'sanitation', 'drainage']) hireCrew(type);

  const canDo = (crew, issue) => crew.info.skills.includes(issue.type);
  const idleFor = (issue) => crews.filter((c) => c.state === 'idle' && canDo(c, issue));
  // Rough travel estimate in game minutes, for the assign list.
  function eta(issue) {
    const d = Math.hypot(issue.x - 19.7, issue.z + 3.2) * 1.35 + 3;
    return Math.max(1, Math.round((d / 3.3) * (opts.minutesPerSecond ?? 1.25)));
  }

  const joinS = (door) => laneEC.project(door.x - 1.25, -0.85);
  function laneClear(lane, s0, s1) { return !traffic.cars.some((c) => !c.hidden && c.piece === lane && c.s > s0 && c.s < s1 && !c.maneuver); }

  // Send a crew. Without a crew, the best idle crew with the right equipment goes.
  function dispatch(issue, crew = idleFor(issue)[0]) {
    if (!issue || !['new', 'reported'].includes(issue.status)) return { ok: false, reason: 'This problem is already being handled.' };
    if (!crew) return { ok: false, reason: `No ${CREW_TYPES[CREW_FOR[issue.type]].name} crew is free right now.` };
    if (!canDo(crew, issue)) return { ok: false, reason: `${crew.name} has no ${CREW_TYPES[CREW_FOR[issue.type]].vehicleName.toLowerCase()} for this job.` };
    if (crew.state !== 'idle') return { ok: false, reason: `${crew.name} is busy.` };
    const spot = issues.workSpot(issue);
    if (!spot) return { ok: false, reason: 'No road access to this spot.' };
    if (issue.status === 'new') report(issue, 'municipal');
    crew.state = 'leaving'; crew.issue = issue; issue.crew = crew; issue.assignedClock = state.clock; issue.waiting = false;
    issues.setStatus(issue, 'assigned');
    const van = crew.van, d = crew.door, s = joinS(d);
    traffic.reset(van, { mode: 'crew', speed: 3.3 }); van.beacon = true; van.hidden = false; van.scale = 1;
    van.x = d.x; van.z = -3.9; van.y = 0.22; van.h = -Math.PI / 2;
    traffic.maneuver(van, [[d.x, 0.22, -4.1], [d.x, 0.22, -2.9], [d.x - 0.12, 0.12, -1.75], [d.x - 0.7, ROAD_Y, -0.95], [d.x - 1.25, ROAD_Y, -0.85]], {
      speed: 1.5,
      wait: () => laneClear(laneEC, s - 4.5, s + 1.6),
      done: () => {
        traffic.place(van, laneEC, s);
        van.mode = 'crew'; van.v = 1.2;
        crew.state = 'enroute';
        if (!traffic.routeTo(van, spot.lane, spot.s, () => arrive(crew))) { crew.state = 'returning'; goHome(crew); }
      },
    });
    emit('dispatch', { issue, crew, title: 'Crew on the way', detail: `${crew.name} → ${issue.info.label.toLowerCase()} on ${issue.street}` });
    return { ok: true, crew };
  }

  function arrive(crew) {
    const van = crew.van, issue = crew.issue;
    van.mode = 'hold'; van.holdLateral = 0.72;
    crew.state = 'working'; crew.work = 0;
    issues.startWork(issue, van);
    emit('working', { issue, crew, title: 'Repair started', detail: `${crew.name} is working on ${issue.street}` });
  }

  function complete(crew) {
    const issue = crew.issue;
    issues.finish(issue);
    state.fixed++; crew.jobs++;
    const minutes = Math.max(1, Math.round((state.clock - (issue.reportedClock ?? issue.createdClock ?? state.clock) + 1440) % 1440));
    state.responseTimes.push(minutes);
    state.mood = clamp(state.mood + 5, 0, 100);
    emit('fixed', { issue, crew, minutes, title: `${issue.info.label} fixed`, detail: `${issue.street} · ${minutes} min after the report · ${crew.name}`, tone: 'good' });
    crew.issue = null; crew.state = 'returning';
    goHome(crew);
  }

  function goHome(crew) {
    const van = crew.van;
    const resume = () => {
      if (van.mode === 'hold') {
        const behind = traffic.cars.some((c) => c !== van && !c.hidden && c.piece === van.piece && c.s < van.s && c.s > van.s - 3.2);
        if (behind) { setTimeout(resume, 400); return; }
      }
      van.mode = 'crew'; van.holdLateral = 0;
      const door = doors[0], s = laneEC.project(door.x + 1.3, -0.85);
      const ok = traffic.routeTo(van, laneEC, s, () => {
        crew.state = 'entering';
        traffic.maneuver(van, [[door.x + 1.3, ROAD_Y, -0.85], [door.x + 0.55, ROAD_Y, -1.05], [door.x + 0.1, 0.14, -1.9], [door.x, 0.22, -3.0], [door.x, 0.22, -4.2]], {
          speed: 1.3,
          done: () => { van.hidden = true; van.beacon = false; van.mode = 'depot'; crew.state = 'idle'; emit('home', { crew, title: 'Crew back at the depot', detail: crew.name }); },
        });
      });
      if (!ok) { van.hidden = true; van.mode = 'depot'; crew.state = 'idle'; }
    };
    resume();
  }

  function report(issue, by = 'resident') {
    if (issue.status !== 'new') return;
    issues.setStatus(issue, 'reported');
    issue.reportedClock = state.clock; state.reported++;
    emit('reported', { issue, by, title: `New report · ${issue.info.label}`, detail: `${issue.street}${by === 'resident' ? ' · sent by a resident' : ' · logged by staff'}`, tone: 'warn' });
  }

  function addIssue(type, at) {
    const issue = issues.spawn(type, at);
    if (!issue) return null;
    issue.code = `RN-${1040 + issue.id}`;
    issue.createdClock = state.clock;
    issue.reportDelay = state.roadna ? R.range(3, 7) : R.range(24, 40);
    emit('spawn', { issue, title: `${issue.info.label} appeared`, detail: `${issue.street} · not reported yet` });
    return issue;
  }
  function addIssueAt(type, x, z) {
    const issue = issues.spawnNear(type, x, z);
    if (!issue) return null;
    issue.code = `RN-${1040 + issue.id}`;
    issue.createdClock = state.clock;
    issue.reportDelay = state.roadna ? R.range(2, 5) : R.range(24, 40);
    emit('spawn', { issue, manual: true, title: `Training: ${issue.info.label.toLowerCase()} created`, detail: issue.street });
    return issue;
  }

  function tick(dt) {
    if (state.paused) return 0;
    const sdt = dt * state.speed;
    state.time += sdt;
    state.clock = (state.clock + sdt * (opts.minutesPerSecond ?? 1.25)) % 1440;
    state.spawnTimer -= sdt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = WEAR[state.wear] * R.range(0.7, 1.3);
      if (issues.open().length < 14) addIssue(R.pick(TYPE_MIX));
    }
    for (const issue of issues.list) {
      if (issue.status !== 'new') continue;
      if (issue.age > issue.reportDelay && !issue.reporting) {
        issue.reporting = true;
        const walker = state.roadna ? people.reportNear(issue.x, issue.z, 5.5, () => report(issue, 'resident')) : null;
        if (!walker) report(issue, 'resident');
        else emit('spotted', { issue, walker });
      }
    }
    for (const crew of crews) {
      if (crew.state === 'working') {
        crew.work += sdt;
        crew.issue.progress = clamp(crew.work / crew.issue.info.work, 0, 1);
        if (crew.work >= crew.issue.info.work) complete(crew);
      }
    }
    // Waiting reports: auto crews take matching jobs, oldest first.
    const waiting = issues.list.filter((i) => i.status === 'reported').sort((a, b) => b.reportedAge - a.reportedAge);
    for (const issue of waiting) {
      if (state.auto && idleFor(issue).length) { dispatch(issue); continue; }
      if (issue.waiting && idleFor(issue).length) issue.waiting = false;
      const type = CREW_FOR[issue.type];
      if (!issue.waiting && issue.reportedAge > 6 && !idleFor(issue).length) {
        issue.waiting = true;
        const exists = crews.some((c) => c.type === type);
        emit('waiting', { issue, title: exists ? `Waiting for a ${CREW_TYPES[type].name} crew` : `No ${CREW_TYPES[type].name} crew on duty`, detail: `${issue.info.label} on ${issue.street}${exists ? '' : ' · add one in Crews'}`, tone: 'bad' });
      }
    }
    const open = issues.open();
    const reported = open.filter((i) => i.status !== 'new');
    const potholes = open.filter((i) => i.type === 'pothole').length;
    const ageMin = reported.reduce((sum, i) => sum + i.reportedAge, 0) / 60;
    const flow = traffic.flow;
    state.moodTarget = clamp(94 - reported.length * 6.5 - (open.length - reported.length) * 2.5 - Math.min(28, ageMin * 9) - Math.max(0, 0.82 - flow) * 60, 0, 100);
    state.mood += (state.moodTarget - state.mood) * (1 - Math.exp(-sdt * 0.16));
    if (!state.protest && state.mood < 28) { state.protest = true; people.setProtest(true); emit('protest', { title: 'Protest at City Hall', detail: 'Residents are angry about open problems', tone: 'bad' }); }
    else if (state.protest && state.mood > 44) { state.protest = false; people.setProtest(false); emit('calm', { title: 'Protest ended', detail: 'Residents are calmer now', tone: 'good' }); }
    state.densityTimer = (state.densityTimer ?? 0) - sdt;
    if (state.densityTimer <= 0 && opts.baseTraffic) {
      state.densityTimer = 2.5;
      const h = state.clock / 60, rush = (h > 7.4 && h < 9.4) || (h > 16.5 && h < 18.6) ? 4 : 0;
      const target = Math.min(opts.baseTraffic + 13, opts.baseTraffic + rush + Math.round(potholes * 1.3));
      const now = traffic.count();
      if (now < target) traffic.setDensity(now + 1); else if (now > target + 1) traffic.setDensity(now - 1);
    }
    if (flow < 0.55 && state.time - state.lastJam > 40) {
      state.lastJam = state.time; const jam = traffic.jammed()[0];
      emit('jam', { title: 'Traffic is backing up', detail: `${jam?.piece?.street ?? 'Several streets'} · potholes slow every car`, tone: 'bad' });
    }
    return sdt;
  }

  function crewStatus(crew) {
    const i = crew.issue;
    switch (crew.state) {
      case 'idle': return 'Ready at the depot';
      case 'leaving': return 'Leaving the depot';
      case 'enroute': return `Driving to ${i?.street ?? 'the job'}`;
      case 'working': return `Repairing · ${Math.round((i?.progress ?? 0) * 100)}%`;
      default: return 'Returning to the depot';
    }
  }

  function stats() {
    const open = issues.open();
    const avg = state.responseTimes.length ? Math.round(state.responseTimes.slice(-8).reduce((a, b) => a + b, 0) / Math.min(8, state.responseTimes.length)) : null;
    return {
      mood: state.mood, moodLabel: moodLabel(state.mood), reports: open.filter((i) => i.status !== 'new').length, unreported: open.filter((i) => i.status === 'new').length,
      needsCrew: open.filter((i) => i.status === 'reported').length,
      potholes: open.filter((i) => i.type === 'pothole').length, flow: traffic.flow, crewsIdle: crews.filter((c) => c.state === 'idle').length, crews: crews.length,
      clock: state.clock, fixed: state.fixed, protest: state.protest, avgResponse: avg, speed: state.speed, paused: state.paused,
    };
  }

  return {
    state, crews, tick, stats, dispatch, report, addIssue, addIssueAt, hireCrew, canDo, idleFor, eta, crewStatus,
    maxCrews: MAX_CREWS,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setSpeed(v) { state.speed = v; state.paused = v === 0; },
    setWear(w) { state.wear = w; state.spawnTimer = Math.min(state.spawnTimer, WEAR[w]); },
    setRoadNa(v) { state.roadna = v; },
    setAuto(v) { state.auto = v; },
    types: ISSUE_TYPES,
  };
}
