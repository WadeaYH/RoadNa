"use strict";

// Presentation only. Everything here is UI feedback on the form: the AI panel shows sample
// suggestions per category, previews use temporary in-memory object URLs, and the map pin is
// a visual marker. ASP.NET and the AI service will supply real values and save the report.
const form = document.querySelector("#report-form");
const stepper = document.querySelector("#stepper");
const description = document.querySelector("#description");
const charCount = document.querySelector("#char-count");
const address = document.querySelector("#address");
const photos = document.querySelector("#photos");
const dropzone = document.querySelector("#dropzone");
const previews = document.querySelector("#previews");
const pickMap = window.RoadNaMap?.create(document.querySelector("#pick-map"), { zoom: 15, label: "Map of Irbid. Click to drop the report pin, or use Drop pin at map centre." });
let pin = null;
const coords = document.querySelector("#coords");
const locate = document.querySelector("#locate-btn");
const aiPanel = document.querySelector(".ai-panel");
const state = { category: false, details: false, photo: false, location: false };
const urls = new Map();

const mark = (key, done) => {
  state[key] = done;
  stepper.querySelector(`[data-step="${key}"]`).classList.toggle("is-done", done);
};

// Step 1: category + sample AI suggestion
const PRIORITY = { high: "High", medium: "Medium", low: "Low", critical: "Critical" };
form.querySelectorAll('input[name="category"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const { label, priority, dept, conf } = radio.dataset;
    document.querySelector("#ai-category").textContent = label;
    document.querySelector("#ai-priority").innerHTML = `<span class="priority priority--${priority}">${PRIORITY[priority]}</span>`;
    document.querySelector("#ai-dept").textContent = dept;
    document.querySelector("#ai-conf").textContent = `${conf}% match`;
    document.querySelector("#ai-bar").style.transform = `scaleX(${Number(conf) / 100})`;
    document.querySelector("#ai-state").textContent = "Suggested";
    aiPanel.classList.add("is-live");
    mark("category", true);
  });
});

// Step 2: description counter
description.addEventListener("input", () => {
  charCount.textContent = String(description.value.length);
  mark("details", description.value.trim().length >= 10);
});

// Step 3: photo previews (object URLs live only in this tab)
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
  mark("photo", urls.size > 0);
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

// Step 4: location pin on the real map. Coordinates are shown; no address lookup is made.
const fmt = new Intl.NumberFormat("en", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
const showPin = (latlng) => {
  coords.lastChild.textContent = `Pinned at ${fmt.format(latlng.lat)}° N, ${fmt.format(latlng.lng)}° E. Drag the pin to adjust.`;
  if (!address.value.trim()) address.value = `Pinned on map (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
  mark("location", address.value.trim().length > 0);
};
const placePin = (latlng) => {
  if (!pickMap) return;
  if (!pin) {
    pin = window.RoadNaMap.pin(pickMap, { lat: latlng.lat, lng: latlng.lng, tone: "amber", icon: "i-place", label: "Report location. Drag to adjust." });
    pin.dragging?.enable();
    pin.on("dragend", () => showPin(pin.getLatLng()));
  } else {
    pin.setLatLng(latlng);
  }
  showPin(latlng);
};
pickMap?.on("click", (event) => placePin(event.latlng));
locate.addEventListener("click", () => { if (pickMap) placePin(pickMap.getCenter()); });
address.addEventListener("input", () => mark("location", Boolean(pin) && address.value.trim().length > 0));

// Entrance
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".stepper__item").forEach((item, i) => {
    item.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
      duration: 400, delay: 80 * i, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards",
    });
  });
}
