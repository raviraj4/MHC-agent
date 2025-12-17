from typing import List, Literal, Optional
from pydantic import BaseModel
from sqlmodel import Field, SQLModel
from datetime import datetime, timezone

Role = Literal["system", "user", "assistant"]

class ChatMessage(BaseModel):
    role: Role = "user"
    content: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    
    
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    conversation_id: str 
    message_id: Optional[str] = None
    message: ChatMessage
    model: dict
   
class EmergencyContact(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: str
    relationship: Optional[str] = None
    phone: str
    email: Optional[str] = None
    consent: bool = False
    is_primary: bool = True
   
class Conversations(SQLModel):
     id: Optional[str] = Field(default=None, primary_key=True)
     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
     title: Optional[str] = None
     
     
     
     