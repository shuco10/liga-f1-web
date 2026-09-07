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

    // 3. Estela del Cursor con control de posición y desvanecimiento al parar
    const numDots = 8;
    const dots = [];
    const tailPos = [];
    const mouse = { x: 0, y: 0 };
    let stopTimeout = null;

    // Crear las partículas de la estela
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
        dot.style.opacity = '0';
        dot.style.transition = 'opacity 0.4s ease'; // Transición suave de aparición/desaparición
        document.body.appendChild(dot);
        dots.push(dot);
    }

    // Capturar el movimiento del ratón
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        // Mostrar la estela con opacidad gradual al mover
        dots.forEach((dot, i) => {
            dot.style.opacity = String((1 - i / numDots) * 0.5);
        });

        // Si el usuario para el ratón durante casi 1 segundo, la estela se desvanece
        clearTimeout(stopTimeout);
        stopTimeout = setTimeout(() => {
            dots.forEach(dot => {
                dot.style.opacity = '0';
            });
        }, 700); // 700 milisegundos de margen antes de ocultarse
    });

    // Bucle de animación fluida de la estela
    function animateTrail() {
        let x = mouse.x;
        let y = mouse.y;

        tailPos.forEach((pos, index) => {
            pos.x += (x - pos.x) * 0.3;
            pos.y += (y - pos.y) * 0.3;
            
            // Restamos 8px para centrar el icono de 16x16 justo detrás/sobre el cursor
            dots[index].style.left = `${pos.x - 8}px`;
            dots[index].style.top = `${pos.y - 8}px`;

            x = pos.x;
        });

        requestAnimationFrame(animateTrail);
    }

    requestAnimationFrame(animateTrail);
});
