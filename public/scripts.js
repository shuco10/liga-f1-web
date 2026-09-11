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

async function iniciarBannerSecuencial() {
    const tituloElemento = document.getElementById('ticker-titulo');
    const contenidoElemento = document.getElementById('ticker-content');

    if (!contenidoElemento || !tituloElemento) {
        setTimeout(iniciarBannerSecuencial, 500);
        return;
    }

    try {
        const [resNoticias, resResoluciones, resUsuarios] = await Promise.all([
            fetch('/api/noticias').then(r => r.json()).catch(() => []),
            fetch('/api/resoluciones').then(r => r.json()).catch(() => []),
            fetch('/api/usuarios/aprobados').then(r => r.json()).catch(() => [])
        ]);

        let bloquesGlobales = [];

        // 1. NOTICIAS: Filtradas estrictamente al último día con noticias
        if (Array.isArray(resNoticias) && resNoticias.length > 0) {
            resNoticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            const ultimaFechaNoticia = (resNoticias[0].fecha || '').split('T')[0].split(' ')[0];
            
            const noticiasUltimoDia = resNoticias.filter(n => {
                const fechaN = (n.fecha || '').split('T')[0].split(' ')[0];
                return fechaN === ultimaFechaNoticia;
            });

            if (noticiasUltimoDia.length > 0) {
                bloquesGlobales.push({
                    titulo: "📰 NOTICIAS",
                    items: noticiasUltimoDia.map(n => `<b>${n.titulo}</b>`)
                });
            }
        }

        // 2. RESOLUCIONES: Filtradas estrictamente al último día con resoluciones
        if (Array.isArray(resResoluciones) && resResoluciones.length > 0) {
            resResoluciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            const ultimaFechaRes = (resResoluciones[0].fecha || '').split('T')[0].split(' ')[0];
            
            const resolucionesUltimoDia = resResoluciones.filter(r => {
                const fechaR = (r.fecha || '').split('T')[0].split(' ')[0];
                return fechaR === ultimaFechaRes;
            });

            if (resolucionesUltimoDia.length > 0) {
                bloquesGlobales.push({
                    titulo: "⚖️ RESOLUCIONES",
                    items: resolucionesUltimoDia.map(r => `Sanción a <b>${r.reclamado}</b> (${r.sancion})`)
                });
            }
        }

        // 3. PILOTOS: Filtrados estrictamente al último día de registro
        if (Array.isArray(resUsuarios) && resUsuarios.length > 0) {
            resUsuarios.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
            const ultimaFechaUser = (resUsuarios[0].creado_en || '').split('T')[0].split(' ')[0];
            
            const usuariosUltimoDia = resUsuarios.filter(u => {
                const fechaU = (u.creado_en || '').split('T')[0].split(' ')[0];
                return fechaU === ultimaFechaUser;
            });

            if (usuariosUltimoDia.length > 0) {
                bloquesGlobales.push({
                    titulo: "🏁 NUEVOS PILOTOS",
                    items: usuariosUltimoDia.map(u => `¡Bienvenido a la parrilla, <b>${u.username}</b>!`)
                });
            }
        }

        if (bloquesGlobales.length === 0) {
            tituloElemento.innerHTML = "🏁 AVISO";
            contenidoElemento.innerHTML = "Bienvenidos a Cazadores de Curvas.";
            return;
        }

        let timerBloque = null;
        let indiceBloqueActual = 0;

        function mostrarBloque(index) {
            if (timerBloque) clearTimeout(timerBloque);

            const bloqueActual = bloquesGlobales[index];
            
            // Asigna el título con icono perfectamente integrado en la caja roja
            tituloElemento.innerHTML = bloqueActual.titulo;

            const textoBloque = bloqueActual.items.join(' &nbsp;&bull;&nbsp; ') + ' &nbsp;&bull;&nbsp; ';
            contenidoElemento.innerHTML = textoBloque;

            const longitudAprox = textoBloque.length * 8; 
            const duracionSegundos = Math.max(15, Math.min(longitudAprox / 45, 45));

            contenidoElemento.style.animation = 'none';
            void contenidoElemento.offsetWidth; 
            contenidoElemento.style.animation = `ticker ${duracionSegundos}s linear infinite`;

            timerBloque = setTimeout(() => {
                indiceBloqueActual = (indiceBloqueActual + 1) % bloquesGlobales.length;
                mostrarBloque(indiceBloqueActual);
            }, duracionSegundos * 1000 + 1000);
        }

        mostrarBloque(indiceBloqueActual);

    } catch (err) {
        console.error("Error al cargar el banner automático:", err);
    }
}

