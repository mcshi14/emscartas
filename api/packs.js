const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { twitchId } = req.query; // Obtener twitchId desde los parámetros de consulta

    console.log("Received twitchId:", twitchId); // Log para verificar que twitchId se recibe

    try {
        const result = await pool.query('SELECT packs FROM users WHERE twitch_id = $1', [twitchId]);

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