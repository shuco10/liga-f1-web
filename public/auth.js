// auth.js
function esAdmin() {
    return localStorage.getItem('rol') === 'admin';
}

function verificarPass() {
    const pass = document.getElementById('pass-admin').value;
    if (pass === "admin123") { // Cambia esto por tu pass real
        localStorage.setItem('rol', 'admin');
        location.reload();
    } else {
        alert("Contraseña incorrecta");
    }
}

function cerrarSesion() {
    localStorage.removeItem('rol');
    location.reload();
}
// /auth.js (Añade esto al final)
function seguridadAbrirModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert("El sistema de login aún se está cargando, espera un segundo.");
    }
}
