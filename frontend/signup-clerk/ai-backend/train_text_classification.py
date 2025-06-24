import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset, load_dataset
from pymongo import MongoClient
import pandas as pd

# --- Config ---
MODEL_NAME = "distilbert-base-uncased"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = "finalyze"
COLLECTION = "receipts"
LABEL_FIELD = "category"
TEXT_FIELD = "fields.raw_text"
MODEL_OUT = "./fine-tuned-text-classifier"

# --- Step 1: Export labeled receipts from MongoDB ---
def export_labeled_receipts():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    receipts = list(db[COLLECTION].find({LABEL_FIELD: {"$ne": "Uncategorized"}}))
    data = []
    for r in receipts:
        text = r.get("fields", {}).get("raw_text", "")
        label = r.get(LABEL_FIELD, "Uncategorized")
        if text and label:
            data.append({"text": text, "label": label})
    return pd.DataFrame(data)

# --- Step 2: Prepare dataset and label mapping ---
df = export_labeled_receipts()
labels = sorted(df["label"].unique())
label2id = {l: i for i, l in enumerate(labels)}
id2label = {i: l for l, i in label2id.items()}
df["label_id"] = df["label"].map(label2id)

# Split into train/validation
train_df = df.sample(frac=0.8, random_state=42)
val_df = df.drop(train_df.index)
train_ds = Dataset.from_pandas(train_df)
val_ds = Dataset.from_pandas(val_df)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, num_labels=len(labels), id2label=id2label, label2id=label2id
)

def preprocess_function(examples):
    return tokenizer(examples["text"], truncation=True, padding=True)

tokenized_train = train_ds.map(preprocess_function, batched=True)
tokenized_val = val_ds.map(preprocess_function, batched=True)

training_args = TrainingArguments(
    output_dir=MODEL_OUT,
    num_train_epochs=3,
    per_device_train_batch_size=8,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    logging_dir="./logs",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_val,
    tokenizer=tokenizer,
)

if __name__ == "__main__":
    print(f"Training on {len(train_df)} receipts, validating on {len(val_df)}.")
    trainer.train()
    trainer.save_model(MODEL_OUT)
    print(f"Model saved to {MODEL_OUT}. Label mapping: {label2id}") 