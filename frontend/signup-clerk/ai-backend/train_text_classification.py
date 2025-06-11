from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from datasets import load_dataset

# --- Config ---
MODEL_NAME = "distilbert-base-uncased"
NUM_LABELS = 2  # Set this to the number of unique categories in your dataset

# --- Load Tokenizer and Model ---
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=NUM_LABELS)

# --- Load Dataset ---
# Replace with your dataset path or Hugging Face dataset name
# The dataset should have 'train' and 'validation' splits
# and be formatted for text classification
dataset = load_dataset("imdb")  # TODO: Replace with your own dataset

# --- Tokenize the Dataset ---
def preprocess_function(examples):
    return tokenizer(examples["text"], truncation=True)

tokenized_datasets = dataset.map(preprocess_function, batched=True)

# --- Training Arguments ---
training_args = TrainingArguments(
    output_dir="./results-text-classification",
    num_train_epochs=3,
    per_device_train_batch_size=8,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    logging_dir="./logs",
)

# --- Trainer ---
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    tokenizer=tokenizer,
)

# --- Train! ---
if __name__ == "__main__":
    trainer.train()
    # Save the model
    trainer.save_model("./fine-tuned-text-classifier") 