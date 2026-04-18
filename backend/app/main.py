import os
import logging
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, create_engine, Session, select
from supabase import create_client, Client
from .models import ChatResponse, ChatMessage, ChatRequest, Conversations, Messages
from .provider_factory import ProviderFactory

# Load environment variables from .env file (explicit path to backend/.env)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

app = FastAPI()

# Supabase setup
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
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
    """Initialize providers and verify Supabase connection on startup"""
    global provider_factory
    
    # Verify Supabase configuration
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL or SUPABASE_KEY missing from environment variables!")
    else:
        try:
            # Simple test query to verify connection
            test = supabase.table("conversations").select("id").limit(1).execute()
            logger.info("Successfully connected to Supabase database")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")

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
async def chat_endpoint(payload: ChatRequest, authorization: Optional[str] = Header(None)):
    """Chat endpoint using provider factory with Supabase persistence"""
    if not provider_factory:
        raise HTTPException(status_code=500, detail="Provider not initialized")
    
    # Authenticate user if token provided
    user_id = None
    if authorization:
        # Use strip() and split() to safely extract the token
        try:
            parts = authorization.split()
            token = parts[1] if len(parts) > 1 else parts[0]
            token = token.strip()
            if not token or token.lower() in {"undefined", "null"}:
                token = ""
                logger.warning("Ignoring empty/placeholder bearer token")
            
            # Use the service role client if available for debugging, or normal client
            # For now, let's stick to the principal of using the user's token
            auth_response = supabase.auth.get_user(token) if token else None
            
            if auth_response and hasattr(auth_response, 'user') and auth_response.user:
                user_id = auth_response.user.id
                logger.info(f"Successfully authenticated user_id: {user_id}")
            elif isinstance(auth_response, dict) and "user" in auth_response:
                user_id = auth_response["user"]["id"]
                logger.info(f"Successfully authenticated user_id (dict): {user_id}")
            else:
                logger.warning("Auth response successful but no user found. Potential session expiry.")
        except Exception as e:
            logger.warning(f"SUPABASE AUTH WARNING: {e}")

    conv_id = payload.conversation_id
    
    # Create a conversation if not provided (and if user is authenticated)
    is_new_conversation = False
    
    # Transient Flag: If conversation_id is "transient_playground", we skip all DB persistence
    is_transient = conv_id == "transient_playground"

    if (not conv_id or conv_id == "conv_local_default") and user_id and not is_transient:
        is_new_conversation = True
        try:
            logger.info(f"Attempting to create a new persistent conversation for user {user_id}")
            
            # We must pass the user's JWT to the request headers to satisfy RLS
            # Supabase Python client usually handles this if initialized with the user's session,
            # but since we're using a single 'supabase' client instance, we need to ensure
            # we're acting on behalf of the user.
            
            # Alternative: Since backend is "trusted", you could Use a Service Role Key, 
            # but it's better to stay on the User's Token for RLS.
            
            # Let's try to set the session for this specific request if possible, 
            # but most people use a service key for backends to bypass RLS.
            
            conv = supabase.table("conversations").insert({
                "user_id": user_id,
                "title": "New Conversation"
            }).execute()
            
            if conv.data and len(conv.data) > 0:
                conv_id = conv.data[0]["id"]
                logger.info(f"New persistent conversation created with ID: {conv_id}")
            else:
                logger.error(f"Supabase returned success but no data for conversation insertion. Result: {conv}")
        except Exception as e:
            logger.error(f"DATABASE ERROR (New Conv): {e}")
            if "violates row-level security" in str(e):
                logger.info("TIP: If RLS is failing on the backend, check if you are using the Service Role Key or if your user_id in the DB matches the JWT sub.")
            
    # Final fallback to local-only
    if not conv_id:
        conv_id = "conv_local_default"
        logger.info("Falling back to conv_local_default")
    
    logger.info(f"Final Conversation ID for this turn: {conv_id} (User: {user_id})")
    
    try:
        # 1. Save user message if persistent
        if user_id and conv_id != "conv_local_default" and not is_transient:
            last_user_msg = payload.messages[-1]
            try:
                # Handle both dict and object types for messages
                content = last_user_msg.get("content") if isinstance(last_user_msg, dict) else getattr(last_user_msg, 'content', '')
                if content:
                    logger.info(f"Attempting to save user message to Supabase. Conv: {conv_id}")
                    supabase.table("messages").insert({
                        "conversation_id": conv_id,
                        "user_id": user_id,
                        "role": "user",
                        "content": content
                    }).execute()
            except Exception as e:
                logger.error(f"SUPABASE ERROR (User Msg): {e}")

        # 2. Get LLM response
        logger.info(f"Requesting LLM response (provider: {payload.preferred_provider or 'default'})")
        response, provider_used = await provider_factory.chat(
            messages=payload.messages,
            temperature=0.7, # Slightly higher for better creativity in titles
            preferred_provider=payload.preferred_provider
        )
        logger.info(f"LLM Response received from {provider_used}")
        
        # 3. Handle persistent storage tasks
        if user_id and conv_id != "conv_local_default" and not is_transient:
            try:
                # A. Save assistant message
                logger.info(f"Saving assistant message to conv {conv_id}")
                supabase.table("messages").insert({
                    "conversation_id": conv_id,
                    "user_id": user_id,
                    "role": "assistant",
                    "content": response.content
                }).execute()
                
                # B. Generate and update title if it's a new conversation
                if is_new_conversation:
                    try:
                        title_prompt = [
                            {"role": "system", "content": "Generate a very short, 3-5 word title for this conversation based on the user's message. Return ONLY the title text, no quotes or punctuation."},
                            {"role": "user", "content": payload.messages[0].get("content") if isinstance(payload.messages[0], dict) else payload.messages[0].content}
                        ]
                        title_res, _ = await provider_factory.chat(messages=title_prompt, temperature=0.3)
                        new_title = title_res.content.strip().strip('"').strip("'")
                        logger.info(f"Updating conversation title to: {new_title}")
                        supabase.table("conversations").update({"title": new_title}).eq("id", conv_id).execute()
                    except Exception as title_err:
                        logger.warning(f"Failed to generate custom title: {title_err}")

                # C. Update conversation timestamp
                supabase.table("conversations").update({"updated_at": "now()"}).eq("id", conv_id).execute()
            except Exception as e:
                logger.error(f"Failed to save to database: {e}")

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


