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
        // CORREGIDO: Cambiamos la ruta de /api/eliminar-resultado/ a /api/resultados/
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
    document.getElementById('form-admin').style.display = 'block';
    document.getElementById('titulo-form').innerText = "Editar Resolución"; // Cambia el título
    
    document.getElementById('edit-id').value = id;
    document.getElementById('reclamante').value = reclamante;
    document.getElementById('reclamado').value = reclamado;
    document.getElementById('articulo').value = articulo;
    document.getElementById('explicacion').value = explicacion;
    document.getElementById('sancion').value = sancion;
}

function eliminarResolucion(id) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta resolución?")) return;

    fetch(`/api/resoluciones/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
        if (res.ok) {
            alert("Resolución eliminada correctamente.");
            cargarResoluciones(); // Esto refresca la lista automáticamente
        } else {
            alert("Error al eliminar la resolución.");
        }
    })
    .catch(err => console.error("Error:", err));
}
async function guardarResolucion() {
    // Obtenemos el ID del campo oculto (estará vacío si es nueva, o tendrá número si editamos)
    const id = document.getElementById('edit-id').value;
    
    const datos = {
        reclamante: document.getElementById('reclamante').value,
        reclamado: document.getElementById('reclamado').value,
        articulo: document.getElementById('articulo').value,
        explicacion: document.getElementById('explicacion').value,
        sancion: document.getElementById('sancion').value
    };

    // Si hay ID, usamos PUT (editar). Si no, usamos POST (crear).
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
            
            // Limpiamos y cerramos
            document.getElementById('form-admin').style.display = 'none';
            document.getElementById('edit-id').value = ''; 
            document.getElementById('titulo-form').innerText = "Nueva Resolución";
            
            // Limpiamos los campos del formulario
            document.getElementById('reclamante').value = '';
            document.getElementById('reclamado').value = '';
            document.getElementById('articulo').value = '';
            document.getElementById('explicacion').value = '';
            document.getElementById('sancion').value = '';

            cargarResoluciones(); // Refrescamos las tarjetas
        } else {
            alert("Error al guardar la resolución.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}
