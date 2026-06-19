const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR CRÍTICO: La variable DATABASE_URL no está llegando al servidor.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static('public'));

async function inicializarBaseDeDatos() {
    try {
        console.log("--- AJUSTANDO BASE DE DATOS CAZADORES DE CURVAS ---");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS escuderias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                color_hex VARCHAR(7)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS pilotos (
                id SERIAL PRIMARY KEY,
                gamertag VARCHAR(100) NOT NULL,
                plataforma VARCHAR(10) NOT NULL,
                escuderia_id INT REFERENCES escuderias(id) ON DELETE SET NULL,
                puntos_totales INT DEFAULT 0,
                victorias INT DEFAULT 0,
                puntos_sancion INT DEFAULT 0,
                numero_piloto INT DEFAULT 0,
                podios INT DEFAULT 0,
                foto_url TEXT DEFAULT '',
                es_reserva INT DEFAULT 0
            );
        `);

        // Parches de columnas por si la tabla ya existía
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS numero_piloto INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS podios INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT '';`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS es_reserva INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'presente';`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS sustituto_id INT DEFAULT NULL;`); } catch(e){}

        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            console.log("Inyectando la parrilla oficial F1 2026...");
            await pool.query(`
                INSERT INTO escuderias (id, nombre, color_hex) VALUES 
                (1, 'Red Bull Racing', '#0600EF'), (2, 'Ferrari', '#E10600'),
                (3, 'Mercedes-AMG', '#27F4D2'), (4, 'McLaren', '#FF8000'),
                (5, 'Aston Martin', '#229971'), (6, 'Alpine', '#FF69B4'),
                (7, 'Williams', '#00A0DE'), (8, 'Visa Cash App RB', '#0078FF'),
                (9, 'Kick Sauber', '#52E252'), (10, 'Haas', '#B6BABD'),
                (11, 'Cadillac', '#FFFFFF')
                ON CONFLICT DO NOTHING;
            `);
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 12;`);
        }

        console.log("🏁 Sistema Cazadores de Curvas Listo Con Soporte Multimedia 🏁");
    } catch (err) {
        console.error("Error crítico inicializando la base de datos:", err);
    }
}

inicializarBaseDeDatos();

// RUTA 1: Obtener clasificación
app.get('/api/lista-de-pilotos', async (req, res) => {
    try {
const querySQL = `
    SELECT id, gamertag, plataforma, puntos_sancion, numero_piloto, podios, escuderia_id, foto_url, es_reserva, 
           estado, sustituto_id, 
           (SELECT nombre FROM escuderias WHERE id = escuderia_id) AS escuderia,
           (SELECT color_hex FROM escuderias WHERE id = escuderia_id) AS color_hex,
           puntos_totales, victorias
    FROM pilotos
    ORDER BY es_reserva ASC, puntos_totales DESC, victorias DESC, podios DESC;
