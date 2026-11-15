/* ==========================================
   LÓGICA GENERAL DE LA APLICACIÓN - VALET PARKING
   ================-------------------------- */

let fotosCapturadas = [null, null, null, null, null, null];
let slotActual = null;
let streamCamara = null;

// URL fija y definitiva de la API de Google Apps Script
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbznDeCl75wwt8I3ocqPh6TkrAd_-KiqPfpFEWWkWDMp1RfNUHUAzuKPs3q1LnWguT_t_Q/exec';

// Limpieza automática de la memoria interna al actualizar el sistema
if (localStorage.getItem('api_version_limpia') !== 'v4') {
    localStorage.removeItem('autos_pendientes');
    localStorage.removeItem('autos_adentro');
    localStorage.setItem('api_version_limpia', 'v4');
}

// Mapa de cocheras oficial del hotel
const colA = ['A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1'];
const fila1 = ['B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1', 'K1', 'M1', 'L1'];
const fila2 = ['B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'I2', 'J2', 'K2', 'M2', 'L2'];
const fila3 = ['B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3', 'J3', 'K3', 'M3', 'L3'];
const fila4 = ['B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4', 'J4', 'K4', 'M4', 'L4'];

// Reloj en tiempo real
setInterval(() => {
    const ahora = new Date();
    document.getElementById('relojVivo').innerText = `📅 ${ahora.toLocaleDateString('es-AR')}  |  🕒 ${ahora.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
}, 1000);

function reiniciarApp() {
    if (confirm("⚠️ ¿Deseas limpiar la memoria local del celular y reiniciar los datos temporales?")) {
        localStorage.removeItem('autos_pendientes');
        localStorage.removeItem('autos_adentro');
        alert("🧹 Memoria limpia correctamente.");
        location.reload();
    }
}

function actualizarContadorPendientes() {
    const pendientes = JSON.parse(localStorage.getItem('autos_pendientes') || '[]');
    const badge = document.getElementById('badgePendientes');
    if (pendientes.length > 0) {
        badge.style.display = 'inline-block';
        badge.innerText = pendientes.length;
    } else {
        badge.style.display = 'none';
    }
}

function cambiarTab(tabName, element) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    element.classList.add('active');

    if (tabName === 'pendientes') {
        renderizarPendientes();
        renderizarPlanoCocheras();
    }
    if (tabName === 'adentro') {
        renderizarAdentro();
    }
}

/* ==========================================
   CÁMARA MÓVIL (6 FOTOS)
   ================-------------------------- */
async function abrirCamara(index) {
    slotActual = index;
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('videoPreview');

    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = streamCamara;
        modal.style.display = 'flex';
    } catch (err) {
        alert("No se pudo acceder a la cámara.");
    }
}

function cerrarCamara() {
    if (streamCamara) streamCamara.getTracks().forEach(t => t.stop());
    document.getElementById('cameraModal').style.display = 'none';
}

function capturarFoto() {
    const video = document.getElementById('videoPreview');
    const canvas = document.createElement('canvas');
    const maxWidth = 800;
    const scale = maxWidth / video.videoWidth;
    canvas.width = maxWidth;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    fotosCapturadas[slotActual] = dataUrl;
    document.getElementById(`slot-${slotActual}`).innerHTML = `<img src="${dataUrl}">`;
    cerrarCamara();
}

/* ==========================================
   PASO 1: GUARDAR INGRESO -> HOJA "Pendientes"
   ================-------------------------- */
async function guardarIngreso(e) {
    e.preventDefault();
    const ahora = new Date();
    
    const idUnico = "ID-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const fechaHoraIngreso = `${ahora.toLocaleDateString('es-AR')} ${ahora.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}`;

    const nuevoAuto = {
        idUnico: idUnico,
        accion: "ingreso_pendiente",
        fechaHoraIngreso: fechaHoraIngreso,
        dominio: document.getElementById('inputDominio').value.toUpperCase().trim(),
        marcaModelo: document.getElementById('inputMarcaModelo').value.trim(),
        valetEntra: document.getElementById('inputValetEntra').value.trim(),
        observaciones: document.getElementById('inputObservaciones').value.trim(),
        fotos: fotosCapturadas
    };

    let pendientes = JSON.parse(localStorage.getItem('autos_pendientes') || '[]');
    pendientes.push(nuevoAuto);
    localStorage.setItem('autos_pendientes', JSON.stringify(pendientes));

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoAuto)
        });
    } catch (err) {
        console.error("Error al enviar a pendientes:", err);
    }

    document.getElementById('formIngreso').reset();
    fotosCapturadas = [null, null, null, null, null, null];
    const labels = ['Frente', 'Lat. Izq', 'Lat. Der', 'Atrás', 'Detalle 1', 'Detalle 2'];
    for (let i = 0; i < 6; i++) {
        document.getElementById(`slot-${i}`).innerHTML = `<span>📷 ${labels[i]}</span>`;
    }

    actualizarContadorPendientes();
    alert(`✅ Vehículo ${nuevoAuto.dominio} enviado a PENDIENTES.`);
}

/* ==========================================
   PASO 2: ASIGNAR COCHERA -> HOJA "Adentro"
   ================-------------------------- */
function renderizarPendientes() {
    const contenedor = document.getElementById('listaPendientes');
    const pendientes = JSON.parse(localStorage.getItem('autos_pendientes') || '[]');

    if (pendientes.length === 0) {
        contenedor.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted); font-size:0.9rem;">No hay autos esperando cochera.</div>';
        return;
    }

    contenedor.innerHTML = pendientes.map(auto => `
        <div class="car-item">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <h3 style="color:var(--accent-blue); font-size:1.3rem;">${auto.dominio}</h3>
                <span class="badge badge-pendiente">⏳ ${auto.fechaHoraIngreso}</span>
            </div>
            <p style="font-size:0.95rem; font-weight:bold;">${auto.marcaModelo}</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">Valet: ${auto.valetEntra}</p>
            
            <div style="display:flex; gap:8px; margin-top:12px;">
                <input type="text" id="input-cochera-${auto.idUnico}" class="form-control" placeholder="Cochera (Ej: B2)" style="padding:10px; text-transform:uppercase;">
                <button type="button" onclick="confirmarCochera('${auto.idUnico}')" class="btn-confirm">Confirmar</button>
            </div>
        </div>
    `).join('');
}

function seleccionarCocheraPlano(codigo) {
    const pendientes = JSON.parse(localStorage.getItem('autos_pendientes') || '[]');
    if (pendientes.length > 0) {
        const input = document.getElementById(`input-cochera-${pendientes[0].idUnico}`);
        if (input) input.value = codigo;
    }
}

function crearCeldaCochera(codigo, ocupadas) {
    if (ocupadas.includes(codigo)) {
        return `<div class="cochera-box cochera-ocupada" title="Ocupada">${codigo}</div>`;
    }
    return `<div class="cochera-box cochera-libre" onclick="seleccionarCocheraPlano('${codigo}')">${codigo}</div>`;
}

function renderizarPlanoCocheras() {
    const contenedor = document.getElementById('planoCocheras');
    const adentro = JSON.parse(localStorage.getItem('autos_adentro') || '[]');
    const ocupadas = adentro.map(a => a.cochera.toUpperCase());

    contenedor.innerHTML = `
        <div class="col-a">${colA.map(c => crearCeldaCochera(c, ocupadas)).join('')}</div>
        <div class="bloque-central">
            <div class="grupo-filas">
                <div class="fila-cocheras">${fila1.map(c => crearCeldaCochera(c, ocupadas)).join('')}</div>
                <div class="fila-cocheras">${fila2.map(c => crearCeldaCochera(c, ocupadas)).join('')}</div>
            </div>
            <div class="grupo-filas">
                <div class="fila-cocheras">${fila3.map(c => crearCeldaCochera(c, ocupadas)).join('')}</div>
                <div class="fila-cocheras">${fila4.map(c => crearCeldaCochera(c, ocupadas)).join('')}</div>
            </div>
        </div>
    `;
}

async function confirmarCochera(idUnico) {
    const input = document.getElementById(`input-cochera-${idUnico}`);
    const cochera = input.value.trim().toUpperCase();
    if (!cochera) return alert("Escribí o seleccioná una cochera.");

    let adentro = JSON.parse(localStorage.getItem('autos_adentro') || '[]');
    if (adentro.some(a => a.cochera.toUpperCase() === cochera)) {
        return alert(`⚠️ La cochera ${cochera} ya está ocupada.`);
    }

    let pendientes = JSON.parse(localStorage.getItem('autos_pendientes') || '[]');
    const index = pendientes.findIndex(a => a.idUnico === idUnico);
    if (index === -1) return;

    const auto = pendientes[index];
    auto.cochera = cochera;
    auto.accion = "confirmar_cochera";

    auto.foto1 = auto.fotos[0] || "";
    auto.foto2 = auto.fotos[1] || "";
    auto.foto3 = auto.fotos[2] || "";
    auto.foto4 = auto.fotos[3] || "";
    auto.foto5 = auto.fotos[4] || "";
    auto.foto6 = auto.fotos[5] || "";

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auto)
        });
    } catch (err) {
        console.error("Error al confirmar cochera:", err);
    }

    pendientes.splice(index, 1);
    localStorage.setItem('autos_pendientes', JSON.stringify(pendientes));

    adentro.unshift(auto);
    localStorage.setItem('autos_adentro', JSON.stringify(adentro));

    actualizarContadorPendientes();
    renderizarPendientes();
    renderizarPlanoCocheras();
    alert(`🚀 Cochera ${cochera} asignada correctamente.`);
}

/* ==========================================
   PASO 3: ADENTRO Y SALIDA -> HOJA "Historial"
   ================-------------------------- */
function renderizarAdentro() {
    const query = document.getElementById('buscarInput').value.toUpperCase().trim();
    const contenedor = document.getElementById('listaAdentro');
    const adentro = JSON.parse(localStorage.getItem('autos_adentro') || '[]');

    const filtrados = adentro.filter(a => 
        a.dominio.includes(query) || 
        a.cochera.includes(query) || 
        a.marcaModelo.toUpperCase().includes(query)
    );

    if (filtrados.length === 0) {
        contenedor.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted); font-size:0.9rem;">No hay vehículos estacionados con ese filtro.</div>';
        return;
    }

    contenedor.innerHTML = filtrados.map(auto => `
        <div class="car-item">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <h3 style="font-size:1.3rem;">${auto.dominio}</h3>
                <span class="badge badge-estacionado">📍 COCHERA ${auto.cochera}</span>
            </div>
            <p style="font-size:0.95rem; font-weight:bold;">${auto.marcaModelo}</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">Ingreso: ${auto.fechaHoraIngreso}</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">Valet Ingresa: ${auto.valetEntra}</p>
            
            <button type="button" onclick="darDeBaja('${auto.idUnico}')" class="btn-salida">🚗 Registrar Salida / Liberar Cochera</button>
        </div>
    `).join('');
}

async function darDeBaja(idUnico) {
    let adentro = JSON.parse(localStorage.getItem('autos_adentro') || '[]');
    const index = adentro.findIndex(a => a.idUnico === idUnico);
    if (index === -1) return;

    const auto = adentro[index];
    const valetSale = prompt(`Salida de ${auto.dominio} (Cochera ${auto.cochera}).\nIngresá el nombre del chofer que retira el vehículo:`);
    
    if (!valetSale || valetSale.trim() === "") return;

    const ahora = new Date();
    const fechaHoraSalida = `${ahora.toLocaleDateString('es-AR')} ${ahora.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}`;

    auto.accion = "salida";
    auto.valetSale = valetSale.trim();
    auto.fechaHoraSalida = fechaHoraSalida;

    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auto)
        });
    } catch (err) {
        console.error("Error al registrar salida:", err);
    }

    adentro.splice(index, 1);
    localStorage.setItem('autos_adentro', JSON.stringify(adentro));

    renderizarAdentro();
    alert(`✅ Salida registrada. La cochera ${auto.cochera} quedó libre.`);
}

actualizarContadorPendientes();