from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
from typing import Optional
import pytesseract
from PIL import Image
import io
import re
import openai
import os
from pymongo import MongoClient
import datetime
import httpx

app = FastAPI()

# --- OCR Endpoint using pytesseract (Image-to-Text) ---
@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))
    text = pytesseract.image_to_string(image)
    return {"text": text}

# --- /extract Endpoint for compatibility with frontend ---
@app.post("/extract")
async def extract_fields(file: UploadFile = File(...), lang: str = Form('eng')):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        # Use the specified OCR language (default 'eng')
        text = pytesseract.image_to_string(image, lang=lang)

        lines = text.splitlines()
        total_keywords = ['total', 'amount due', 'balance due', 'amount to pay', 'amount', 'grand total']
        amount = ""

        # 1. Prefer numbers with a decimal in total lines
        for line in lines:
            if any(kw in line.lower() for kw in total_keywords):
                amounts = re.findall(r"\$?\s*([0-9]+\.[0-9]{2})", line)
                if amounts:
                    amount = amounts[-1]
        # 2. Fallback: numbers with a decimal anywhere
        if not amount:
            all_amounts = re.findall(r"\$?\s*([0-9]+\.[0-9]{2})", text)
            if all_amounts:
                amount = str(max(float(a.replace(',', '')) for a in all_amounts))
        # 3. Fallback: numbers with a $ sign anywhere (integers)
        if not amount:
            all_amounts = re.findall(r"\$([0-9]+)", text)
            if all_amounts:
                amount = str(max(float(a.replace(',', '')) for a in all_amounts))
        return {
            "fields": {
                "raw_text": text,
                "amount": amount
            },
            "category": "Uncategorized"
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"OCR extraction failed: {str(e)}"})

# --- Token Classification Endpoint (Field Extraction) ---
token_classifier = pipeline("token-classification", model="bert-base-cased")

@app.post("/extract-fields")
async def extract_fields_from_text(text: str = Form(...)):
    results = token_classifier(text)
    return {"fields": results}

# --- Text Classification Endpoint (Category Labeling) ---
FINE_TUNED_MODEL_PATH = os.getenv("FINE_TUNED_MODEL_PATH", "./fine-tuned-text-classifier")
try:
    # Try to load the fine-tuned model if it exists
    text_classifier = pipeline(
        "text-classification",
        model=FINE_TUNED_MODEL_PATH,
        tokenizer=FINE_TUNED_MODEL_PATH
    )
    print(f"Loaded fine-tuned classifier from {FINE_TUNED_MODEL_PATH}")
except Exception as e:
    # Fallback to default model
    print(f"Could not load fine-tuned model: {e}. Using default model.")
    text_classifier = pipeline("text-classification", model="distilbert-base-uncased")

# Map model labels to user-friendly categories
CATEGORY_MAP = {
    "LABEL_0": "food",
    "LABEL_1": "travel",
    "LABEL_2": "entertainment",
    "LABEL_3": "shopping",
    "LABEL_4": "utilities",
    # Add more as needed
}

# --- Improved Multi-Category Keyword-Based Classification ---
CATEGORY_KEYWORDS = {
    "food": ["restaurant", "burger", "pizza", "salad", "diner", "cafe", "food", "meal", "grill", "bistro", "bar", "steakhouse", "kitchen"],
    "travel": ["flight", "uber", "lyft", "hotel", "taxi", "airbnb", "train", "bus", "car rental", "airport", "boarding pass"],
    "entertainment": ["movie", "cinema", "theater", "concert", "show", "amc", "regal", "ticket", "event", "museum", "zoo", "park"],
    "shopping": ["store", "walmart", "target", "costco", "receipt", "purchase", "mall", "shop", "grocery", "supermarket"],
    "utilities": ["electric", "water", "gas", "utility", "internet", "cable", "bill", "statement", "energy", "comcast", "verizon"],
}

def best_keyword_category(text):
    text_lower = text.lower()
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for word in keywords if word in text_lower)
        if hits:
            scores[category] = hits
    if scores:
        # Pick the category with the most keyword hits
        return max(scores, key=scores.get)
    return None

openai.api_key = os.getenv("OPENAI_API_KEY")

# OpenAI fallback categorization
# Returns a category string (e.g., 'food', 'travel', ...)
def openai_categorize(text):
    prompt = (
        "Classify this receipt into one of: food, travel, entertainment, shopping, utilities, other. "
        "Return only the category. Text: " + text
    )
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=10,
        temperature=0
    )
    return response.choices[0].message['content'].strip().lower()

@app.post("/classify")
async def classify_text(text: str = Form(...)):
    # 1. Try improved keyword-based rules first (multi-category, hit-count based)
    rule_category = best_keyword_category(text)
    if rule_category:
        return {"category": rule_category, "score": 1.0, "source": "rule"}
    # 2. Try your fine-tuned model
    results = text_classifier(text)
    raw_label = results[0]["label"]
    score = results[0]["score"]
    category = CATEGORY_MAP.get(raw_label, "Other")
    # 3. If model is uncertain (score < 0.7), fallback to OpenAI
    if score < 0.7:
        try:
            openai_category = openai_categorize(text)
            return {"category": openai_category, "score": score, "source": "openai"}
        except Exception as e:
            # If OpenAI fails, fallback to model
            pass
    return {"category": category, "score": score, "source": "model"}

