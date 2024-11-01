const apiBaseUrl = 'https://emscartas.vercel.app/api'; // Cambia esto a la URL de tu backend

// Función para cargar las colecciones disponibles al iniciar la página
async function loadCollections() {
    const response = await fetch(`${apiBaseUrl}/allCollections`);
    const collections = await response.json();
    const select = document.getElementById('card-collection');

    select.innerHTML = ''; // Limpiar las opciones anteriores
    collections.forEach(collection => {
        const option = document.createElement('option');
        option.value = collection.id;
        option.textContent = collection.name;
        select.appendChild(option);
    });
}

// Llamar a la función de carga de colecciones al cargar la página
window.onload = loadCollections;

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

    const response = await fetch(`${apiBaseUrl}/createCard`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: cardName,
            rarity: cardRarity,
            image_url: cardImageUrl,
            collection_id: collectionId
        })
    });

    const result = await response.json();
    if (response.ok) {
        alert('Carta creada exitosamente');
        document.getElementById('card-form').reset(); // Limpiar el formulario
    } else {
        alert(`Error: ${result.error}`);
    }
}