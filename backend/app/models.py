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
    preferred_provider: Optional[str] = None  # "groq", "ollama", or None for auto

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
   
class Conversations(SQLModel, table=True):
    __tablename__ = "conversations"
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str
    title: Optional[str] = "New Conversation"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Messages(SQLModel, table=True):
    __tablename__ = "messages"
    id: Optional[str] = Field(default=None, primary_key=True)
    conversation_id: str = Field(foreign_key="conversations.id")
    user_id: str
    role: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
     
     
     
     