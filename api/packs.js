const { Pool } = require('pg');
const bodyParser = require('body-parser');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    await new Promise(resolve => bodyParser.json()(req, res, resolve));

    console.log("Cuerpo de la solicitud recibido:", req.body); // Log detallado de req.body completo

    const { twitchId } = req.body;
    console.log("twitchId extraído:", twitchId); // Log del twitchId extraído
    return res.status(404).json({ error: twitchId });
    try {
        const result = await pool.query('SELECT packs FROM users WHERE twitch_id = $1', [twitchId]);
        console.log("Resultado de la consulta:", result.rows); // Log del resultado de la consulta

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const packs = result.rows[0].packs;
        res.status(200).json({ packs });
    } catch (error) {
        console.error("Error en la consulta a la base de datos:", error);
        res.status(500).json({ error: 'Error al obtener el número de packs del usuario' });
    }
};