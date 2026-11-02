"use strict";

// Presentation only. Votes, follows and comments are visual states for the demo; ASP.NET
// will record them. Nothing is stored in the browser.
const toast = document.querySelector("#toast");
let toastTimer = null;
const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3000);
};

// Upvote
const voteButton = document.querySelector("#vote-btn");
const voteCount = document.querySelector("#vote-count");
const voteLabel = voteButton.querySelector(".vote-big__label");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
voteButton.addEventListener("click", () => {
  const on = voteButton.getAttribute("aria-pressed") !== "true";
  voteButton.setAttribute("aria-pressed", String(on));
  voteLabel.textContent = on ? "Voted" : "Upvote";
  // Keep the sample vote count fixed; the pressed state only previews the control.
  if (on && !reduceMotion) voteCount.animate([{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
});

// Follow
const followButton = document.querySelector("#follow-btn");
followButton.addEventListener("click", () => {
  const on = followButton.getAttribute("aria-pressed") !== "true";
  followButton.setAttribute("aria-pressed", String(on));
  followButton.querySelector("span").textContent = on ? "Following" : "Follow updates";
  showToast("Follow-button preview only. Notification preferences have not been saved.");
});

// Share (link text only; nothing is sent)
document.querySelector("#share-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast("Link copied to the clipboard.");
  } catch {
    showToast("Copy the address from your browser to share this report.");
  }
});

// Gallery thumbnails
const thumbs = [...document.querySelectorAll(".gallery__thumb")];
const caption = document.querySelector(".gallery__main figcaption");
const galleryArt = document.querySelector("#gallery-art");
const captions = ["Sample overview", "Sample pothole detail", "Sample crossing detail"];
const viewBoxes = ["0 0 640 360", "110 90 320 180", "380 0 260 146"];
thumbs.forEach((thumb, index) => {
  thumb.addEventListener("click", () => {
    thumbs.forEach((t) => {
      t.classList.toggle("is-active", t === thumb);
      t.setAttribute("aria-pressed", String(t === thumb));
    });
    caption.querySelector(".tag").textContent = captions[index];
    galleryArt.setAttribute("viewBox", viewBoxes[index]);
    galleryArt.setAttribute("aria-label", captions[index] + " of the illustrated incident");
  });
});

 // Comments are a backend action; the form remains a presentation preview.
const form = document.querySelector("#comment-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (form.reportValidity()) window.RoadNaUI.preview("Comments will be available when the service is connected. No comment has been posted.");
});

