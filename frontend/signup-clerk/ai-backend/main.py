from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from transformers import pipeline
from typing import Optional
import pytesseract
from PIL import Image
import io

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
        return {"fields": {"raw_text": text}, "category": "Uncategorized"}
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

@app.post("/classify")
async def classify_text(text: str = Form(...)):
    results = text_classifier(text)
    return {"category": results[0]["label"], "score": results[0]["score"]}

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