let currentIndex = 0;
let clipsData = [];
const VISIBLE_ITEMS_BUFFER = 2; // Margen de seguridad para el bucle

async function cargarCarruselClips() {
    try {
        const response = await fetch('/api/videos');
        clipsData = await response.json();
        
        const container = document.getElementById('twitchCarousel');
        if (!container) return; 
        
        if (clipsData.length === 0) {
            container.innerHTML = '<div class="carousel-loading" style="color: #94a3b8; font-size: 12px;">No hay clips guardados todavía.</div>';
            return;
        }

        renderCarousel();
    } catch (error) {
        console.error('Error al cargar el carrusel:', error);
    }
}

function renderCarousel() {
    const container = document.getElementById('twitchCarousel');
    if (!container || clipsData.length === 0) return;
    
    container.innerHTML = '';
    const dominioActual = window.location.hostname;

    // Duplicamos los elementos al principio y al final para permitir rotación infinita sin huecos vacíos
    const extendedClips = [...clipsData, ...clipsData, ...clipsData];
    currentIndex = clipsData.length; // Empezamos en el bloque central para poder ir a ambos lados libremente

    extendedClips.forEach((clip, absoluteIndex) => {
        let iframeAdaptado = clip.embed_codigo.replace(/parent=([^&"']+)/g, 'parent=' + dominioActual);

        const item = document.createElement('div');
        item.className = `carousel-clip-item ${absoluteIndex === currentIndex ? 'active' : ''}`;
        item.innerHTML = `
            ${iframeAdaptado}
            <div class="carousel-clip-title" title="${clip.titulo}">${clip.titulo}</div>
        `;
        container.appendChild(item);
    });

    actualizarPosicionCarrusel(false);
}

function actualizarPosicionCarrusel(animar = true) {
    const container = document.getElementById('twitchCarousel');
    if (!container || clipsData.length === 0) return;

    if (!animar) {
        container.style.transition = 'none';
    } else {
        container.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);';
    }

    const items = container.children;
    const totalClips = clipsData.length;

    // Control de límites para el bucle infinito transparente
    if (currentIndex < totalClips) {
        currentIndex += totalClips;
        posicionarInstantaneo();
    } else if (currentIndex >= totalClips * 2) {
        currentIndex -= totalClips;
        posicionarInstantaneo();
    }

    // Actualizar clases activas
    for (let i = 0; i < items.length; i++) {
        if (i === currentIndex) {
            items[i].classList.add('active');
            items[i].style.transform = 'scale(1.05)';
            items[i].style.opacity = '1';
            items[i].style.zIndex = '2';
        } else {
            items[i].classList.remove('active');
            items[i].style.transform = 'scale(0.85)';
            items[i].style.opacity = '0.4';
            items[i].style.zIndex = '1';
        }
    }

    // Centrar el elemento activo
    const activeItem = items[currentIndex];
    if (activeItem) {
        const containerWidth = container.parentElement.offsetWidth;
        const itemLeft = activeItem.offsetLeft;
        const itemWidth = activeItem.offsetWidth;
        const scrollTarget = itemLeft - (containerWidth / 2) + (itemWidth / 2);
        
        container.style.transform = `translateX(${-scrollTarget}px)`;
    }
}

function posicionarInstantaneo() {
    const container = document.getElementById('twitchCarousel');
    const items = container.children;
    container.style.transition = 'none';
    
    const activeItem = items[currentIndex];
    if (activeItem) {
        const containerWidth = container.parentElement.offsetWidth;
        const itemLeft = activeItem.offsetLeft;
        const itemWidth = activeItem.offsetWidth;
        const scrollTarget = itemLeft - (containerWidth / 2) + (itemWidth / 2);
        container.style.transform = `translateX(${-scrollTarget}px)`;
    }
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarCarruselClips();
});

// Control de flechas por Delegación Global (Infalible ante cargas asíncronas)
document.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('#nextClip');
    const prevBtn = e.target.closest('#prevClip');

    if (nextBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (clipsData.length === 0) return;
        currentIndex++;
        actualizarPosicionCarrusel(true);
    }

    if (prevBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (clipsData.length === 0) return;
        currentIndex--;
        actualizarPosicionCarrusel(true);
    }
});


/////////////////////////////////////////////////
//NO ELIMINAR ESTO DE AQUI//////////////////
// Inicialización general al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    verificarSesionPagina();
    gestionarVisitas();
    iniciarBannerSecuencial();
});
