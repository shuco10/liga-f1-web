const socket = io();

// 1. Socket.io: Actualizar los usuarios online en tiempo real
socket.on('usuarios-actualizados', (numUsuarios) => {
    const spanNum = document.getElementById('num-usuarios');
    const spanBola = document.getElementById('bola-estado');
    
    if (spanNum) spanNum.innerText = numUsuarios;
    
    const total = Number(numUsuarios);
    if (spanBola && spanNum) {
        if (total > 0) {
            spanBola.style.color = '#4ade80'; // Verde (Hay usuarios)
            spanNum.style.color = '#4ade80';
        } else {
            spanBola.style.color = '#ef4444'; // Rojo (Sin usuarios)
            spanNum.style.color = '#ef4444';
        }
    }
});

// 2. Control de Visitas: Registrar y pintar contadores de hoy y totales
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

// Ejecutar todo cuando el documento HTML esté completamente cargado y listo
window.addEventListener('DOMContentLoaded', () => {
    
    // Iniciar el gestor de visitas
    gestionarVisitas();

    // 3. Estela del Cursor: Animación de cascos persiguiendo el ratón
    const maxParticles = 10; // Número de elementos que componen la estela
    const particles = [];

    // Crear dinámicamente los elementos visuales de la estela en el DOM
    for (let i = 0; i < maxParticles; i++) {
        const p = document.createElement('div');
        p.className = 'cursor-trail';
        p.style.position = 'fixed';
        p.style.pointerEvents = 'none';
        p.style.width = '16px';
        p.style.height = '16px';
        p.style.backgroundImage = "url('/webimagenes/cursorcdc.png')";
        p.style.backgroundSize = 'cover';
        p.style.zIndex = '999999';
        p.style.opacity = '0';
        p.style.transition = 'transform 0.1s ease-out';
        document.body.appendChild(p);
        particles.push({ element: p, x: 0, y: 0 });
    }

    let mouseX = 0;
    let mouseY = 0;

    // Registrar la posición actual del ratón en tiempo real
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Bucle de animación fluida para calcular el retraso de la estela
    let index = 0;
    function updateTrail() {
        const particle = particles[index];
        particle.x = mouseX;
        particle.y = mouseY;

        particles.forEach((p, idx) => {
            const nextParticle = particles[(idx + 1) % particles.length];
            p.x += (nextParticle.x - p.x) * 0.3;
            p.y += (nextParticle.y - p.y) * 0.3;

            p.element.style.transform = `translate(${p.x + 8}px, ${p.y + 8}px) scale(${1 - idx / maxParticles})`;
            p.element.style.opacity = (1 - idx / maxParticles) * 0.4;
        });

        index = (index + 1) % particles.length;
        requestAnimationFrame(updateTrail);
    }

    // Arrancar el bucle de renderizado de la estela
    requestAnimationFrame(updateTrail);
});
