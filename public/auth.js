// auth.js - Sistema de Autenticación por Sesiones del Servidor

let usuarioActual = { logueado: false, username: '', rol: 'user' };

// Comprobar la sesión activa al cargar la página
async function verificarSesion() {
    try {
        const res = await fetch('/api/auth/sesion');
        const data = await res.json();
        if (data.logueado) {
            usuarioActual = data;
        } else {
            usuarioActual = { logueado: false, username: '', rol: 'user' };
        }
        actualizarUIUsuario();
    } catch (err) {
        console.error("Error al verificar sesión:", err);
    }
}

// Verificar si el usuario actual es admin
function esAdmin() {
    return usuarioActual.logueado && usuarioActual.rol === 'admin';
}

// Cerrar sesión real en el servidor
async function cerrarSesion() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
            location.reload();
        } else {
            alert("Error al cerrar sesión");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

// Adaptar la interfaz según el rol del usuario
function actualizarUIUsuario() {
    // Si existe un botón o panel de logout/admin en la vista, lo gestionamos aquí
    const btnLogout = document.getElementById('btn-cerrar-sesion');
    if (btnLogout) {
        btnLogout.style.display = usuarioActual.logueado ? 'inline-block' : 'none';
    }
}

// Ejecutar la comprobación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
});

// --- FUNCIONES DE GESTIÓN Y MODALES ---

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
    
    const modal = document.getElementById('modal-editar');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('edit-id').value = id;
    }
}

// Enviar los datos actualizados de resultados al servidor
async function guardarEdicion() {
    const id = document.getElementById('edit-id').value;
    const nuevaPosicion = document.getElementById('edit-posicion').value;

    const res = await fetch(`/api/resultados/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posicion: parseInt(nuevaPosicion) })
    });

    if (res.ok) {
        alert("Resultado actualizado correctamente");
        location.reload();
    } else {
        alert("Error al actualizar la posición");
    }
}

// Eliminar resultados en circuitos
function eliminarResultado(id) {
    if (!esAdmin()) {
        alert("No tienes permisos para eliminar.");
        return;
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este resultado?")) {
        fetch(`/api/resultados/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => {
            if (res.ok) {
                alert("Resultado eliminado correctamente.");
                location.reload(); 
            } else {
                alert("Error al eliminar el resultado.");
            }
        })
        .catch(err => console.error("Error:", err));
    }
}

function prepararEdicion(id, reclamante, reclamado, articulo, explicacion, sancion) {
    const formAdmin = document.getElementById('form-admin');
    if (formAdmin) formAdmin.style.display = 'block';
    
    const tituloForm = document.getElementById('titulo-form');
    if (tituloForm) tituloForm.innerText = "Editar Resolución";
    
    document.getElementById('edit-id').value = id;
    document.getElementById('reclamante').value = reclamante;
    document.getElementById('reclamado').value = reclamado;
    document.getElementById('articulo').value = articulo;
    document.getElementById('explicacion').value = explicacion;
    document.getElementById('sancion').value = sancion;
}

function eliminarResolucion(id) {
    if (!esAdmin()) return alert("No tienes permisos.");
    if (!confirm("¿Estás seguro de que quieres eliminar esta resolución?")) return;

    fetch(`/api/resoluciones/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
        if (res.ok) {
            alert("Resolución eliminada correctamente.");
            if (typeof cargarResoluciones === 'function') cargarResoluciones();
        } else {
            alert("Error al eliminar la resolución.");
        }
    })
    .catch(err => console.error("Error:", err));
}

async function guardarResolucion() {
    if (!esAdmin()) return alert("No tienes permisos.");

    const id = document.getElementById('edit-id').value;
    
    const datos = {
        reclamante: document.getElementById('reclamante').value,
        reclamado: document.getElementById('reclamado').value,
        articulo: document.getElementById('articulo').value,
        explicacion: document.getElementById('explicacion').value,
        sancion: document.getElementById('sancion').value
    };

    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `/api/resoluciones/${id}` : '/api/resoluciones';

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            alert(id ? "Resolución actualizada correctamente" : "Resolución publicada");
            
            const formAdmin = document.getElementById('form-admin');
            if (formAdmin) formAdmin.style.display = 'none';
            document.getElementById('edit-id').value = ''; 
            document.getElementById('titulo-form').innerText = "Nueva Resolución";
            
            document.getElementById('reclamante').value = '';
            document.getElementById('reclamado').value = '';
            document.getElementById('articulo').value = '';
            document.getElementById('explicacion').value = '';
            document.getElementById('sancion').value = '';

            if (typeof cargarResoluciones === 'function') cargarResoluciones();
        } else {
            alert("Error al guardar la resolución.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}
