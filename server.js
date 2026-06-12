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

// 1. FUNCIÓN AUTOMÁTICA PARA CREAR TABLAS (ASEGURANDO EL ORDEN)
async function inicializarBaseDeDatos() {
    try {
        // Crear tabla de escuderías si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS escuderias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                color_hex VARCHAR(7)
            );
        `);

        // Crear tabla de pilotos si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pilotos (
                id SERIAL PRIMARY KEY,
                gamertag VARCHAR(100) NOT NULL,
                plataforma VARCHAR(10) NOT NULL,
                escuderia_id INT REFERENCES escuderias(id) ON DELETE SET NULL,
                puntos_totales INT DEFAULT 0,
                victorias INT DEFAULT 0
            );
        `);

        // Comprobar si ya hay escuderías metidas
        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            console.log("Base de datos vacía. Insertando datos de prueba oficiales...");
            
            // Insertamos las escuderías fijas de prueba
            await pool.query(`INSERT INTO escuderias (id, nombre, color_hex) VALUES (1, 'Ferrari', '#E10600'), (2, 'Red Bull', '#0600EF') ON CONFLICT DO NOTHING;`);
            
            // Forzamos a que el contador de IDs de escuderías empiece en el 3 para que no choque en el futuro
            await pool.query(`ALTER SEQUENCE escuderias_id_seq RESTART WITH 3;`);

            // Insertamos pilotos de prueba
            await pool.query(`
                INSERT INTO pilotos (gamertag, plataforma, escuderia_id, victorias, puntos_totales) VALUES 
                ('Sainz_Fan_99', 'PS5', 1, 2, 43),
                ('Schumi_Ghost', 'PC', 1, 1, 37),
                ('Max_Checo_Combo', 'PC', 2, 0, 18);
            `);
        }
        console.log("¡Estructura de la base de datos creada y verificada con éxito!");
        
        // SÓLO CUANDO LAS TABLAS ESTÁN LISTAS, LEVANTAMOS EL SERVIDOR
        app.listen(PORT, () => {
            console.log(`Servidor de la liga corriendo con éxito en el puerto ${PORT}`);
        });

    } catch (err) {
        console.error("Error crítico al inicializar las tablas de la base de datos:", err);
    }
}

// Arrancamos el proceso seguro
inicializarBaseDeDatos();

// RUTA 1: Obtener la clasificación para los pilotos (index.html y admin.html)
app.get('/api/clasificacion-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT id, gamertag, plataforma, 
                   (SELECT nombre FROM escuderias WHERE id = escuderia_id) AS escuderia,
                   (SELECT color_hex FROM escuderias WHERE id = escuderia_id) AS color_hex,
                   puntos_totales, victorias
            FROM pilotos
            ORDER BY puntos_totales DESC, victorias DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error("Error en la ruta /api/clasificacion-pilotos:", err);
        res.status(500).json({ error: 'Error en la consulta de pilotos' });
    }
});

// RUTA 2: Guardar un nuevo piloto desde el panel de control
app.post('/api/nuevo-piloto', async (req, res) => {
    const { gamertag, plataforma, escuderia_id } = req.body;
    try {
        await pool.query(
            'INSERT INTO pilotos (gamertag, plataforma, escuderia_id) VALUES ($1, $2, $3)',
            [gamertag, plataforma, escuderia_id]
        );
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// RUTA 3: Sumar el resultado de una carrera a un piloto existente
app.post('/api/subir-resultado', async (req, res) => {
    const { piloto_id, posicion_carrera } = req.body;
    
    // Función de puntos integrada
    const tablaPuntos = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    const puntosA_Sumar = tablaPuntos[posicion_carrera] || 0;
    const esVictoria = posicion_carrera === 1 ? 1 : 0;

    try {
        await pool.query(`
            UPDATE pilotos 
            SET puntos_totales = puntos_totales + $1,
                victorias = victorias + $2
            WHERE id = $3
        `, [puntosA_Sumar, esVictoria, piloto_id]);

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al procesar la carrera.");
    }
});
