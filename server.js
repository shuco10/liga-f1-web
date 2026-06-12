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
        console.log("--- CONFIGURACIÓN FORZADA DE PARRILLA F1 2026 ---");

        // PASO 1: Forzamos la eliminación radical para limpiar residuos antiguos de Ferrari/RedBull
        await pool.query(`DROP TABLE IF EXISTS pilotos, escuderias CASCADE;`);
        console.log("1. Base de datos antigua limpiada a la fuerza.");

        // PASO 2: Creación de la tabla de escuderías oficiales
        await pool.query(`
            CREATE TABLE escuderias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                color_hex VARCHAR(7)
            );
        `);

        // PASO 3: Creación de la tabla de pilotos (puntos_sancion empieza en 0. Si llega a 12, se suspende)
        await pool.query(`
            CREATE TABLE pilotos (
                id SERIAL PRIMARY KEY,
                gamertag VARCHAR(100) NOT NULL,
                plataforma VARCHAR(10) NOT NULL,
                escuderia_id INT REFERENCES escuderias(id) ON DELETE SET NULL,
                puntos_totales INT DEFAULT 0,
                victorias INT DEFAULT 0,
                puntos_sancion INT DEFAULT 0
            );
        `);

        // PASO 4: Inyección garantizada de los 10 equipos de la temporada 2026 con sus colores exactos
        console.log("2. Inyectando la parrilla oficial F1 2026...");
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
            (10, 'Haas', '#B6BABD');
        `);
        
        // Ajustamos el secuenciador automático de IDs para que no choque en el futuro
        await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 11;`);
        
        // PASO 5: Pilotos iniciales de prueba asignados a los nuevos IDs oficiales
        await pool.query(`
            INSERT INTO pilotos (gamertag, plataforma, escuderia_id, victorias, puntos_totales, puntos_sancion) VALUES 
            ('Sainz_Fan_99', 'PS5', 2, 2, 43, 0),
            ('Schumi_Ghost', 'PC', 2, 1, 37, 2),
            ('Max_Checo_Combo', 'PC', 1, 0, 18, 5);
        `);

        console.log("🏁 PARRILLA 2026 INYECTADA Y REINICIADA CON ÉXITO 🏁");
    } catch (err) {
        console.error("Error crítico en la inicialización forzada de la liga:", err);
    }
}

// Arrancar inicialización al ejecutar el servidor
inicializarBaseDeDatos();

// RUTA 1: Obtener clasificaciones y estado del carnet por puntos
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
        res.status(500).json({ error: 'Error al consultar clasificaciones' });
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

// RUTA 3: Subir resultados de carrera y aplicar puntos de la FIA
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

// RUTA 4: Aplicar sanciones O quitar puntos (¡Admite números negativos!)
app.post('/api/restar-licencia', async (req, res) => {
    const { piloto_id, puntos_restar } = req.body;
    try {
        // Al sumar un número negativo, restamos puntos de sanción (devolviendo vida al carnet)
        await pool.query(`UPDATE pilotos SET puntos_sancion = puntos_sancion + $1 WHERE id = $2`, [puntos_restar, piloto_id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// Encendido del servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
