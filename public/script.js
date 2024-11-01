const clientId = 'lvy1fq9h316jv21p2iirxiq7wttuel'; // Reemplaza con tu Client ID de Twitch
const redirectUri = 'https://emscartas.vercel.app/'; // Cambia a tu URL de GitHub Pages
const apiBaseUrl = 'https://emscartas.vercel.app/api'; // Reemplaza con la URL de tu proyecto en Vercel

// Función para iniciar sesión con Twitch
function loginWithTwitch() {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=user:read:email`;
    window.location = authUrl;
}

async function checkForToken() {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
        const token = new URLSearchParams(hash.substring(1)).get("access_token");
        console.log("Access Token:", token); // Verificar el token en la consola

        document.getElementById('auth').style.display = 'none'; // Ocultar el botón de inicio de sesión

        // Llamada a Twitch para obtener el ID y el nombre de usuario
        try {
            const userResponse = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Client-ID': clientId
                }
            });
            const userData = await userResponse.json();
            const twitchId = userData.data[0].id; // Obtener twitchId
            const displayName = userData.data[0].display_name; // Obtener nombre de usuario

            // Mostrar el nombre de usuario en la interfaz
            document.getElementById('username-display').textContent = displayName;
            document.getElementById('user-info').style.display = 'block';

            // Cargar la colección de cartas del usuario autenticado
            await loadUserCollection(twitchId);
        } catch (error) {
            console.error("Error al obtener el usuario de Twitch:", error);
        }
    } else {
        console.log("Usuario no autenticado");
    }
}

// Llamar a `fetchUserPacks` después de la autenticación del usuario
async function fetchUserData(token) {
    const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Client-ID': clientId
        }
    });
    const data = await response.json();
    const user = data.data[0];
    twitchId = user.id;
    // Mostrar nombre de usuario en la interfaz
    document.getElementById('username-display').textContent = user.display_name;
    document.getElementById('user-info').style.display = 'block';

    // Obtener el número de packs del usuario y mostrarlos en la página
    fetchUserPacks(user.id); // Pasar twitchId a `fetchUserPacks`
}

// Obtener datos del usuario desde la API en Vercel
async function loadUserData(twitchId) {
    const response = await fetch(`${apiBaseUrl}/user/${twitchId}`);
    const data = await response.json();
    if (response.ok) {
        document.getElementById('packs-count').textContent = data.packs || 0;
        displayCards(data.cards, data.cards.map(card => card.id)); // Muestra las cartas con base en los datos del usuario
    } else {
        console.error('Error al obtener los datos del usuario:', data.error);
    }
}

function displayCards(allCards, userCardIds) {
    const collectionDiv = document.getElementById('collection');
    collectionDiv.innerHTML = ''; // Limpiar la colección antes de mostrar nuevas cartas

    // Agrupar las cartas por colección
    const collections = {};
    allCards.forEach(card => {
        if (!collections[card.collection_name]) {
            collections[card.collection_name] = [];
        }
        collections[card.collection_name].push(card);
    });

    // Crear una sección para cada colección
    for (const [collectionName, cards] of Object.entries(collections)) {
        // Crear un contenedor de colección
        const collectionSection = document.createElement('div');
        collectionSection.className = 'collection-section';

        // Título de la colección
        const collectionTitle = document.createElement('h2');
        collectionTitle.textContent = collectionName;
        collectionSection.appendChild(collectionTitle);

        // Contenedor para las cartas de la colección
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'cards-container';

        // Añadir cada carta a la sección
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            const isOwned = userCardIds.has(card.id);

            // Asignar clases para estilo y contenido de la carta
            cardElement.className = `card ${card.rarity} ${isOwned ? 'card-owned' : 'card-not-owned'}`;
            cardElement.innerHTML = `
                <img src="${card.image_url}" alt="${card.name}">
                <h3>${card.name}</h3>
                <p>Rareza: ${card.rarity}</p>
            `;

            cardsContainer.appendChild(cardElement);
        });

        collectionSection.appendChild(cardsContainer);
        collectionDiv.appendChild(collectionSection);
    }
}

// Función para abrir un sobre y actualizar la base de datos en Vercel
async function openPack() {
    const packsCountElem = document.getElementById('packs-count');
    let packsCount = parseInt(packsCountElem.textContent);

    if (packsCount > 0) {
        // Llamada a la API para abrir un sobre usando GET y pasar twitchId como parámetro de consulta
        const response = await fetch(`${apiBaseUrl}/user/${twitchId}/open-pack?twitchId=${twitchId}`, {
            method: 'GET', // Usamos GET para enviar twitchId como parámetro de consulta
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            const newCard = result.card;

            packsCount -= 1;
            packsCountElem.textContent = packsCount;

            // Mostrar la nueva carta en la colección
            const collectionDiv = document.getElementById('collection');
            const cardElement = document.createElement('div');
            cardElement.className = `card ${newCard.rarity} card-owned`;
            cardElement.innerHTML = `
                <img src="${newCard.image_url}" alt="${newCard.name}">
                <h3>${newCard.name}</h3>
                <p>Rareza: ${newCard.rarity}</p>
                <p>Colección: ${newCard.collection_name}</p>
            `;
            collectionDiv.appendChild(cardElement);

            alert(`¡Has obtenido la carta ${newCard.name}!`);
        } else {
            const errorData = await response.json();
            console.error('Error al abrir el sobre:', errorData.error);
        }
    } else {
        alert("No tienes sobres disponibles para abrir.");
    }
}


async function fetchUserPacks(twitchId) {
    try {
        // Enviar el twitchId como parámetro de consulta en una solicitud GET
        const response = await fetch(`${apiBaseUrl}/user/packs?twitchId=${twitchId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('packs-count').textContent = data.packs;
        } else {
            console.error('Error:', data.error);
            document.getElementById('packs-count').textContent = "0"; // Mostrar 0 si hay un error
        }
    } catch (error) {
        console.error('Error al obtener el número de packs:', error);
        document.getElementById('packs-count').textContent = "0"; // Mostrar 0 si hay un error
    }
}
async function loadUserCollection(twitchId) {
    try {
        // Llamada para obtener todas las cartas
        const allCardsResponse = await fetch(`${apiBaseUrl}/allCards`);
        const allCardsData = await allCardsResponse.json();

        // Llamada para obtener las cartas que el usuario posee
        const userCardsResponse = await fetch(`${apiBaseUrl}/user/${twitchId}?twitchId=${twitchId}`);
        const userCardsData = await userCardsResponse.json();

        if (!allCardsResponse.ok || !userCardsResponse.ok) {
            console.error('Error al cargar las cartas:', allCardsData.error || userCardsData.error);
            return;
        }

        const allCards = allCardsData.cards;
        const userCardIds = new Set(userCardsData.cards.map(card => card.id)); // Convertir las cartas del usuario en un Set para fácil comparación

        displayCards(allCards, userCardIds); // Mostrar las cartas
    } catch (error) {
        console.error('Error al cargar la colección:', error);
    }
}

// Mostrar todas las cartas, aplicando un efecto de "apagado" a las que no posee el usuario
function displayCards(allCards, userCardIds) {
    const collectionDiv = document.getElementById('collection');
    collectionDiv.innerHTML = ''; // Limpiar la colección antes de mostrar nuevas cartas

    allCards.forEach(card => {
        const cardElement = document.createElement('div');
        const isOwned = userCardIds.has(card.id); // Verificar si el usuario posee la carta

        // Asignar clases para estilo y contenido de la carta
        cardElement.className = `card ${card.rarity} ${isOwned ? 'card-owned' : 'card-not-owned'}`;
        cardElement.innerHTML = `
            <img src="${card.image_url}" alt="${card.name}">
            <h3>${card.name}</h3>
            <p>Rareza: ${card.rarity}</p>
            <p>Colección: ${card.collection_name}</p>
        `;

        collectionDiv.appendChild(cardElement);
    });
}
// Ejecutar la función de verificación de token al cargar la página
window.onload = checkForToken;