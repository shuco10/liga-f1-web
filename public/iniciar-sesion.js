(function () {
    // 1. Inyectar los estilos CSS actualizados
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
        .auth-header-title {
            font-size: 1.25rem;
            font-weight: bold;
            color: #38bdf8;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #334155;
            padding-bottom: 12px;
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
        .auth-links {
            margin-top: 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-top: 1px solid #334155;
            padding-top: 15px;
        }
        .auth-links a {
            color: #38bdf8;
            font-size: 0.85rem;
            text-decoration: none;
            cursor: pointer;
        }
        .auth-links a:hover {
            text-decoration: underline;
        }
        .auth-links a:hover {
            text-decoration: underline;
        }
        .nav-icon-only i, .nav-icon-only svg {
            pointer-events: none;
        }
        
    `;
    document.head.appendChild(estilosModal);

    // 2. Inyectar la estructura HTML con el nuevo layout
    const modalHTML = `
        <div id="modalAuthOverlay" class="modal-auth-overlay">
            <div class="modal-auth-content">
                <button id="cerrarModalAuth" class="modal-auth-close"><i class="fa-solid fa-xmark"></i></button>
                
                <!-- Vista 1: Iniciar Sesión (Principal) -->
                <div id="vistaLogin" class="auth-vista">
                    <div class="auth-header-title"><i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión</div>
                    <form id="formLogin">
                        <div class="auth-form-group">
                            <label>Usuario</label>
                            <input type="text" id="loginUser" required placeholder="Tu usuario">
                        </div>
                        <div class="auth-form-group">
                            <label>Contraseña</label>
                            <input type="password" id="loginPass" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="auth-btn-submit">Entrar</button>
                        <div id="msgLogin" class="auth-msg"></div>
                    </form>
                    <div class="auth-links">
                        <a id="linkIrRegistro">¿No tienes cuenta? Regístrate</a>
                        <a id="linkIrRecuperar">¿Olvidaste tu contraseña?</a>
                    </div>
                </div>

                <!-- Vista 2: Registro -->
                <div id="vistaRegistro" class="auth-vista" style="display: none;">
                    <div class="auth-header-title"><i class="fa-solid fa-user-plus"></i> Crear Cuenta</div>
                    <form id="formRegistro">
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
                            <select id="regPreguntaSeguridad" required>
                                <option value="" disabled selected>Elige una pregunta...</option>
                                <option value="¿Cómo se llamaba tu primera mascota?">¿Cómo se llamaba tu primera mascota?</option>
                                <option value="¿En qué ciudad naciste?">¿En qué ciudad naciste?</option>
                                <option value="¿Cómo se llamaba tu primer colegio?">¿Cómo se llamaba tu primer colegio?</option>
                            </select>
                        </div>
                        <div class="auth-form-group">
                            <label>Respuesta de Seguridad</label>
                            <input type="text" id="regRespuestaSeguridad" required placeholder="Respuesta secreta">
                        </div>
                        <button type="submit" class="auth-btn-submit">Registrarse</button>
                        <div id="msgReg" class="auth-msg"></div>
                    </form>
                    <div class="auth-links">
                        <a id="linkVolverLoginReg">¿Ya tienes cuenta? Inicia sesión</a>
                    </div>
                </div>

                <!-- Vista 3: Recuperar Contraseña -->
                <div id="vistaRecuperar" class="auth-vista" style="display: none;">
                    <div class="auth-header-title"><i class="fa-solid fa-key"></i> Recuperar Contraseña</div>
                    <form id="formRecuperar">
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
                                <input type="text" id="recRespuestaSeguridad" placeholder="Respuesta">
                            </div>
                            <div class="auth-form-group">
                                <label>Nueva Contraseña</label>
                                <input type="password" id="recNuevaPass" placeholder="Nueva contraseña">
                            </div>
                            <button type="submit" class="auth-btn-submit">Cambiar Contraseña</button>
                        </div>
                        <div id="msgRec" class="auth-msg"></div>
                    </form>
                    <div class="auth-links">
                        <a id="linkVolverLoginRec">Volver a Iniciar Sesión</a>
                    </div>
                </div>

            </div>
        </div>
    `;
    const divContenedor = document.createElement('div');
    divContenedor.innerHTML = modalHTML;
    document.body.appendChild(divContenedor);

    // 3. Lógica de navegación entre vistas
    const overlay = document.getElementById('modalAuthOverlay');
    const cerrarBtn = document.getElementById('cerrarModalAuth');
    
    const vistaLogin = document.getElementById('vistaLogin');
    const vistaRegistro = document.getElementById('vistaRegistro');
    const vistaRecuperar = document.getElementById('vistaRecuperar');

    function cambiarVista(vistaDestino) {
        vistaLogin.style.display = 'none';
        vistaRegistro.style.display = 'none';
        vistaRecuperar.style.display = 'none';
        
        vistaDestino.style.display = 'block';
        
        // Limpiar mensajes y resetear formularios al cambiar
        document.querySelectorAll('.auth-msg').forEach(m => m.textContent = '');
    }

    window.abrirModalAuth = function() {
        const overlay = document.getElementById('modalAuthOverlay');
        const vistaLogin = document.getElementById('vistaLogin');
        
        if (overlay && vistaLogin) {
            // Ocultamos las demás vistas por seguridad y mostramos el login
            const vistaRegistro = document.getElementById('vistaRegistro');
            const vistaRecuperar = document.getElementById('vistaRecuperar');
            
            if (vistaRegistro) vistaRegistro.style.display = 'none';
            if (vistaRecuperar) vistaRecuperar.style.display = 'none';
            
            vistaLogin.style.display = 'block';
            overlay.style.display = 'flex';
        } else {
            console.error("No se encontró el HTML de la modal de autenticación.");
        }
    };

    // Vincular el nuevo botón del header para abrir la modal automáticamente
    const btnLoginNuevo = document.getElementById('btnAbrirLogin');
    if (btnLoginNuevo) {
        btnLoginNuevo.addEventListener('click', (e) => {
            e.preventDefault();
            window.abrirModalAuth();
        });
    }

    function cerrarModal() {
        overlay.style.display = 'none';
        document.getElementById('paso1Recuperar').style.display = 'block';
        document.getElementById('paso2Recuperar').style.display = 'none';
        document.getElementById('formRecuperar').reset();
        document.getElementById('formRegistro').reset();
    }

    cerrarBtn.onclick = cerrarModal;
    overlay.onclick = (e) => { if (e.target === overlay) cerrarModal(); };

    // Enlaces de navegación inferior
    document.getElementById('linkIrRegistro').onclick = () => cambiarVista(vistaRegistro);
    document.getElementById('linkIrRecuperar').onclick = () => cambiarVista(vistaRecuperar);
    document.getElementById('linkVolverLoginReg').onclick = () => cambiarVista(vistaLogin);
    document.getElementById('linkVolverLoginRec').onclick = () => {
        document.getElementById('paso1Recuperar').style.display = 'block';
        document.getElementById('paso2Recuperar').style.display = 'none';
        document.getElementById('formRecuperar').reset();
        cambiarVista(vistaLogin);
    };

    // 4. Conexión con los endpoints del Backend

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
        const preguntaSeguridad = document.getElementById('regPreguntaSeguridad').value;
        const respuestaSeguridad = document.getElementById('regRespuestaSeguridad').value;
        const msg = document.getElementById('msgReg');

        try {
            const res = await fetch('/api/auth/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, preguntaSeguridad, respuestaSeguridad })
            });
            const data = await res.json();
            if (res.ok) {
                msg.style.color = '#4ade80';
                msg.textContent = data.message || '¡Registrado! Cuenta pendiente de aprobación.';
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

    // C. Recuperación (Paso 1)
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

    // Recuperación (Paso 2)
    document.getElementById('formRecuperar').onsubmit = async (e) => {
        e.preventDefault();
        if (document.getElementById('paso1Recuperar').style.display !== 'none') return;

        const respuestaSeguridad = document.getElementById('recRespuestaSeguridad').value;
        const nuevaPassword = document.getElementById('recNuevaPass').value;
        const msg = document.getElementById('msgRec');

        try {
            const res = await fetch('/api/auth/recuperar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: usuarioRecuperacion, 
                    respuestaSeguridad, 
                    nuevaPassword 
                })
            });
            const data = await res.json();
            if (res.ok) {
                msg.style.color = '#4ade80';
                msg.textContent = '¡Contraseña cambiada con éxito!';
                setTimeout(() => {
                    document.getElementById('paso1Recuperar').style.display = 'block';
                    document.getElementById('paso2Recuperar').style.display = 'none';
                    document.getElementById('formRecuperar').reset();
                    cambiarVista(vistaLogin);
                }, 2000);
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
