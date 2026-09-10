async function enviarContacto() {
    const nombre = document.getElementById('nombre-contacto').value;
    const asunto = document.getElementById('asunto-contacto').value;
    const mensaje = document.getElementById('mensaje-contacto').value;

    if(!nombre || !asunto || !mensaje) {
        alert("Por favor, rellena todos los campos.");
        return;
    }

    try {
        const res = await fetch('/api/contacto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, asunto, mensaje })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert(data.message);
            document.getElementById('modal-contacto').style.display = 'none';
            document.getElementById('nombre-contacto').value = '';
            document.getElementById('asunto-contacto').value = '';
            document.getElementById('mensaje-contacto').value = '';
        } else {
            alert(data.error || "Error al enviar el mensaje.");
        }
    } catch (error) {
        alert("Hubo un error de conexión.");
    }
}
