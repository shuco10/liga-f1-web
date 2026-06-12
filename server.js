const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Configuración de Express para leer JSON y servir la carpeta pública
app.use(express.json());
app.use(express.static('public'));

async function inicializarBaseDeDatos() {
    try {
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
                puntos_sancion INT DEFAULT 0
            );
        `);

        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            await pool.query(`INSERT INTO escuderias (id, nombre, color_hex) VALUES (1, 'Ferrari', '#E10600'), (2, 'Red Bull', '#0600EF') ON CONFLICT DO NOTHING;`);
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 3;`);
            await pool.query(`
                INSERT INTO pilotos (gamertag, plataforma, escuderia_id, victorias, puntos_totales, puntos_sancion) VALUES 
                ('Sainz_Fan_99', 'PS5', 1, 2, 43, 0),
                ('Schumi_Ghost', 'PC', 1, 1, 37, 2),
                ('Max_Checo_Combo', 'PC', 2, 0, 18, 5);
            `);
        }
        console.log("Base de datos lista y conectada.");
    } catch (err) {
        console.error("Error inicializando la base de datos:", err);
    }
}

// Inicializar DB antes de las rutas
inicializarBaseDeDatos();

// RUTA 1: Obtener la clasificación de pilotos y sanciones
app.get('/api/clasificacion-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT id, gamertag, plataforma, puntos_sancion,
                   (SELECT nombre FROM escuderias WHERE id = escuderia_id) AS escuderia,
                   (SELECT color_hex FROM escuderias WHERE id = escuderia_id) AS color_hex,
                   puntos_totales, victorias
            FROM pilotos
            ORDER BY puntos_totales DESC, victorias DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la consulta de pilotos' });
    }
});

// RUTA 2: Registrar un nuevo piloto
app.post('/api/nuevo-piloto', async (req, res) => {
    const { gamertag, plataforma, escuderia_id } = req.body;
    try {
        await pool.query('INSERT INTO pilotos (gamertag, plataforma, escuderia_id) VALUES ($1, $2, $3)', [gamertag, plataforma, escuderia_id]);
        res.sendStatus(200);
    } catch (err) { 
        console.error(err);
        res.sendStatus(500); 
    }
});

// RUTA 3: Añadir puntos de una carrera
app.post('/api/subir-resultado', async (req, res) => {
    const { piloto_id, posicion_carrera } = req.body;
    const tablaPuntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    const puntosA_Sumar = tablaPuntos[posicion_carrera] || 0;
    const esVictoria = posicion_carrera === 1 ? 1 : 0;

    try {
        await pool.query(`UPDATE pilotos SET puntos_totales = puntos_totales + $1, victorias = victorias + $2 WHERE id = $3`, [puntosA_Sumar, esVictoria, piloto_id]);
        res.sendStatus(200);
    } catch (err) { 
        console.error(err);
        res.sendStatus(500); 
    }
});

// RUTA 4: Descontar puntos de la licencia (Sanción)
app.post('/api/restar-licencia', async (req, res) => {
    const { piloto_id, puntos_restar } = req.body;
    try {
        await pool.query(`UPDATE pilotos SET puntos_sancion = puntos_sancion + $1 WHERE id = $2`, [puntos_restar, piloto_id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// Levantar el servidor Express siempre al final
app.listen(PORT, () => {
    console.log(`Servidor corriendo con éxito en el puerto ${PORT}`);
});
