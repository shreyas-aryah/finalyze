from transformers import AutoTokenizer, AutoModelForQuestionAnswering, Trainer, TrainingArguments
from datasets import load_dataset

# --- Config ---
MODEL_NAME = "impira/layoutlm-document-qa"

# --- Load Tokenizer and Model ---
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForQuestionAnswering.from_pretrained(MODEL_NAME)

# --- Load Dataset ---
# Replace with your dataset path or Hugging Face dataset name
# The dataset should have 'train' and 'validation' splits
# and be formatted for question answering (SQuAD-style)
dataset = load_dataset("squad")  # TODO: Replace with your own dataset

# --- Tokenize the Dataset ---
def preprocess_function(examples):
    questions = [q.strip() for q in examples["question"]]
    contexts = [c.strip() for c in examples["context"]]
    inputs = tokenizer(
        questions,
        contexts,
        max_length=384,
        truncation="only_second",
        padding="max_length",
        return_offsets_mapping=True,
        return_tensors="pt"
    )
    # Add start and end positions
    inputs["start_positions"] = examples["answers"]["answer_start"][0]
    inputs["end_positions"] = [start + len(ans[0]) for start, ans in zip(examples["answers"]["answer_start"], examples["answers"]["text"])]
    return inputs

tokenized_datasets = dataset.map(preprocess_function, batched=True)

# --- Training Arguments ---
training_args = TrainingArguments(
    output_dir="./results-document-qa",
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
    eval_dataset=tokenized_datasets["validation"],
    tokenizer=tokenizer,
)

# --- Train! ---
if __name__ == "__main__":
    trainer.train()
    # Save the model
    trainer.save_model("./fine-tuned-document-qa") 