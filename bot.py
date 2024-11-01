import os
import random
import psycopg2
from twitchio.ext import commands
from dotenv import load_dotenv

# Cargar las variables de entorno desde .env
load_dotenv()

# Configura la conexión a la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
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

# Función para obtener datos del usuario desde la base de datos por twitch_id
def get_user_data(twitch_id):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE twitch_id = %s", (twitch_id,))
        user_data = cur.fetchone()
        if user_data:
            return {
                "twitch_id": user_data[0],
                "packs": user_data[1],
                "cards": user_data[2]
            }
        else:
            # Crear el perfil básico si el usuario no existe
            cur.execute("INSERT INTO users (twitch_id, packs, cards) VALUES (%s, %s, %s) RETURNING *",
                        (twitch_id, 0, []))
            conn.commit()
            return {"twitch_id": twitch_id, "packs": 0, "cards": []}

# Función para dar un sobre a un usuario usando twitch_id
def give_pack_to_user(twitch_id):
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET packs = packs + 1 WHERE twitch_id = %s RETURNING packs", (twitch_id,))
        result = cur.fetchone()
        if result is None:
            cur.execute("INSERT INTO users (twitch_id, packs, cards) VALUES (%s, %s, %s) RETURNING packs",
                        (twitch_id, 1, []))
            result = cur.fetchone()
        conn.commit()
    return result[0]

# Comando para otorgar sobres al usuario
@bot.command(name='sobres')
async def give_pack_command(ctx):
    twitch_id = ctx.author.id  # Obtenemos el ID único de Twitch del autor
    new_pack_count = give_pack_to_user(twitch_id)
    await ctx.send(f"{ctx.author.name}, has recibido un sobre. Ahora tienes {new_pack_count} sobres.")
#Añadir una funcion para saber si un id de twitch es mod o no

# Comando para abrir un sobre y obtener una carta
@bot.command(name='abrirsobre')
async def open_pack_command(ctx):
    twitch_id = ctx.author.id
    new_card, remaining_packs = open_pack(twitch_id)

    if new_card and remaining_packs is not None:
        await ctx.send(
            f"{ctx.author.name}, has abierto un sobre y recibido la carta '{new_card[1]}' de rareza {new_card[2]} "
            f"con marco {new_card[3]} de la colección con ID {new_card[4]}! Ahora te quedan {remaining_packs} sobres."
        )
    else:
        await ctx.send(f"{ctx.author.name}, no tienes sobres disponibles para abrir.")

# Función para abrir un sobre usando twitch_id
def open_pack(twitch_id):
    with conn.cursor() as cur:
        cur.execute("SELECT packs FROM users WHERE twitch_id = %s", (twitch_id,))
        packs = cur.fetchone()
        if not packs or packs[0] <= 0:
            return None, None

        cur.execute("SELECT id, name, rarity, frame, collection_id FROM cards ORDER BY RANDOM() LIMIT 1")
        new_card = cur.fetchone()

        cur.execute("""
            UPDATE users SET packs = packs - 1, cards = array_append(cards, %s::text) 
            WHERE twitch_id = %s RETURNING packs
        """, (new_card[0], twitch_id))
        remaining_packs = cur.fetchone()[0]
        conn.commit()
    return new_card, remaining_packs

# Inicia el bot
if __name__ == "__main__":
    bot.run()
