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

// Configuración de la estela del cursor
const maxParticles = 10; // Número de elementos en la estela
const particles = [];

// Crear los elementos visuales de la estela en el DOM
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

// Registrar la posición actual del ratón
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Animación fluida mediante bucle de renderizado
let index = 0;
function updateTrail() {
    const particle = particles[index];
    particle.x = mouseX;
    particle.y = mouseY;

    particles.forEach((p, idx) => {
        // Calcular posición escalonada para crear el efecto de retraso/estela
        const nextParticle = particles[(idx + 1) % particles.length];
        p.x += (nextParticle.x - p.x) * 0.3;
        p.y += (nextParticle.y - p.y) * 0.3;

        p.element.style.transform = `translate(${p.x + 8}px, ${p.y + 8}px) scale(${1 - idx / maxParticles})`;
        p.element.style.opacity = (1 - idx / maxParticles) * 0.4; // Transparencia gradual
    });

    index = (index + 1) % particles.length;
    requestAnimationFrame(updateTrail);
}

// Arrancar la animación de la estela
requestAnimationFrame(updateTrail);