`;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar clasificaciones' });
    }
});

// RUTA 2: Registrar piloto
app.post('/api/nuevo-piloto', async (req, res) => {
    const { gamertag, plataforma, escuderia_id, numero_piloto, foto_url, es_reserva } = req.body;
    try {
        await pool.query(
            'INSERT INTO pilotos (gamertag, plataforma, escuderia_id, numero_piloto, foto_url, es_reserva) VALUES ($1, $2, $3, $4, $5, $6)', 
            [gamertag, plataforma, escuderia_id, numero_piloto, foto_url || '', es_reserva || 0]
        );
        res.sendStatus(200);
    } catch (err) { 
        console.error(err);
        res.sendStatus(500); 
    }
});

app.post('/api/editar-piloto', async (req, res) => {
    const { id, gamertag, numero_piloto, plataforma, escuderia_id, foto_url, es_reserva, estado, sustituto_id } = req.body;
    
    // VALIDACIÓN ESTRICTA: Si es null o undefined, el servidor rechazará la petición
    // Esto te evitará el problema de que se ponga Cadillac por error
    if (!escuderia_id || escuderia_id === 0) {
        console.error("Error: Se intentó guardar un piloto sin escudería válida");
        return res.status(400).send("Error: Escudería no válida");
    }

    try {
        await pool.query(`
            UPDATE pilotos 
            SET gamertag = $1, 
                numero_piloto = $2, 
                plataforma = $3, 
                escuderia_id = $4, 
                foto_url = $5, 
                es_reserva = $6,
                estado = $7,
                sustituto_id = $8
            WHERE id = $9
        `, [gamertag, numero_piloto, plataforma, escuderia_id, foto_url || '', es_reserva || 0, estado, sustituto_id, id]);
        
        res.sendStatus(200);
    } catch (err) {
        console.error("Error al actualizar piloto:", err);
        res.status(500).send("Error al editar el piloto");
    }
});

// RUTA 3: Subir resultados
// CORRECCIÓN en RUTA: Subir resultados (la tabla es 'escuderias')
app.post('/api/subir-resultado', async (req, res) => {
    const { piloto_id, posicion_carrera, escuderia_id } = req.body;
    const tablaPuntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    const puntosA_Sumar = tablaPuntos[posicion_carrera] || 0;
    
    try {
        const equipoParaSumar = escuderia_id || (await pool.query('SELECT escuderia_id FROM pilotos WHERE id = $1', [piloto_id])).rows[0].escuderia_id;

        // Sumar puntos a piloto
        await pool.query('UPDATE pilotos SET puntos_totales = puntos_totales + $1 WHERE id = $2', [puntosA_Sumar, piloto_id]);

        // SUMAR PUNTOS A LA TABLA ESCUDERIAS (Corregido nombre de tabla)
        await pool.query('UPDATE escuderias SET puntos = puntos + $1 WHERE id = $2', [puntosA_Sumar, equipoParaSumar]);

        res.sendStatus(200);
    } catch (err) { 
        console.error("Error al subir resultado:", err);
        res.sendStatus(500); 
    }
});

// Resto de tus rutas (licencias, eliminar, circuitos, resultados) siguen igual
app.post('/api/restar-licencia', async (req, res) => {
    const { piloto_id, puntos_restar } = req.body;
    try {
        await pool.query(`UPDATE pilotos SET puntos_sancion = puntos_sancion + $1 WHERE id = $2`, [puntos_restar, piloto_id]);
        res.sendStatus(200);
    } catch (err) { console.error(err); res.sendStatus(500); }
});

app.post('/api/eliminar-piloto', async (req, res) => {
    const { piloto_id } = req.body;
    try {
        await pool.query('DELETE FROM pilotos WHERE id = $1', [piloto_id]);
        res.sendStatus(200);
    } catch (err) { console.error(err); res.sendStatus(500); }
});

app.post('/api/reset-campeonato', async (req, res) => {
    try {
        await pool.query("UPDATE pilotos SET puntos_totales = 0, victorias = 0, podios = 0, puntos_sancion = 0");
        res.sendStatus(200);
    } catch (err) { console.error(err); res.sendStatus(500); }
});

app.get('/api/circuitos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM circuitos ORDER BY id ASC');
        res.json(rows);
    } catch (err) { console.error(err); res.status(500).send("Error al obtener circuitos"); }
});

app.post('/api/guardar-resultado', async (req, res) => {
    const { circuito_id, piloto_id, posicion } = req.body;
    const puntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    const puntosObtenidos = puntos[posicion] || 0;

    try {
        await pool.query('INSERT INTO resultados_carrera (circuito_id, piloto_id, posicion) VALUES ($1, $2, $3)', [circuito_id, piloto_id, posicion]);
        await pool.query('UPDATE pilotos SET puntos_totales = puntos_totales + $1 WHERE id = $2', [puntosObtenidos, piloto_id]);
        res.sendStatus(200);
    } catch (err) { res.status(500).send("Error al guardar resultado"); }
});

app.get('/api/todos-los-resultados', async (req, res) => {
    const { rows } = await pool.query(`
            SELECT r.*, p.gamertag as piloto_nombre 
            FROM resultados_carrera r
            JOIN pilotos p ON r.piloto_id = p.id
            ORDER BY r.circuito_id ASC, r.posicion ASC;
    `);
    res.json(rows);
});


// --- NUEVAS RUTAS PARA EDICIÓN Y ELIMINACIÓN DE RESULTADOS ---

// 1. ELIMINAR RESULTADO (DELETE)
app.delete('/api/resultados/:id', async (req, res) => {
    // Aquí es donde validarías si es admin. 
    // Ejemplo: si tienes un sistema de sesión o cabeceras:
    // if (req.headers['x-admin-token'] !== 'TU_TOKEN_SECRETO') return res.status(403).send("No autorizado");

    try {
        // Primero obtenemos el resultado para saber cuántos puntos restar al piloto
        const resultado = await pool.query('SELECT piloto_id, posicion FROM resultados_carrera WHERE id = $1', [req.params.id]);
        if (resultado.rows.length === 0) return res.status(404).send("Resultado no encontrado");

        const { piloto_id, posicion } = resultado.rows[0];
        const puntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
        const puntosARestar = puntos[posicion] || 0;

        // Borramos el resultado
        await pool.query('DELETE FROM resultados_carrera WHERE id = $1', [req.params.id]);
        
        // Restamos los puntos al piloto
        await pool.query('UPDATE pilotos SET puntos_totales = puntos_totales - $1 WHERE id = $2', [puntosARestar, piloto_id]);
        
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al eliminar el resultado");
    }
});

// 2. EDITAR POSICIÓN (PUT)
app.put('/api/resultados/:id', async (req, res) => {
    const { posicion } = req.body;
    try {
        // Obtenemos el resultado original
        const resOriginal = await pool.query('SELECT piloto_id, posicion FROM resultados_carrera WHERE id = $1', [req.params.id]);
        const { piloto_id, posicion: posAntigua } = resOriginal.rows[0];

        const puntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
        const diferenciaPuntos = (puntos[posicion] || 0) - (puntos[posAntigua] || 0);

        // Actualizamos resultado y puntos
        await pool.query('UPDATE resultados_carrera SET posicion = $1 WHERE id = $2', [posicion, req.params.id]);
        await pool.query('UPDATE pilotos SET puntos_totales = puntos_totales + $1 WHERE id = $2', [diferenciaPuntos, piloto_id]);
        
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al editar");
    }
});

// Ruta para resetear la base de datos
app.post('/api/reset', async (req, res) => {
    try {
        // Limpiamos los datos acumulados de los pilotos
        await pool.query("UPDATE pilotos SET puntos_totales = 0, victorias = 0, podios = 0, puntos_sancion = 0");
        // Borramos el histórico de resultados de carreras
        await pool.query("DELETE FROM resultados_carrera");
        
        console.log("Base de datos reseteada por el admin");
        res.json({ success: true });
    } catch (err) { 
        console.error("Error al resetear:", err); 
        res.status(500).json({ success: false, message: "Error al borrar los datos" });
    }
});



// PARCHES: METER AQUI LOS PARCHES DE ACTUALIZACION DE TABLAS Y DEMAS


// --- MANTENIMIENTO DE CIRCUITOS (Ejecuta esto una vez y borra) ---


app.get('/api/corregir-circuitos', async (req, res) => {
    try {
        // 1. Eliminamos los erróneos
        await pool.query("DELETE FROM circuitos WHERE nombre IN ('Bahrein', 'Imola')");
        
        // 2. Insertamos Budapest (si no está, no hace nada)
        // Usamos una sentencia que no depende de IDs fijos para evitar errores
        await pool.query(`
            INSERT INTO circuitos (nombre) 
            SELECT 'Budapest' 
            WHERE NOT EXISTS (SELECT 1 FROM circuitos WHERE nombre = 'Budapest')
        `);
        
        res.send("¡Éxito! Bahrein e Imola eliminados y Budapest añadido correctamente.");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error: " + err.message);
    }
});


// PARCHES: METER AQUI LOS PARCHES DE ACTUALIZACION DE TABLAS Y DEMAS


// RUTA: Obtener lista de escuderías
app.get('/api/escuderias', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM escuderias ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error en /api/escuderias:", err);
        res.status(500).json({ error: "Error al obtener escuderías" });
    }
});

app.get('/api/circuitos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM circuitos');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener circuitos" });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor Cazadores de Curvas operativo en puerto ${PORT}`);
});
