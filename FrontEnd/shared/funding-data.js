"use strict";

// Sample funding campaigns for the preview (residents donating to repairs the budget cannot cover).
// The rules, in order:
// 1. A reviewer requests funding with a cost estimate. Critical repairs are always paid from the budget.
// 2. The manager approves: target, deadline and any municipality share.
// 3. Residents donate. The last gift is capped at what is still needed, so a campaign never over-collects.
// 4. Target met: the report is funded and goes to the front of Review & assign.
// 5. Short at the deadline: the manager has a few days to cover the rest (the recommended path).
// 6. If the municipality cannot cover it, each donor chooses: a refund, or moving the gift to another open
//    campaign. A donor who does not choose in time is refunded.
// 7. After the repair, money left over (the work cost less) goes back to the donors' choice the same way.
// ASP.NET will hold the money in an earmarked municipal account through a payment provider.
(() => {
  const CAMPAIGNS = [
    { id: "CF-2026-014", report: "RN-2025-0392", title: "Safe playground surface at King Abdullah II Park", place: "King Abdullah II Park", dept: "Parks Department",
      why: "The rubber surface under the swings is torn. Replacing it is beyond this year's parks budget.",
      target: 3500, municipality: 1000, residents: 1140, donors: 63, status: "open", daysLeft: 9 },
    { id: "CF-2026-012", report: "RN-2025-0381", title: "Shade and benches at the Al-Nuzha bus stop", place: "University St, Al-Nuzha", dept: "Roads Department",
      why: "Students wait in full sun. The roads budget covers the pavement, not the shelter.",
      target: 1800, municipality: 0, residents: 1460, donors: 88, status: "open", daysLeft: 4 },
    { id: "CF-2026-009", report: "RN-2025-0377", title: "Lights along the Al-Andalus footpath", place: "Al-Andalus footpath", dept: "Lighting Division",
      why: "Six new poles for a dark path near the school. Not in this year's lighting plan.",
      target: 2400, municipality: 600, residents: 920, donors: 47, status: "short", daysLeft: -2, decideDays: 5 },
    { id: "CF-2026-006", report: "RN-2025-0350", title: "Shade trees on the Bayt Ras school road", place: "Bayt Ras", dept: "Parks Department",
      why: "Twenty trees with watering for the first year.",
      target: 1200, municipality: 0, residents: 610, donors: 39, status: "choosing", daysLeft: -6, chooseDays: 12, choices: { refund: 9, moved: 14, undecided: 16 } },
    { id: "CF-2026-004", report: "RN-2025-0360", title: "Wheelchair ramp at the Bayt Ras health centre", place: "Health centre, Bayt Ras", dept: "Roads Department",
      why: "The entrance has three steps and no ramp.",
      target: 900, municipality: 300, residents: 600, donors: 52, status: "funded", daysLeft: -1 },
    { id: "CF-2026-002", report: "RN-2025-0331", title: "Pedestrian island on Al-Hashemi St", place: "Al-Hashemi St, Downtown", dept: "Roads Department",
      why: "A safe stop halfway across the busiest crossing downtown.",
      target: 1500, municipality: 500, residents: 1000, donors: 71, status: "done", daysLeft: -40, spent: 1390, leftover: 110 },
  ];
  const REQUESTS = [
    { id: "FR-031", report: "RN-2025-0424", title: "Cracked pavement outside the clinic", place: "Health centre entrance, Bayt Ras", dept: "Roads Department",
      estimate: 2200, by: "Hala Bani Yaseen", ago: "Yesterday", reason: "Full slab replacement. The Bayt Ras roads budget is spent until January." },
  ];
  // The signed-in resident's own gifts (Lina Obeidat in the preview).
  const MINE = [
    { campaign: "CF-2026-014", amount: 10, when: "Oct 28", status: "held" },
    { campaign: "CF-2026-006", amount: 15, when: "Oct 2", status: "choose" },
    { campaign: "CF-2026-002", amount: 20, when: "Sep 12", status: "used" },
  ];
  const STATUS = {
    requested: { label: "Waiting for approval", tone: "submitted" },
    open: { label: "Open for donations", tone: "assigned" },
    short: { label: "Short of target", tone: "progress" },
    covered: { label: "Covered by the municipality", tone: "resolved" },
    choosing: { label: "Donors choosing", tone: "progress" },
    funded: { label: "Funded", tone: "resolved" },
    done: { label: "Repaired", tone: "resolved" },
  };
  const raised = (c) => c.municipality + c.residents;
  const remaining = (c) => Math.max(0, c.target - raised(c));
  const pct = (c) => Math.min(100, Math.round((raised(c) / c.target) * 100));
  const money = (n) => `${Number(n).toLocaleString("en")} JOD`;
  const find = (id) => CAMPAIGNS.find((c) => c.id === id);
  window.RoadNaFunding = { CAMPAIGNS, REQUESTS, MINE, STATUS, raised, remaining, pct, money, find };
})();
