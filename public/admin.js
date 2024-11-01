const apiBaseUrl = 'https://emscartas.vercel.app/api'; // Cambia esto a la URL de tu backend

async function loadCollections() {
    try {
        const response = await fetch(`${apiBaseUrl}/collections`);
        const data = await response.json();

        if (response.ok) {
            const collectionSelect = document.getElementById('card-collection'); // Asegúrate de que este ID sea correcto

            data.collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.id;
                option.textContent = collection.name;
                collectionSelect.appendChild(option);
            });
        } else {
            console.error('Error al obtener las colecciones:', data.error);
        }
    } catch (error) {
        console.error('Error al cargar las colecciones:', error);
    }
}

// Función para crear una nueva colección
async function createCollection() {
    const collectionName = document.getElementById('collection-name').value;

    const response = await fetch(`${apiBaseUrl}/createCollection`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: collectionName })
    });

    const result = await response.json();
    if (response.ok) {
        alert('Colección creada exitosamente');
        loadCollections(); // Recargar las colecciones
        document.getElementById('collection-form').reset(); // Limpiar el formulario
    } else {
        alert(`Error: ${result.error}`);
    }
}

// Función para crear una nueva carta
async function createCard() {
    const cardName = document.getElementById('card-name').value;
    const cardRarity = document.getElementById('card-rarity').value;
    const cardImageUrl = document.getElementById('card-image-url').value;
    const collectionId = document.getElementById('card-collection').value;

    const url = `${apiBaseUrl}/createCard?name=${encodeURIComponent(cardName)}&rarity=${encodeURIComponent(cardRarity)}&image_url=${encodeURIComponent(cardImageUrl)}&collection_id=${encodeURIComponent(collectionId)}`;

    const response = await fetch(url, {
        method: 'GET', // Usar GET en lugar de POST
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();
    if (response.ok) {
        alert('Carta creada exitosamente');
        document.getElementById('card-form').reset(); // Limpiar el formulario
    } else {
        alert(`Error: ${result.error}`);
    }
}
window.onload = () => {
    loadCollections(); // Cargar las colecciones en el selector de administración
};