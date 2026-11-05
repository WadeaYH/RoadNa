"use strict";

// Field team task page (main flow steps 5–10). Sample data from shared/sample-work.js.
// Photos use temporary object URLs and never leave the device; nothing is saved.
const W = window.RoadNaWork;
const params = new URLSearchParams(window.location.search);
const signedIn = window.RoadNaAccess?.role;
const role = params.get("as") ? (params.get("as") === "member" ? "member" : "leader") : signedIn === "team_member" ? "member" : "leader";
if (signedIn) document.getElementById("role-switch")?.setAttribute("hidden", "");
const me = role === "leader" ? W.team.leader : W.team.member;
const order = W.find(params.get("wo")) || W.orders[0];
// Keep rejected evidence visible, but it cannot satisfy this round of rework.
const rejectedAfterPhotos = new Set(order.sentBack ? order.after : []);
const $ = (id) => document.getElementById(id);
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const icon = (id, size = 16) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
const clock = () => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date()).toLowerCase();
const urls = [];
window.addEventListener("pagehide", () => urls.forEach((url) => URL.revokeObjectURL(url)));

// Role preview and links keep the chosen role.
$("role-name").textContent = role === "leader" ? "Team leader" : "Team member";
$("role-switch").href = `?wo=${order.id}&as=${role === "leader" ? "member" : "leader"}`;
$("role-switch").setAttribute("aria-label", `Preview role: ${role === "leader" ? "team leader" : "team member"}. Switch role`);
["home-link", "back-link"].forEach((id) => { $(id).href = `../../team/tasks/tasks.html?as=${role}`; });

// Static facts.
document.title = `${order.title} | RoadNa JO Field Team`;
$("t-id").textContent = order.id;
$("t-report").textContent = order.report;
$("t-title").textContent = order.title;
$("t-priority").textContent = `${order.priority} priority`;
$("t-priority").className = `priority priority--${W.PRIORITY[order.priority]}`;
$("t-place").textContent = `${order.place} · ${order.area}`;
$("t-received").textContent = `Received ${order.received}`;
$("t-citizen-photo").src = order.citizen.photo;
$("t-citizen-text").textContent = `“${order.citizen.text}”`;
const map = window.RoadNaMap?.create($("t-map"), { still: true, zoom: 16, center: [order.lat, order.lng] });
window.RoadNaMap?.pin(map, { lat: order.lat, lng: order.lng, tone: "amber", icon: "i-construction", label: order.place, interactive: false });

// Directions: opens the phone's maps app. Only a link; nothing is sent from this page.
$("directions-btn").href = `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}&travelmode=driving`;
$("copy-place").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(`${order.place}, ${order.area}`); toast("Address copied."); }
  catch { toast("Select the address and copy it by hand."); }
});

// The next one-tap step for each status (steps 6–8 of the main flow).
const NEXT = {
  assigned: { to: "on_way", label: "On my way", icon: "i-navigation", log: "On the way.", hint: "Tap when the team leaves for the site." },
  on_way: { to: "arrived", label: "I've arrived", icon: "i-location-on", log: "Arrived on site.", hint: "Tap when you reach the location. Then take a before photo." },
  arrived: { to: "in_progress", label: "Start work", icon: "i-construction", log: "Started work.", hint: "Take at least one before photo first, so the supervisor can compare." },
  sent_back: { to: "in_progress", label: "Start rework", icon: "i-construction", log: "Started rework.", hint: "Read the supervisor's reason, then fix the remaining problem." },
};
const STEP_INDEX = { assigned: 0, on_way: 1, arrived: 2, in_progress: 3, sent_back: 3, checking: 4, approved: 5 };
const editable = () => ["arrived", "in_progress", "sent_back"].includes(order.status);

const log = (text) => order.history.push({ at: clock(), by: me.name, text });
const toast = (text) => {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3600);
};

