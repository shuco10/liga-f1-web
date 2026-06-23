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
function editarResultado(id) {
    if (!esAdmin()) {
        alert("No tienes permisos para editar.");
        return;
    }
    // Aquí iría tu lógica de edición, por ejemplo abrir un modal:
    console.log("Editando resultado con ID:", id);
    alert("Función de edición en desarrollo para el ID: " + id);
}

function eliminarResultado(id) {
    if (!esAdmin()) {
        alert("No tienes permisos para eliminar.");
        return;
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este resultado?")) {
        fetch(`/api/eliminar-resultado/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => {
            if (res.ok) {
                alert("Resultado eliminado correctamente.");
                location.reload(); // Recarga la página para ver los cambios
            } else {
                alert("Error al eliminar el resultado.");
            }
        })
        .catch(err => console.error("Error:", err));
    }
}
