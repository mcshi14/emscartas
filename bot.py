import os
import random
import psycopg2
from twitchio.ext import commands
from dotenv import load_dotenv
load_dotenv()
# Configura la conexión a la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")  # Configura esta variable de entorno
conn = psycopg2.connect(DATABASE_URL, sslmode='require')

# Configura el bot con el token de acceso y el canal inicial
CLIENT_ID = 'gp762nuuoqcoxypju8c569th9wz7q5'
ACCESS_TOKEN = 'm29c4i5pv7ba3jjcfb3e35qkf4dk42'
bot = commands.Bot(
    token=ACCESS_TOKEN,
    client_id=CLIENT_ID,
    prefix='!',
    initial_channels=['EMS_iRacing']
)

# Función para obtener datos del usuario desde la base de datos
def get_user_data(username):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        user_data = cur.fetchone()
        if user_data:
            return {
                "username": user_data[0],
                "packs": user_data[1],
                "cards": user_data[2]
            }
        else:
            # Si el usuario no existe, creamos un perfil básico en la base de datos
            cur.execute("INSERT INTO users (username, packs, cards) VALUES (%s, %s, %s) RETURNING *",
                        (username, 0, []))
            conn.commit()
            return {"username": username, "packs": 0, "cards": []}

# Función para dar un sobre a un usuario
def give_pack_to_user(username):
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET packs = packs + 1 WHERE username = %s RETURNING packs", (username,))
        new_pack_count = cur.fetchone()[0]
        conn.commit()
    return new_pack_count

# Función para abrir un sobre y añadir una carta
def open_pack(username):
    with conn.cursor() as cur:
        # Verificar que el usuario tenga sobres
        cur.execute("SELECT packs FROM users WHERE username = %s", (username,))
        packs = cur.fetchone()
        if not packs or packs[0] <= 0:
            return None, None  # No tiene sobres disponibles

        # Obtener una carta aleatoria
        cur.execute("SELECT id, name, rarity, frame, collection_id FROM cards ORDER BY RANDOM() LIMIT 1")
        new_card = cur.fetchone()

        # Añadir la carta a la colección del usuario y disminuir el número de sobres
        cur.execute("""
            UPDATE users SET packs = packs - 1, cards = array_append(cards, %s) 
            WHERE username = %s RETURNING packs
        """, (new_card[0], username))
        remaining_packs = cur.fetchone()[0]
        conn.commit()
    return new_card, remaining_packs

# Comando para otorgar sobres al usuario
@bot.command(name='sobres')
async def give_pack_command(ctx):
    if ctx.author.is_mod:
        username = ctx.author.name
        new_pack_count = give_pack_to_user(username)
        await ctx.send(f"{username}, has recibido un sobre. Ahora tienes {new_pack_count} sobres.")

# Comando para abrir un sobre y obtener una carta
@bot.command(name='abrirsobre')
async def open_pack_command(ctx):
    username = ctx.author.name
    new_card, remaining_packs = open_pack(username)

    if new_card and remaining_packs is not None:
        await ctx.send(
            f"{username}, has abierto un sobre y recibido la carta '{new_card[1]}' de rareza {new_card[2]} "
            f"con marco {new_card[3]} de la colección con ID {new_card[4]}! Ahora te quedan {remaining_packs} sobres."
        )
    else:
        await ctx.send(f"{username}, no tienes sobres disponibles para abrir.")

# Comando para ver la colección de un usuario
@bot.command(name='coleccion')
async def show_collection(ctx):
    username = ctx.author.name
    user_data = get_user_data(username)

    # Verificar si el usuario tiene cartas en su colección
    if user_data and user_data["cards"]:
        card_ids = user_data["cards"]
        with conn.cursor() as cur:
            cur.execute("SELECT name FROM cards WHERE id = ANY(%s)", (card_ids,))
            collection = ', '.join([card[0] for card in cur.fetchall()])
        await ctx.send(f"{username}, tu colección de cartas: {collection}")
    else:
        await ctx.send(f"{username}, aún no tienes cartas en tu colección.")

# Comando para activar una colección específica (solo mods)
@bot.command(name='activarcoleccion')
async def activate_collection(ctx, collection_name):
    if ctx.author.is_mod:
        with conn.cursor() as cur:
            # Activar la colección si existe
            cur.execute("SELECT id FROM collections WHERE name = %s", (collection_name,))
            collection = cur.fetchone()
            if collection:
                await ctx.send(f"La colección '{collection_name}' ha sido activada.")
            else:
                await ctx.send(f"La colección '{collection_name}' no existe.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

# Comando para desactivar una colección (solo mods)
@bot.command(name='desactivarcoleccion')
async def deactivate_collection(ctx, collection_name):
    if ctx.author.is_mod:
        with conn.cursor() as cur:
            # Verificar si la colección existe
            cur.execute("SELECT id FROM collections WHERE name = %s", (collection_name,))
            collection = cur.fetchone()
            if collection:
                await ctx.send(f"La colección '{collection_name}' ha sido desactivada.")
            else:
                await ctx.send(f"La colección '{collection_name}' no está activa o no existe.")
    else:
        await ctx.send("No tienes permiso para usar este comando.")

# Inicia el bot
if __name__ == "__main__":
    bot.run()
