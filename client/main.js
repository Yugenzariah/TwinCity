document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map", { zoomControl: true }).setView([-41.3, 173.25], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const statusEl = document.getElementById("status");
  const setStatus = (msg) => (statusEl.textContent = msg);

  (async function loadParcel() {
    try {
      setStatus("Loading parcel…");
      const res = await fetch("/api/parcels?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("API /api/parcels failed");
      const parcelDoc = await res.json();

      const layer = L.geoJSON(parcelDoc.geojson, {
        style: { color: "#009688", weight: 3, fillColor: "#4DB6AC", fillOpacity: 0.25 }
      }).addTo(map);

      map.fitBounds(layer.getBounds(), { padding: [20, 20] });

      const areaSqm = parcelDoc.areaSqm ? parcelDoc.areaSqm.toFixed(0) : "—";
      layer.bindPopup(`<b>Parcel</b><br>Zone: ${parcelDoc.zone || "—"}<br>Area: ${areaSqm} m²`);
      setStatus("Parcel loaded. Next: add inputs & POST to /api/scenarios.");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load parcel. Check /api/parcels.");
    }
  })();
});