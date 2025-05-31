# API endpoint logic

from fastapi import FastAPI # to create web API
from models import Receipt # imports receipt model
from database import receipts_collection # MongoDB collection

app = FastAPI() # creates instance

# creates receipt

@app.post("/receipt")
async def create_receipt(receipt: Receipt):
    receipt_dict = receipt.dict() # need to convert to readable format for MongoDB
    result = await receipts_collection.insert_one(receipt_dict) # inserts receipt into collection
    return {"id": str(result.inserted_id)} # returns id of newly inserted receipt

# retrieves and returns all receipts

@app.get("/receipts/{user_id}")
async def get_receipts(user_id: str):
    receipts = []
    async for doc in receipts_collection.find({"user_id": user_id}):
        doc["_id"] = str(doc["_id"])  # convert ObjectId to string
        receipts.append(doc)
    return receipts


