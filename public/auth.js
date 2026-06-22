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
