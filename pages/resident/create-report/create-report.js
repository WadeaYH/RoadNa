"use strict";

// Presentation only. The form is a four-step wizard; the category is suggested from the
// description with a simple keyword match (the real AI service will replace it), previews use
// temporary in-memory object URLs, and the map pin is a visual marker. ASP.NET will save the report.
const form = document.querySelector("#report-form");
const stepper = document.querySelector("#stepper");
const steps = [...form.querySelectorAll(".wiz-step")];
const description = document.querySelector("#description");
const charCount = document.querySelector("#char-count");
const address = document.querySelector("#address");
const photos = document.querySelector("#photos");
const dropzone = document.querySelector("#dropzone");
const previews = document.querySelector("#previews");
const coords = document.querySelector("#coords");
const locate = document.querySelector("#locate-btn");
const catNote = document.querySelector("#cat-note");
const radios = [...form.querySelectorAll('input[name="category"]')];
const urls = new Map();
let pickMap = null;
let pin = null;
let current = 0;
let categoryPickedByUser = false;

// Steps
const mapReady = () => {
  if (pickMap || !window.RoadNaMap) return;
  pickMap = window.RoadNaMap.create(document.querySelector("#pick-map"), { zoom: 15, label: "Map of Irbid. Click to drop the report pin, or use Drop pin at map centre." });
  pickMap?.on("click", (event) => placePin(event.latlng));
};

const stepNames = ["Photo", "Place", "Details", "Send"];
const stepLabel = document.querySelector("#step-label");
const show = (index) => {
  current = index;
  stepLabel.textContent = `Step ${index + 1} of ${steps.length} · ${stepNames[index]}`;
  steps.forEach((step, i) => { step.hidden = i !== index; });
  stepper.querySelectorAll(".stepper__item").forEach((item, i) => {
    item.classList.toggle("is-current", i === index);
    item.classList.toggle("is-done", i < index);
  });
  if (steps[index].dataset.step === "place") { mapReady(); window.setTimeout(() => pickMap?.invalidateSize(), 60); }
  if (steps[index].dataset.step === "send") fillSummary();
  const heading = steps[index].querySelector("h2");
  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
};

const stepIsValid = () => {
  const fields = [...steps[current].querySelectorAll("input[required], textarea[required]")];
  const radioGroupMissing = steps[current].querySelector('input[name="category"]') && !radios.some((r) => r.checked);
  const bad = fields.find((field) => field.type !== "radio" && !field.checkValidity());
  if (bad) { bad.reportValidity(); return false; }
  if (radioGroupMissing) { radios[0].setCustomValidity("Choose the type of problem."); radios[0].reportValidity(); radios[0].setCustomValidity(""); return false; }
  return true;
};

form.querySelectorAll("[data-wiz]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.wiz === "back") { show(Math.max(0, current - 1)); return; }
    if (stepIsValid()) show(Math.min(steps.length - 1, current + 1));
  });
});

