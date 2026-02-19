const tbody = document.getElementById("tbodyReportes");
const alertBox = document.getElementById("alertBox");
const limitSelect = document.getElementById("limitSelect");
const btnRefrescar = document.getElementById("btnRefrescar");

let chart;

function showAlert(type, message) {
  alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString("es-PE", { style: "currency", currency: "PEN" });
}

function renderTabla(rows) {
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Sin data</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, idx) => `
    <tr>
      <td class="fw-semibold">${idx + 1}</td>
      <td>
        <div class="fw-semibold">${r.vendedor}</div>
        <div class="small text-muted">${r.dni_vendedor}</div>
      </td>
      <td class="text-end">${r.ventas_realizadas}</td>
      <td class="text-end">${formatMoney(r.total_venta)}</td>
      <td class="text-end fw-semibold">${formatMoney(r.utilidad_total)}</td>
    </tr>
  `).join("");
}

function renderChart(rows) {
  const labels = rows.map(r => r.vendedor);
  const values = rows.map(r => Number(r.utilidad_total || 0));

  const ctx = document.getElementById("chartUtilidad");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Utilidad total (PEN)",
        data: values
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => `S/ ${Number(value).toLocaleString("es-PE")}`
          }
        }
      }
    }
  });
}

async function cargarReportes() {
  try {
    const limit = limitSelect.value;
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Cargando...</td></tr>`;

    const res = await fetch(`${window.API_BASE_URL}/api/reportes/top-vendedores?limit=${limit}`);
    const data = await res.json();

    if (!res.ok) {
      showAlert("danger", data.message || "No se pudo cargar el reporte");
      return;
    }

    renderTabla(data);
    renderChart(data);
  } catch (err) {
    showAlert("danger", `Error cargando reportes: ${err}`);
  }
}

btnRefrescar.addEventListener("click", cargarReportes);
limitSelect.addEventListener("change", cargarReportes);

document.addEventListener("DOMContentLoaded", () => {
  cargarReportes();
});