@app.get("/api/scenarios/search")
async def search_scenarios(query: str, threshold: float = 0.5, limit: int = 3):
    """Search for relevant scenarios using vector similarity (RAG)"""
    if not provider_factory:
        raise HTTPException(status_code=500, detail="Provider not initialized")
    
    try:
        # 1. Generate embedding for query
        query_vector = await provider_factory.embed(query)
        
        # 2. Call Supabase RPC
        # match_scenarios(query_embedding, match_threshold, match_count)
        result = supabase.rpc("match_scenarios", {
            "query_embedding": query_vector,
            "match_threshold": threshold,
            "match_count": limit
        }).execute()
        
        return result.data
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


@app.get("/api/conversations")
async def get_conversations(authorization: Optional[str] = Header(None)):
    """Fetch user's conversations from Supabase"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Extract token
    token = authorization.replace("Bearer ", "")
    user = supabase.auth.get_user(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.user.id
    
    # We use Supabase directly instead of local SQLModel for production scale
    response = supabase.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
    return response.data


@app.get("/api/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, authorization: Optional[str] = Header(None)):
    """Fetch messages for a conversation"""
    if conversation_id == "conv_local_default":
        return []
        
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user.user.id
        
        # Verify ownership of conversation - Use maybe_single() to handle 406/no-match
        # Avoid .single() as it throws an error if 0 or >1 matches
        try:
            request = supabase.table("conversations").select("user_id").eq("id", conversation_id).execute()
            if not request.data:
                return []
                
            conv_data = request.data[0]
            if conv_data["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Forbidden")
        except Exception as table_err:
            # Handle invalid UUID format or other PostgREST errors gracefully
            logger.error(f"PostgREST error in get_messages: {table_err}")
            return []
            
        response = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conversations")
async def create_conversation(payload: dict, authorization: Optional[str] = Header(None)):
    """Create a new conversation"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.replace("Bearer ", "")
    user = supabase.auth.get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.user.id
    title = payload.get("title", "New Conversation")
    
    response = supabase.table("conversations").insert({
        "user_id": user_id,
        "title": title
    }).execute()
    
    return response.data[0]


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
