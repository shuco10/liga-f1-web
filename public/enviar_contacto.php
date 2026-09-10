<?php
session_start();
header('Content-Type: application/json');

// 1. COMPROBAR SI EL USUARIO HA INICIADO SESIÓN
// (Asegúrate de que 'usuario_id' coincide con la variable de sesión que usas en tu login)
if (!isset($_SESSION['usuario_id'])) {
    echo json_encode(['success' => false, 'error' => 'Debes iniciar sesión para enviar mensajes.']);
    exit;
}

$usuario_id = $_SESSION['usuario_id'];

// 2. CONECTAR A LA BASE DE DATOS Y VERIFICAR SI ESTÁ ACTIVO
// (Ajusta los datos de conexión a tu base de datos)
$conexion = new mysqli("localhost", "tu_usuario", "tu_contraseña", "tu_base_de_datos");

if ($conexion->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Error de conexión con el servidor.']);
    exit;
}

$stmt = $conexion->prepare("SELECT activo FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $usuario_id);
$stmt->execute();
$resultado = $stmt->get_result();

if ($resultado->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Usuario no encontrado.']);
    exit;
}

$usuario = $resultado->fetch_assoc();
$stmt->close();
$conexion->close();

// Comprobamos que el campo booleano 'activo' sea verdadero
if (!$usuario['activo']) { 
    echo json_encode(['success' => false, 'error' => 'Tu cuenta aún no está activa para enviar mensajes.']);
    exit;
}

// 3. RECIBIR LOS DATOS DEL FORMULARIO JSON
$input = json_decode(file_get_contents('php://input'), true);
$nombre = trim($input['nombre'] ?? '');
$asunto = trim($input['asunto'] ?? '');
$mensaje = trim($input['mensaje'] ?? '');

if (empty($nombre) || empty($asunto) || empty($mensaje)) {
    echo json_encode(['success' => false, 'error' => 'Por favor, rellena todos los campos.']);
    exit;
}

// 4. ENVIAR AL WEBHOOK DE DISCORD DESDE EL BACKEND (¡URL Segura oculta al cliente!)
$webhookUrl = 'https://discord.com/api/webhooks/1517947890415440045/mSZebdMcmNQpvmE1CafNS2BLLW1j74bOrYQXE8dGt43tN4rylqDvpNCr4KZ68DRDAK9x';

$payload = [
    "content" => "📢 @admin 📢 **¡Nuevo contacto desde la web!** 📢",
    "embeds" => [[
        "title" => "📩 Nuevo mensaje de contacto",
        "color" => 3447003,
        "fields" => [
            ["name" => "Nombre", "value" => $nombre, "inline" => true],
            ["name" => "Asunto", "value" => $asunto, "inline" => true],
            ["name" => "Mensaje", "value" => $mensaje]
        ],
        "timestamp" => date(DATE_ISO8601)
    ]]
];

$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Error al comunicar con Discord.']);
}
?>
