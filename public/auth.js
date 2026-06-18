// auth.js - Control global de permisos
function esAdmin() {
    return localStorage.getItem('rol') === 'admin';
}

function cerrarSesion() {
    localStorage.removeItem('rol');
    window.location.reload();
}
