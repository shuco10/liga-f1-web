const socket = io();

// 1. Socket.io para actualizar los usuarios online en tiempo real
socket.on('usuarios-actualizados', (numUsuarios) => {
    const spanNum = document.getElementById('num-usuarios');
    const spanBola = document.getElementById('bola-estado');
    
    if (spanNum) spanNum.innerText = numUsuarios;
    
    const total = Number(numUsuarios);
    if (spanBola && spanNum) {
        if (total > 0) {
            spanBola.style.color = '#4ade80'; // Verde
            spanNum.style.color = '#4ade80';
        } else {
            spanBola.style.color = '#ef4444'; // Rojo
            spanNum.style.color = '#ef4444';
        }
    }
});

// 2. Registrar la visita en Neon y pintar los contadores de hoy y totales
async function gestionarVisitas() {
    try {
        // Registra la visita al cargar la página
        await fetch('/api/visitas/registrar', { method: 'POST' });

        // Pide los datos actualizados a la API
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

// Ejecutar la función de visitas cuando el documento esté listo
window.addEventListener('DOMContentLoaded', gestionarVisitas);