// Photos (object URLs live only in this tab)
const renderPreviews = () => {
  previews.innerHTML = "";
  urls.forEach((url, name) => {
    const item = document.createElement("li");
    item.className = "preview";
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Selected photo ${name}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove photo ${name}`);
    remove.innerHTML = "&times;";
    remove.addEventListener("click", () => {
      URL.revokeObjectURL(url);
      urls.delete(name);
      renderPreviews();
    });
    item.append(img, remove);
    previews.append(item);
  });
  previews.hidden = urls.size === 0;
};
const addFiles = (files) => {
  let rejected = false;
  [...files].forEach((file) => {
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024 || (!urls.has(file.name) && urls.size >= 3)) {
      rejected = true;
      return;
    }
    if (urls.has(file.name)) URL.revokeObjectURL(urls.get(file.name));
    urls.set(file.name, URL.createObjectURL(file));
  });
  renderPreviews();
  if (rejected) window.RoadNaUI.preview("Choose up to three JPG or PNG images, no larger than 10 MB each. Images are shown in this tab only and are not uploaded.");
};
window.addEventListener("pagehide", () => urls.forEach((url) => URL.revokeObjectURL(url)));
photos.addEventListener("change", () => { addFiles(photos.files); photos.value = ""; });
["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (e) => { e.preventDefault(); dropzone.classList.add("is-over"); }));
["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, (e) => { e.preventDefault(); dropzone.classList.remove("is-over"); }));
dropzone.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

// Place: pin on the real map. Coordinates are shown; no address lookup is made.
const fmt = new Intl.NumberFormat("en", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
let generatedAddress = null;
address.addEventListener("input", () => { generatedAddress = null; });
const showPin = (latlng) => {
  coords.lastChild.textContent = `Pinned at ${fmt.format(latlng.lat)}° N, ${fmt.format(latlng.lng)}° E. Drag the pin to adjust.`;
  if (!address.value.trim() || address.value === generatedAddress) {
    generatedAddress = `Pinned on map (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
    address.value = generatedAddress;
  }
};
function placePin(latlng) {
  if (!pickMap) return;
  if (!pin) {
    pin = window.RoadNaMap.pin(pickMap, { lat: latlng.lat, lng: latlng.lng, tone: "amber", icon: "i-place", label: "Report location. Drag to adjust." });
    pin.dragging?.enable();
    pin.on("dragend", () => showPin(pin.getLatLng()));
  } else {
    pin.setLatLng(latlng);
  }
  showPin(latlng);
}
locate.addEventListener("click", () => { mapReady(); if (pickMap) placePin(pickMap.getCenter()); });

// Details: description counter + a suggested category the resident can change
const KEYWORDS = [
  ["roads", /pothole|asphalt|crack|sinkhole|road|lane|crosswalk/i],
  ["light", /lamp|light|signal|dark|flicker|traffic light/i],
  ["sanitation", /trash|rubbish|garbage|bin|litter|dump|waste/i],
  ["parks", /tree|branch|park|garden|bench|playground/i],
  ["water", /drain|water|leak|flood|sewer|manhole/i],
  ["sidewalk", /sidewalk|pavement|curb|kerb|sign/i],
];
description.addEventListener("input", () => {
  charCount.textContent = String(description.value.length);
  if (categoryPickedByUser) return;
  const match = KEYWORDS.find(([, pattern]) => pattern.test(description.value));
  const radio = match && radios.find((r) => r.value === match[0]);
  if (radio) {
    radio.checked = true;
    catNote.textContent = `We picked "${radio.dataset.label}" from your description. Change it if that is not right.`;
    catNote.hidden = false;
  }
});
radios.forEach((radio) => radio.addEventListener("change", (event) => {
  if (event.isTrusted) { categoryPickedByUser = true; catNote.hidden = true; }
}));

// Send: summary of what the resident entered
const fillSummary = () => {
  const chosen = radios.find((r) => r.checked);
  document.querySelector("#sum-photos").textContent = urls.size ? `${urls.size} photo${urls.size > 1 ? "s" : ""}` : "None";
  document.querySelector("#sum-place").textContent = address.value.trim() || "-";
  document.querySelector("#sum-type").textContent = chosen ? chosen.dataset.label : "-";
  const text = description.value.trim();
  document.querySelector("#sum-desc").textContent = text.length > 140 ? `${text.slice(0, 140)}...` : text || "-";
};

// Entrance
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".stepper__item").forEach((item, i) => {
    item.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
      duration: 400, delay: 80 * i, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards",
    });
  });
}

// Sending a new report after one was rejected: say which one, so the reviewer sees the link.
const fromId = new URLSearchParams(window.location.search).get("from");
if (fromId && /^RN-\d{4}-\d{4}$/.test(fromId)) {
  const note = document.querySelector("#from-note");
  note.textContent = `New report about the same place as ${fromId}, which was rejected. Add what is different now, so the reviewer can tell.`;
  note.hidden = false;
}
