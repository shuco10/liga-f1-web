// Si esta página no tiene esta función, evitamos que rompa el script global
if (typeof cargarListaUsuarios !== 'function') {
    window.cargarListaUsuarios = function() {};
}

// 1. Control de Visitas (Aislado y con manejo seguro)
async function gestionarVisitas() {
    try {
        await fetch('/api/visitas/registrar', { method: 'POST' }).catch(() => {});
        const respuesta = await fetch('/api/visitas');
        const texto = await respuesta.text();
        if (texto.trim().startsWith('<')) return; // Evitar HTML de error
        
        const datos = JSON.parse(texto);
        const elHoy = document.getElementById('visitas-hoy') || document.getElementById('visitas-h');
        const elTotal = document.getElementById('visitas-totales') || document.getElementById('visitas-t');

        if (elHoy) elHoy.innerText = datos.hoy ?? 0;
        if (elTotal) elTotal.innerText = datos.totales ?? datos.total ?? 0;
    } catch (e) {
        console.error("Error gestionando las visitas:", e);
    }
}

// 2. Verificación de Sesión
async function verificarSesionPagina() {
    try {
        const res = await fetch('/api/auth/sesion');
        const texto = await res.text();
        if (texto.trim().startsWith('<')) return;
        const data = JSON.parse(texto);
        
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

// 3. GESTIÓN GLOBAL DE CLICS (Login / Logout)
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
            const texto = await logoutRes.text();
            if (texto.trim().startsWith('<')) return;
            const logoutData = JSON.parse(texto);
            
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
/// TELETIPOS (Con protección estricta contra errores HTML de la API)
/////////////////////////////////////////////////////////////////////////////

async function iniciarBannerSecuencial() {
    const tituloElemento = document.getElementById('ticker-titulo');
    const contenidoElemento = document.getElementById('ticker-content');

    if (!contenidoElemento || !tituloElemento) {
        setTimeout(iniciarBannerSecuencial, 500);
        return;
    }

    try {
        const fetchSeguro = async (url) => {
            try {
                const r = await fetch(url);
                const txt = await r.text();
                if (txt.trim().startsWith('<')) return [];
                return JSON.parse(txt);
            } catch {
                return [];
            }
        };

        const [resNoticias, resResoluciones, resUsuarios] = await Promise.all([
            fetchSeguro('/api/noticias'),
            fetchSeguro('/api/resoluciones'),
            fetchSeguro('/api/usuarios/aprobados')
        ]);

        let bloquesGlobales = [];

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
                    items: noticiasUltimoDia.map(n => `**${n.titulo}**`)
                });
            }
        }

        if (Array.isArray(resResoluciones) && resResoluciones.length > 0) {
            resResoluciones.sort((a, b) => new Date(b.fecha) - new Date(b.fecha));
            const ultimaFechaRes = (resResoluciones[0].fecha || '').split('T')[0].split(' ')[0];
            
            const resolucionesUltimoDia = resResoluciones.filter(r => {
                const fechaR = (r.fecha || '').split('T')[0].split(' ')[0];
                return fechaR === ultimaFechaRes;
            });

            if (resolucionesUltimoDia.length > 0) {
                bloquesGlobales.push({
                    titulo: "⚖️ RESOLUCIONES",
                    items: resolucionesUltimoDia.map(r => `Sanción a **${r.reclamado}** (${r.sancion})`)
                });
            }
        }

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
                    items: usuariosUltimoDia.map(u => `¡Bienvenido a la parrilla, **${u.username}**!`)
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
            tituloElemento.innerHTML = bloqueActual.titulo;

            const textoBloque = bloqueActual.items.join('  •  ') + '  •  ';
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


////////////////////////////////////////////////////////////////////////////////
/// CUENTA ATRÁS DE CIRCUITOS (Adaptada a la estructura exacta de Neon DB)
////////////////////////////////////////////////////////////////////////////////

