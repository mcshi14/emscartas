const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { twitchId } = req.query; // Obtener twitchId de la consulta

    if (!twitchId) {
        return res.status(400).json({ error: 'twitchId es requerido' }); // Validación adicional para twitchId
    }

    try {
        // Obtener el usuario por twitchId
        const userResult = await pool.query('SELECT * FROM users WHERE twitch_id = $1', [twitchId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userData = userResult.rows[0];

        // Obtener detalles de las cartas del usuario
        const cardIds = userData.cards || []; // Manejar casos en que cards sea null
        if (cardIds.length === 0) {
            return res.status(200).json({
                twitchId: userData.twitch_id,
                packs: userData.packs,
                cards: [] // Responder con una lista vacía si el usuario no tiene cartas
            });
        }

        const cardDetails = await pool.query(`
            SELECT cards.id, cards.name, cards.rarity, cards.image_url, collections.name AS collection_name
            FROM cards
            LEFT JOIN collections ON cards.collection_id = collections.id
            WHERE cards.id = ANY($1::int[])
        `, [cardIds]);

        // Enviar la respuesta con los datos del usuario y sus cartas
        res.status(200).json({
            twitchId: userData.twitch_id,
            packs: userData.packs,
            cards: cardDetails.rows
        });
    } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
        res.status(500).json({ error: 'Error al obtener los datos del usuario' });
    }
};