function renderStatus() {
  const status = W.STATUS[order.status];
  $("t-status").textContent = status.label;
  $("t-status").className = `chip chip--${status.tone}`;
  $("t-due").textContent = order.status === "approved" ? `Approved ${order.approved}` : order.status === "checking" ? `Sent ${order.submitted}` : `Due ${order.due}`;
  const at = STEP_INDEX[order.status];
  [...$("t-steps").children].forEach((li, i) => {
    li.classList.toggle("is-done", i < at || order.status === "approved");
    li.classList.toggle("is-current", i === at && order.status !== "approved");
    li.textContent = i === 3 && (order.status === "sent_back" || order.sentBack) ? "Rework" : ["Received", "On the way", "On site", "Working", "Checked"][i];
  });

  const action = $("t-action");
  action.className = "task-action";
  const next = NEXT[order.status];
  if (next) {
    const blocked = order.status === "arrived" && !order.before.length;
    const photoButton = blocked ? `<label class="btn btn--outline btn--lg btn--block" data-action>${icon("i-photo-camera", 20)}Take the before photo<input class="sr-only" type="file" accept="image/png,image/jpeg" capture="environment" data-photo="before"></label>` : "";
    action.innerHTML = `${photoButton}<button class="btn ${blocked ? "btn--ghost" : "btn--primary"} btn--lg btn--block" type="button" id="next-btn" data-action${blocked ? ' aria-disabled="true"' : ""}>${icon(next.icon, 20)}${next.label}</button><p>${next.hint}</p>`;
    action.classList.toggle("is-sticky", !blocked);
    $("next-btn").addEventListener("click", () => {
      if (blocked) { toast("Take the before photo first."); return; }
      order.status = next.to;
      log(next.log);
      render();
      toast(`${W.STATUS[order.status].label}. The supervisor can see this.`);
      $("next-btn")?.focus();
    });
  } else if (order.status === "in_progress") {
    action.innerHTML = `<p><strong>Work in progress.</strong> Add after photos and notes below. ${role === "leader" ? "When it is done, submit it for the supervisor's check." : "The team leader submits the finished work."}</p>`;
  } else if (order.status === "returned") {
    action.classList.add("task-action--wait");
    action.innerHTML = `<p>${icon("i-schedule")} Returned to the reviewer: ${esc(order.returned)}. It leaves your list until it is given to a team again.</p>`;
  } else if (order.status === "checking") {
    action.classList.add("task-action--wait");
    action.innerHTML = `<p>${icon("i-schedule")} Sent to ${esc(W.supervisor.name)} for checking. You will see the result here.</p>`;
  } else {
    action.classList.add("task-action--done");
    action.innerHTML = `<p>${icon("i-check-circle")} Approved by the supervisor. The report is closed and the resident sees “Fixed”.</p>`;
  }

  // Sent-back reason and the AI reassessment suggestion.
  $("t-sentback").hidden = !order.sentBack || order.status === "approved";
  if (order.sentBack) {
    $("sb-by").textContent = `${order.sentBack.by}, ${order.sentBack.at}`;
    $("sb-reason").textContent = order.sentBack.reason;
    $("sb-risk").textContent = order.sentBack.ai.risk;
    $("sb-priority").textContent = order.sentBack.ai.priority;
    $("sb-work").textContent = order.sentBack.ai.work;
  }
}

function renderPhotos() {
  ["before", "after"].forEach((kind) => {
    const list = order[kind];
    $(`${kind}-list`).innerHTML = list.map((photo, i) => {
      const mine = photo.by === me.name && editable() && !photo.locked;
      return `<li class="photo"><img src="${esc(photo.src)}" alt="${kind === "before" ? "Before" : "After"} photo ${i + 1} by ${esc(photo.by)}" width="320" height="200">
        <span>${esc(photo.by)} · ${esc(photo.at)}${photo.sample ? " · sample" : ""}</span>
        ${mine ? `<button type="button" data-remove="${kind}:${i}" aria-label="Remove your ${kind} photo ${i + 1}">${icon("i-close-thin", 14)}</button>` : ""}</li>`;
    }).join("");
    const canAdd = kind === "before" ? editable() : ["in_progress", "sent_back"].includes(order.status);
    document.querySelector(`[data-kind="${kind}"] .evidence__add`).classList.toggle("is-locked", !canAdd);
    $(`${kind}-hint`).textContent = canAdd ? "You can remove your own photos until the job is submitted."
      : order.status === "checking" || order.status === "approved" ? "Locked after submission." : kind === "before" ? "Available when you arrive on site." : "Available once work has started.";
  });
}

function renderNotes() {
  $("notes").innerHTML = order.notes.map((note) => `<li>${esc(note.text)}<small>${esc(note.by)} · ${esc(note.at)}</small></li>`).join("");
  $("note-form").hidden = order.status === "approved";
}

