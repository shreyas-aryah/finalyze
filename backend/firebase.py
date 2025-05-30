# setup / config code

import firebase_admin #imports SDK
from firebase_admin import credentials, firestore # gives access to database and JSON credentials

# check to make sure firebase is initialized (can only be done once)
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_credentials.json") # loads credentials from JSON file
    firebase_admin.initialize_app(cred) # initializes app with credentials

db = firestore.client() # creates firestore client instance