let modal;
let modoEdicion = false;
let idEditando = null;

const tbody = document.getElementById("tbodyClientes");
const alertBox = document.getElementById("alertBox");

const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");

const inputDniRuc = document.getElementById("dni_ruc");
const inputNombre = document.getElementById("nombre_razon_social");
const inputTel = document.getElementById("telefono");
const inputEmail = document.getElementById("email");

function showAlert(type, message) {
  alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

function limpiarFormulario() {
  inputDniRuc.value = "";
  inputNombre.value = "";
  inputTel.value = "";
  inputEmail.value = "";
}

function abrirModalNuevo() {
  modoEdicion = false;
  idEditando = null;
  document.getElementById("modalTitle").textContent = "Nuevo Cliente";
  limpiarFormulario();
  modal.show();
}

function abrirModalEditar(c) {
  modoEdicion = true;
  idEditando = c.cliente_id;
  document.getElementById("modalTitle").textContent = "Editar Cliente";
  inputDniRuc.value = c.dni_ruc || "";
  inputNombre.value = c.nombre_razon_social || "";
  inputTel.value = c.telefono || "";
  inputEmail.value = c.email || "";
  modal.show();
}

function renderTabla(data) {
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Sin clientes</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr>
      <td class="fw-semibold">${c.cliente_id}</td>
      <td>${c.dni_ruc ?? ""}</td>
      <td>${c.nombre_razon_social ?? ""}</td>
      <td>${c.telefono ?? ""}</td>
      <td>${c.email ?? ""}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${c.cliente_id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-action="del" data-id="${c.cliente_id}">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

async function cargarClientes() {
  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Cargando...</td></tr>`;
    const res = await fetch(`${window.API_BASE_URL}/api/clientes`);
    const data = await res.json();
    renderTabla(data);
  } catch (err) {
    showAlert("danger", `Error cargando clientes: ${err}`);
  }
}

function validarDniRuc(value) {
  const v = (value || "").trim();
  if (!v) return { ok: false, msg: "DNI/RUC es obligatorio." };

  if ((v.length === 8 || v.length === 11) && !/^[0-9]+$/.test(v)) {
    return { ok: false, msg: "DNI/RUC inválido (si es 8 u 11 dígitos debe ser numérico)." };
  }
  return { ok: true, value: v };
}

async function guardarCliente() {
  const dniCheck = validarDniRuc(inputDniRuc.value);
  if (!dniCheck.ok) {
    showAlert("warning", dniCheck.msg);
    return;
  }

  const nombre = inputNombre.value.trim();
  if (!nombre) {
    showAlert("warning", "Nombre/Razón social es obligatorio.");
    return;
  }

  const payload = {
    dni_ruc: dniCheck.value,
    nombre_razon_social: nombre,
    telefono: inputTel.value.trim() || null,
    email: inputEmail.value.trim() || null,
  };

  try {
    let res;
    if (!modoEdicion) {
      res = await fetch(`${window.API_BASE_URL}/api/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${window.API_BASE_URL}/api/clientes/${idEditando}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const out = await res.json();

    if (!res.ok) {
      showAlert("danger", out.message ? `${out.message} (${out.error ?? ""})` : "Error guardando");
      return;
    }

    showAlert("success", modoEdicion ? "Cliente actualizado ✅" : "Cliente creado ✅");
    modal.hide();
    await cargarClientes();
  } catch (err) {
    showAlert("danger", `Error guardando cliente: ${err}`);
  }
}

async function eliminarCliente(id) {
  if (!confirm(`¿Eliminar cliente ID ${id}?`)) return;

  try {
    const res = await fetch(`${window.API_BASE_URL}/api/clientes/${id}`, { method: "DELETE" });
    const out = await res.json();

    if (!res.ok) {
      showAlert("danger", out.message ? `${out.message} (${out.error ?? ""})` : "Error eliminando");
      return;
    }

    showAlert("success", "Cliente eliminado ✅");
    await cargarClientes();
  } catch (err) {
    showAlert("danger", `Error eliminando cliente: ${err}`);
  }
}

tbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "edit") {
    const res = await fetch(`${window.API_BASE_URL}/api/clientes/${id}`);
    const cli = await res.json();

    if (!res.ok) {
      showAlert("danger", cli.message || "No se pudo cargar el cliente");
      return;
    }
    abrirModalEditar(cli);
  }

  if (action === "del") {
    await eliminarCliente(id);
  }
});

btnNuevo.addEventListener("click", abrirModalNuevo);
btnGuardar.addEventListener("click", guardarCliente);

document.addEventListener("DOMContentLoaded", () => {
  modal = new bootstrap.Modal(document.getElementById("clienteModal"));
  cargarClientes();
});