async function inicializarCuentaAtrasCircuitos() {
    const elGp = document.getElementById('nombre-gp');
    const elGrid = document.getElementById('contador-grid');

    if (!elGp || !elGrid) {
        setTimeout(inicializarCuentaAtrasCircuitos, 500);
        return;
    }

    try {
        const resC = await fetch('/api/circuitos');
        const circuitos = await resC.json();

        let eventos = [];
        try {
            const resE = await fetch('/api/eventos-especiales');
            eventos = await resE.json();
        } catch (err) {
            console.warn("No se pudieron cargar eventos especiales:", err);
        }

        const listaCircuitos = Array.isArray(circuitos) ? circuitos.map(c => ({
            nombre: `Gran Premio de ${c.nombre}`,
            fecha: c.fecha_carrera
        })) : [];

        const listaEventos = Array.isArray(eventos) ? eventos.map(e => ({
            nombre: e.nombre,
            fecha: e.fecha_evento
        })) : [];

        const eventosTotales = [...listaCircuitos, ...listaEventos];

        if (eventosTotales.length === 0) {
            elGp.innerText = "Sin eventos programados";
            return;
        }

        const mesesMap = {
            'ENE': 0, 'JAN': 0, 'FEB': 1, 'MAR': 2, 'ABR': 3, 'APR': 3,
            'MAY': 4, 'JUN': 5, 'JUL': 6, 'AGO': 7, 'AUG': 7,
            'SEP': 8, 'OCT': 9, 'NOV': 10, 'DIC': 11, 'DEC': 11
        };

        const ahora = new Date();
        const anioActual = ahora.getFullYear();
        const timestampActual = ahora.getTime();
        
        let proximaCita = null;
        let menorDiferencia = Infinity;

        eventosTotales.forEach(item => {
            const fechaStr = item.fecha;
            if (!fechaStr) return;

            const partes = fechaStr.trim().toUpperCase().split(/\s+/);
            if (partes.length < 2) return;

            const dia = parseInt(partes[0], 10);
            const mesStr = partes[1].substring(0, 3);
            const mes = mesesMap[mesStr];

            if (isNaN(dia) || mes === undefined) return;

            let fechaC = new Date(anioActual, mes, dia, 22, 30, 0).getTime();

            if (fechaC < timestampActual) {
                fechaC = new Date(anioActual + 1, mes, dia, 22, 30, 0).getTime();
            }

            const diferencia = fechaC - timestampActual;
            if (diferencia > 0 && diferencia < menorDiferencia) {
                menorDiferencia = diferencia;
                proximaCita = {
                    nombreCompleto: item.nombre,
                    tiempoObjetivo: fechaC
                };
            }
        });

        if (!proximaCita) {
            elGp.innerText = "No hay próximas citas";
            return;
        }

        elGp.innerText = proximaCita.nombreCompleto;
        elGrid.style.display = 'flex';

        function actualizarReloj() {
            const ahoraLoc = new Date().getTime();
            const diferenciaLoc = proximaCita.tiempoObjetivo - ahoraLoc;

            const elemDias = document.getElementById('dias');
            const elemHoras = document.getElementById('horas');
            const elemMinutos = document.getElementById('minutos');
            const elemSegundos = document.getElementById('segundos');

            if (!elemDias) return;

            if (diferenciaLoc < 0) {
                elGp.innerText = `¡${proximaCita.nombreCompleto} en marcha!`;
                elGrid.style.display = 'none';
                return;
            }

            const dias = Math.floor(diferenciaLoc / (1000 * 60 * 60 * 24));
            const horas = Math.floor((diferenciaLoc % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutos = Math.floor((diferenciaLoc % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferenciaLoc % (1000 * 60)) / 1000);

            elemDias.innerText = String(dias).padStart(2, '0');
            elemHoras.innerText = String(horas).padStart(2, '0');
            elemMinutos.innerText = String(minutos).padStart(2, '0');
            elemSegundos.innerText = String(segundos).padStart(2, '0');
        }

        actualizarReloj();
        setInterval(actualizarReloj, 1000);

    } catch (e) {
        console.error("❌ Error crítico en cuenta atrás:", e);
        elGp.innerText = "Error al cargar la cuenta atrás";
    }
}


////////////////////////////////////////////////////////////////////////////////
// INICIALIZACIÓN GENERAL AL CARGAR EL DOM
////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM completamente cargado y ejecutándose");
    verificarSesionPagina();
    gestionarVisitas();
    iniciarBannerSecuencial();
    inicializarCuentaAtrasCircuitos();
});
