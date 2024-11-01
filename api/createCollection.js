const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { name } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO collections (name) VALUES ($1) RETURNING *', [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error al crear la colección:", error);
        res.status(500).json({ error: 'Error al crear la colección' });
    }
};