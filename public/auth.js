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

// Editar resultados en circuitos
function editarResultado(id) {
    if (!esAdmin()) return alert("No tienes permisos.");
    
    // Mostramos el modal
    const modal = document.getElementById('modal-editar');
    modal.style.display = 'block';
    
    // Guardamos el ID en un campo oculto para saber qué estamos editando
    document.getElementById('edit-id').value = id;
}

// Nueva función para enviar los datos al servidor
async function guardarEdicion() {
    const id = document.getElementById('edit-id').value;
    const piloto = document.getElementById('edit-piloto').value;
    const posicion = document.getElementById('edit-posicion').value;

    const res = await fetch(`/api/editar-resultado/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piloto_nombre: piloto, posicion: posicion })
    });

    if (res.ok) {
        alert("Resultado actualizado");
        location.reload();
    } else {
        alert("Error al actualizar");
    }
}
// Eliminar resultados en circuitos
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
