from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import httpx
import json
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlmodel import Field, Session, SQLModel, create_engine, select
import os
from .models import ChatResponse, ChatMessage, ChatRequest


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
    "G34" : "gemma3:4b-it-qat",
    "ASA" : "asa"
}

MODEL = MODELS["ASA"]

OLLAMA_URL = "http://127.0.0.1:11434/api"
OLLAMA_BASE = "http://127.0.0.1:11434/"
DATABASE_URL = "sqlite:///./local.db"
engine = create_engine(DATABASE_URL, echo=False)
SQLModel.metadata.create_all(engine)



@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    conv_id = payload.conversation_id or "conv_local_default"
    prompt_text = "\n".join({"role": m.role, "content": m.content} for m in payload.messages)
    ollama_payload = {
        "model": MODEL,
        # "messages": [
        #     {"role": m.role, "content": m.content} for m in payload.messages
        #     ],
        "prompt": prompt_text ,
        "stream": False
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.post(f"{OLLAMA_URL}/generate", json=ollama_payload) # NOTE to @raviraj: try changing to /generate prompt API. i.e await client.post(f"{OLLAMA_BASE}/generate", json={"model": MODEL, "prompt": "Your prompt here"})

        except Exception as e:
            raise HTTPException(status_code=500,detail=f"Error contacting Ollama - {MODEL}: {e}")
    
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Ollama error {r.status_code}: {r.text}")
    
    resp_json = r.json()
    
    assistant = resp_json.get("message", {"role": "assistant", "content": "" })
    assistant_msg = ChatMessage(
        role=assistant.get("role", "assistant"),
        content=assistant.get("content", ""),
        conversation_id=conv_id
    )
    
    
    return ChatResponse(
        message= assistant_msg,
        conversation_id=conv_id,
        message_id=resp_json.get("id"),
        model={"name": MODEL, **{k:v for k,v in resp_json.items() if k!="message"}}
        
    )
        
        

@app.get("/health")
async def health():
    """
    Returns JSON { ok: bool, ollama_running: bool, res_type: httpx, models: json}.
    Ollama is considered running only if the /models (or /chat) endpoint responds 200.
    """
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{OLLAMA_URL}/tags")
            data = response.json()
            # parsed_r = json.loads(r)
            # If we get 200 from Ollama, consider it running
            return {"ok": True, "ollama_running": 200, "res_type": str(type(data)), "models": [{"model": m["name"], "model": m["model"]} for m in data["models"]] }
        
        # , "models": [{"model": m["name"], "model": m["model"]} for m in parsed_r["models"]]
    except Exception:
        # Any exception -> not running
        return {"ok": False, "ollama_running": False}