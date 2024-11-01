const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { twitchId } = req.query; // Obtener twitchId de la consulta

    try {
        // Consulta a la base de datos para obtener el número de packs del usuario
        console.log(twitchId)
        const result = await pool.query('SELECT packs FROM users WHERE twitch_id = $1', [twitchId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const packs = result.rows[0].packs; // Número de packs del usuario

        // Responder con el número de packs
        res.status(200).json({ packs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el número de packs del usuario' });
    }
};