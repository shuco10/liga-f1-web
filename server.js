const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const db = new sqlite3.Database('./liga_f1.db');

app.use(bodyParser.json());
app.use(express.static('public'));

// Obtener clasificación
app.get('/api/clasificacion-pilotos', (req, res) => {
    db.all("SELECT p.*, e.nombre as escuderia, e.color_hex FROM pilotos p LEFT JOIN escuderias e ON p.escuderia_id = e.id ORDER BY p.puntos_totales DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// Guardar nuevo piloto
app.post('/api/nuevo-piloto', (req, res) => {
    const { gamertag, numero_piloto, foto_url, plataforma, escuderia_id } = req.body;
    db.run("INSERT INTO pilotos (gamertag, numero_piloto, foto_url, plataforma, escuderia_id, puntos_totales, victorias, puntos_sancion) VALUES (?,?,?,?,?,0,0,0)", 
    [gamertag, numero_piloto, foto_url, plataforma, escuderia_id], (err) => {
        res.sendStatus(err ? 500 : 200);
    });
});

// Subir resultado (suma puntos según posición)
app.post('/api/subir-resultado', (req, res) => {
    const { piloto_id, posicion_carrera } = req.body;
    const puntos = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][posicion_carrera - 1] || 0;
    const esVictoria = posicion_carrera == 1 ? 1 : 0;
    db.run("UPDATE pilotos SET puntos_totales = puntos_totales + ?, victorias = victorias + ? WHERE id = ?", [puntos, esVictoria, piloto_id], (err) => {
        res.sendStatus(err ? 500 : 200);
    });
});

// Restar puntos de licencia
app.post('/api/restar-licencia', (req, res) => {
    const { piloto_id, puntos_restar } = req.body;
    db.run("UPDATE pilotos SET puntos_sancion = puntos_sancion + ? WHERE id = ?", [puntos_restar, piloto_id], (err) => {
        res.sendStatus(err ? 500 : 200);
    });
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));
