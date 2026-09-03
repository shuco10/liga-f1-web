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
                color_hex VARCHAR(7),
                estrellas INT DEFAULT 2,
                mundiales INT DEFAULT 0
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS resoluciones (
                id SERIAL PRIMARY KEY,
                reclamante VARCHAR(100),
                reclamado VARCHAR(100),
                articulo VARCHAR(50),
                explicacion TEXT,
                sancion VARCHAR(255),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS resultados (
                id SERIAL PRIMARY KEY,
                id_piloto INTEGER,
                id_gp INTEGER,
                posicion INTEGER,
                puntos INTEGER,
                escuderia_puntos INTEGER
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS resultados_carrera (
                id SERIAL PRIMARY KEY,
                circuito_id INTEGER,
                piloto_id INTEGER,
                posicion INTEGER
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS circuitos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS registro_avisos (
                id SERIAL PRIMARY KEY,
                id_piloto INTEGER,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS draft_parejas (
                id SERIAL PRIMARY KEY,
                id_piloto1 INT,
                id_piloto2 INT,
                id_escuderia INT
            );
        `);
       
        await pool.query(`
            CREATE TABLE IF NOT EXISTS noticias (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(200),
                contenido TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pilotos (
                id SERIAL PRIMARY KEY,
                gamertag VARCHAR(100) NOT NULL,
                plataforma VARCHAR(10) NOT NULL,
                escuderia_id INT,
                puntos_totales INT DEFAULT 0,
                victorias INT DEFAULT 0,
                puntos_sancion INT DEFAULT 0,
                numero_piloto INT DEFAULT 0,
                podios INT DEFAULT 0,
                poles INT DEFAULT 0,
                mundiales INT DEFAULT 0,
                foto_url TEXT DEFAULT '',
                es_reserva INT DEFAULT 0,
                penalizacion_tiempo INT DEFAULT 0,
                estrellas INT DEFAULT 3
            );
        `);

        // Parches de columnas por si ya existían las tablas
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS numero_piloto INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS podios INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS poles INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS mundiales INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT '';`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS es_reserva INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS penalizacion_tiempo INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN IF NOT EXISTS estrellas INT DEFAULT 3;`); } catch(e){}
        try { await pool.query(`ALTER TABLE escuderias ADD COLUMN IF NOT EXISTS estrellas INT DEFAULT 2;`); } catch(e){}
        try { await pool.query(`ALTER TABLE escuderias ADD COLUMN IF NOT EXISTS mundiales INT DEFAULT 0;`); } catch(e){}

        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            console.log("Inyectando la parrilla oficial F1...");
            await pool.query(`
                INSERT INTO escuderias (id, nombre, color_hex) VALUES 
                (1, 'Red Bull Racing', '#0600EF'), (2, 'Ferrari', '#E10600'),
                (3, 'Mercedes-AMG', '#27F4D2'), (4, 'McLaren', '#FF8000'),
                (5, 'Aston Martin', '#229971'), (6, 'Alpine', '#FF69B4'),
                (7, 'Williams', '#00A0DE'), (8, 'Visa Cash App RB', '#0078FF'),
                (9, 'Audi', '#52E252'), (10, 'Haas', '#B6BABD'),
                (11, 'Cadillac', '#FFFFFF')
                ON CONFLICT DO NOTHING;
            `);
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 12;`);
        }

        console.log("🏁 Sistema Cazadores de Curvas Listo 🏁");
    } catch (err) {
        console.error("Error crítico inicializando la base de datos:", err);
    }
}

inicializarBaseDeDatos();

// ==========================================
// RUTAS DE PILOTOS (ÚNICA DEFINICIÓN)
// Devuelve tanto las estadísticas de clasificación como las estrellas y escudería para el draft.
// ==========================================
app.get('/api/lista-de-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT 
                p.id, 
                p.gamertag, 
                p.plataforma, 
                p.puntos_sancion, 
                p.numero_piloto, 
                p.podios, 
                p.poles,
                p.mundiales,
                p.estrellas,
                p.escuderia_id, 
                p.foto_url, 
                p.es_reserva, 
                p.penalizacion_tiempo, 
                p.puntos_totales, 
                p.victorias,
                COALESCE((SELECT COUNT(*) FROM registro_avisos WHERE id_piloto = p.id), 0)::int AS total_avisos,
                e.nombre AS escuderia,
                e.color_hex,
                e.estrellas AS escuderia_estrellas
            FROM pilotos p
            LEFT JOIN escuderias e ON p.escuderia_id = e.id
            ORDER BY p.es_reserva ASC, p.puntos_totales DESC, p.victorias DESC, p.podios DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error("Error en lista-de-pilotos:", err);
        res.status(500).json({ error: 'Error al consultar clasificaciones' });
    }
});

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
    const { id, gamertag, numero_piloto, plataforma, escuderia_id, foto_url, es_reserva } = req.body;
    try {
        await pool.query(`
            UPDATE pilotos 
            SET gamertag = $1, numero_piloto = $2, plataforma = $3, escuderia_id = $4, foto_url = $5, es_reserva = $6 
            WHERE id = $7
        `, [gamertag, numero_piloto, plataforma, escuderia_id, foto_url || '', es_reserva || 0, id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al editar el piloto");
    }
});

