# AI Backend for Finalyze

This backend provides endpoints for OCR, field extraction, text classification, document QA, and (optionally) visual document retrieval using Hugging Face models and FastAPI.

## Structure
- `main.py` — FastAPI app with endpoints for:
  - `/ocr` — Image-to-text (OCR)
  - `/extract-fields` — Token classification (field extraction)
  - `/classify` — Text classification (category labeling)
  - `/document-qa` — Document question answering
  - `/retrieve-similar` — (Placeholder) Visual document retrieval
- `train_token_classification.py` — Fine-tune a token classification model (e.g., BERT/FinBERT)
- `train_text_classification.py` — Fine-tune a text classification model (e.g., DistilBERT)
- `train_document_qa.py` — Fine-tune a document QA model (e.g., LayoutLM QA)
- `requirements.txt` — Python dependencies

## Endpoints
- **/ocr**: POST an image file, returns extracted text using pytesseract.
- **/extract-fields**: POST text, returns extracted fields using a token classification model.
- **/classify**: POST text, returns a category label using a text classification model.
- **/document-qa**: POST context and question, returns answer using a QA model.
- **/retrieve-similar**: POST an image file, (not implemented) for document similarity search.

## Fine-tuning Scripts
- Each `train_*.py` script uses Hugging Face Trainer to fine-tune a model on your data.
- Replace the dataset loading section with your own data (see TODOs in scripts).
- After training, update the model paths in `main.py` to use your fine-tuned models.

## Usage
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
3. Fine-tune a model (example for token classification):
   ```bash
   python train_token_classification.py
   ```
4. Update `main.py` to load your fine-tuned model.

## Notes
- Add authentication and error handling for production use.
- For visual document retrieval, implement FAISS-based search as needed. 