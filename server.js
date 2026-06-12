const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static('public'));

async function inicializarBaseDeDatos() {
    try {
        console.log("--- ACTUALIZANDO TABLAS CON DORSAL Y PODIOS ---");

        // 1. Crear tabla de escuderías si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS escuderias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                color_hex VARCHAR(7)
            );
        `);

        // 2. Crear o actualizar tabla de pilotos (incluyendo numero_piloto y podios)
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
                podios INT DEFAULT 0
            );
        `);

        // Migración rápida: Por si la tabla existía pero no tenía estas columnas nuevas
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN numero_piloto INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN podios INT DEFAULT 0;`); } catch(e){}

        // 3. Rellenar escuderías 2026 si estuviera vacía
        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            console.log("Inyectando la parrilla oficial F1 2026...");
            await pool.query(`
                INSERT INTO escuderias (id, nombre, color_hex) VALUES 
                (1, 'Red Bull Racing', '#0600EF'),
                (2, 'Ferrari', '#E10600'),
                (3, 'Mercedes-AMG', '#27F4D2'),
                (4, 'McLaren', '#FF8000'),
                (5, 'Aston Martin', '#229971'),
                (6, 'Alpine', '#0078FF'),
                (7, 'Williams', '#00A0DE'),
                (8, 'Visa Cash App RB', '#6600FF'),
                (9, 'Kick Sauber', '#52E252'),
                (10, 'Haas', '#B6BABD')
                ON CONFLICT DO NOTHING;
            `);
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 11;`);
        }

        console.log("🏁 Base de datos actualizada y lista 🏁");
    } catch (err) {
        console.error("Error inicializando la base de datos:", err);
    }
}

inicializarBaseDeDatos();

// RUTA 1: Obtener clasificación (incluyendo el dorsal y los podios)
app.get('/api/clasificacion-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT id, gamertag, plataforma, puntos_sancion, numero_piloto, podios,
                   (SELECT nombre FROM escuderias WHERE id = escuderia_id) AS escuderia,
                   (SELECT color_hex FROM escuderias WHERE id = escuderia_id) AS color_hex,
                   puntos_totales, victorias
            FROM pilotos
            ORDER BY puntos_totales DESC, victorias DESC, podios DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar clasificaciones' });
    }
});

// RUTA 2: Registrar piloto solicitando también su número de dorsal
app.post('/api/nuevo-piloto', async (req, res) => {
    const { gamertag, plataforma, escuderia_id, numero_piloto } = req.body;
    try {
        await pool.query(
            'INSERT INTO pilotos (gamertag, plataforma, escuderia_id, numero_piloto) VALUES ($1, $2, $3, $4)', 
            [gamertag, plataforma, escuderia_id, numero_piloto]
        );
        res.sendStatus(200);
    } catch (err) { 
        console.error(err);
        res.sendStatus(500); 
    }
});

// RUTA 3: Subir resultados (Suma puntos, victorias y calcula automáticamente si es podio: pos 1, 2 o 3)
app.post('/api/subir-resultado', async (req, res) => {
    const { piloto_id, posicion_carrera } = req.body;
    const tablaPuntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    
    const puntosA_Sumar = tablaPuntos[posicion_carrera] || 0;
    const esVictoria = posicion_carrera === 1 ? 1 : 0;
    const esPodio = (posicion_carrera >= 1 && posicion_carrera <= 3) ? 1 : 0; // Posición 1, 2 o 3 suma podio

    try {
        await pool.query(`
            UPDATE pilotos 
            SET puntos_totales = puntos_totales + $1, 
                victorias = victorias + $2,
                podios = podios + $3
            WHERE id = $4
        `, [puntosA_Sumar, esVictoria, esPodio, piloto_id]);
        res.sendStatus(200);
    } catch (err) { 
        console.error(err);
        res.sendStatus(500); 
    }
});

// RUTA 4: Aplicar o quitar sanciones
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

// RUTA 5: Eliminar piloto
app.post('/api/eliminar-piloto', async (req, res) => {
    const { piloto_id } = req.body;
    try {
        await pool.query('DELETE FROM pilotos WHERE id = $1', [piloto_id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
