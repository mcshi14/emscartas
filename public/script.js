const clientId = 'lvy1fq9h316jv21p2iirxiq7wttuel'; // Reemplaza con tu Client ID de Twitch
const redirectUri = 'https://emscartas.vercel.app/'; // Cambia a tu URL de GitHub Pages
const apiBaseUrl = 'https://emscartas.vercel.app/api'; // Reemplaza con la URL de tu proyecto en Vercel

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

// Mostrar todas las cartas, indicando cuáles posee el usuario
function displayCards(allCards, userCards) {
    const collectionDiv = document.getElementById('collection');
    collectionDiv.innerHTML = ''; // Limpiar la colección antes de mostrar nuevas cartas

    allCards.forEach(card => {
        const cardElement = document.createElement('div');
        const isOwned = userCards.includes(card.id); // Verificar si el usuario posee la carta

        // Asignar la clase y contenido de la carta según si el usuario la posee
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

// Función para abrir un sobre y actualizar la base de datos en Vercel
async function openPack(twitchId) {
    const packsCountElem = document.getElementById('packs-count');
    let packsCount = parseInt(packsCountElem.textContent);

    if (packsCount > 0) {
        // Llamada a la API para abrir un sobre y actualizar en la base de datos
        const response = await fetch(`${apiBaseUrl}/user/${twitchId}/open-pack`, {
            method: 'POST',
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

// Función para obtener el número de packs del usuario
async function fetchUserPacks(twitchId) {
    try {
        const response = await fetch(`/api/packs?twitchId=${twitchId}`);
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
// Ejecutar la función de verificación de token al cargar la página
window.onload = checkForToken;