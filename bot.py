from twitchio.ext import commands
import json
import random
import requests
import subprocess
import aiofiles
import asyncio

# Configura el bot con el token de acceso y el canal inicial
CLIENT_ID = 'gp762nuuoqcoxypju8c569th9wz7q5'
ACCESS_TOKEN = 'm29c4i5pv7ba3jjcfb3e35qkf4dk42'
bot = commands.Bot(
    token=ACCESS_TOKEN,  # Access Token para Twitch
    client_id=CLIENT_ID,  # Client ID de la aplicación en Twitch
    prefix='!',                  # Prefijo de comando en el chat
    initial_channels=['EMS_iRacing']  # Reemplaza con el nombre de tu canal
)

# Funciones para cargar y guardar datos en JSON
def load_data():
    try:
        with open("users.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        # Definir estructura inicial si el archivo no existe
        return {"active_collection": "default", "collections": {"default": [f"card_{i}" for i in range(1, 101)]}}

# Función asíncrona para guardar datos en JSON y hacer commit/push en GitHub
async def save_data(data):
    # Guardar el archivo JSON de forma asíncrona
    async with aiofiles.open("users.json", "w") as f:
        await f.write(json.dumps(data, indent=4))

    # Cometer y hacer push de los cambios en GitHub de forma asíncrona
    await asyncio.create_subprocess_exec("git", "add", "users.json")
    await asyncio.create_subprocess_exec("git", "commit", "-m", "Actualizar users.json con nuevos datos de usuarios")
    await asyncio.create_subprocess_exec("git", "push", "origin", "main")  # Asegúrate de estar en la rama correcta

# Comando para otorgar sobres al usuario
@bot.command(name='sobres')
async def give_pack(ctx):
    if ctx.author.is_mod:
        user = ctx.author.name
        data = load_data()

        # Crear perfil del usuario si no existe
        if user not in data:
            data[user] = {"packs": 0, "cards": []}
        
        # Aumentar el contador de sobres
        data[user]["packs"] += 1
        save_data(data)
        
        await ctx.send(f"{user}, has recibido un sobre. Ahora tienes {data[user]['packs']} sobres!")
    

# Comando para abrir un sobre y obtener una carta
@bot.command(name='abrirsobre')
async def open_pack(ctx):
    user = ctx.author.name
    data = load_data()

    # Comprobar que el usuario tenga al menos un sobre
    if user in data and data[user]["packs"] > 0:
        # Verificar que hay colecciones activas
        active_collections = data.get("active_collections", [])
        if not active_collections:
            await ctx.send("No hay colecciones activas para obtener cartas.")
            return
        
        # Elegir una colección activa al azar y seleccionar una carta de ella
        collection_name = random.choice(active_collections)
        collection_cards = data["collections"].get(collection_name, [])
        
        if collection_cards:
            new_card = random.choice(collection_cards)
            data[user]["cards"].append(new_card)  # Añadir la carta a la colección del usuario
            data[user]["packs"] -= 1  # Reducir el número de sobres
            save_data(data)  # Guardar los datos actualizados
            
            await ctx.send(f"{user}, has abierto un sobre y recibido la carta {new_card} de la colección {collection_name}!")
        else:
            await ctx.send("La colección seleccionada está vacía o no tiene cartas.")
    else:
        await ctx.send(f"{user}, no tienes sobres disponibles para abrir.")

# Comando para cambiar la colección activa (solo mods)
@bot.command(name='set_collection')
async def set_collection(ctx, collection_name):
    if ctx.author.is_mod:  # Comprobar si el usuario es moderador
        data = load_data()
        
        # Comprobar si la colección existe
        if collection_name in data["collections"]:
            data["active_collection"] = collection_name
            save_data(data)
            await ctx.send(f"La colección activa se ha cambiado a {collection_name}.")
        else:
            await ctx.send(f"La colección {collection_name} no existe.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

# Función para obtener seguidores de un canal específico
def get_followers(user_id):
    url = f"https://api.twitch.tv/helix/users/follows?to_id={user_id}"
    headers = {
        "Client-ID": CLIENT_ID,
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    response = requests.get(url, headers=headers)
    data = response.json()
    followers = [follower['from_name'] for follower in data['data']]
    return followers

# Función para obtener la lista de espectadores actuales
async def get_viewers(ctx):
    chatters = await ctx.channel.chatters()
    return [user.name for user in chatters]

# Comando para distribuir sobres a todos los usuarios actuales en el chat
@bot.command(name='sobresparatodos')
async def give_pack_to_all_viewers(ctx):
    if ctx.author.is_mod:  # Solo los mods pueden usar este comando
        data = load_data()
        
        # Obtener la lista de usuarios conectados al chat (sin paréntesis ya que es un set)
        viewers = ctx.channel.chatters
        
        # Asignar sobres a cada usuario en la lista de espectadores
        for user in viewers:
            user_name = user.name
            if user_name not in data:
                data[user_name] = {"packs": 0, "cards": []}
            data[user_name]["packs"] += 1
        
        # Guardar los datos actualizados
        save_data(data)
        
        # Confirmación en el chat
        await ctx.send("Se han distribuido sobres a todos los espectadores actuales.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

@bot.command(name='coleccion')
async def show_collection(ctx):
    user = ctx.author.name
    data = load_data()

    # Verificar si el usuario tiene cartas en su colección
    if user in data and data[user]["cards"]:
        collection = ', '.join(data[user]["cards"])  # Convertir la lista de cartas a una cadena de texto
        await ctx.send(f"{user}, tu colección de cartas: {collection}")
    else:
        await ctx.send(f"{user}, aún no tienes cartas en tu colección.")

# Comando para que los mods agreguen una nueva colección de cartas
@bot.command(name='agregarcoleccion')
async def add_collection(ctx, collection_name, *cards):
    if ctx.author.is_mod:  # Solo los mods pueden ejecutar este comando
        data = load_data()

        # Convertir la lista de cartas en una colección
        cards_list = list(cards)
        
        # Agregar la colección al archivo de datos
        if "collections" not in data:
            data["collections"] = {}
        
        data["collections"][collection_name] = cards_list
        save_data(data)
        
        await ctx.send(f"La colección '{collection_name}' ha sido añadida con las cartas: {', '.join(cards_list)}")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

@bot.command(name='activarcoleccion')
async def activate_collection(ctx, collection_name):
    if ctx.author.is_mod:
        data = load_data()

        # Verificar si la colección existe en el archivo
        if collection_name in data.get("collections", {}):
            # Crear la lista de colecciones activas si no existe
            if "active_collections" not in data:
                data["active_collections"] = []
            
            # Agregar la colección a la lista de colecciones activas
            if collection_name not in data["active_collections"]:
                data["active_collections"].append(collection_name)
                save_data(data)
                await ctx.send(f"La colección '{collection_name}' ha sido activada.")
            else:
                await ctx.send(f"La colección '{collection_name}' ya está activa.")
        else:
            await ctx.send(f"La colección '{collection_name}' no existe.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

# Comando para desactivar una colección (solo mods)
@bot.command(name='desactivarcoleccion')
async def deactivate_collection(ctx, collection_name):
    if ctx.author.is_mod:
        data = load_data()

        # Verificar si la lista de colecciones activas contiene la colección
        if "active_collections" in data and collection_name in data["active_collections"]:
            data["active_collections"].remove(collection_name)
            save_data(data)
            await ctx.send(f"La colección '{collection_name}' ha sido desactivada.")
        else:
            await ctx.send(f"La colección '{collection_name}' no está activa o no existe.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")
# Comando para ver las colecciones activas
@bot.command(name='coleccionesactivas')
async def show_active_collections(ctx):
    data = load_data()

    # Obtener las colecciones activas
    active_collections = data.get("active_collections", [])
    
    # Enviar la lista de colecciones activas en el chat
    if active_collections:
        collections_list = ', '.join(active_collections)
        await ctx.send(f"Las colecciones activas actualmente son: {collections_list}")
    else:
        await ctx.send("No hay colecciones activas en este momento.")
# Comando para ver las cartas de una colección específica (solo mods)
@bot.command(name='vercoleccion')
async def show_collection_details(ctx, collection_name):
    if ctx.author.is_mod:  # Solo los mods pueden ejecutar este comando
        data = load_data()

        # Verificar si la colección existe
        if collection_name in data.get("collections", {}):
            collection_cards = data["collections"][collection_name]
            cards_list = ', '.join(collection_cards)
            await ctx.send(f"Cartas en la colección '{collection_name}': {cards_list}")
        else:
            await ctx.send(f"La colección '{collection_name}' no existe.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

# Inicia el bot
if __name__ == "__main__":
    bot.run()