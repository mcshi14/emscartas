const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { username } = req.query;
    const { newCardId } = req.body;

    try {
        // Obtener una carta aleatoria de las colecciones activas
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

        // Actualizar sobres y agregar la nueva carta al usuario
        await pool.query('UPDATE users SET packs = packs - 1, cards = array_append(cards, $1) WHERE username = $2 AND packs > 0', [newCard.id, username]);

        res.status(200).json({
            message: `¡Sobre abierto! Has recibido la carta: ${newCard.name}`,
            card: newCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al abrir el sobre' });
    }
};