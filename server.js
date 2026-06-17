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
                foto_url TEXT DEFAULT ''
            );
        `);

        // Aseguramos que existan todas las columnas necesarias por si la tabla ya existía
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN numero_piloto INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN podios INT DEFAULT 0;`); } catch(e){}
        try { await pool.query(`ALTER TABLE pilotos ADD COLUMN foto_url TEXT DEFAULT '';`); } catch(e){}

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
                (10, 'Haas', '#B6BABD'),
                (11, 'Cadillac', '#FFFFFF')
                ON CONFLICT DO NOTHING;
            `);
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 11;`);
        }

        console.log("🏁 Sistema Cazadores de Curvas Listo Con Soporte Multimedia 🏁");
    } catch (err) {
        console.error("Error crítico inicializando la base de datos:", err);
    }
}

inicializarBaseDeDatos();

// RUTA 1: Obtener clasificación (incluyendo ahora foto_url)
app.get('/api/clasificacion-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT id, gamertag, plataforma, puntos_sancion, numero_piloto, podios, escuderia_id, foto_url,
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

// RUTA 2: Registrar piloto (incluyendo foto_url)
app.post('/api/nuevo-piloto', async (req, res) => {
    const { gamertag, plataforma, escuderia_id, numero_piloto, foto_url } = req.body;
    try {
        await pool.query(
            'INSERT INTO pilotos (gamertag, plataforma, escuderia_id, numero_piloto, foto_url) VALUES ($1, $2, $3, $4, $5)', 
            [gamertag, plataforma, escuderia_id, numero_piloto, foto_url || '']
        );
        res.sendStatus(200);
    } catch (err) { 
        console.error(err);
        res.sendStatus(500); 
    }
});

// RUTA 2B: Editar piloto (incluyendo foto_url)
app.post('/api/editar-piloto', async (req, res) => {
    const { id, gamertag, numero_piloto, plataforma, escuderia_id, foto_url } = req.body;
    try {
        await pool.query(`
            UPDATE pilotos 
            SET gamertag = $1, numero_piloto = $2, plataforma = $3, escuderia_id = $4, foto_url = $5 
            WHERE id = $6
        `, [gamertag, numero_piloto, plataforma, escuderia_id, foto_url || '', id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al editar el piloto");
    }
});

// RUTA 3: Subir resultados
app.post('/api/subir-resultado', async (req, res) => {
    const { piloto_id, posicion_carrera } = req.body;
    const tablaPuntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    
    const puntosA_Sumar = tablaPuntos[posicion_carrera] || 0;
    const esVictoria = posicion_carrera === 1 ? 1 : 0;
    const esPodio = (posicion_carrera >= 1 && posicion_carrera <= 3) ? 1 : 0;

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

// RUTA 6: Resetear Campeonato
app.post('/api/reset-campeonato', async (req, res) => {
    try {
        await pool.query("UPDATE pilotos SET puntos_totales = 0, victorias = 0, podios = 0, puntos_sancion = 0");
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// PARCHE: Crear tablas de circuitos
app.get('/api/instalar-circuitos', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS circuitos (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL);
            CREATE TABLE IF NOT EXISTS resultados_carrera (
                id SERIAL PRIMARY KEY, 
                circuito_id INT REFERENCES circuitos(id),
                piloto_id INT REFERENCES pilotos(id),
                posicion INT NOT NULL
            );
            INSERT INTO circuitos (nombre) VALUES ('Bahrein'), ('Yeda'), ('Melbourne') ON CONFLICT DO NOTHING;
        `);
        res.send("Tablas de circuitos creadas correctamente.");
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor Cazadores de Curvas operativo en puerto ${PORT}`);
});