app.post('/api/eliminar-piloto', async (req, res) => {
    const { piloto_id } = req.body;
    try {
        await pool.query('DELETE FROM pilotos WHERE id = $1', [piloto_id]);
        res.sendStatus(200);
    } catch (err) { 
        if (err.code === '23503') {
            return res.status(400).send("No se puede eliminar al piloto: ya tiene puntos o resultados registrados.");
        }
        console.error("Error al eliminar:", err); 
        res.sendStatus(500); 
    }
});

// ==========================================
// RUTAS DE ESCUDERÍAS
// ==========================================
app.get('/api/escuderias', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM escuderias');
        res.json(rows);
    } catch (err) { 
        res.status(500).send("Error al obtener escuderías"); 
    }
});

app.get('/api/lista-de-escuderias', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nombre, estrellas, color_hex FROM escuderias ORDER BY nombre ASC;');
        res.json(rows);
    } catch (err) {
        console.error("Error al listar escuderías:", err);
        res.status(500).json({ error: "Error al listar escuderías" });
    }
});

// ==========================================
// RUTAS DE DRAFT (ÚNICO BLOQUE UNIFICADO)
// ==========================================
app.get('/api/draft-parejas', async (req, res) => {
    try {
        const query = `
            SELECT 
                dp.id,
                dp.id_piloto1,
                dp.id_piloto2,
                dp.id_escuderia,
                p1.gamertag AS nombre1,
                p1.estrellas AS estrellas1,
                p2.gamertag AS nombre2,
                p2.estrellas AS estrellas2,
                e.nombre AS escuderia_nombre,
                e.estrellas AS estrellas_escuderia
            FROM draft_parejas dp
            JOIN pilotos p1 ON dp.id_piloto1 = p1.id
            JOIN pilotos p2 ON dp.id_piloto2 = p2.id
            LEFT JOIN escuderias e ON dp.id_escuderia = e.id
            ORDER BY dp.id ASC;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener parejas:", err);
        res.status(500).json({ error: "Error al obtener parejas" });
    }
});

app.post('/api/draft-parejas', async (req, res) => {
    const { id1, id2 } = req.body;
    try {
        await pool.query(
            'INSERT INTO draft_parejas (id_piloto1, id_piloto2) VALUES ($1, $2)',
            [id1, id2]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error al guardar pareja:", err);
        res.status(500).json({ error: "Error al guardar pareja" });
    }
});

app.put('/api/draft-parejas/:id/escuderia', async (req, res) => {
    const { id_escuderia } = req.body;
    try {
        const valorEscuderia = (id_escuderia !== undefined && id_escuderia !== null && id_escuderia !== '') 
            ? parseInt(id_escuderia, 10) 
            : null;

        await pool.query(
            'UPDATE draft_parejas SET id_escuderia = $1 WHERE id = $2',
            [valorEscuderia, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error al asignar escudería:", err);
        res.status(500).json({ error: "Error al asignar escudería" });
    }
});

app.delete('/api/draft-parejas/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM draft_parejas WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error al eliminar pareja:", err);
        res.status(500).json({ error: "Error al eliminar pareja" });
    }
});

app.delete('/api/draft-parejas', async (req, res) => {
    try {
        await pool.query('DELETE FROM draft_parejas;');
        res.json({ success: true });
    } catch (err) {
        console.error("Error al resetear draft:", err);
        res.status(500).json({ error: "Error al resetear draft" });
    }
});

// ==========================================
// ACTUALIZACIÓN DE ESTRELLAS
// ==========================================
app.put('/api/pilotos/:id/estrellas', async (req, res) => {
    const { estrellas } = req.body;
    try {
        await pool.query('UPDATE pilotos SET estrellas = $1 WHERE id = $2', [estrellas, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error al actualizar estrellas del piloto:", err);
        res.status(500).json({ error: "Error al actualizar estrellas" });
    }
});

app.put('/api/escuderias/:id/estrellas', async (req, res) => {
    const { estrellas } = req.body;
    try {
        await pool.query('UPDATE escuderias SET estrellas = $1 WHERE id = $2', [estrellas, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error al actualizar estrellas de la escudería:", err);
        res.status(500).json({ error: "Error al actualizar estrellas" });
    }
});

// ==========================================
// RESTO DE RUTAS (Noticias, Sanciones, Resultados, etc.)
// ==========================================
app.get('/api/noticias', async (req, res) => {
    const result = await pool.query("SELECT * FROM noticias ORDER BY fecha DESC");
    res.json(result.rows);
});

app.post('/api/noticias', async (req, res) => {
    const { titulo, contenido } = req.body;
    await pool.query("INSERT INTO noticias (titulo, contenido) VALUES ($1, $2)", [titulo, contenido]);
    res.json({ success: true });
});

app.delete('/api/noticias/:id', async (req, res) => {
    await pool.query("DELETE FROM noticias WHERE id = $1", [req.params.id]);
    res.json({ success: true });
});

app.get('/api/resoluciones', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM resoluciones ORDER BY fecha DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error al cargar resoluciones" });
    }
});

app.post('/api/resoluciones', async (req, res) => {
    const { reclamante, reclamado, articulo, explicacion, sancion } = req.body;
    try {
        await pool.query(
            "INSERT INTO resoluciones (reclamante, reclamado, articulo, explicacion, sancion) VALUES ($1, $2, $3, $4, $5)",
            [reclamante, reclamado, articulo, explicacion, sancion]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar resolución" });
    }
});

app.delete('/api/resoluciones/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM resoluciones WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar resolución" });
    }
});

app.post('/api/aplicar-avisos', async (req, res) => {
    const { piloto_id } = req.body;
    try {
        await pool.query('INSERT INTO registro_avisos (id_piloto) VALUES ($1)', [piloto_id]);
        const countRes = await pool.query('SELECT COUNT(*) FROM registro_avisos WHERE id_piloto = $1', [piloto_id]);
        const totalAvisos = parseInt(countRes.rows[0].count);
        res.status(200).json({ totalAvisos });
    } catch (err) { 
        res.status(500).send("Error"); 
    }
});

app.post('/api/actualizar-pole', async (req, res) => {
    const { piloto_id } = req.body;
    try {
        await pool.query("UPDATE pilotos SET poles = COALESCE(poles, 0) + 1 WHERE id = $1", [piloto_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sumar-mundial-piloto', async (req, res) => {
    const { piloto_id } = req.body;
    try {
        await pool.query("UPDATE pilotos SET mundiales = mundiales + 1 WHERE id = $1", [piloto_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sumar-mundial-escuderia', async (req, res) => {
    const { escuderia_id } = req.body;
    try {
        await pool.query("UPDATE escuderias SET mundiales = mundiales + 1 WHERE id = $1", [escuderia_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reset-campeonato', async (req, res) => {
    try {
        await pool.query("UPDATE pilotos SET puntos_totales = 0, victorias = 0, podios = 0, puntos_sancion = 0, poles = 0");
        res.sendStatus(200);
    } catch (err) { res.sendStatus(500); }
});


// ==========================================
// RUTA DE CLASIFICACIÓN DE CONSTRUCTORES
// ==========================================
app.get('/api/clasificacion-constructores', async (req, res) => {
    try {
        const querySQL = `
            SELECT 
                e.id, 
                e.nombre, 
                e.color_hex, 
                e.estrellas,
                e.mundiales,
                COALESCE(SUM(p.puntos_totales), 0)::int AS puntos_totales,
                COALESCE(SUM(p.victorias), 0)::int AS victorias,
                COALESCE(SUM(p.podios), 0)::int AS podios
            FROM escuderias e
            LEFT JOIN pilotos p ON p.escuderia_id = e.id
            GROUP BY e.id, e.nombre, e.color_hex, e.estrellas, e.mundiales
            ORDER BY puntos_totales DESC, victorias DESC, podios DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener la clasificación de constructores:", err);
        res.status(500).json({ error: 'Error al consultar constructores' });
    }
});

// ==========================================
// RUTA DE PILOTOS PARA DESPLEGABLES (ADMIN / GESTIÓN)
// ==========================================
app.get('/api/pilotos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, gamertag, numero_piloto, escuderia_id, estrellas, es_reserva FROM pilotos ORDER BY gamertag ASC;');
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener pilotos para desplegables:", err);
        res.status(500).json({ error: 'Error al obtener lista de pilotos' });
    }
});



app.listen(PORT, () => {
    console.log(`Servidor Cazadores de Curvas operativo en puerto ${PORT}`);
});