function renderSubmit() {
  const hasAfterPhoto = order.after.some((photo) => !order.sentBack || !rejectedAfterPhotos.has(photo));
  const checks = [
    [order.before.length > 0, "At least one before photo"],
    [hasAfterPhoto, order.sentBack ? "A new after photo of the rework" : "At least one after photo"],
    [order.status === "in_progress", "Work has started"],
  ];
  $("submit-checks").innerHTML = checks.map(([ok, text]) => `<li class="${ok ? "is-ok" : ""}">${text}</li>`).join("");
  const ready = checks.every(([ok]) => ok);
  const button = $("submit-btn");
  let why = "";
  if (order.status === "checking" || order.status === "approved") why = "Already submitted.";
  else if (role !== "leader") why = `Only the team leader (${W.team.leader.name}) can submit the finished work.`;
  else if (order.sentBack && !hasAfterPhoto) why = "Add a new after photo of the rework before resubmitting.";
  else if (!ready) why = "Complete the items above to submit.";
  button.setAttribute("aria-disabled", String(Boolean(why)));
  button.closest(".submit-panel").hidden = order.status === "approved";
  $("submit-why").textContent = why;
}

function renderHistory() {
  $("history").innerHTML = order.history.slice().reverse()
    .map((item) => `<li><time>${esc(item.at)}</time><span><strong>${esc(item.by)}</strong> · ${esc(item.text)}</span></li>`).join("");
}

function render() { renderStatus(); renderPhotos(); renderNotes(); renderSubmit(); renderHistory(); }

// Photos: real files from the device (object URLs only) or the sample drawings.
const addPhoto = (kind, src, sample) => {
  order[kind].push({ src, by: me.name, at: clock(), sample });
  log(`Added a ${kind} photo.`);
  render();
};
document.addEventListener("change", (event) => {
  const input = event.target.closest?.("[data-photo]");
  if (!input) return;
  [...input.files].slice(0, 4).forEach((file) => {
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 10 * 1024 * 1024) { toast("Use a JPG or PNG photo under 10 MB."); return; }
    const url = URL.createObjectURL(file);
    urls.push(url);
    addPhoto(input.dataset.photo, url, false);
  });
  input.value = "";
});
document.querySelectorAll("[data-sample]").forEach((button) => button.addEventListener("click", () => {
  const kind = button.dataset.sample;
  const after = /crack/.test(order.citizen.photo) ? "road-sealed" : "road-patched";
  addPhoto(kind, kind === "before" ? order.citizen.photo : `../../../shared/samples/${after}.svg`, true);
}));
document.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (!remove) return;
  const [kind, index] = remove.dataset.remove.split(":");
  const [photo] = order[kind].splice(Number(index), 1);
  log(`Removed their own ${kind} photo (kept in the record).`);
  order.removed = (order.removed || []).concat({ ...photo, removedAt: clock() });
  render();
});

// Quick notes: one tap adds a ready phrase to the note box, so nobody has to type with gloves on.
document.querySelectorAll("[data-quick]").forEach((button) => button.addEventListener("click", () => {
  const box = $("note-text");
  box.value = box.value.trim() ? `${box.value.trim()} ${button.dataset.quick}` : button.dataset.quick;
  box.focus();
}));

// Team notes.
$("note-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("note-text").value.trim();
  if (!text) { $("note-text").focus(); return; }
  order.notes.push({ by: me.name, at: clock(), text });
  log("Added a note.");
  $("note-text").value = "";
  render();
});

// Step 10: the team leader submits the finished work for the supervisor's check.
$("submit-btn").addEventListener("click", () => {
  if ($("submit-btn").getAttribute("aria-disabled") === "true") { toast($("submit-why").textContent); return; }
  order.status = "checking";
  order.submitted = `today, ${clock()}`;
  order.before.forEach((p) => { p.locked = true; });
  order.after.forEach((p) => { p.locked = true; });
  log(`Submitted the work for checking by ${W.supervisor.name}.`);
  render();
  toast(`Sent to ${W.supervisor.name} for checking.`);
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

render();

// ---- A job the team cannot finish goes back to the reviewer (the leader decides) ----
const cantDialog = $("cant-dialog");
const showCant = () => { $("cant-wrap").hidden = !(role === "leader" && ["assigned", "on_way", "arrived", "in_progress", "sent_back"].includes(order.status)); };
$("cant-btn").addEventListener("click", () => cantDialog.showModal());
$("cant-cancel").addEventListener("click", () => cantDialog.close());
$("cant-form").addEventListener("submit", () => {
  const why = $("cant-form").elements.why.value;
  const note = $("cant-note").value.trim();
  order.status = "returned";
  order.returned = note ? `${why.toLowerCase()} (${note})` : why.toLowerCase();
  log(`Returned to the reviewer: ${order.returned}.`);
  render();
  showCant();
  toast("Returned to the reviewer (preview). They will give it to another team.");
});
showCant();
