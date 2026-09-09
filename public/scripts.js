const socket = io();

// Si esta página no tiene esta función, evitamos que rompa el script global
if (typeof cargarListaUsuarios !== 'function') {
    window.cargarListaUsuarios = function() {};
}

// 1. Socket.io: Actualizar los usuarios online en tiempo real y pintar la lista
function actualizarContadorOnline(datos) {
    const spanNum = document.getElementById('num-usuarios');
    const spanBola = document.getElementById('bola-estado');
    
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

socket.on('actualizar-conectados', (listaConectados) => {
    const contadorSpan = document.getElementById('num-usuarios') || document.getElementById('contador-online');
    if (contadorSpan) {
        contadorSpan.innerText = listaConectados.length;
    }

    const contenedorLista = document.getElementById('lista-conectados-rt');
    if (!contenedorLista) return;

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

// 2. Control de Visitas (Aislado y con manejo de errores para que no se quede colgado en "...")
async function gestionarVisitas() {
    try {
        await fetch('/api/visitas/registrar', { method: 'POST' });
        const respuesta = await fetch('/api/visitas');
        if (!respuesta.ok) throw new Error('Error al obtener visitas');
        const datos = await respuesta.json();
        
        const elHoy = document.getElementById('visitas-hoy') || document.getElementById('visitas-h');
        const elTotal = document.getElementById('visitas-totales') || document.getElementById('visitas-t');

        if (elHoy) elHoy.innerText = datos.hoy ?? 0;
        if (elTotal) elTotal.innerText = datos.totales ?? datos.total ?? 0;
    } catch (e) {
        console.error("Error gestionando las visitas:", e);
        const elHoy = document.getElementById('visitas-hoy');
        const elTotal = document.getElementById('visitas-totales');
        if (elHoy) elHoy.innerText = "-";
        if (elTotal) elTotal.innerText = "-";
    }
}

// 3. Verificación de Sesión
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

// 4. GESTIÓN GLOBAL DE CLICS (Login / Logout)
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
                localStorage.removeItem('rol');
                window.location.reload();
            }
        } catch (err) {
            console.error("Error al cerrar sesión:", err);
        }
    }
});


/////////////////////////////////////////////////////////////////////////////
/// TELETIPOS (Formato por bloques secuenciales: Noticias -> Resoluciones -> Pilotos)
/////////////////////////////////////////////////////////////////////////////

let timerBloque = null;
let bloquesGlobales = [];
let indiceBloqueActual = 0;

async function iniciarBannerSecuencial() {
    try {
        const [resNoticias, resResoluciones, resUsuarios] = await Promise.all([
            fetch('/api/noticias').then(r => r.json()).catch(() => []),
            fetch('/api/resoluciones').then(r => r.json()).catch(() => []),
            fetch('/api/usuarios/aprobados').then(r => r.json()).catch(() => [])
        ]);

        bloquesGlobales = [];

        if (Array.isArray(resNoticias) && resNoticias.length > 0) {
            bloquesGlobales.push({
                key: "noticias",
                titulo: "📰 Noticias",
                items: resNoticias.map(n => `<b>${n.titulo}</b>`)
            });
        }

        if (Array.isArray(resResoluciones) && resResoluciones.length > 0) {
            bloquesGlobales.push({
                key: "resoluciones",
                titulo: "⚖️ Resoluciones",
                items: resResoluciones.map(r => `Sanción a <b>${r.reclamado}</b> (${r.sancion})`)
            });
        }

        if (Array.isArray(resUsuarios) && resUsuarios.length > 0) {
            bloquesGlobales.push({
                key: "usuarios",
                titulo: "🏁 Nuevos Pilotos",
                items: resUsuarios.map(u => `¡Bienvenido a la parrilla, <b>${u.username}</b>!`)
            });
        }

        const selectElemento = document.getElementById('ticker-select');
        const contenidoElemento = document.getElementById('ticker-content');

        if (!contenidoElemento) return;

        if (bloquesGlobales.length === 0) {
            contenidoElemento.innerHTML = "Bienvenidos a Cazadores de Curvas.";
            return;
        }

        function mostrarBloque(index, forzado = false) {
            if (timerBloque) clearTimeout(timerBloque);

            const bloqueActual = bloquesGlobales[index];
            if (selectElemento && !forzado) {
                selectElemento.value = bloqueActual.key;
            }

            const textoBloque = bloqueActual.items.join(' &nbsp;&bull;&nbsp; ') + ' &nbsp;&bull;&nbsp; ';
            contenidoElemento.innerHTML = textoBloque;

            const longitudAprox = textoBloque.length * 8; 
            const duracionSegundos = Math.max(15, Math.min(longitudAprox / 45, 40));

            contenidoElemento.style.animation = 'none';
            void contenidoElemento.offsetWidth; 
            contenidoElemento.style.animation = `ticker ${duracionSegundos}s linear infinite`;

            // Si está en modo automático, programamos el siguiente bloque
            if (!forzado && selectElemento.value === 'auto') {
                timerBloque = setTimeout(() => {
                    indiceBloqueActual = (indiceBloqueActual + 1) % bloquesGlobales.length;
                    mostrarBloque(indiceBloqueActual, false);
                }, duracionSegundos * 1000 + 1000);
            }
        }

        // Listener para cuando el usuario cambia manualmente el desplegable
        if (selectElemento) {
            selectElemento.addEventListener('change', (e) => {
                const seleccion = e.target.value;
                if (timerBloque) clearTimeout(timerBloque);

                if (seleccion === 'auto') {
                    mostrarBloque(indiceBloqueActual, false);
                } else {
                    const bloqueEncontrado = bloquesGlobales.find(b => b.key === seleccion);
                    if (bloqueEncontrado) {
                        const textoBloque = bloqueEncontrado.items.join(' &nbsp;&bull;&nbsp; ') + ' &nbsp;&bull;&nbsp; ';
                        contenidoElemento.innerHTML = textoBloque;

                        const longitudAprox = textoBloque.length * 8; 
                        const duracionSegundos = Math.max(15, Math.min(longitudAprox / 45, 40));

                        contenidoElemento.style.animation = 'none';
                        void contenidoElemento.offsetWidth;
                        contenidoElemento.style.animation = `ticker ${duracionSegundos}s linear infinite`;
                    }
                }
            });
        }

        // Arrancamos el ciclo automático inicial
        mostrarBloque(indiceBloqueActual, false);

    } catch (err) {
        console.error("Error al cargar el banner interactivo:", err);
    }
}
