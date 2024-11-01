const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { twitchId } = req.query; // Obtener twitchId desde la URL como parámetro de consulta
    const { newCardId } = req.body;

    try {
        // Obtener la carta seleccionada por su ID
        const cardResult = await pool.query(`
            SELECT cards.id, cards.name, cards.rarity, cards.image_url, collections.name AS collection_name
            FROM cards
            LEFT JOIN collections ON cards.collection_id = collections.id
            WHERE cards.id = $1
        `, [newCardId]);

        if (cardResult.rows.length === 0) {
            return res.status(404).json({ error: 'Carta no encontrada' });
        }

        const newCard = cardResult.rows[0];

        // Actualizar sobres y agregar la nueva carta al usuario usando twitchId
        const updateResult = await pool.query(`
            UPDATE users
            SET packs = packs - 1, cards = array_append(cards, $1::text)
            WHERE twitch_id = $2 AND packs > 0
            RETURNING packs
        `, [newCard.id, twitchId]);

        if (updateResult.rows.length === 0) {
            return res.status(400).json({ error: 'No tienes sobres disponibles para abrir.' });
        }

        res.status(200).json({
            message: `¡Sobre abierto! Has recibido la carta: ${newCard.name}`,
            card: newCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al abrir el sobre' });
    }
};