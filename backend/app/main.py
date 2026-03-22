import os
import logging
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, create_engine
from .models import ChatResponse, ChatMessage, ChatRequest
from .provider_factory import ProviderFactory

# Load environment variables from .env file (explicit path to backend/.env)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

app = FastAPI()
# CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = "sqlite:///./local.db"
engine = create_engine(DATABASE_URL, echo=False)
SQLModel.metadata.create_all(engine)

# Initialize LLM provider factory
provider_factory: ProviderFactory = None


@app.on_event("startup")
async def startup_event():
    """Initialize providers on startup"""
    global provider_factory
    
    primary = os.getenv("LLM_PRIMARY_PROVIDER", "groq")
    fallback = os.getenv("LLM_FALLBACK_PROVIDER", "ollama")
    retries = int(os.getenv("LLM_RETRY_ATTEMPTS", "2"))
    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    
    provider_factory = ProviderFactory(
        primary_provider=primary,
        fallback_provider=fallback,
        retry_attempts=retries,
        timeout_seconds=timeout,
    )
    
    await provider_factory.initialize()
    logger.info(f"LLM Provider Factory initialized (primary={primary}, fallback={fallback})")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if provider_factory:
        await provider_factory.shutdown()


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    """Chat endpoint using provider factory"""
    if not provider_factory:
        raise HTTPException(status_code=500, detail="Provider not initialized")
    
    conv_id = payload.conversation_id or "conv_local_default"
    
    try:
        response, provider_used = await provider_factory.chat(
            messages=payload.messages,
            temperature=0.55,
            preferred_provider=payload.preferred_provider
        )
        
        assistant_msg = ChatMessage(
            role="assistant",
            content=response.content,
            conversation_id=conv_id
        )
        
        return ChatResponse(
            message=assistant_msg,
            conversation_id=conv_id,
            message_id=getattr(response, 'metadata', None),
            model={
                "name": response.model_name,
                "provider": response.provider_name,
                "input_tokens": response.input_tokens,
                "output_tokens": response.output_tokens,
            }
        )
    
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get response: {e}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    if not provider_factory:
        return {
            "ok": False,
            "error": "Provider not initialized"
        }
    
    status = await provider_factory.health_check()
    return status
