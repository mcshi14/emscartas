const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async(req, res) => {
    const { username } = req.query;

    try {
        // Obtener el usuario y sus cartas junto con la información de la colección
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userData = userResult.rows[0];

        // Obtener detalles de las cartas del usuario, incluyendo la colección
        const cardIds = userData.cards;
        const cardDetails = await pool.query(`
      SELECT cards.id, cards.name, cards.rarity, cards.image_url, collections.name AS collection_name
      FROM cards
      LEFT JOIN collections ON cards.collection_id = collections.id
      WHERE cards.id = ANY($1::int[])
    `, [cardIds]);

        // Devolver la información del usuario y sus cartas con la colección
        res.status(200).json({
            username: userData.username,
            packs: userData.packs,
            cards: cardDetails.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los datos del usuario' });
    }
};