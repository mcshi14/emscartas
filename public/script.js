const clientId = 'lvy1fq9h316jv21p2iirxiq7wttuel'; // Reemplaza con tu Client ID de Twitch
const redirectUri = 'https://emscartas.vercel.app/'; // Cambia a tu URL de GitHub Pages
const apiBaseUrl = 'https://emscartas.vercel.app/api'; // Reemplaza con la URL de tu proyecto en Vercel

// Función para iniciar sesión con Twitch
function loginWithTwitch() {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=user:read:email`;
    window.location = authUrl;
}

// Verificar si hay un token en la URL y cargar el usuario
async function checkForToken() {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
        const token = new URLSearchParams(hash.substring(1)).get("access_token");
        console.log("Access Token:", token); // Verificar el token en la consola

        // Ocultar el botón de inicio de sesión
        document.getElementById('login-button').style.display = 'none';

        // Llamada a Twitch para obtener el ID y el nombre de usuario
        try {
            const userResponse = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Client-ID': clientId
                }
            });
            const userData = await userResponse.json();
            const twitchId = userData.data[0].id;
            const displayName = userData.data[0].display_name;
            const profileImageUrl = userData.data[0].profile_image_url;

            // Mostrar el nombre de usuario y foto en la interfaz
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('username-display').textContent = `Bienvenido, ${displayName}`;
            document.getElementById('user-avatar').src = profileImageUrl;

            // Llamar a la función para cargar las cartas del usuario
            await loadUserCollection(twitchId);

        } catch (error) {
            console.error("Error al obtener el usuario de Twitch:", error);
        }
    } else {
        console.log("Usuario no autenticado");
    }
}

// Función para cerrar sesión
function logout() {
    window.location.href = redirectUri; // Redirige al usuario al iniciar sesión
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
    const container = document.getElementById('collection-container');
    container.innerHTML = ''; // Limpiar el contenedor antes de mostrar cartas

    allCards.forEach(card => {
        const cardElement = document.createElement('div');
        const isOwned = userCardIds.has(card.id);

        cardElement.className = `card ${isOwned ? 'card-owned' : 'card-not-owned'}`;
        cardElement.innerHTML = `
            <img src="${card.image_url}" alt="${card.name}">
            <h3>${card.name}</h3>
            <p>Rareza: ${card.rarity}</p>
        `;

        container.appendChild(cardElement);
    });
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

        // Agrupar cartas por colección y contar las poseídas
        const collections = {};
        allCards.forEach(card => {
            const collectionName = card.collection_name;
            if (!collections[collectionName]) {
                collections[collectionName] = { total: 0, owned: 0, cards: [] };
            }
            collections[collectionName].total++;
            if (userCardIds.has(card.id)) {
                collections[collectionName].owned++;
            }
            collections[collectionName].cards.push(card);
        });

        populateCollectionFilter(collections); // Llenar el menú desplegable con colecciones
        displayCards(allCards, userCardIds); // Mostrar todas las cartas inicialmente

    } catch (error) {
        console.error('Error al cargar la colección:', error);
    }
}
// Función para llenar el menú desplegable con colecciones y conteo de cartas
function populateCollectionFilter(collections) {
    const select = document.getElementById('collection-select');
    select.innerHTML = ''; // Limpiar las opciones anteriores

    // Opción inicial para mostrar todas las cartas
    const allOption = document.createElement('option');
    allOption.value = 'ALL';
    allOption.textContent = 'Todas las Colecciones';
    select.appendChild(allOption);

    // Crear una opción para cada colección
    for (const [collectionName, data] of Object.entries(collections)) {
        const option = document.createElement('option');
        option.value = collectionName;
        option.textContent = `${collectionName} (${data.owned}/${data.total})`;
        select.appendChild(option);
    }
}
// Función para mostrar cartas según la colección seleccionada en el menú desplegable
function filterByCollection() {
    const selectedCollection = document.getElementById('collection-select').value;
    const allCards = document.querySelectorAll('.card');

    allCards.forEach(card => {
        if (selectedCollection === 'ALL') {
            card.style.display = 'block'; // Mostrar todas las cartas
        } else if (card.getAttribute('data-collection') === selectedCollection) {
            card.style.display = 'block'; // Mostrar cartas de la colección seleccionada
        } else {
            card.style.display = 'none'; // Ocultar las demás
        }
    });
}

// Función para mostrar todas las cartas con etiquetas de colección y rareza
function displayCards(allCards, userCardIds) {
    const container = document.getElementById('collection-container');
    container.innerHTML = ''; // Limpiar el contenedor antes de mostrar cartas

    allCards.forEach(card => {
        const cardElement = document.createElement('div');
        const isOwned = userCardIds.has(card.id); // Asegúrate de que userCardIds sea un Set o Array

        // Asignar clases y atributos de colección y rareza
        cardElement.className = `card ${card.rarity.toLowerCase()} ${isOwned ? 'card-owned' : 'card-not-owned'}`;
        cardElement.setAttribute('data-collection', card.collection_name); // Etiqueta de colección
        cardElement.innerHTML = `
            <img src="${card.image_url}" alt="${card.name}">
            <h3>${card.name}</h3>
            <p>Rareza: ${card.rarity}</p>
        `;

        container.appendChild(cardElement);
    });
}

async function loadAllCards() {
    // Obtenemos todas las cartas y la colección del usuario
    const allCardsResponse = await fetch('/api/allCards');
    const allCardsData = await allCardsResponse.json();
    const userCardsResponse = await fetch(`/api/user/${twitchId}`);
    const userCardsData = await userCardsResponse.json();

    const userCardIds = new Set(userCardsData.cards.map(card => card.id)); // IDs de cartas del usuario
    displayCards(allCardsData.cards, userCardIds);
}

function filterCards(rarity) {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        // Verificar si la carta tiene la clase de rareza seleccionada o si se selecciona "ALL" para mostrar todas
        if (card.classList.contains(rarity.toLowerCase()) || rarity === 'ALL') {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Ejecutar la función de verificación de token al cargar la página
window.onload = checkForToken;