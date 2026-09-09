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

async function iniciarBannerSecuencial() {
    try {
        const [resNoticias, resResoluciones, resUsuarios] = await Promise.all([
            fetch('/api/noticias').then(r => r.json()),
            fetch('/api/resoluciones').then(r => r.json()),
            fetch('/api/usuarios/aprobados').then(r => r.json())
        ]);

        // Preparamos los bloques de datos
        const bloques = [];

        if (resNoticias.length > 0) {
            bloques.push({
                titulo: "📰 Noticias",
                items: resNoticias.map(n => `<b>${n.titulo}</b>`)
            });
        }

        if (resResoluciones.length > 0) {
            bloques.push({
                titulo: "⚖️ Resoluciones",
                items: resResoluciones.map(r => `Sanción a <b>${r.reclamado}</b> (${r.sancion})`)
            });
        }

        if (resUsuarios.length > 0) {
            bloques.push({
                titulo: "🏁 Nuevos Pilotos",
                items: resUsuarios.map(u => `¡Bienvenido a la parrilla, <b>${u.username}</b>!`)
            });
        }

        if (bloques.length === 0) {
            document.getElementById('ticker-content').innerHTML = "Bienvenidos a Cazadores de Curvas.";
            return;
        }

        let indiceBloque = 0;
        const etiquetaElemento = document.getElementById('ticker-title');
        const contenidoElemento = document.getElementById('ticker-content');

        function mostrarSiguienteBloque() {
            const bloqueActual = bloques[indiceBloque];
            
            // Actualizamos la etiqueta lateral
            etiquetaElemento.innerText = bloqueActual.titulo;

            // Unimos los elementos del bloque
            const textoBloque = bloqueActual.items.join(' &nbsp;&bull;&nbsp; ') + ' &nbsp;&bull;&nbsp; ';
            contenidoElemento.innerHTML = textoBloque;

            // Calculamos la duración de la animación en base a la longitud del texto para que vaya fluido (aprox 40-50 px por segundo)
            const longitudAprox = textoBloque.length * 8; 
            const duracionSegundos = Math.max(15, Math.min(longitudAprox / 45, 40)); // Entre 15s y 40s

            // Aplicamos la animación dinámicamente
            contenidoElemento.style.animation = 'none';
            void contenidoElemento.offsetWidth; // Forzar reflow
            contenidoElemento.style.animation = `ticker ${duracionSegundos}s linear infinite`;

            // Programamos el salto al siguiente bloque justo cuando termine esta vuelta (+ 1 segundo de pausa)
            setTimeout(() => {
                indiceBloque = (indiceBloque + 1) % bloques.length;
                mostrarSiguienteBloque();
            }, duracionSegundos * 1000 + 1000); // Duración exacta + 1 segundo de respiro
        }

        // Arrancamos el ciclo
        mostrarSiguienteBloque();

    } catch (err) {
        console.error("Error al cargar el banner secuencial:", err);
    }
}

document.addEventListener('DOMContentLoaded', iniciarBannerSecuencial);
