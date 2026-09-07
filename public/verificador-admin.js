document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Consultamos la sesión actual en tu API existente
        const res = await fetch('/api/auth/sesion');
        const data = await res.json();
        
        // Comprobamos si está logueado y su rol es 'admin' (como Shuco_vsk)
        if (data.logueado && data.rol === 'admin') {
            
            // 1. Ocultar la llavecita de acceso por contraseña en el header o vistas
            const contenedorLlave = document.getElementById('contenedor-llave-comisarios') || document.querySelector('.btn-llave-modal');
            if (contenedorLlave) {
                contenedorLlave.style.display = 'none';
            }

            // 2. Si estás en una página restringida o de gestión, asegurarnos de que se muestre el panel
            const panelGestion = document.getElementById('panel-gestion-usuarios');
            if (panelGestion) {
                panelGestion.style.display = 'block';
            }

            // 3. Opcional: Mostrar un indicador sutil de "Modo Admin: Shuco_vsk" si tienes un hueco para ello
            const saludoAdmin = document.getElementById('saludo-admin-activo');
            if (saludoAdmin) {
                saludoAdmin.innerText = `Conectado como Admin (${data.username || 'Shuco_vsk'})`;
                saludoAdmin.style.display = 'block';
            }
        }
    } catch (err) {
        console.error("Error al comprobar el rol de administración:", err);
    }
});