# --- Document QA Endpoint ---
# Switched to a smaller, widely available QA model for reliability
document_qa = pipeline("question-answering", model="distilbert-base-uncased-distilled-squad")

@app.post("/document-qa")
async def document_qa_endpoint(context: str = Form(...), question: str = Form(...)):
    """
    Answers the question using the Hugging Face QA model. If the answer is empty or confidence is low, fallback to OpenAI.
    """
    try:
        result = document_qa(question=question, context=context)
        answer = result.get("answer", "")
        score = result.get("score", 0)
        # Fallback to OpenAI if answer is empty or score is low
        if not answer or score < 0.3:
            openai_prompt = f"Context: {context}\n\nQuestion: {question}\n\nAnswer as concisely as possible:"
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": openai_prompt}],
                max_tokens=128,
                temperature=0
            )
            answer = response.choices[0].message['content'].strip()
            score = 1.0  # Assume high confidence for OpenAI fallback
        return {"answer": answer, "score": score}
    except Exception as e:
        return {"error": f"QA failed: {str(e)}"}

# --- Visual Document Retrieval (FAISS/Embeddings) ---
@app.post("/retrieve-similar")
async def retrieve_similar(file: UploadFile = File(...)):
    return JSONResponse(status_code=501, content={"message": "Visual document retrieval not implemented yet."})

# --- Auto-Split Receipt Endpoint (Group Expense Detection) ---
@app.post("/split-receipt")
async def split_receipt(text: str = Form(...), num_people: int = Form(2)):
    """
    Uses OpenAI to analyze the OCR text and suggest a way to split the bill among num_people.
    Returns line items, detected total, and per-person share.
    """
    try:
        prompt = (
            f"""
            The following is the OCR text from a group receipt. Extract all line items (description and price), the total, and suggest how to split the bill evenly among {num_people} people. Return a JSON object with 'items' (list of {{'desc', 'price'}}), 'total', and 'per_person'.
            OCR Text:
            {text}
            """
        )
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0
        )
        # Try to extract JSON from the response
        import json
        import re
        content = response.choices[0].message['content']
        # Find the first JSON object in the response
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            result = json.loads(match.group(0))
            return result
        else:
            return {"error": "Could not parse split result", "raw": content}
    except Exception as e:
        return {"error": f"Split failed: {str(e)}"}

# --- Summarization Endpoint for Q&A chunking ---
@app.post("/summarize")
async def summarize_endpoint(text: str = Form(...)):
    """
    Uses OpenAI to summarize a chunk of text for Q&A context reduction.
    """
    try:
        prompt = f"Summarize the following receipt data for financial Q&A:\n{text}"
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3
        )
        summary = response.choices[0].message['content'].strip()
        return {"summary": summary}
    except Exception as e:
        return {"error": f"Summarization failed: {str(e)}"}

# --- Vendor Matching Helper ---
def match_vendor(vendor_name, mongo_uri="mongodb://localhost:27017/", db_name="finalyze"):
    """
    Fuzzy match the vendor name to the vendors collection in MongoDB.
    Returns the best match (name, logo, info) or None.
    """
    from difflib import get_close_matches
    client = MongoClient(mongo_uri)
    db = client[db_name]
    vendors = list(db["vendors"].find())
    names = [v["name"] for v in vendors]
    matches = get_close_matches(vendor_name, names, n=1, cutoff=0.7)
    if matches:
        for v in vendors:
            if v["name"] == matches[0]:
                return v
    return None

# --- POST: Handle file upload, AI backend, MongoDB ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), userId: str = Form(...), fileName: str = Form(...)):
    try:
        # --- AI-powered categorization: Call /classify with OCR text to get category ---
        category = "Uncategorized"
        vendor_info = None
        vendor_name = aiData.fields.get("vendor") if aiData.fields else None
        if aiData.fields and aiData.fields.get("raw_text"):
            async with httpx.AsyncClient() as client:
                classifyRes = await client.post(
                    "http://localhost:8000/classify",
                    data={"text": aiData.fields["raw_text"]},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                if classifyRes.status_code == 200:
                    classifyData = classifyRes.json()
                    category = classifyData.get("category", category)
        # --- Vendor matching ---
        if vendor_name:
            vendor_info = match_vendor(vendor_name)

        # --- Save to MongoDB ---
        receipt_doc = {
            "userId": userId,
            "fileName": fileName,
            "filePath": f"/receipts/{fileName}",
            "fields": aiData.fields,
            "category": category,
            "createdAt": datetime.datetime.utcnow(),
            "folder": "",
        }
        if vendor_info:
            receipt_doc["vendor_info"] = vendor_info
        await db.collection("receipts").insert_one(receipt_doc)

        return {"status": "success", "message": "Receipt processed and saved successfully"}
    except Exception as e:
        return {"status": "error", "message": f"An error occurred: {str(e)}"}

# --- Notes ---
# - Replace model names with paths to your fine-tuned models after training.
# - Add error handling and authentication as needed for production use.