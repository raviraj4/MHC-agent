from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlmodel import Field, Session, SQLModel, create_engine, select



app = FastAPI()
# CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
MODELS = {
    "G31" : "gemma3:1b",
    "G34" : "gemma3:4b-it-qat"
}

MODEL = MODELS["G31"]
OLLAMA_URL = "http://localhost:11434/api/generate"

class ChatMessage(BaseModel):
    message: str
    user_id: str
    conversation_id: str = None
    
class ChatResponse(BaseModel):
    response: str
    model: dict
    conversation_id: str 
    message_id: str
   
   
class Conversations(SQLModel):
     conversation_id: str
     
# @app.post('/api/chat', response_model=ChatResponse)
# async def chat_with_ai(
#     chat_data: ChatResponse,
#     db: Session = Depends(get_db)
# ):
#     try:
#         if chat_data.conversation_id:
#             conversation = db.get(Conversation, chat_data.conversation_id)
#             if not conversation:
#                 raise(404, 'Conversation not found')

#     except:
#         raise(404, "failed")
    

app.get('/')
def home():
    return {
        "root": "/"
    }