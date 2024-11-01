const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    try {
        const result = await pool.query(`
            SELECT cards.id, cards.name, cards.rarity, cards.image_url, collections.name AS collection_name
            FROM cards
            LEFT JOIN collections ON cards.collection_id = collections.id
        `);

        res.status(200).json({ cards: result.rows });
    } catch (error) {
        console.error("Error al obtener todas las cartas:", error);
        res.status(500).json({ error: 'Error al obtener todas las cartas' });
    }
};