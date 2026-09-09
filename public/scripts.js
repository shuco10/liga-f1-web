const socket = io();
// Si esta página no tiene esta función, evitamos que rompa el script global
if (typeof cargarListaUsuarios !== 'function') {
    window.cargarListaUsuarios = function() {};
}
// 1. Socket.io: Actualizar los usuarios online en tiempo real y pintar la lista
// Manejador universal para Socket.io (funciona con número o con array)
function actualizarContadorOnline(datos) {
    const spanNum = document.getElementById('num-usuarios');
    const spanBola = document.getElementById('bola-estado');
    
    // Si llegan datos en forma de lista (array), contamos sus elementos; si es un número, lo usamos tal cual
    const total = Array.isArray(datos) ? datos.length : Number(datos);
    
    if (spanNum) spanNum.innerText = total;
    
    if (spanBola && spanNum) {
        if (total > 0) {
            spanBola.style.color = '#4ade80';
            spanNum.style.color = '#4ade80';
        } else {
            spanBola.style.color = '#ef4444';
            spanNum.style.color = '#ef4444';
        }
    }
}

// Escuchamos ambos nombres de eventos posibles que pueda emitir el servidor
// Socket.io para conectados en tiempo real (seguro para cualquier página)
socket.on('actualizar-conectados', (listaConectados) => {
    // 1. Actualizar contador superior (si existe en la página actual)
    const contadorSpan = document.getElementById('num-usuarios') || document.getElementById('contador-online');
    if (contadorSpan) {
        contadorSpan.innerText = listaConectados.length;
    }

    // 2. Actualizar lista detallada inferior (solo si la página tiene el contenedor)
    const contenedorLista = document.getElementById('lista-conectados-rt');
    if (!contenedorLista) return; // Si no estamos en la página de gestión, salimos sin error

    contenedorLista.innerHTML = '';

    if (listaConectados.length === 0) {
        contenedorLista.innerHTML = '<li style="color: #94a3b8; font-style: italic;">No hay usuarios activos ahora mismo.</li>';
        return;
    }

    listaConectados.forEach(user => {
        const li = document.createElement('li');
        li.style.cssText = 'padding: 6px 10px; margin: 4px 0; background: rgba(15, 23, 42, 0.6); border-radius: 5px; display: flex; justify-content: space-between;';
        li.innerHTML = `<span><i class="fa-solid fa-circle" style="color: #10b981; font-size: 0.7em; margin-right: 8px;"></i> ${user}</span> <span style="font-size: 0.8em; color: #94a3b8;">Conectado</span>`;
        contenedorLista.appendChild(li);
    });
});


socket.on('usuarios-actualizados', (numUsuarios) => {
    actualizarContadorOnline(numUsuarios);
});

// 2. Control de Visitas: Registrar y pintar contadores
async function gestionarVisitas() {
    try {
        await fetch('/api/visitas/registrar', { method: 'POST' });
        const respuesta = await fetch('/api/visitas');
        const datos = await respuesta.json();
        
        const elHoy = document.getElementById('visitas-hoy');
        const elTotal = document.getElementById('visitas-totales');

        if (elHoy) elHoy.innerText = datos.hoy;
        if (elTotal) elTotal.innerText = datos.totales;
    } catch (e) {
        console.error("Error gestionando las visitas:", e);
    }
}




///////////////////////////////////////////////////////////////////////////////////////////
// Este escucha cualquier clic en el botón de logout, aunque el header se cargue más tarde
/// CERRAR SESION
/////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-logout') {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('rol');
                window.location.reload(); 
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }
});





