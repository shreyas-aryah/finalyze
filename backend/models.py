from pydantic import BaseModel # data validation library
from typing import List, Optional # used for type hints
from datetime import datetime # used to store timesteamps

# checks for fields that will appear on result
# pydantic model checks if data is valid

class Item(BaseModel):
    name: str
    price: float
    quantity: int

class Receipt(BaseModel):
    user_id: str
    vendor: str
    total: float
    date: datetime
    currency: str
    category: str
    items: Optional[List[Item]] = []
    created_at: Optional[datetime] = datetime.utcnow()

# optional -> could be an empty list if needed