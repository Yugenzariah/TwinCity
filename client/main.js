let map, parcelLayer, ghostLayer;

document.addEventListener("DOMContentLoaded", () => {
  // Create the map
  map = L.map("map", { zoomControl: true }).setView([-41.3, 173.25], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  const statusEl = document.getElementById("status");
  const setStatus = (m) => (statusEl.textContent = m);

  // Loads parcel
  (async function loadParcel() {
    try {
      setStatus("Loading parcel…");
      const res = await fetch(`/api/parcels?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`API /api/parcels failed (${res.status})`);
      const parcelDoc = await res.json();

      parcelLayer = L.geoJSON(parcelDoc.geojson, {
        style: {
          color: "#009688",
          weight: 3,
          fillColor: "#4DB6AC",
          fillOpacity: 0.25,
        },
      }).addTo(map);

      map.fitBounds(parcelLayer.getBounds(), { padding: [20, 20] });

      const areaSqm = parcelDoc.areaSqm ? parcelDoc.areaSqm.toFixed(0) : "—";
      parcelLayer.bindPopup(
        `<b>Parcel</b><br>Zone: ${parcelDoc.zone || "—"}<br>Area: ${areaSqm} m²`
      );
      setStatus("Parcel loaded.");
    } catch (e) {
      console.error(e);
      setStatus("Failed to load parcel.");
    }
  })();

  // Shows the rules
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
    } catch (e) {
      console.warn("Couldn't load rules", e);
    }
  })();

  // Inputs
  const heightEl = document.getElementById("height");
  const footprintEl = document.getElementById("footprint");
  const setbackEl = document.getElementById("setback");
  const resultEl = document.getElementById("result");
  const btn = document.getElementById("check");

  // Draws the ghost building
  function drawGhostBuilding(footprintSqm, setbackM) {
    if (!parcelLayer) return;

    const parcelGeo = parcelLayer.toGeoJSON().features
      ? parcelLayer.toGeoJSON().features[0]
      : parcelLayer.toGeoJSON();

    const inner = turf.buffer(parcelGeo, -setbackM, { units: "meters" });
    const innerGeom =
      inner.type === "FeatureCollection" ? inner.features[0] : inner;
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
    const topLeft = turf.destination(centroid, (Math.sqrt(2) * half) / 2, 315, {
      units: "meters",
    });
    const topRight = turf.destination(centroid, (Math.sqrt(2) * half) / 2, 45, {
      units: "meters",
    });
    const bottomRight = turf.destination(
      centroid,
      (Math.sqrt(2) * half) / 2,
      135,
      { units: "meters" }
    );
    const bottomLeft = turf.destination(
      centroid,
      (Math.sqrt(2) * half) / 2,
      225,
      { units: "meters" }
    );

    const rect = turf.polygon([
      [
        topLeft.geometry.coordinates,
        topRight.geometry.coordinates,
        bottomRight.geometry.coordinates,
        bottomLeft.geometry.coordinates,
        topLeft.geometry.coordinates,
      ],
    ]);
    console.log("Rect:", rect);

    // remove old ghost layer
    if (ghostLayer) map.removeLayer(ghostLayer);

    // add new ghost
    ghostLayer = L.geoJSON(rect, {
      style: { color: "red", weight: 2, fillColor: "orange", fillOpacity: 0.4 },
    }).addTo(map);

    console.log("Ghost layer added", ghostLayer);
    map.fitBounds(ghostLayer.getBounds(), { maxZoom: 17 });
  }

  // handle check button
btn.addEventListener("click", async (e) => {
  e.preventDefault();

  const heightM = parseFloat(heightEl.value);
  const footprintSqm = parseFloat(footprintEl.value);
  const setbackM = parseFloat(setbackEl.value);

  // Draw ghost rectangle
  drawGhostBuilding(footprintSqm, setbackM);

  // Send a POST request to /api/scenarios
  const payload = { heightM, footprintSqm, minSetbackM: setbackM };
  try {
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      resultEl.textContent = `Request failed (${res.status}). ${txt}`;
      resultEl.className = "fail";
      return;
    }

    const data = await res.json();
    const r = data.results;

    // Update ghost building color based on validation
    if (ghostLayer) map.removeLayer(ghostLayer);

    ghostLayer = L.geoJSON(data.buildingGeojson, {
      style: {
        color: r.allOK ? "green" : "red",
        weight: 2,
        fillColor: r.allOK ? "#16a34a" : "#dc2626",
        fillOpacity: 0.4,
      },
    }).addTo(map);

    map.fitBounds(ghostLayer.getBounds(), { maxZoom: 17 });

    // Result text
    const header = r.allOK ? "PASS" : "FAIL";
    const cls = r.allOK ? "pass" : "fail";
    resultEl.className = cls;
    resultEl.textContent = `${header}
Height: ${r.heightOK ? "Pass" : "Fail"}
Coverage: ${r.coverageOK ? "Pass" : "Fail"}
Setback: ${r.setbackOK ? "Pass" : "Fail"}${
      r.notes?.length ? `\n\nNotes:\n- ${r.notes.join("\n- ")}` : ""
    }`;

    // Detect which rules failed
    const failedRules = [];
    if (!r.heightOK) failedRules.push("height");
    if (!r.coverageOK) failedRules.push("coverage");
    if (!r.setbackOK) failedRules.push("setback");

    // Store globally for Why button
    window.lastFailedRules = failedRules;

  } catch (err) {
    console.error(err);
    resultEl.textContent = "Network error. Check server.";
    resultEl.className = "fail";
  }
});

const whyBtn = document.getElementById("why");
const explainBox = document.getElementById("explanation");

whyBtn.addEventListener("click", async () => {
  explainBox.textContent = "Loading explanation…";

  const failedRules = window.lastFailedRules || [];
  const zone = "Residential";
  // If there are no failed rules, show positive message
  if (!failedRules.length) {
    explainBox.innerHTML = `
      <p style="color:green; font-weight:bold;">
        Your scenario complies with all planning rules.
      </p>
      <p>You can now proceed to submit your application to Nelson City Council for review.</p>
    `;
    return;
  }

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Why did my scenario fail?",
        zone,
        failedRules,
      }),
    });

    const data = await res.json();

    if (data.answers?.length) {
      explainBox.innerHTML = `
        <h4 style="margin-bottom:0.5em;">Explanation for Failed Criteria:</h4>
        ${data.answers
          .map(
            (a) => `
          <p><b>${a.section || "Rule"}:</b> ${a.text}</p>
          <small><i>Source: ${a.source || "NCC District Plan"}</i></small>
        `
          )
          .join("<hr>")}
      `;
    } else {
      explainBox.textContent = "No matching rules found.";
    }
  } catch (err) {
    console.error(err);
    explainBox.textContent = "Failed to load explanation.";
  }
});
});