async function verificarSesionPagina() {
    try {
        const res = await fetch('/api/auth/sesion');
        const data = await res.json();
        
        const seccionFormularios = document.getElementById('seccion-formularios');
        const panelGestion = document.getElementById('panel-gestion-usuarios');
        const avisoNoAuth = document.getElementById('aviso-no-autorizado');

        const estaLogueado = data.logueado || data.autenticado;
        const esAdmin = estaLogueado && data.rol === 'admin';

        if (esAdmin) {
            if (seccionFormularios) seccionFormularios.style.display = 'none';
            if (panelGestion) panelGestion.style.display = 'block';
            if (avisoNoAuth) avisoNoAuth.style.display = 'none';
            if (typeof cargarListaUsuarios === 'function') cargarListaUsuarios();
        } else {
            if (seccionFormularios) seccionFormularios.style.display = 'flex';
            if (panelGestion) panelGestion.style.display = 'none';
            if (avisoNoAuth) avisoNoAuth.style.display = 'block';
        }

        // Mostrar u ocultar botones según la sesión de forma inmediata y segura
        const btnCerrarSesion = document.getElementById('btn-logout');
        const btnIniciarSesion = document.getElementById('btnAbrirLogin');

        if (estaLogueado) {
            if (btnCerrarSesion) btnCerrarSesion.style.display = 'inline-block';
            if (btnIniciarSesion) btnIniciarSesion.style.display = 'none';
        } else {
            if (btnCerrarSesion) btnCerrarSesion.style.display = 'none';
            if (btnIniciarSesion) btnIniciarSesion.style.display = 'inline-block';
        }

    } catch (err) {
        console.error("Error al verificar sesión en la página:", err);
    }
}

document.addEventListener('DOMContentLoaded', verificarSesionPagina);

// 2. // GESTIÓN GLOBAL DE CLICS
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btnAbrirLogin') {
        e.preventDefault();
        if (typeof window.abrirModalAuth === 'function') {
            window.abrirModalAuth();
        } else {
            console.error("La función abrirModalAuth no está disponible.");
        }
    }

    if (e.target && e.target.id === 'btn-logout') {
        e.preventDefault();
        try {
            const logoutRes = await fetch('/api/auth/logout', { method: 'POST' });
            const logoutData = await logoutRes.json();
            if (logoutRes.ok || logoutData.success) {
                window.location.reload();
            }
        } catch (err) {
            console.error("Error al cerrar sesión:", err);
        }
    }
});


/////////////////////////////////////////////////////////////////////////////
/// TELETIPOS
///////////////////////////////////////////////

let currentIndex = 0;
let elementosTicker = [];
let intervalId = null;

async function cargarBannerTicker() {
    try {
        const [resNoticias, resResoluciones, resUsuarios] = await Promise.all([
            fetch('/api/noticias').then(r => r.json()),
            fetch('/api/resoluciones').then(r => r.json()),
            fetch('/api/usuarios/aprobados').then(r => r.json())
        ]);

        elementosTicker = [];

        // Añadir noticias
        resNoticias.forEach(n => {
            elementosTicker.push(`📰 <b>NOTICIA:</b> ${n.titulo}`);
        });

        // Añadir resoluciones
        resResoluciones.forEach(r => {
            elementosTicker.push(`⚖️ <b>RESOLUCIÓN:</b> Sanción a ${r.reclamado} (${r.sancion})`);
        });

        // Añadir nuevos pilotos aprobados
        resUsuarios.forEach(u => {
            elementosTicker.push(`🏁 <b>NUEVO PILOTO:</b> ¡Bienvenido a la parrilla, ${u.username}!`);
        });

        const contenedor = document.getElementById('ticker-content');
        
        if (elementosTicker.length > 0) {
            // Generamos los divs ocultos para cada mensaje
            contenedor.innerHTML = elementosTicker.map((texto, index) => `
                <div class="ticker-item ${index === 0 ? 'active' : ''}">${texto}</div>
            `).join('');

            // Si ya habia un intervalo corriendo, lo limpiamos
            if (intervalId) clearInterval(intervalId);

            // Rotar cada 4.5 segundos
            intervalId = setInterval(() => {
                const items = contenedor.querySelectorAll('.ticker-item');
                if (items.length === 0) return;

                items[currentIndex].classList.remove('active');
                currentIndex = (currentIndex + 1) % items.length;
                items[currentIndex].classList.add('active');
            }, 4500);

        } else {
            contenedor.innerHTML = `<div class="ticker-item active">🏁 Bienvenidos a Cazadores de Curvas - Centro de Control Activo.</div>`;
        }

    } catch (err) {
        console.error("Error al cargar el panel de avisos:", err);
    }
}

document.addEventListener('DOMContentLoaded', cargarBannerTicker);
