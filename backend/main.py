# API endpoint logic

from fastapi import FastAPI # to create a web API
from firebase import db  # import the Firestore client

app = FastAPI() # creates FastAPI instance

@app.post("/add-expense")
def add_expense(): # defines a POST endpoint
    expense_ref = db.collection("expenses").document() # creates a new document in the "expenses" collection
    expense_ref.set({
        "user_id": "test123",
        "amount": 49.99,
        "category": "Food",
        "vendor": "Chipotle",
        "date": "2025-05-30"
    })

    return {"status": "saved", "id": expense_ref.id}
