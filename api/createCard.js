const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { name, rarity, image_url, collection_id } = req.query;

    try {
        const result = await pool.query(
            'INSERT INTO cards (name, rarity, image_url, collection_id) VALUES ($1, $2, $3, $4) RETURNING *', [name, rarity, image_url, collection_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error al crear la carta:", error);
        res.status(500).json({ error: 'Error al crear la carta' });
    }
};