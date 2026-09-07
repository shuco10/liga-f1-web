const socket = io();

// 1. Socket.io: Actualizar los usuarios online en tiempo real
socket.on('usuarios-actualizados', (numUsuarios) => {
    const spanNum = document.getElementById('num-usuarios');
    const spanBola = document.getElementById('bola-estado');
    
    if (spanNum) spanNum.innerText = numUsuarios;
    
    const total = Number(numUsuarios);
    if (spanBola && spanNum) {
        if (total > 0) {
            spanBola.style.color = '#4ade80';
            spanNum.style.color = '#4ade80';
        } else {
            spanBola.style.color = '#ef4444';
            spanNum.style.color = '#ef4444';
        }
    }
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

window.addEventListener('DOMContentLoaded', () => {
    gestionarVisitas();
});

// 3. Estela del Cursor mediante elementos fijos en el DOM
const maxParticles = 10;
const particles = [];

// Seleccionamos los elementos de la estela directamente del HTML
for (let i = 0; i < maxParticles; i++) {
    const p = document.getElementById(`trail-${i}`);
    if (p) {
        particles.push({ element: p, x: 0, y: 0 });
    }
}

let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

let index = 0;
function updateTrail() {
    if (particles.length === 0) return;
    
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

requestAnimationFrame(updateTrail);
