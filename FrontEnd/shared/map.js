"use strict";

// Real map for every 2D map in the preview: Leaflet (shared/vendor/leaflet, BSD-2) with
// OpenStreetMap tiles, locked to Jordan and opening on Irbid. Tiles need an internet
// connection; the pins and their positions are sample data in real Irbid locations.
(() => {
  const L = window.L;
  const JORDAN = [[29.0, 34.8], [33.5, 39.4]];
  const IRBID = [32.5556, 35.85];
  const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Radial gradients for the heat layer. Browsers only paint them when they live inside the
  // same SVG as the path, so they are added to the map's own vector layer on first use.
  const HEAT = {
    hot: [["#ba1a1a", 0.85], ["#ea580c", 0.6], ["#f59e0b", 0]],
    warm: [["#ea580c", 0.75], ["#f59e0b", 0.48], ["#facc15", 0]],
    mild: [["#f59e0b", 0.65], ["#facc15", 0.38], ["#a3e635", 0]],
  };
  const heatDefs = (key) => {
    const stops = (list) => list.map(([color, opacity], i) => `<stop offset="${[0, 0.5, 1][i]}" stop-color="${color}" stop-opacity="${opacity}"/>`).join("");
    return `<defs class="rn-heat-defs">${Object.entries(HEAT).map(([name, list]) => `<radialGradient id="rn-heat-${key}-${name}">${stops(list)}</radialGradient>`).join("")}</defs>`;
  };

  const showOffline = (el) => {
    el.classList.add("rn-map--offline");
    if (el.querySelector(".rn-map__offline")) return;
    const note = document.createElement("p");
    note.className = "rn-map__offline";
    note.setAttribute("role", "status");
    note.textContent = "The street map needs an internet connection. Pins are still shown.";
    el.append(note);
  };

  function create(el, opts = {}) {
    if (!L || !el) { el?.classList.add("rn-map--offline"); return null; }
    const still = Boolean(opts.still);
    const map = L.map(el, {
      center: opts.center || IRBID,
      zoom: opts.zoom ?? 14,
      minZoom: opts.minZoom ?? 7,
      maxZoom: 18,
      maxBounds: JORDAN,
      maxBoundsViscosity: 1,
      zoomControl: false,
      scrollWheelZoom: opts.wheel ?? false,
      dragging: !still,
      touchZoom: !still,
      doubleClickZoom: !still,
      boxZoom: !still,
      keyboard: !still,
      zoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion,
    });
    map.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    let loaded = 0;
    let failed = 0;
    tiles.on("tileload", () => { loaded += 1; el.classList.remove("rn-map--offline"); el.querySelector(".rn-map__offline")?.remove(); });
    tiles.on("tileerror", () => { failed += 1; if (!loaded && failed >= 3) showOffline(el); });
    if (still) {
      // A still map is a picture: its attribution link stays visible but out of the tab order.
      el.querySelectorAll(".leaflet-control-attribution a").forEach((link) => { link.tabIndex = -1; });
    } else if (opts.label) {
      el.setAttribute("aria-label", opts.label);
    }
    if ("ResizeObserver" in window) new ResizeObserver(() => map.invalidateSize({ animate: false })).observe(el);
    return map;
  }

  function pin(map, { lat, lng, tone = "teal", icon = "", label = "", size = "md", interactive = true, className = "" }) {
    if (!map) return null;
    const small = size === "sm";
    const glyph = icon ? `<svg class="icon" width="15" height="15" aria-hidden="true" focusable="false"><use href="#${icon}"/></svg>` : "";
    const html = small ? `<span class="rn-dot rn-dot--${tone}"></span>` : `<span class="rn-pin rn-pin--${tone}">${glyph}</span>`;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({ className: `rn-marker ${className}`.trim(), html, iconSize: small ? [18, 18] : [36, 36], iconAnchor: small ? [9, 9] : [18, 18] }),
      interactive,
      keyboard: interactive,
      riseOnHover: interactive,
    }).addTo(map);
    const node = marker.getElement();
    if (node) {
      if (interactive) {
        node.setAttribute("role", "button");
        node.setAttribute("aria-label", label);
        node.title = label;
      } else {
        node.setAttribute("aria-hidden", "true");
      }
    }
    return marker;
  }

  function heat(map, { lat, lng, radius = 400, level = "warm", opacity = 0.8 }) {
    if (!map) return null;
    const key = L.stamp(map);
    const circle = L.circle([lat, lng], { radius, stroke: false, fillColor: `url(#rn-heat-${key}-${level})`, fillOpacity: opacity, className: "rn-heat" });
    circle.on("add", () => {
      const svg = circle.getElement()?.ownerSVGElement;
      if (svg && !svg.querySelector(".rn-heat-defs")) svg.insertAdjacentHTML("afterbegin", heatDefs(key));
    });
    return circle;
  }

  function ring(map, { lat, lng, radius = 260 }) {
    if (!map) return null;
    return L.circle([lat, lng], { radius, color: "#0e7c86", weight: 2, dashArray: "7 6", fill: false, interactive: false, className: "rn-ring" });
  }

  function fit(map, points, padding = 32, maxZoom = 16) {
    if (!map || !points.length) return;
    if (points.length === 1) { map.setView(points[0], maxZoom, { animate: false }); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom, animate: false });
  }

  // Declarative maps: <div class="rn-map" data-rn-map="still" data-zoom="15">
  //   <span data-pin data-lat=".." data-lng=".." data-tone="amber" data-label=".."></span></div>
  function auto() {
    document.querySelectorAll("[data-rn-map]").forEach((el) => {
      const pins = [...el.querySelectorAll("[data-pin]")].map((node) => ({
        lat: Number(node.dataset.lat), lng: Number(node.dataset.lng), tone: node.dataset.tone || "teal", label: node.dataset.label || "",
      }));
      el.replaceChildren();
      const still = el.dataset.rnMap === "still";
      const zoom = Number(el.dataset.zoom) || 15;
      const map = create(el, { still, zoom, center: pins[0] ? [pins[0].lat, pins[0].lng] : IRBID });
      pins.forEach((p) => pin(map, { ...p, size: "sm", interactive: !still }));
      if (pins.length > 1) fit(map, pins.map((p) => [p.lat, p.lng]), 26, zoom);
    });
  }

  window.RoadNaMap = { IRBID, JORDAN, create, pin, heat, ring, fit };
  auto();
})();
