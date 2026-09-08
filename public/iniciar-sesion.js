(function () {
    // 1. Inyectar los estilos CSS de la modal de forma limpia y encapsulada
    const estilosModal = document.createElement('style');
    estilosModal.innerHTML = `
        .modal-auth-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            font-family: inherit;
        }
        .modal-auth-content {
            background: #1e293b;
            border: 1px solid #334155;
            padding: 30px;
            border-radius: 12px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            color: #f8fafc;
            position: relative;
        }
        .modal-auth-close {
            position: absolute;
            top: 15px; right: 20px;
            background: none; border: none;
            color: #94a3b8; font-size: 1.2rem;
            cursor: pointer;
        }
        .modal-auth-close:hover { color: #fff; }
        .auth-tabs {
            display: flex; gap: 10px; margin-bottom: 20px;
            border-bottom: 1px solid #334155; padding-bottom: 10px;
        }
        .auth-tab-btn {
            background: none; border: none; color: #94a3b8;
            cursor: pointer; font-size: 0.9rem; font-weight: bold; padding: 5px 10px;
            transition: color 0.2s;
        }
        .auth-tab-btn.active {
            color: #38bdf8; border-bottom: 2px solid #38bdf8;
        }
        .auth-form-group {
            margin-bottom: 15px;
        }
        .auth-form-group label {
            display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 5px;
        }
        .auth-form-group input, .auth-form-group select {
            width: 100%; padding: 10px; background: #0f172a;
            border: 1px solid #475569; border-radius: 6px; color: #fff; font-size: 0.95rem;
            box-sizing: border-box;
        }
        .auth-form-group input:focus, .auth-form-group select:focus {
            outline: none; border-color: #38bdf8;
        }
        .auth-btn-submit {
            width: 100%; background: #0ea5e9; color: white; border: none;
            padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;
            margin-top: 10px; transition: background 0.2s;
        }
        .auth-btn-submit:hover { background: #0284c7; }
        .auth-msg {
            margin-top: 12px; font-size: 0.85rem; text-align: center;
        }
    `;
    document.head.appendChild(estilosModal);

    // 2. Inyectar la estructura HTML de la modal en el body
    const modalHTML = `
        <div id="modalAuthOverlay" class="modal-auth-overlay">
            <div class="modal-auth-content">
                <button id="cerrarModalAuth" class="modal-auth-close"><i class="fa-solid fa-xmark"></i></button>
                
                <!-- Pestañas de navegación interna -->
                <div class="auth-tabs">
                    <button class="auth-tab-btn active" data-target="formLogin">Iniciar Sesión</button>
                    <button class="auth-tab-btn" data-target="formRegistro">Crear Cuenta</button>
                    <button class="auth-tab-btn" data-target="formRecuperar">Recuperar</button>
                </div>

                <!-- Formulario 1: Login -->
                <form id="formLogin" class="auth-form">
                    <div class="auth-form-group">
                        <label>Usuario o Email</label>
                        <input type="text" id="loginUser" required placeholder="Tu usuario">
                    </div>
                    <div class="auth-form-group">
                        <label>Contraseña</label>
                        <input type="password" id="loginPass" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="auth-btn-submit">Entrar</button>
                    <div id="msgLogin" class="auth-msg"></div>
                </form>

                <!-- Formulario 2: Registro -->
                <form id="formRegistro" class="auth-form" style="display: none;">
                    <div class="auth-form-group">
                        <label>Usuario</label>
                        <input type="text" id="regUser" required placeholder="Elige un usuario">
                    </div>
                    <div class="auth-form-group">
                        <label>Email</label>
                        <input type="email" id="regEmail" required placeholder="correo@ejemplo.com">
                    </div>
                    <div class="auth-form-group">
                        <label>Contraseña</label>
                        <input type="password" id="regPass" required placeholder="••••••••">
                    </div>
                    <div class="auth-form-group">
                        <label>Pregunta de Seguridad</label>
                        <select id="regPregunta" required>
                            <option value="" disabled selected>Elige una pregunta de seguridad...</option>
                            <option value="¿Cómo se llamaba tu primera mascota?">¿Cómo se llamaba tu primera mascota?</option>
                            <option value="¿En qué ciudad naciste?">¿En qué ciudad naciste?</option>
                            <option value="¿Cómo se llamaba tu primer colegio?">¿Cómo se llamaba tu primer colegio?</option>
                        </select>
                    </div>
                    <div class="auth-form-group">
                        <label>Respuesta de Seguridad</label>
                        <input type="text" id="regRespuesta" required placeholder="Respuesta secreta">
                    </div>
                    <button type="submit" class="auth-btn-submit">Registrarse</button>
                    <div id="msgReg" class="auth-msg"></div>
                </form>

                <!-- Formulario 3: Recuperar Contraseña -->
                <form id="formRecuperar" class="auth-form" style="display: none;">
                    <div id="paso1Recuperar">
                        <div class="auth-form-group">
                            <label>Introduce tu usuario</label>
                            <input type="text" id="recUser" placeholder="Tu usuario">
                        </div>
                        <button type="button" id="btnBuscarPregunta" class="auth-btn-submit">Siguiente</button>
                    </div>
                    <div id="paso2Recuperar" style="display: none;">
                        <div class="auth-form-group">
                            <label>Pregunta de seguridad:</label>
                            <p id="txtPreguntaSecreta" style="color: #38bdf8; font-weight: bold; margin-bottom: 10px;"></p>
                        </div>
                        <div class="auth-form-group">
                            <label>Tu Respuesta</label>
                            <input type="text" id="recRespuesta" placeholder="Respuesta">
                        </div>
                        <div class="auth-form-group">
                            <label>Nueva Contraseña</label>
                            <input type="password" id="recNuevaPass" placeholder="Nueva contraseña">
                        </div>
                        <button type="submit" class="auth-btn-submit">Cambiar Contraseña</button>
                    </div>
                    <div id="msgRec" class="auth-msg"></div>
                </form>
            </div>
        </div>
    `;
    const divContenedor = document.createElement('div');
    divContenedor.innerHTML = modalHTML;
    document.body.appendChild(divContenedor);

    // 3. Lógica de interacción (Abrir/Cerrar y Pestañas)
    const overlay = document.getElementById('modalAuthOverlay');
    const cerrarBtn = document.getElementById('cerrarModalAuth');
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    const forms = document.querySelectorAll('.auth-form');

    // Función global para que el Header pueda abrir la modal fácilmente
    window.abrirModalAuth = function(pestanaIndex = 0) {
        overlay.style.display = 'flex';
        cambiarPestaña(pestanaIndex);
    };

    function cerrarModal() {
        overlay.style.display = 'none';
        // Limpiar mensajes y restablecer pasos de recuperación al cerrar
        document.querySelectorAll('.auth-msg').forEach(m => m.textContent = '');
        document.getElementById('paso1Recuperar').style.display = 'block';
        document.getElementById('paso2Recuperar').style.display = 'none';
        document.getElementById('formRecuperar').reset();
    }

    cerrarBtn.onclick = cerrarModal;
    overlay.onclick = (e) => { if (e.target === overlay) cerrarModal(); };

    function cambiarPestaña(index) {
        tabBtns.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
            forms[i].style.display = (i === index) ? 'block' : 'none';
        });
    }

    tabBtns.forEach((btn, i) => {
        btn.onclick = () => cambiarPestaña(i);
    });

    // 4. Conexión con los endpoints del Backend (Fetch)

    // A. Login
    document.getElementById('formLogin').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUser').value;
        const password = document.getElementById('loginPass').value;
        const msg = document.getElementById('msgLogin');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                msg.style.color = '#4ade80';
                msg.textContent = '¡Login correcto! Recargando...';
                setTimeout(() => window.location.reload(), 1000);
            } else {
                msg.style.color = '#f87171';
                msg.textContent = data.error || 'Error al iniciar sesión';
            }
        } catch (err) {
            msg.style.color = '#f87171';
            msg.textContent = 'Error de conexión con el servidor';
        }
    };

    // B. Registro
    document.getElementById('formRegistro').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUser').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPass').value;
        const pregunta = document.getElementById('regPregunta').value;
        const respuesta = document.getElementById('regRespuesta').value;
        const msg = document.getElementById('msgReg');

        try {
            const res = await fetch('/api/auth/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, pregunta, respuesta })
            });
            const data = await res.json();
            if (res.ok) {
                msg.style.color = '#4ade80';
                msg.textContent = '¡Registrado! Cuenta pendiente de aprobación por un admin.';
                e.target.reset();
            } else {
                msg.style.color = '#f87171';
                msg.textContent = data.error || 'Error en el registro';
            }
        } catch (err) {
            msg.style.color = '#f87171';
            msg.textContent = 'Error de conexión con el servidor';
        }
    };

    // C. Recuperación de Contraseña (Paso 1: Obtener pregunta)
    let usuarioRecuperacion = '';
    document.getElementById('btnBuscarPregunta').onclick = async () => {
        usuarioRecuperacion = document.getElementById('recUser').value;
        const msg = document.getElementById('msgRec');
        if (!usuarioRecuperacion) {
            msg.style.color = '#f87171';
            msg.textContent = 'Introduce un usuario válido';
            return;
        }

        try {
            const res = await fetch('/api/auth/obtener-pregunta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usuarioRecuperacion })
            });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('txtPreguntaSecreta').textContent = data.pregunta;
                document.getElementById('paso1Recuperar').style.display = 'none';
                document.getElementById('paso2Recuperar').style.display = 'block';
                msg.textContent = '';
            } else {
                msg.style.color = '#f87171';
                msg.textContent = data.error || 'Usuario no encontrado';
            }
        } catch (err) {
            msg.style.color = '#f87171';
            msg.textContent = 'Error de conexión';
        }
    };

    // Recuperación (Paso 2: Enviar respuesta y nueva pass)
    document.getElementById('formRecuperar').onsubmit = async (e) => {
        e.preventDefault();
        // Si el usuario da Enter en el paso 1 antes de avanzar, evitamos que ejecute el cambio de pass
        if (document.getElementById('paso1Recuperar').style.display !== 'none') return;

        const respuesta = document.getElementById('recRespuesta').value;
        const nuevaPassword = document.getElementById('recNuevaPass').value;
        const msg = document.getElementById('msgRec');

        try {
            const res = await fetch('/api/auth/recuperar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usuarioRecuperacion, respuesta, nuevaPassword })
            });
            const data = await res.json();
            if (res.ok) {
                msg.style.color = '#4ade80';
                msg.textContent = '¡Contraseña cambiada con éxito! Ya puedes iniciar sesión.';
                setTimeout(() => cambiarPestaña(0), 2000);
            } else {
                msg.style.color = '#f87171';
                msg.textContent = data.error || 'Respuesta incorrecta';
            }
        } catch (err) {
            msg.style.color = '#f87171';
            msg.textContent = 'Error de conexión';
        }
    };
})();
