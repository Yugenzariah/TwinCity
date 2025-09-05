document.addEventListener("DOMContentLoaded", () => {
  // --- create map once ---
  const map = L.map("map", { zoomControl: true }).setView([-41.3, 173.25], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const statusEl = document.getElementById("status");
  const setStatus = (m) => (statusEl.textContent = m);

  // --- load parcel and draw it ---
  (async function loadParcel() {
    try {
      setStatus("Loading parcel…");
      const res = await fetch(`/api/parcels?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API /api/parcels failed (${res.status})`);
      const parcelDoc = await res.json();

      const layer = L.geoJSON(parcelDoc.geojson, {
        style: { color: "#009688", weight: 3, fillColor: "#4DB6AC", fillOpacity: 0.25 }
      }).addTo(map);

      map.fitBounds(layer.getBounds(), { padding: [20, 20] });

      const areaSqm = parcelDoc.areaSqm ? parcelDoc.areaSqm.toFixed(0) : "—";
      layer.bindPopup(`<b>Parcel</b><br>Zone: ${parcelDoc.zone || "—"}<br>Area: ${areaSqm} m²`);
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

  // --- POST /api/scenarios ---
  const heightEl = document.getElementById("height");
  const footprintEl = document.getElementById("footprint");
  const setbackEl = document.getElementById("setback");
  const resultEl = document.getElementById("result");
  const btn = document.getElementById("check");

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const payload = {
      heightM: parseFloat(heightEl.value),
      footprintSqm: parseFloat(footprintEl.value),
      minSetbackM: parseFloat(setbackEl.value)
    };

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
      const header = r.allOK ? "✅ PASS" : "❌ FAIL";
      const cls = r.allOK ? "pass" : "fail";
      resultEl.className = cls;
      resultEl.textContent =
        `${header}
Height: ${r.heightOK ? "Pass" : "Fail"}
Coverage: ${r.coverageOK ? "Pass" : "Fail"}
Setback: ${r.setbackOK ? "Pass" : "Fail"}${
          r.notes?.length ? `\n\nNotes:\n- ${r.notes.join("\n- ")}` : ""}`;
    } catch (err) {
      console.error(err);
      resultEl.textContent = "Network error. Check server.";
      resultEl.className = "fail";
    }
  });
});