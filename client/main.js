let map, parcelLayer, ghostLayer;

document.addEventListener("DOMContentLoaded", () => {
  // --- create map ---
  map = L.map("map", { zoomControl: true }).setView([-41.3, 173.25], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const statusEl = document.getElementById("status");
  const setStatus = (m) => (statusEl.textContent = m);

  // --- load parcel ---
  (async function loadParcel() {
    try {
      setStatus("Loading parcel…");
      const res = await fetch(`/api/parcels?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API /api/parcels failed (${res.status})`);
      const parcelDoc = await res.json();

      parcelLayer = L.geoJSON(parcelDoc.geojson, {
        style: { color: "#009688", weight: 3, fillColor: "#4DB6AC", fillOpacity: 0.25 }
      }).addTo(map);

      map.fitBounds(parcelLayer.getBounds(), { padding: [20, 20] });

      const areaSqm = parcelDoc.areaSqm ? parcelDoc.areaSqm.toFixed(0) : "—";
      parcelLayer.bindPopup(`<b>Parcel</b><br>Zone: ${parcelDoc.zone || "—"}<br>Area: ${areaSqm} m²`);
      setStatus("Parcel loaded.");
    } catch (e) {
      console.error(e);
      setStatus("Failed to load parcel.");
    }
  })();

  // --- show rules ---
  (async function loadRules() {
    try {
      const res = await fetch("/api/rules");
      const rule = await res.json();
      const box = document.getElementById("rulesBox");
      box.innerHTML = `
        <b>Current Rules</b><br>
        Max height: <code>${rule.maxHeightM} m</code> ·
        Min setback: <code>${rule.minSetbackM} m</code> ·
        Max site coverage: <code>${rule.maxSiteCoveragePct}%</code>
      `;
    } catch (e) { console.warn("Couldn't load rules", e); }
  })();

  // --- inputs ---
  const heightEl = document.getElementById("height");
  const footprintEl = document.getElementById("footprint");
  const setbackEl = document.getElementById("setback");
  const resultEl = document.getElementById("result");
  const btn = document.getElementById("check");

  // --- draw ghost building ---
  function drawGhostBuilding(footprintSqm, setbackM) {
    if (!parcelLayer) return;

    const parcelGeo = parcelLayer.toGeoJSON().features
      ? parcelLayer.toGeoJSON().features[0]
      : parcelLayer.toGeoJSON();

    const inner = turf.buffer(parcelGeo, -setbackM, { units: "meters" });
    const innerGeom = inner.type === "FeatureCollection"
      ? inner.features[0]
      : inner;
    if (!innerGeom || !innerGeom.geometry) {
      console.warn("Inner buffer invalid or empty");
      return;
    }

    // centroid of inner parcel
    const centroid = turf.centroid(innerGeom);

    // square footprint for now
    const side = Math.sqrt(footprintSqm);
    const half = side / 2;

    // use turf.destination to move in meters, not degrees
    const topLeft = turf.destination(centroid, Math.sqrt(2) * half / 2, 315, { units: "meters" });
    const topRight = turf.destination(centroid, Math.sqrt(2) * half / 2, 45, { units: "meters" });
    const bottomRight = turf.destination(centroid, Math.sqrt(2) * half / 2, 135, { units: "meters" });
    const bottomLeft = turf.destination(centroid, Math.sqrt(2) * half / 2, 225, { units: "meters" });

    const rect = turf.polygon([[
      topLeft.geometry.coordinates,
      topRight.geometry.coordinates,
      bottomRight.geometry.coordinates,
      bottomLeft.geometry.coordinates,
      topLeft.geometry.coordinates
    ]]);
    console.log("Rect:", rect);

    // remove old ghost layer
    if (ghostLayer) map.removeLayer(ghostLayer);

    // add new ghost
    ghostLayer = L.geoJSON(rect, {
      style: { color: "red", weight: 2, fillColor: "orange", fillOpacity: 0.4 }
    }).addTo(map);

    console.log("Ghost layer added", ghostLayer);
    map.fitBounds(ghostLayer.getBounds(), { maxZoom: 17 });
  }

  // --- handle check button ---
  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const heightM = parseFloat(heightEl.value);
    const footprintSqm = parseFloat(footprintEl.value);
    const setbackM = parseFloat(setbackEl.value);

    // draw ghost rectangle
    drawGhostBuilding(footprintSqm, setbackM);

    // send POST to /api/scenarios
    const payload = { heightM, footprintSqm, minSetbackM: setbackM };
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        resultEl.textContent = `Request failed (${res.status}). ${txt}`;
        resultEl.className = "fail";
        return;
      }
      const data = await res.json();
      const r = data.results;
      const header = r.allOK ? "PASS" : "FAIL";
      const cls = r.allOK ? "pass" : "fail";
      resultEl.className = cls;
      resultEl.textContent =
        `${header}
Height: ${r.heightOK ? "Pass" : "Fail"}
Coverage: ${r.coverageOK ? "Pass" : "Fail"}
Setback: ${r.setbackOK ? "Pass" : "Fail"}${r.notes?.length ? `\n\nNotes:\n- ${r.notes.join("\n- ")}` : ""}`;
    } catch (err) {
      console.error(err);
      resultEl.textContent = "Network error. Check server.";
      resultEl.className = "fail";
    }
  });
});