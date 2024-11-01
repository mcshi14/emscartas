const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Configura las probabilidades de aparición para cada rareza (por ejemplo)
const rarityProbabilities = {
    common: 0.5, // 70%
    epic: 0.15, // 15%
    rare: 0.25, // 20%
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

function getRandomCardBasedOnRarity(cards) {
    if (cards.length === 0) return null;

    // Contar las cartas por rareza en `cards`
    const rarityCounts = cards.reduce((acc, card) => {
        acc[card.rarity] = (acc[card.rarity] || 0) + 1;
        return acc;
    }, {});

    // Establecer pesos base para cada rareza
    const baseRarityWeights = {
        common: 70,
        rare: 25,
        legendary: 5
    };

    // Ajustar las probabilidades de cada rareza según las cartas disponibles
    const adjustedRarityWeights = {};
    let totalWeight = 0;

    for (const [rarity, baseWeight] of Object.entries(baseRarityWeights)) {
        const availableCards = rarityCounts[rarity] || 0;

        // Si no hay cartas de esta rareza, la probabilidad es cero
        if (availableCards > 0) {
            adjustedRarityWeights[rarity] = baseWeight;
            totalWeight += baseWeight;
        } else {
            adjustedRarityWeights[rarity] = 0;
        }
    }

    // Crear el array de cartas ponderado dinámicamente
    const weightedCards = [];

    cards.forEach(card => {
        const weight = adjustedRarityWeights[card.rarity];
        for (let i = 0; i < weight; i++) {
            weightedCards.push(card);
        }
    });

    // Si no hay cartas ponderadas (por seguridad), retornar null
    if (weightedCards.length === 0) {
        return null;
    }

    // Seleccionar una carta al azar del array ponderado
    const randomIndex = Math.floor(Math.random() * weightedCards.length);
    return weightedCards[randomIndex];
}