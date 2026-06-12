const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// FUNCIÓN AUTOMÁTICA PARA CREAR TABLAS Y METER DATOS DE PRUEBA
async function inicializarBaseDeDatos() {
    try {
        // 1. Crear tabla de escuderías si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS escuderias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                color_hex VARCHAR(7)
            );
        `);

        // 2. Crear tabla de pilotos si no existe
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

        // 3. Comprobar si ya hay escuderías. Si está vacío, metemos datos de prueba
        const resEscuderias = await pool.query('SELECT COUNT(*) FROM escuderias');
        if (parseInt(resEscuderias.rows[0].count) === 0) {
            console.log("Base de datos vacía. Insertando datos de prueba oficiales...");
            
            // Insertamos Ferrari y Red Bull
            await pool.query(`INSERT INTO escuderias (nombre, color_hex) VALUES ('Ferrari', '#E10600'), ('Red Bull', '#0600EF');`);
            
            // Insertamos 3 pilotos de prueba asignados a esas escuderías (ID 1 y ID 2)
            await pool.query(`
                INSERT INTO pilotos (gamertag, plataforma, escuderia_id, victorias, puntos_totales) VALUES 
                ('Sainz_Fan_99', 'PS5', 1, 2, 43),
                ('Schumi_Ghost', 'PC', 1, 1, 37),
                ('Max_Checo_Combo', 'PC', 2, 0, 18);
            `);
        }
        console.log("Estructura de la base de datos verificada correctamente.");
    } catch (err) {
        console.error("Error al inicializar las tablas:", err);
    }
}

// Llamamos a la función al arrancar el servidor
inicializarBaseDeDatos();

app.use(express.json());
app.use(express.static('public'));

// RUTA WEB: Obtener pilotos ordenador por puntos
app.get('/api/clasificacion-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT 
                p.gamertag,
                p.plataforma,
                e.nombre AS escuderia,
                e.color_hex,
                p.puntos_totales,
                p.victorias
            FROM pilotos p
            LEFT JOIN escuderias e ON p.escuderia_id = e.id
            ORDER BY p.puntos_totales DESC, p.victorias DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la consulta' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de la liga corriendo en el puerto ${PORT}`);
});
