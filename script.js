const clientId = 'lvy1fq9h316jv21p2iirxiq7wttuel'; // Reemplaza con tu Client ID de Twitch
const redirectUri = 'https://mcshi14.github.io/emscartas/'; // Cambia a tu URL de GitHub Pages

// Función para iniciar sesión con Twitch
function loginWithTwitch() {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=user:read:email`;
    window.location = authUrl;
}

// Verificar si hay un token en la URL (después de autenticación)
function checkForToken() {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
        const token = new URLSearchParams(hash.substring(1)).get("access_token");
        console.log("Access Token:", token); // Verificar el token en la consola
        document.getElementById('auth').style.display = 'none'; // Ocultar el botón de inicio de sesión
        fetchUserData(token);
    }
}

// Obtener datos del usuario autenticado
async function fetchUserData(token) {
    const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Client-ID': clientId
        }
    });
    const data = await response.json();
    const user = data.data[0];

    // Mostrar nombre de usuario en la interfaz
    document.getElementById('username-display').textContent = user.display_name;
    document.getElementById('user-info').style.display = 'block';

    // Cargar la colección del usuario autenticado
    loadUserData(user.login);
}

// Cargar datos de la colección del usuario y de todas las cartas desde el archivo JSON
async function loadUserData(username) {
    const cardsResponse = await fetch('https://mcshi14.github.io/emscartas/cards.json');
    const usersResponse = await fetch('https://mcshi14.github.io/emscartas/users.json');
    const allCards = await cardsResponse.json();
    const usersData = await usersResponse.json();
    const userData = usersData[username];

    // Verificar que userData no sea nulo o undefined
    const userCards = userData && userData.cards ? userData.cards.map(card => card.id) : [];
    document.getElementById('packs-count').textContent = userData && userData.packs || 0;

    displayCards(allCards.cards, userCards);
}

// Mostrar todas las cartas, indicando cuáles posee el usuario
function displayCards(allCards, userCards) {
    const collectionDiv = document.getElementById('collection');

    allCards.forEach(card => {
        const cardElement = document.createElement('div');
        const isOwned = userCards.includes(card.id); // Verificar si el usuario posee la carta

        // Asignar la clase y contenido de la carta según si el usuario la posee
        cardElement.className = `card ${card.rarity} ${isOwned ? 'card-owned' : 'card-not-owned'}`;
        cardElement.innerHTML = `
            <img src="${card.image_url}" alt="${card.name}">
            <h3>${card.name}</h3>
            <p>Rareza: ${card.rarity}</p>
        `;

        collectionDiv.appendChild(cardElement);
    });
}

// Función para abrir un sobre
async function openPack() {
    const packsCountElem = document.getElementById('packs-count');
    let packsCount = parseInt(packsCountElem.textContent);

    if (packsCount > 0) {
        // Simulación de obtener una carta aleatoria de las colecciones activas
        const cardsResponse = await fetch('https://mcshi14.github.io/emscartas/cards.json');
        const allCards = await cardsResponse.json();
        const newCard = allCards.cards[Math.floor(Math.random() * allCards.cards.length)];

        // Mostrar la nueva carta en la colección
        const collectionDiv = document.getElementById('collection');
        const cardElement = document.createElement('div');
        cardElement.className = `card ${newCard.rarity} card-owned`;
        cardElement.innerHTML = `
            <img src="${newCard.image_url}" alt="${newCard.name}">
            <h3>${newCard.name}</h3>
            <p>Rareza: ${newCard.rarity}</p>
        `;
        collectionDiv.appendChild(cardElement);

        // Actualizar el conteo de sobres y reducir en 1
        packsCount -= 1;
        packsCountElem.textContent = packsCount;

        // Aquí es donde se actualizaría el archivo `users.json` en el servidor
        alert(`¡Has obtenido la carta ${newCard.name}!`);
    } else {
        alert("No tienes sobres disponibles para abrir.");
    }
}

// Ejecutar la función de verificación de token al cargar la página
window.onload = checkForToken;