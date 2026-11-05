"use strict";

// Sample money data for the manager's Finance page and the RoadNa AI assistant (preview only).
// Budgets and spending are for January to October 2026. Every total, average, forecast and risk
// is computed from these numbers, so the charts, the AI summary and the chat answers always agree.
// ASP.NET will read the real figures from the municipality's finance system.
(() => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const MONTHS_LEFT = 2; // Nov and Dec
  // Spent from the yearly budget, per month (JOD)
  const MONTHLY = [71200, 68900, 79400, 74300, 83100, 86700, 88950, 92400, 89520, 92100];

  const DEPARTMENTS = [
    { key: "roads", name: "Roads Department", short: "Roads", budget: 420000, spent: 318450, fixed: 214 },
    { key: "lighting", name: "Lighting Division", short: "Lighting", budget: 160000, spent: 121300, fixed: 96 },
    { key: "sanitation", name: "Sanitation Department", short: "Sanitation", budget: 210000, spent: 173960, fixed: 412 },
    { key: "parks", name: "Parks Department", short: "Parks", budget: 95000, spent: 88240, fixed: 63 },
    { key: "drainage", name: "Drainage & Water Authority", short: "Drainage", budget: 180000, spent: 124620, fixed: 58 },
  ];

  // Recent closed repairs and what each one cost. paidBy: budget, or campaign (municipality share + residents)
  const REPAIRS = [
    { report: "RN-2025-0401", title: "Sinkhole by the Irbid Camp school", dept: "roads", area: "Irbid Camp", cost: 4950, paidBy: "budget", closed: "Oct 21", days: 6 },
    { report: "RN-2025-0388", title: "Collapsed storm drain cover", dept: "drainage", area: "Al-Manara", cost: 3720, paidBy: "budget", closed: "Oct 24", days: 4 },
    { report: "RN-2025-0331", title: "Pedestrian island on Al-Hashemi St", dept: "roads", area: "Downtown", cost: 1390, paidBy: "campaign", municipality: 500, residents: 890, closed: "Sep 30", days: 21 },
    { report: "RN-2025-0409", title: "Streetlight cluster dark", dept: "lighting", area: "Al-Andalus", cost: 1180, paidBy: "budget", closed: "Oct 26", days: 3 },
    { report: "RN-2025-0360", title: "Wheelchair ramp at the health centre", dept: "roads", area: "Bayt Ras", cost: 900, paidBy: "campaign", municipality: 300, residents: 600, closed: "Oct 29", days: 9 },
    { report: "RN-2025-0371", title: "Damaged curb ramp rebuilt", dept: "roads", area: "Downtown", cost: 860, paidBy: "budget", closed: "Oct 18", days: 5 },
    { report: "RN-2025-0412", title: "Pothole on University St", dept: "roads", area: "Al-Nuzha", cost: 640, paidBy: "budget", closed: "Oct 30", days: 2 },
    { report: "RN-2025-0344", title: "Blocked storm drain by Emaar Irbid Park", dept: "drainage", area: "Emaar Irbid Park", cost: 410, paidBy: "budget", closed: "Oct 15", days: 3 },
    { report: "RN-2025-0352", title: "Street lamp replaced", dept: "lighting", area: "Bayt Ras", cost: 340, paidBy: "budget", closed: "Oct 27", days: 2 },
    { report: "RN-2025-0390", title: "Fallen branches on the bike lane", dept: "parks", area: "Al-Nuzha", cost: 230, paidBy: "budget", closed: "Oct 22", days: 1 },
    { report: "RN-2025-0368", title: "Speed limit sign replaced", dept: "roads", area: "Emaar Irbid Park", cost: 180, paidBy: "budget", closed: "Oct 19", days: 2 },
    { report: "RN-2025-0385", title: "Overflowing bins at King Abdullah II Park", dept: "sanitation", area: "King Abdullah II Park", cost: 95, paidBy: "budget", closed: "Oct 28", days: 1 },
  ];

  const sum = (list, f = (x) => x) => list.reduce((n, x) => n + f(x), 0);
  const money = (n) => `${Math.round(n).toLocaleString("en")} JOD`;
  const pct = (a, b) => Math.round((a / b) * 100);
  const dept = (key) => DEPARTMENTS.find((d) => d.key === key);

  const totals = () => {
    const budget = sum(DEPARTMENTS, (d) => d.budget);
    const spent = sum(DEPARTMENTS, (d) => d.spent);
    const fixed = sum(DEPARTMENTS, (d) => d.fixed);
    const pace = sum(MONTHLY.slice(-3)) / 3; // the last three months
    const forecast = spent + pace * MONTHS_LEFT;
    return { budget, spent, left: budget - spent, used: pct(spent, budget), fixed, avg: spent / fixed, pace, forecast, plan: budget / 12 };
  };
  // Each department's year-end forecast at its own monthly pace so far
  const deptForecast = (d) => d.spent + (d.spent / MONTHLY.length) * MONTHS_LEFT;
  const risks = () => DEPARTMENTS.map((d) => ({ ...d, forecast: deptForecast(d), over: deptForecast(d) - d.budget, used: pct(d.spent, d.budget), avg: d.spent / d.fixed }))
    .sort((a, b) => b.over - a.over);
  const campaigns = () => {
    const F = window.RoadNaFunding;
    if (!F) return { list: [], residents: 0, municipality: 0, donors: 0 };
    const list = F.CAMPAIGNS;
    return { list, residents: sum(list, (c) => c.residents), municipality: sum(list, (c) => c.municipality), donors: sum(list, (c) => c.donors),
      short: list.filter((c) => c.status === "short"), choosing: list.filter((c) => c.status === "choosing"), open: list.filter((c) => c.status === "open") };
  };

  window.RoadNaFinance = { MONTHS, MONTHLY, DEPARTMENTS, REPAIRS, MONTHS_LEFT, sum, money, pct, dept, totals, risks, campaigns };
})();
