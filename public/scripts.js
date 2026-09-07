socket = io();

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
socket.on('actualizar-conectados', (listaUsuarios) => {
    actualizarContadorOnline(listaUsuarios);

    // Si estás en la página de administración, actualizamos también la lista de abajo
    const contenedorListaAbajo = document.getElementById('contenedor-conectados-abajo');
    if (contenedorListaAbajo && Array.isArray(listaUsuarios)) {
        contenedorListaAbajo.innerHTML = '';
        listaUsuarios.forEach(usuario => {
            const item = document.createElement('div');
            item.textContent = usuario;
            contenedorListaAbajo.appendChild(item);
        });
    }
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

// Todo se ejecuta de forma segura cuando el DOM está listo
window.addEventListener('DOMContentLoaded', () => {
    gestionarVisitas();

    // 3. Efecto de "huellas" estáticas del cursor
    let lastTime = 0;

    window.addEventListener('mousemove', (e) => {
        const now = Date.now();
        // Controlamos la frecuencia para dejar una huella cada 50ms (evita saturar el navegador)
        if (now - lastTime < 50) return;
        lastTime = now;

        // Crear la huella estática
        const huella = document.createElement('div');
        huella.style.position = 'fixed';
        // Tamaño exacto de 32x32px (igual que el asset original)
        huella.style.width = '32px';
        huella.style.height = '32px';
        huella.style.backgroundImage = "url('/webimagenes/cursorcdc.png')";
        huella.style.backgroundSize = 'cover';
        huella.style.pointerEvents = 'none';
        huella.style.zIndex = '999999';
        
        // Centrar perfectamente restando la mitad del tamaño (16px) a la posición del ratón
        huella.style.left = `${e.clientX - 16}px`;
        huella.style.top = `${e.clientY - 16}px`;
        
        huella.style.opacity = '0.5'; // Visibilidad inicial de la huella
        // Transición de desvanecimiento suave de 0.8 segundos
        huella.style.transition = 'opacity 0.8s ease';
        
        document.body.appendChild(huella);

        // Iniciar el desvanecimiento casi al instante
        setTimeout(() => {
            huella.style.opacity = '0';
        }, 50);

        // Eliminar el elemento del HTML cuando transcurra el tiempo para no acumular basura en la página
        setTimeout(() => {
            huella.remove();
        }, 850);
    });
});
