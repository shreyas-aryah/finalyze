from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv # to load environment variables from .env file
import os # to access environment variables

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") # get the MongoDB URI from the environment variable

client = AsyncIOMotorClient(MONGO_URI) # create a MongoDB client
db = client.finalyze # database name
receipts_collection = db["receipts"]  # name of collection
