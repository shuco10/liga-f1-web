const express = require('express');
const { Pool } = require('pg'); // Cambiado a 'pg' para PostgreSQL en Render
const app = express();
// El hosting nos asignará un puerto automáticamente en producción, si no, usa el 3000
const PORT = process.env.PORT || 3000; 

// Configuración segura conectada al hosting
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render nos dará este enlace largo
    ssl: { rejectUnauthorized: false } // Requisito de seguridad para conexiones en la nube
});

app.use(express.json());
app.use(express.static('public'));

// RUTA: Obtener la clasificación del Mundial de Pilotos
app.get('/api/clasificacion-pilotos', async (req, res) => {
    try {
        const querySQL = `
            SELECT 
                p.gamertag,
                p.plataforma,
                e.nombre AS escuderia,
                e.color_hex,
                COALESCE(SUM(r.puntos_obtenidos), 0) AS puntos_totales,
                COALESCE(SUM(CASE WHEN r.posicion_carrera = 1 THEN 1 ELSE 0 END), 0) AS victorias
            FROM pilotos p
            LEFT JOIN escuderias e ON p.escuderia_id = e.id
            LEFT JOIN resultados r ON p.id = r.piloto_id
            GROUP BY p.id, p.gamertag, p.plataforma, e.nombre, e.color_hex
            ORDER BY puntos_totales DESC, victorias DESC;
        `;
        const { rows } = await pool.query(querySQL);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los datos de la liga' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de la liga corriendo en el puerto ${PORT}`);
});
