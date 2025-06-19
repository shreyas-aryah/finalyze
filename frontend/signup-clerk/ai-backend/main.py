from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from transformers import pipeline
from typing import Optional
import pytesseract
from PIL import Image
import io
import re

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
async def extract_fields(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)

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

@app.post("/classify")
async def classify_text(text: str = Form(...)):
    # 1. Try improved keyword-based rules first (multi-category, hit-count based)
    rule_category = best_keyword_category(text)
    if rule_category:
        return {"category": rule_category, "score": 1.0, "source": "rule"}
    # 2. Otherwise, use the model
    results = text_classifier(text)
    raw_label = results[0]["label"]
    category = CATEGORY_MAP.get(raw_label, "Other")
    return {"category": category, "score": results[0]["score"], "source": "model"}

# --- Document QA Endpoint ---
document_qa = pipeline("question-answering", model="impira/layoutlm-document-qa")

@app.post("/document-qa")
async def document_qa_endpoint(context: str = Form(...), question: str = Form(...)):
    result = document_qa(question=question, context=context)
    return {"answer": result["answer"], "score": result["score"]}

# --- Visual Document Retrieval (FAISS/Embeddings) ---
@app.post("/retrieve-similar")
async def retrieve_similar(file: UploadFile = File(...)):
    return JSONResponse(status_code=501, content={"message": "Visual document retrieval not implemented yet."})

# --- Notes ---
# - Replace model names with paths to your fine-tuned models after training.
# - Add error handling and authentication as needed for production use.