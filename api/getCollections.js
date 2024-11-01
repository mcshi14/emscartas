const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    try {
        // Consulta para obtener todas las colecciones
        const result = await pool.query('SELECT id, name FROM collections');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontraron colecciones' });
        }

        res.status(200).json({ collections: result.rows });
    } catch (error) {
        console.error("Error al obtener las colecciones:", error);
        res.status(500).json({ error: 'Error al obtener las colecciones' });
    }
};