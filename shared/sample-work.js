"use strict";

// Sample work orders shared by the field-team and supervisor previews. Nothing is saved:
// each page starts from this data, and changes last only until the page is reloaded.
(() => {
  const photo = (name) => `../../shared/samples/${name}.svg`;
  window.RoadNaWork = {
    municipality: "Greater Irbid Municipality",
    department: "Roads Department",
    supervisor: { name: "Eng. Rana Al-Khatib", initials: "RK" },
    team: {
      name: "Roads Team 4",
      vehicle: "Asphalt patch truck · 24-61873",
      leader: { name: "Omar Haddad", initials: "OH" },
      member: { name: "Khaled Al-Momani", initials: "KM" },
      members: ["Omar Haddad (team leader)", "Khaled Al-Momani", "Yousef Bani Hani"],
    },
    STATUS: {
      assigned: { label: "New task", tone: "submitted" },
      on_way: { label: "On the way", tone: "assigned" },
      arrived: { label: "On site", tone: "assigned" },
      in_progress: { label: "Working", tone: "progress" },
      sent_back: { label: "Sent back", tone: "critical" },
      checking: { label: "Waiting for check", tone: "validated" },
      approved: { label: "Approved", tone: "resolved" },
    },
    PRIORITY: { High: "high", Normal: "medium", Low: "low" },
    CHECKLIST: [
      "The before and after photos show the same spot.",
      "The problem is fully fixed in the after photo.",
      "The site is clean and safe for traffic and people.",
    ],
    orders: [
      {
        id: "WO-2026-0118", report: "RN-2026-0412", title: "Deep pothole in the right lane", category: "Roads & potholes",
        priority: "High", status: "assigned", place: "University St, next to Yarmouk University", area: "Al-Nuzha",
        lat: 32.5392, lng: 35.852, due: "Today, 3:00 pm", received: "Today, 8:12 am",
        citizen: { text: "Deep pothole in the right lane. Cars swerve around it and one hit the curb.", photo: photo("road-pothole") },
        before: [], after: [], notes: [],
        history: [{ at: "8:12 am", by: "System", text: "Report RN-2026-0412 received with a photo and pin." },
          { at: "8:14 am", by: "System", text: "Suggested category Roads & potholes, priority High (AI suggestion, simulated)." },
          { at: "8:40 am", by: "Eng. Rana Al-Khatib", text: "Accepted the report and assigned Roads Team 4." }],
      },
      {
        id: "WO-2026-0121", report: "RN-2026-0419", title: "Broken road edge by the bus stop", category: "Roads & potholes",
        priority: "Normal", status: "in_progress", place: "Al-Hashemi St, Downtown", area: "Downtown",
        lat: 32.5568, lng: 35.8536, due: "Tomorrow, 12:00 pm", received: "Yesterday, 4:30 pm",
        citizen: { text: "The asphalt edge is breaking away next to the bus stop.", photo: photo("road-crack") },
        before: [{ src: photo("road-crack"), by: "Khaled Al-Momani", at: "9:05 am", sample: true }], after: [],
        notes: [{ by: "Khaled Al-Momani", at: "9:07 am", text: "About 2 m of edge is loose. Cones placed." }],
        history: [{ at: "Yesterday 4:30 pm", by: "System", text: "Report RN-2026-0419 received." },
          { at: "Yesterday 5:10 pm", by: "Eng. Rana Al-Khatib", text: "Accepted and assigned Roads Team 4." },
          { at: "8:41 am", by: "Omar Haddad", text: "On the way." }, { at: "8:58 am", by: "Omar Haddad", text: "Arrived on site." },
          { at: "9:02 am", by: "Omar Haddad", text: "Started work." }],
      },
      {
        id: "WO-2026-0109", report: "RN-2026-0398", title: "Pothole near the school gate", category: "Roads & potholes",
        priority: "Normal", status: "sent_back", place: "Main road by the school, Bayt Ras", area: "Bayt Ras",
        lat: 32.5885, lng: 35.8632, due: "Today, 1:00 pm", received: "2 days ago",
        citizen: { text: "Wide pothole at the school gate. Children walk around it into the road.", photo: photo("road-pothole") },
        before: [{ src: photo("road-pothole"), by: "Omar Haddad", at: "Yesterday 10:20 am", sample: true }],
        after: [{ src: photo("road-crack"), by: "Yousef Bani Hani", at: "Yesterday 11:45 am", sample: true }],
        notes: [{ by: "Omar Haddad", at: "Yesterday 11:50 am", text: "Patched the main hole." }],
        sentBack: {
          by: "Eng. Rana Al-Khatib", at: "Yesterday 2:15 pm",
          reason: "The after photo still shows broken edges around the patch.",
          ai: { risk: "Medium", priority: "Normal", work: "Cut back the loose edges, seal the joint and take a new after photo from the same spot.", note: "Partial repair. The main hole is filled, but loose edges remain near a school gate, so the priority stays Normal." },
        },
        history: [{ at: "2 days ago", by: "System", text: "Report RN-2026-0398 received." },
          { at: "Yesterday 11:55 am", by: "Omar Haddad", text: "Submitted the work for checking." },
          { at: "Yesterday 2:15 pm", by: "Eng. Rana Al-Khatib", text: "Sent back for rework." }],
      },
      {
        id: "WO-2026-0102", report: "RN-2026-0385", title: "Cracked asphalt at the park entrance", category: "Roads & potholes",
        priority: "Low", status: "checking", place: "Emaar Irbid Park entrance", area: "Al-Manara",
        lat: 32.5386, lng: 35.8411, due: "Thursday", received: "3 days ago", submitted: "Today, 10:40 am",
        citizen: { text: "Long cracks across the entrance road to the park.", photo: photo("road-crack") },
        before: [{ src: photo("road-crack"), by: "Khaled Al-Momani", at: "9:50 am", sample: true }],
        after: [{ src: photo("road-sealed"), by: "Omar Haddad", at: "10:35 am", sample: true }],
        notes: [{ by: "Omar Haddad", at: "10:38 am", text: "Cracks sealed along 6 m. Road reopened." }],
        history: [{ at: "3 days ago", by: "System", text: "Report RN-2026-0385 received." },
          { at: "Today 10:40 am", by: "Omar Haddad", text: "Submitted the work for checking." }],
      },
      {
        id: "WO-2026-0095", report: "RN-2026-0371", title: "Pothole on the road to Irbid Camp", category: "Roads & potholes",
        priority: "Normal", status: "checking", place: "Near Irbid Camp, Al-Manara", area: "Al-Manara",
        lat: 32.5585, lng: 35.8478, due: "Tomorrow", received: "4 days ago", submitted: "Today, 9:15 am",
        citizen: { text: "Pothole in the middle of the lane, filling with water when it rains.", photo: photo("road-pothole") },
        before: [{ src: photo("road-pothole"), by: "Yousef Bani Hani", at: "8:20 am", sample: true }],
        after: [{ src: photo("road-patched"), by: "Omar Haddad", at: "9:10 am", sample: true }],
        notes: [{ by: "Omar Haddad", at: "9:12 am", text: "Hole cleaned, filled and rolled." }],
        history: [{ at: "4 days ago", by: "System", text: "Report RN-2026-0371 received." },
          { at: "Today 9:15 am", by: "Omar Haddad", text: "Submitted the work for checking." }],
      },
      {
        id: "WO-2026-0088", report: "RN-2026-0360", title: "Curb ramp rebuilt", category: "Roads & potholes",
        priority: "Normal", status: "approved", place: "Al-Hashemi St, Downtown", area: "Downtown",
        lat: 32.5569, lng: 35.8506, due: "Done", received: "6 days ago", approved: "Yesterday, 1:30 pm",
        citizen: { text: "The curb ramp is broken and wheelchairs cannot use it.", photo: photo("road-crack") },
        before: [{ src: photo("road-crack"), by: "Omar Haddad", at: "2 days ago", sample: true }],
        after: [{ src: photo("road-sealed"), by: "Omar Haddad", at: "2 days ago", sample: true }],
        notes: [], history: [{ at: "Yesterday 1:30 pm", by: "Eng. Rana Al-Khatib", text: "Approved. Report closed and archived." }],
      },
    ],
    find(id) { return this.orders.find((order) => order.id === id); },
    // Simulated AI reassessment after a rejected check: priority follows the remaining risk.
    reassess(order, reason) {
      const serious = /danger|unsafe|deep|collapse|hole|children|traffic/i.test(reason);
      const risk = serious ? "High" : order.priority === "Low" ? "Low" : "Medium";
      const priority = serious ? "High" : order.priority;
      return {
        risk, priority,
        work: "Finish the repair described in the supervisor's reason, then take a new after photo from the same spot as the before photo.",
        note: `Rework needed: ${reason.trim()} Remaining risk is ${risk.toLowerCase()}, so the suggested priority is ${priority}. Work already done does not lower the priority on its own.`,
      };
    },
  };
})();
