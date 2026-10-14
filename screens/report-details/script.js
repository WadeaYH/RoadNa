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
