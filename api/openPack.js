const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Configura las probabilidades de aparición para cada rareza (por ejemplo)
const rarityProbabilities = {
    common: 0.7, // 70%
    rare: 0.2, // 20%
    legendary: 0.1 // 10%
};

module.exports = async(req, res) => {
    const { twitchId } = req.query;
    console.log("Received twitchId:", twitchId);
    try {
        // Verificar si el usuario tiene sobres
        const userResult = await pool.query('SELECT packs FROM users WHERE twitch_id = $1', [twitchId]);
        if (userResult.rows.length === 0 || userResult.rows[0].packs <= 0) {
            return res.status(400).json({ error: 'No tienes sobres disponibles para abrir.' });
        }

        // Obtener cartas de colecciones activas
        const cardsResult = await pool.query(`
            SELECT cards.id, cards.name, cards.rarity, cards.image_url, collections.name AS collection_name
            FROM cards
            JOIN collections ON cards.collection_id = collections.id
            WHERE collections.active = TRUE
        `);

        const activeCards = cardsResult.rows;

        if (activeCards.length === 0) {
            return res.status(404).json({ error: 'No hay cartas en colecciones activas.' });
        }

        // Seleccionar una carta basada en las probabilidades de rareza
        const selectedCard = getRandomCardBasedOnRarity(activeCards);
        if (!selectedCard) {
            return res.status(500).json({ error: 'Error al seleccionar una carta.' });
        }

        // Actualizar sobres y agregar la carta al usuario
        await pool.query(`
            UPDATE users
            SET packs = packs - 1, cards = array_append(cards, $1::text)
            WHERE twitch_id = $2
        `, [selectedCard.id, twitchId]);

        res.status(200).json({
            message: `¡Sobre abierto! Has recibido la carta: ${selectedCard.name}`,
            card: selectedCard
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al abrir el sobre' });
    }
};

// Función para seleccionar una carta al azar en función de la rareza y sus probabilidades
function getRandomCardBasedOnRarity(cards) {
    // Filtrar cartas por rareza
    const cardsByRarity = {
        common: cards.filter(card => card.rarity === 'common'),
        rare: cards.filter(card => card.rarity === 'rare'),
        legendary: cards.filter(card => card.rarity === 'legendary')
    };

    // Seleccionar una rareza basada en las probabilidades
    const random = Math.random();
    let accumulatedProbability = 0;

    for (const [rarity, probability] of Object.entries(rarityProbabilities)) {
        accumulatedProbability += probability;
        if (random < accumulatedProbability) {
            // Seleccionar una carta al azar dentro de la rareza elegida
            const cardsOfChosenRarity = cardsByRarity[rarity];
            return cardsOfChosenRarity[Math.floor(Math.random() * cardsOfChosenRarity.length)];
        }
    }

    return null;
}