const { Pool } = require('pg');
const bodyParser = require('body-parser'); // Importa body-parser

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    await new Promise(resolve => bodyParser.json()(req, res, resolve)); // Usar body-parser para parsear JSON

    const { twitchId } = req.body; // Ahora req.body debería estar disponible
    console.log(twitchId); // Log para depuración

    try {
        // Consulta a la base de datos para obtener el número de packs del usuario
        const result = await pool.query('SELECT packs FROM users WHERE twitch_id = $1', twitchId);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const packs = result.rows[0].packs; // Número de packs del usuario
        res.status(200).json({ packs });
    } catch (error) {
        console.error("Error en la consulta a la base de datos:", error);
        res.status(500).json({ error: 'Error al obtener el número de packs del usuario' });
    }
};