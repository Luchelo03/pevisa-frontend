let modal;
let map;
let layerRoute;
let markerOrigen;
let markerDestino;

const tbody = document.getElementById("tbodyRutas");
const alertBox = document.getElementById("alertBox");
const btnRefrescar = document.getElementById("btnRefrescar");

const mDespachoId = document.getElementById("mDespachoId");
const mResumen = document.getElementById("mResumen");
const mDetalle = document.getElementById("mDetalle");
const mPuntos = document.getElementById("mPuntos");

function showAlert(type, message) {
  alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

function badgeEstado(estado) {
  const s = (estado || "").toUpperCase();
  const cls =
    s === "PENDIENTE" ? "secondary" :
    s === "EN_RUTA" ? "warning" :
    s === "ENTREGADO" ? "success" :
    "info";
  return `<span class="badge bg-${cls}">${s || "N/A"}</span>`;
}

function renderTabla(rows) {
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Sin despachos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="fw-semibold">#${r.despacho_id}</td>
      <td>${r.descripcion_resumen || ""}</td>
      <td>
        <div class="fw-semibold">${r.origen_alias}</div>
        <div class="small text-muted">${r.origen_distrito} - ${r.origen_direccion}</div>
      </td>
      <td>
        <div class="fw-semibold">${r.destino_alias}</div>
        <div class="small text-muted">${r.destino_distrito} - ${r.destino_direccion}</div>
      </td>
      <td>${badgeEstado(r.estado)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-dark" data-action="map" data-id="${r.despacho_id}">
          Ver mapa
        </button>
      </td>
    </tr>
  `).join("");
}

async function cargarRutas() {
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Cargando...</td></tr>`;
    const res = await fetch(`${window.API_BASE_URL}/api/despachos`);
    const data = await res.json();
    renderTabla(data);
  } catch (err) {
    showAlert("danger", `Error cargando rutas: ${err}`);
  }
}

function initMapIfNeeded() {
  if (map) return;

  map = L.map("map");
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  layerRoute = L.geoJSON(null).addTo(map);
}

function clearMap() {
  if (layerRoute) layerRoute.clearLayers();
  if (markerOrigen) map.removeLayer(markerOrigen);
  if (markerDestino) map.removeLayer(markerDestino);
  markerOrigen = null;
  markerDestino = null;
}

async function drawRouteOSRM(origen, destino) {
  // OSRM espera lon,lat
  const url = `https://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("OSRM no devolvió ruta");
    }

    const geo = data.routes[0].geometry; // GeoJSON LineString
    layerRoute.addData({
      type: "Feature",
      properties: {},
      geometry: geo
    });

    const bounds = layerRoute.getBounds();
    map.fitBounds(bounds, { padding: [30, 30] });
  } catch (e) {
    // fallback: línea recta
    const latlngs = [ [origen.lat, origen.lng], [destino.lat, destino.lng] ];
    const poly = L.polyline(latlngs);
    poly.addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [30, 30] });
  }
}

function renderDetalle(detalle) {
  if (!detalle || detalle.length === 0) {
    mDetalle.innerHTML = `<li class="list-group-item text-muted">Sin productos</li>`;
    return;
  }

  mDetalle.innerHTML = detalle.map(x => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold">${x.nombre}</div>
        <div class="small text-muted">${x.numero_serial}</div>
      </div>
      <span class="badge bg-primary rounded-pill">${x.cantidad}</span>
    </li>
  `).join("");
}

async function abrirMapa(despachoId) {
  try {
    const res = await fetch(`${window.API_BASE_URL}/api/despachos/${despachoId}`);
    const data = await res.json();

    if (!res.ok) {
      showAlert("danger", data.message || "No se pudo cargar el despacho");
      return;
    }

    const c = data.cabecera;
    const det = data.detalle;

    mDespachoId.textContent = `#${c.despacho_id}`;
    mResumen.textContent = c.descripcion_resumen || "";
    renderDetalle(det);

    const origen = {
      lat: Number(c.origen_latitud),
      lng: Number(c.origen_longitud)
    };
    const destino = {
      lat: Number(c.destino_latitud),
      lng: Number(c.destino_longitud)
    };

    mPuntos.innerHTML = `
      <div class="mb-2"><b>Origen:</b> ${c.origen_alias} (${origen.lat.toFixed(6)}, ${origen.lng.toFixed(6)})</div>
      <div><b>Destino:</b> ${c.destino_alias} (${destino.lat.toFixed(6)}, ${destino.lng.toFixed(6)})</div>
    `;

    modal.show();

    // Importante: Leaflet necesita que el modal ya esté visible para calcular tamaños
    setTimeout(async () => {
      initMapIfNeeded();
      clearMap();

      markerOrigen = L.marker([origen.lat, origen.lng]).addTo(map).bindPopup("Origen").openPopup();
      markerDestino = L.marker([destino.lat, destino.lng]).addTo(map).bindPopup("Destino");

      await drawRouteOSRM(origen, destino);
    }, 250);

  } catch (err) {
    showAlert("danger", `Error abriendo mapa: ${err}`);
  }
}

// Delegación: click "Ver mapa"
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.action === "map") {
    abrirMapa(btn.dataset.id);
  }
});

btnRefrescar.addEventListener("click", cargarRutas);

document.addEventListener("DOMContentLoaded", () => {
  modal = new bootstrap.Modal(document.getElementById("mapModal"));
  cargarRutas();

  // Fix extra: cuando se abre el modal, Leaflet a veces necesita invalidateSize
  const modalEl = document.getElementById("mapModal");
  modalEl.addEventListener("shown.bs.modal", () => {
    if (map) map.invalidateSize();
  });
});
