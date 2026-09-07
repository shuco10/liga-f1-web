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

// Todo se ejecuta de forma segura cuando el DOM está listo
window.addEventListener('DOMContentLoaded', () => {
    gestionarVisitas();

    // 3. Estela del Cursor (Generación dinámica y fluida)
    const numDots = 8;
    const dots = [];
    const mouse = { x: 0, y: 0 };
    const tailPos = [];

    // Crear las partículas de la estela en memoria e inyectarlas
    for (let i = 0; i < numDots; i++) {
        tailPos.push({ x: 0, y: 0 });
        const dot = document.createElement('div');
        dot.style.position = 'fixed';
        dot.style.width = '16px';
        dot.style.height = '16px';
        dot.style.backgroundImage = "url('/webimagenes/cursorcdc.png')";
        dot.style.backgroundSize = 'cover';
        dot.style.pointerEvents = 'none';
        dot.style.zIndex = '999999';
        dot.style.opacity = String((1 - i / numDots) * 0.5); // Se desvanecen gradualmente
        document.body.appendChild(dot);
        dots.push(dot);
    }

    // Capturar el movimiento del ratón
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // Bucle de animación de la estela
    function animateTrail() {
        let x = mouse.x;
        let y = mouse.y;

        tailPos.forEach((pos, index) => {
            pos.x += (x - pos.x) * 0.35;
            pos.y += (y - pos.y) * 0.35;
            
            dots[index].style.left = `${pos.x}px`;
            dots[index].style.top = `${pos.y}px`;

            x = pos.x;
        });

        requestAnimationFrame(animateTrail);
    }

    requestAnimationFrame(animateTrail);
});