// ---- Report states ----
// The preview has one full sample (the pothole, in progress). Fixed and rejected reports from My reports
// open with ?id=..., which swaps in their text and the actions that state allows. ASP.NET will load the real report.
const SAMPLES = {
  "RN-2025-0371": { state: "fixed", title: "Damaged curb ramp rebuilt", place: "Al-Hashemi St, Downtown", reported: "Reported Oct 20, 9:40 am", fixed: "Fixed 3 days ago", category: "Walkways",
    text: "The curb ramp at the crossing was broken into pieces, so wheelchairs and prams had to use the road.", fixedNote: "Rebuilt with a new ramp and tactile paving. The supervisor checked the photos." },
  "RN-2025-0302": { state: "fixed", title: "Cracked sidewalk slab near bus stop", place: "Al-Nuzha bus stop", reported: "Reported Sep 15, 4:05 pm", fixed: "Fixed on Sep 24", category: "Walkways",
    text: "A tilted slab next to the bus stop trips people getting off the bus.", fixedNote: "The slab was replaced and levelled. The supervisor checked the photos." },
  "RN-2025-0344": { state: "fixed", rated: 4, title: "Blocked storm drain by Emaar Irbid Park", place: "Emaar Irbid Park", reported: "Reported Sep 10, 7:20 am", fixed: "Fixed on Sep 18", category: "Drainage",
    text: "The drain is full of leaves and the street floods after every rain.", fixedNote: "Cleared and flushed. The supervisor checked the photos." },
  "RN-2025-0288": { state: "rejected", title: "Faded crosswalk markings", place: "Al-Hashemi St", reported: "Reported Aug 30, 11:15 am", rejected: "Rejected on Sep 2", category: "Roads & Hazards",
    text: "The zebra crossing paint is almost gone, drivers do not see it at night.", reason: "This was merged with an earlier report of the same problem (RN-2025-0274), so it is handled there." },
};
const id = new URLSearchParams(window.location.search).get("id");
const sample = SAMPLES[id];
const el = (sel) => document.querySelector(sel);
const timelineItem = (cls, icon, title, meta) => `<li class="timeline__item ${cls}"><span class="timeline__dot">${icon ? `<svg class="icon" width="14" height="14" aria-hidden="true" focusable="false"><use href="#${icon}"/></svg>` : ""}</span><div><p class="timeline__title">${title}</p><p class="timeline__meta">${meta}</p></div></li>`;
if (sample) {
  document.title = `${sample.title} | RoadNa JO`;
  el("#report-title").textContent = sample.title;
  el("#report-place").textContent = sample.place;
  el("#report-date").textContent = sample.reported;
  el("#report-ref").textContent = id;
  el("#report-cat").textContent = el("#cat-tag").textContent = sample.category;
  el("#report-text").textContent = sample.text;
  el("#gallery").hidden = true;
  el("#flag-list").hidden = true;
  el(".similar")?.closest("section")?.setAttribute("hidden", "");
  // The discussion shows the municipality's closing message for this report, not the pothole sample's thread.
  const closing = sample.state === "fixed" ? `The repair is done and the supervisor checked it. ${sample.fixedNote}` : `We closed this report. ${sample.reason}`;
  const team = document.createElement("li");
  team.className = "comment";
  team.innerHTML = '<span class="avatar avatar--slate" aria-hidden="true">RN</span><div><p class="comment__who"><strong>RoadNa team</strong><span class="tag">Municipality</span><time></time></p><p></p></div>';
  team.querySelector("time").textContent = (sample.fixed || sample.rejected).replace(/^(Fixed|Rejected) (on )?/, "");
  team.querySelectorAll("p")[1].textContent = closing;
  el("#comments").replaceChildren(team);
  el("#talk-title .tab__count").textContent = "1";
  const chip = el("#status-chip"), pchip = el("#progress-chip");
  if (sample.state === "fixed") {
    chip.className = "chip chip--resolved"; chip.textContent = "Fixed";
    pchip.className = "chip chip--resolved"; pchip.textContent = sample.fixed;
    el("#progress-sub").textContent = "Step 3 of 3 · fixed and checked";
    el("#timeline").innerHTML = timelineItem("is-done", "i-done", "Received", sample.reported.replace("Reported ", ""))
      + timelineItem("is-done", "i-done", "In progress", "A team was assigned and did the repair")
      + timelineItem("is-done", "i-done", "Fixed", `${sample.fixed} · ${sample.fixedNote}`);
    // Rating and reopening are open now
    el("#rate-lock").hidden = true;
    el("#stars-locked").hidden = true;
    el("#rate-sub").textContent = sample.rated ? `You rated it ${sample.rated} out of 5. You can change it.` : "How good is the repair?";
    el("#rate-form").hidden = false;
    if (sample.rated) el(`#rate-form input[value="${sample.rated}"]`).checked = true;
    el("#reopen-btn").disabled = false;
  } else {
    chip.className = "chip chip--rejected"; chip.textContent = "Rejected";
    pchip.className = "chip chip--rejected"; pchip.textContent = sample.rejected;
    el("#progress-sub").textContent = "Not taken forward";
    el("#timeline").innerHTML = timelineItem("is-done", "i-done", "Received", sample.reported.replace("Reported ", ""))
      + timelineItem("is-current", "", "Rejected", `${sample.rejected} · ${sample.reason}`);
    el("#rate").hidden = true;
    el("#next-steps").hidden = false;
    el("#report-again").href = `../../resident/create-report/create-report.html?from=${encodeURIComponent(id)}`;
  }
}

el("#rate-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const stars = event.target.querySelector("input:checked")?.value;
  if (!stars) { showToast("Pick from 1 to 5 stars first."); return; }
  el("#rate-sub").textContent = `You rated it ${stars} out of 5. You can change it.`;
  showToast(`Thank you. You rated the repair ${stars} out of 5 (preview, not saved).`);
});
const reopenForm = el("#reopen-form");
el("#reopen-btn").addEventListener("click", () => { reopenForm.hidden = false; el("#reopen-btn").hidden = true; el("#reopen-why").focus(); });
el("#reopen-cancel").addEventListener("click", () => { reopenForm.hidden = true; el("#reopen-btn").hidden = false; el("#reopen-btn").focus(); });
reopenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!reopenForm.reportValidity()) return;
  const chip = el("#status-chip");
  chip.className = "chip chip--progress"; chip.textContent = "In progress";
  const pchip = el("#progress-chip");
  pchip.className = "chip chip--progress"; pchip.textContent = "Reopened today";
  el("#progress-sub").textContent = "Reopened · a supervisor will check it again";
  el("#timeline").insertAdjacentHTML("beforeend", timelineItem("is-current", "i-history", "Reopened by you", `Today · ${el("#reopen-why").value.trim().replace(/[<>&]/g, "")}`));
  reopenForm.hidden = true;
  el("#rate").querySelector(".rate").insertAdjacentHTML("beforeend", "<p>Reopened. The supervisor of the team that did the repair will look at it again and can send the team back.</p>");
  el("#rate-form").hidden = true;
  showToast("Report reopened (preview, not saved). It goes back to the supervisor.");
});
el("#ask-why").addEventListener("click", () => { window.setTimeout(() => el("#comment-text").focus(), 0); });
