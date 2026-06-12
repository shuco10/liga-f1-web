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
        // 1. Crear tabla de escuderías
        await pool.query(`
            CREATE TABLE IF NOT EXISTS escuderias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                color_hex VARCHAR(7)
            );
        `);

        // 2. Crear tabla de pilotos con carnet de sanciones integrado
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

        // 3. Inyectar la parrilla oficial F1 2026 si la tabla está vacía
        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            console.log("Inyectando la parrilla oficial de escuderías F1 2026...");
            
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
            
            // Ajustamos el secuenciador automático por si en el futuro creas más
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 11;`);
            
            // Pilotos de prueba iniciales asignados correctamente
            await pool.query(`
                INSERT INTO pilotos (gamertag, plataforma, escuderia_id, victorias, puntos_totales, puntos_sancion) VALUES 
                ('Sainz_Fan_99', 'PS5', 2, 2, 43, 0),
                ('Schumi_Ghost', 'PC', 2, 1, 37, 2),
                ('Max_Checo_Combo', 'PC', 1, 0, 18, 5)
                ON CONFLICT DO NOTHING;
            `);
        }
        console.log("Base de datos de la Liga lista y conectada perfectamente.");
    } catch (err) {
        console.error("Error crítico inicializando la base de datos:", err);
    }
}

// Inicializar DB antes de declarar las rutas de la API
inicializarBaseDeDatos();

// RUTA 1: Obtener la clasificación completa de pilotos, escuderías y carnet de puntos
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

// RUTA 2: Registrar un nuevo piloto en el campeonato
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

// RUTA 3: Añadir puntos y victorias tras una carrera
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

// RUTA 4: Aplicar penalización sumando puntos de sanción al carnet
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

// Encendido oficial del servidor
app.listen(PORT, () => {
    console.log(`Servidor de la liga corriendo con éxito en el puerto ${PORT}`);
});
