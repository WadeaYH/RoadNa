// Derived only from the shared operations snapshot and its simulated clock.
export const QUEUE_WARNING_MINUTES = 120;
export const isQueueDelayed = (report, status, minute) =>
  (status === 'review' || status === 'waiting') && minute - report.events[0][0] > QUEUE_WARNING_MINUTES;

export function summarizeOperations({ reports, teams, snapshot, minute, department = 'all', statuses }) {
  const inDepartment = item => department === 'all' || item.dept === department;
  const shown = reports.filter(report => {
    const status = snapshot.reports.get(report.id);
    return status && inDepartment(report) && (!statuses || statuses.has(status));
  });
  const counts = { review: 0, waiting: 0, progress: 0, check: 0, fixed: 0 };
  const dispatchTimes = [], repairTimes = [];
  for (const report of shown) {
    counts[snapshot.reports.get(report.id)]++;
    const submitted = report.events[0][0];
    const dispatched = report.events.find(([time, status]) => time <= minute && status === 'progress')?.[0];
    if (dispatched == null) continue;
    if (dispatched >= submitted) dispatchTimes.push(dispatched - submitted);
    const completed = report.events.find(([time, status]) => time <= minute && time >= dispatched && (status === 'check' || status === 'fixed'))?.[0];
    if (completed != null) repairTimes.push(completed - dispatched);
  }
  const crewPhases = { free: 0, route: 0, site: 0, returning: 0 };
  let totalCrews = 0;
  for (const team of teams.filter(inDepartment)) {
    const state = snapshot.teams.get(team.name);
    if (!state) continue;
    totalCrews++;
    if (Object.hasOwn(crewPhases, state.phase)) crewPhases[state.phase]++;
  }
  const workload = new Map();
  for (const report of shown) {
    if (!workload.has(report.dept)) workload.set(report.dept, 0);
    if (snapshot.reports.get(report.id) !== 'fixed') workload.set(report.dept, workload.get(report.dept) + 1);
  }
  const average = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  return {
    total: shown.length,
    open: shown.length - counts.fixed,
    delayed: shown.filter(report => isQueueDelayed(report, snapshot.reports.get(report.id), minute)).length,
    counts,
    crews: { ...crewPhases, total: totalCrews },
    avgDispatch: average(dispatchTimes),
    dispatchSamples: dispatchTimes.length,
    avgRepair: average(repairTimes),
    repairSamples: repairTimes.length,
    workload
  };
}
