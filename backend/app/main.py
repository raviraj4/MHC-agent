import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, create_engine, Session, select
from supabase import create_client, Client
from .models import (
    ChatResponse, ChatMessage, ChatRequest, Conversations, Messages, 
    TrainerRagChatRequest, TrainerRagChatResponse, ScenarioContext,
    TherapistApplicationResponse, TherapistApprovalRequest, TherapistRejectionRequest,
    AdminApprovalResponse, TherapistConnectionRequest, DirectMessageRequest
)
from .provider_factory import ProviderFactory

import prometheus_client
import uvicorn

# Load environment variables from .env file (explicit path to backend/.env)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

app = FastAPI()

# Supabase setup
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
admin_supabase: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_SERVICE_ROLE_KEY else None
)


def get_admin_supabase() -> Client:
    """Return the server-only client used for authorized admin database operations."""
    if not admin_supabase:
        raise HTTPException(status_code=503, detail="Admin database access is not configured")
    return admin_supabase

# CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# // TO-DO add local chat Database setup
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


async def retrieve_and_ground_scenario(
    user_message: str,
    query_hint: Optional[str] = None,
    scenario_id_hint: Optional[str] = None,
    threshold: float = 0.5,
    fallback_threshold: float = 0.3
) -> ScenarioContext:
    """
    Retrieve best-matching scenario for grounding trainer conversation.
    Implements per-turn RAG retrieval with fallback logic.
    
    Args:
        user_message: Latest user turn message
        query_hint: Optional tag-based query hint (e.g., "grief support")
        scenario_id_hint: Optional explicit scenario id preference
        threshold: Initial similarity threshold
        fallback_threshold: Fallback threshold if initial returns empty
    
    Returns:
        ScenarioContext with selected scenario metadata
    """
    if not provider_factory:
        raise ValueError("Provider not initialized")
    
    try:
        # 0. Scenario lock: if scenario id is provided, pin to that scenario for the session.
        if scenario_id_hint:
            locked = supabase.table("scenarios").select(
                "id,title,description,initial_system_prompt,critique_focus"
            ).eq("id", scenario_id_hint).limit(1).execute()
            if locked.data:
                selected = locked.data[0]
                return ScenarioContext(
                    scenario_id=selected.get("id"),
                    scenario_title=selected.get("title"),
                    description=selected.get("description"),
                    initial_system_prompt=selected.get("initial_system_prompt"),
                    critique_focus=selected.get("critique_focus"),
                    retrieval_score=1.0
                )
            raise ValueError(f"Locked scenario not found for id: {scenario_id_hint}")

        # 0b. Fallback lock by title when id is unavailable (e.g. locally seeded scenario cards).
        if query_hint:
            title_locked = supabase.table("scenarios").select(
                "id,title,description,initial_system_prompt,critique_focus"
            ).ilike("title", query_hint).limit(1).execute()
            if title_locked.data:
                selected = title_locked.data[0]
                return ScenarioContext(
                    scenario_id=selected.get("id"),
                    scenario_title=selected.get("title"),
                    description=selected.get("description"),
                    initial_system_prompt=selected.get("initial_system_prompt"),
                    critique_focus=selected.get("critique_focus"),
                    retrieval_score=0.99
                )

        # Compose retrieval query: combine user message with hint if available
        if query_hint:
            retrieval_query = f"{user_message} {query_hint}"
        else:
            retrieval_query = user_message
        
        # 1. Generate embedding for the query
        query_vector = await provider_factory.embed(retrieval_query)
        
        # 2. Attempt retrieval at primary threshold
        result = supabase.rpc("match_scenarios", {
            "query_embedding": query_vector,
            "match_threshold": threshold,
            "match_count": 5
        }).execute()
        
        candidates = result.data
        
        # 3. Fallback: if no results, retry with lower threshold
        if not candidates:
            logger.warning(f"No scenarios at threshold {threshold}, retrying at {fallback_threshold}")
            result = supabase.rpc("match_scenarios", {
                "query_embedding": query_vector,
                "match_threshold": fallback_threshold,
                "match_count": 5
            }).execute()
            candidates = result.data

        # 4. Final fallback: very permissive threshold for sparse queries
        if not candidates:
            final_threshold = 0.1
            logger.warning(f"No scenarios at threshold {fallback_threshold}, retrying at {final_threshold}")
            result = supabase.rpc("match_scenarios", {
                "query_embedding": query_vector,
                "match_threshold": final_threshold,
                "match_count": 5
            }).execute()
            candidates = result.data
        
        # 5. Select best candidate
        if candidates:
            best = candidates[0]  # Top match from RPC
            return ScenarioContext(
                scenario_id=best.get("id"),
                scenario_title=best.get("title"),
                description=best.get("description"),
                initial_system_prompt=best.get("initial_system_prompt"),
                critique_focus=best.get("critique_focus"),
                retrieval_score=best.get("similarity", 0.0)
            )
        else:
            # Last resort: return generic fallback scenario
            logger.error(f"No scenarios found even at threshold {fallback_threshold}")
            raise ValueError("No scenarios available for grounding")
    
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        raise


def assemble_grounded_prompt(
    scenario_context: ScenarioContext,
    transcript: List[ChatMessage]
) -> List[ChatMessage]:
    """
    Assemble grounded messages for generation by injecting scenario context.
    Ensures assistant stays within retrieved scenario constraints.
    
    Args:
        scenario_context: Retrieved scenario metadata
        transcript: Current conversation transcript
    
    Returns:
        Modified message list with scenario-grounded system prompt
    """
    # Build grounded system prompt combining scenario metadata
    grounding_text = f"""You are {scenario_context.scenario_title}.

Scenario Context:
{scenario_context.description}

Your Focus:
{scenario_context.critique_focus or 'Provide empathetic and supportive responses.'}

Initial Approach:
{scenario_context.initial_system_prompt or 'Engage authentically with the person.'}

Remember: Stay true to this scenario. Respond authentically as the persona, providing support aligned with the scenario's critique focus."""
    
    # Prepare output messages: inject scenario context as system message
    grounded_messages = []
    
    # Check if first message is already a system message
    if transcript and transcript[0].role == "system":
        # Replace existing system message with grounded version
        grounded_messages.append(ChatMessage(
            role="system",
            content=grounding_text
        ))
        grounded_messages.extend(transcript[1:])
    else:
        # Prepend grounded system message
        grounded_messages.append(ChatMessage(
            role="system",
            content=grounding_text
        ))
        grounded_messages.extend(transcript)
    
    return grounded_messages

@app.post("/api/trainer/rag-chat", response_model=TrainerRagChatResponse)
async def trainer_rag_chat_endpoint(payload: TrainerRagChatRequest, authorization: Optional[str] = Header(None)):
    """
    Per-turn RAG-grounded chat endpoint for role-play trainer.
    Retrieves relevant scenario on each turn and grounds response.
    """
    if not provider_factory:
        raise HTTPException(status_code=500, detail="Provider not initialized")
    
    try:
        # 1. Perform per-turn retrieval with scenario grounding
        logger.info(f"Trainer RAG: Retrieving scenario for user message: {payload.user_message[:50]}...")
        scenario_context = await retrieve_and_ground_scenario(
            user_message=payload.user_message,
            query_hint=payload.query_hint,
            scenario_id_hint=payload.scenario_id,
            threshold=0.5,
            fallback_threshold=0.3
        )
        logger.info(f"Trainer RAG: Selected scenario '{scenario_context.scenario_title}' (score: {scenario_context.retrieval_score:.3f})")
        
        # 2. Assemble grounded messages with scenario context
        grounded_messages = assemble_grounded_prompt(
            scenario_context=scenario_context,
            transcript=payload.transcript
        )
        
        # 3. Generate response using grounded context
        logger.info(f"Trainer RAG: Generating response with {len(grounded_messages)} grounded messages")
        response, provider_used = await provider_factory.chat(
            messages=grounded_messages,
            temperature=0.8,  # Higher creativity for roleplay
            preferred_provider=payload.preferred_provider
        )
        logger.info(f"Trainer RAG: LLM response received from {provider_used}")
        
        # 4. Assemble and return response with scenario metadata
        return TrainerRagChatResponse(
            conversation_id=payload.conversation_id,
            assistant_message=response.content,
            scenario_context=scenario_context,
            model={"provider": provider_used, "model": getattr(response, 'model', 'unknown')}
        )
    
    except ValueError as e:
        logger.error(f"Trainer RAG value error: {e}")
        raise HTTPException(status_code=400, detail=f"Retrieval failed: {e}")
    except Exception as e:
        logger.error(f"Trainer RAG endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {e}")

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


# ──────────────────────────────────────────────────
# ADMIN ENDPOINTS (Role-Based Access)
# ──────────────────────────────────────────────────

async def validate_admin_role(token: str) -> str:
    """
    Validate that token belongs to an admin user.
    Returns admin_id (user UUID) if valid, raises HTTPException otherwise.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    # Remove 'Bearer ' prefix if present
    token = token.replace("Bearer ", "").strip()
    
    try:
        # Get user from Supabase auth
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        admin_id = auth_response.user.id
        
        # Query admin_profiles to verify admin role
        admin_check = supabase.table("admin_profiles").select("admin_id").eq("admin_id", admin_id).limit(1).execute()
        
        if not admin_check.data or len(admin_check.data) == 0:
            raise HTTPException(status_code=403, detail="User is not an admin")
        
        return admin_id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin role validation error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def validate_user_token(token: str) -> str:
    """Validate a bearer token and return its authenticated user id."""
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        auth_response = supabase.auth.get_user(token.replace("Bearer ", "").strip())
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return auth_response.user.id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User token validation error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_authenticated_user(token: str):
    """Return the authenticated Supabase user from a bearer token."""
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    try:
        response = supabase.auth.get_user(token.replace("Bearer ", "").strip())
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User token validation error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


def assign_organisation_from_email(db: Client, user_id: str, email: Optional[str]) -> Optional[str]:
    """Assign an organisation only when the authenticated email matches one domain uniquely."""
    profile = db.table("profiles").select("organisation_id").eq("id", user_id).limit(1).execute()
    if profile.data and profile.data[0].get("organisation_id"):
        return profile.data[0]["organisation_id"]
    if not email or "@" not in email:
        return None

    domain = email.rsplit("@", 1)[1].lower()
    organisations = db.table("organisations").select("id, allowed_email_domains").execute().data or []
    matches = [
        org["id"] for org in organisations
        if domain in [value.lower() for value in (org.get("allowed_email_domains") or [])]
    ]
    if len(matches) == 1:
        db.table("profiles").update({
            "organisation_id": matches[0],
            "organisation_source": "email_domain",
            "organisation_assigned_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()
        return matches[0]
    return None


def get_connection_for_participant(db: Client, conversation_id: str, participant_id: str):
    conversation = db.table("direct_conversations").select("id, connection_id").eq("id", conversation_id).limit(1).execute()
    if not conversation.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    connection = db.table("therapist_connections").select("id, user_id, therapist_id").eq(
        "id", conversation.data[0]["connection_id"]
    ).limit(1).execute()
    if not connection.data or participant_id not in (connection.data[0]["user_id"], connection.data[0]["therapist_id"]):
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")
    return conversation.data[0], connection.data[0]


@app.get("/therapists")
async def search_therapists(
    search: Optional[str] = None,
    specialization: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Find verified therapists, returning the user's organisation first."""
    user = await get_authenticated_user(authorization)
    db = get_admin_supabase()
    profile_result = db.table("profiles").select("role, organisation_id").eq("id", user.id).limit(1).execute()
    profile = profile_result.data[0] if profile_result.data else {}
    if profile.get("role") != "user":
        raise HTTPException(status_code=403, detail="Therapist search is available to user accounts")

    organisation_id = profile.get("organisation_id") or assign_organisation_from_email(db, user.id, user.email)
    applications = db.table("therapist_profiles").select(
        "therapist_id, organisation_id, practice_name, bio, specializations, profiles(full_name)"
    ).eq("verification_status", "verified").execute().data or []
    organisations = db.table("organisations").select("id, name").execute().data or []
    organisation_names = {org["id"]: org.get("name", "Organisation") for org in organisations}
    query = (search or "").lower().strip()
    specialization_query = (specialization or "").lower().strip()

    therapists = []
    for application in applications:
        profile_data = application.get("profiles") or {}
        name = profile_data.get("full_name") or "Therapist"
        specializations = application.get("specializations") or []
        haystack = " ".join([name, application.get("practice_name") or "", *specializations]).lower()
        if query and query not in haystack:
            continue
        if specialization_query and not any(specialization_query in item.lower() for item in specializations):
            continue
        therapists.append({
            "therapist_id": application["therapist_id"],
            "full_name": name,
            "practice_name": application.get("practice_name"),
            "bio": application.get("bio"),
            "specializations": specializations,
            "organisation_id": application.get("organisation_id"),
            "organisation_name": organisation_names.get(application.get("organisation_id"), "Independent practice"),
            "is_same_organisation": bool(organisation_id and application.get("organisation_id") == organisation_id),
        })
    therapists.sort(key=lambda item: (not item["is_same_organisation"], item["full_name"].lower()))
    return {"user_organisation_id": organisation_id, "count": len(therapists), "data": therapists}


@app.post("/therapist-connections")
async def connect_to_therapist(payload: TherapistConnectionRequest, authorization: Optional[str] = Header(None)):
    """Create or return a low-friction direct connection to a verified therapist."""
    user = await get_authenticated_user(authorization)
    db = get_admin_supabase()
    user_profile = db.table("profiles").select("role, organisation_id").eq("id", user.id).limit(1).execute()

    if not user_profile.data or user_profile.data[0].get("role") != "user":
        raise HTTPException(status_code=403, detail="Only user accounts can connect to therapists")

    user_organisation_id = user_profile.data[0].get("organisation_id") or assign_organisation_from_email(db, user.id, user.email)
    therapist = db.table("therapist_profiles").select("therapist_id, organisation_id").eq(
        "therapist_id", payload.therapist_id
    ).eq("verification_status", "verified").limit(1).execute()

    if not therapist.data:
        raise HTTPException(status_code=404, detail="Verified therapist not found")

    therapist_data = therapist.data[0]
    existing = db.table("therapist_connections").select("id").eq("user_id", user.id).eq(
        "therapist_id", payload.therapist_id
    ).limit(1).execute()

    if existing.data:
        connection = existing.data[0]
    else:
        scope = "same_organisation" if user_organisation_id and user_organisation_id == therapist_data.get("organisation_id") else "external"
        try:
            connection = db.table("therapist_connections").insert({
                "user_id": user.id, "therapist_id": payload.therapist_id, "connection_scope": scope,
            }).execute().data[0]
        except Exception as error:
            # A second request can arrive before the first finishes. The unique
            # constraint is the authority; return the connection it protected.
            if "duplicate" not in str(error).lower():
                raise
            retry = db.table("therapist_connections").select("id").eq("user_id", user.id).eq(
                "therapist_id", payload.therapist_id
            ).limit(1).execute()
            if not retry.data:
                raise
            connection = retry.data[0]

    conversation_result = db.table("direct_conversations").select("id").eq("connection_id", connection["id"]).limit(1).execute()

    if conversation_result.data:
        conversation_id = conversation_result.data[0]["id"]
        return {"connection_id": connection["id"], "conversation_id": conversation_id, "created": False}

    conversation = db.table("direct_conversations").insert({"connection_id": connection["id"]}).execute().data[0]
    intro = db.table("direct_messages").insert({
        "conversation_id": conversation["id"], "sender_id": payload.therapist_id,
        "body": "Thanks for reaching out. I will get back to you as soon as possible.",
    }).execute().data[0]
    now = datetime.now(timezone.utc).isoformat()
    db.table("direct_conversations").update({"last_message_at": now}).eq("id", conversation["id"]).execute()
    db.table("notifications").insert([
        {"recipient_id": user.id, "actor_id": payload.therapist_id, "kind": "new_direct_message", "title": "New message from your therapist", "body": intro["body"], "conversation_id": conversation["id"], "message_id": intro["id"]},
        {"recipient_id": payload.therapist_id, "actor_id": user.id, "kind": "new_connection", "title": "A user connected with you", "body": "Open the conversation to view their connection.", "conversation_id": conversation["id"]},
    ]).execute()
    return {"connection_id": connection["id"], "conversation_id": conversation["id"], "created": True}


@app.get("/direct-conversations/{conversation_id}/messages")
async def get_direct_messages(conversation_id: str, authorization: Optional[str] = Header(None)):
    user_id = await validate_user_token(authorization)
    db = get_admin_supabase()
    get_connection_for_participant(db, conversation_id, user_id)
    messages = db.table("direct_messages").select("id, sender_id, body, read_at, created_at").eq(
        "conversation_id", conversation_id
    ).order("created_at").execute().data or []
    db.table("direct_messages").update({"read_at": datetime.now(timezone.utc).isoformat()}).eq(
        "conversation_id", conversation_id
    ).neq("sender_id", user_id).is_("read_at", "null").execute()
    db.table("notifications").update({"read_at": datetime.now(timezone.utc).isoformat()}).eq(
        "recipient_id", user_id
    ).eq("conversation_id", conversation_id).is_("read_at", "null").execute()
    return {"data": messages}


@app.post("/direct-conversations/{conversation_id}/messages")
async def send_direct_message(conversation_id: str, payload: DirectMessageRequest, authorization: Optional[str] = Header(None)):
    user_id = await validate_user_token(authorization)
    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    db = get_admin_supabase()
    _, connection = get_connection_for_participant(db, conversation_id, user_id)
    message = db.table("direct_messages").insert({
        "conversation_id": conversation_id, "sender_id": user_id, "body": body,
    }).execute().data[0]
    recipient_id = connection["therapist_id"] if user_id == connection["user_id"] else connection["user_id"]
    now = datetime.now(timezone.utc).isoformat()
    db.table("direct_conversations").update({"last_message_at": now}).eq("id", conversation_id).execute()
    db.table("notifications").insert({
        "recipient_id": recipient_id, "actor_id": user_id, "kind": "new_direct_message",
        "title": "You received a new message", "body": body[:160], "conversation_id": conversation_id, "message_id": message["id"],
    }).execute()
    return message


@app.get("/notifications")
async def list_notifications(authorization: Optional[str] = Header(None)):
    user_id = await validate_user_token(authorization)
    db = get_admin_supabase()
    rows = db.table("notifications").select("id, title, body, kind, conversation_id, read_at, created_at").eq(
        "recipient_id", user_id
    ).order("created_at", desc=True).limit(20).execute().data or []
    return {"unread_count": sum(1 for row in rows if not row.get("read_at")), "data": rows}


@app.get("/therapist/connections")
async def list_therapist_connections(authorization: Optional[str] = Header(None)):
    therapist_id = await validate_user_token(authorization)
    db = get_admin_supabase()
    therapist = db.table("therapist_profiles").select("verification_status").eq(
        "therapist_id", therapist_id
    ).limit(1).execute()
    if not therapist.data or therapist.data[0].get("verification_status") != "verified":
        raise HTTPException(status_code=403, detail="Only verified therapists can view connections")
    connections = db.table("therapist_connections").select("id, user_id, connection_scope, created_at").eq(
        "therapist_id", therapist_id
    ).eq("status", "active").order("created_at", desc=True).execute().data or []
    result = []
    for connection in connections:
        conversation = db.table("direct_conversations").select("id, last_message_at").eq("connection_id", connection["id"]).limit(1).execute()
        profile = db.table("profiles").select("full_name, email").eq("id", connection["user_id"]).limit(1).execute()
        result.append({**connection, "conversation_id": conversation.data[0]["id"] if conversation.data else None,
                       "last_message_at": conversation.data[0].get("last_message_at") if conversation.data else None,
                       "user": profile.data[0] if profile.data else {}})
    return {"data": result}


@app.get("/therapist/application-status")
async def get_therapist_application_status(authorization: Optional[str] = Header(None)):
    """Return the signed-in therapist's status without exposing other applications."""
    therapist_id = await validate_user_token(authorization)
    db = get_admin_supabase()

    try:
        result = db.table("therapist_profiles").select(
            "verification_status, verified_at, organisation_id"
        ).eq("therapist_id", therapist_id).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Therapist application not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching therapist application status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch therapist application status")


@app.get("/admin/therapist-applications")
async def list_therapist_applications(
    status: Optional[str] = "pending_review",
    organisation_id: Optional[str] = None,
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    List therapist applications with optional filters.
    Admin-only endpoint.
    
    Query params:
    - status: pending_review, verified, rejected (default: pending_review)
    - organisation_id: filter by org
    - search: search by name/email/license_number
    """
    # Validate admin role
    await validate_admin_role(authorization)
    db = get_admin_supabase()
    
    try:
        # Build query
        query = db.table("therapist_profiles").select(
            "therapist_id, profile_id, profiles(full_name, email), "
            "license_number, practice_name, bio, specializations, "
            "verification_status, created_at"
        )
        
        # Apply status filter
        if status:
            query = query.eq("verification_status", status)
        
        # Apply organisation filter
        if organisation_id:
            query = query.eq("organisation_id", organisation_id)
        
        result = query.order("created_at", desc=True).execute()
        
        # Apply search filter client-side (Supabase text search limited in anon key)
        applications = result.data
        if search:
            search_lower = search.lower()
            applications = [
                app for app in applications
                if (search_lower in app.get("profiles", {}).get("full_name", "").lower() or
                    search_lower in app.get("profiles", {}).get("email", "").lower() or
                    search_lower in app.get("license_number", "").lower())
            ]
        
        # Format response
        formatted_apps = []
        for app in applications:
            profile = app.get("profiles", {})
            formatted_apps.append({
                "therapist_id": app["therapist_id"],
                "profile_id": app["profile_id"],
                "full_name": profile.get("full_name"),
                "email": profile.get("email"),
                "license_number": app["license_number"],
                "practice_name": app.get("practice_name"),
                "bio": app.get("bio"),
                "specializations": app.get("specializations", []),
                "verification_status": app["verification_status"],
                "created_at": app["created_at"]
            })
        
        return {"count": len(formatted_apps), "data": formatted_apps}
    
    except Exception as e:
        logger.error(f"Error listing therapist applications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {e}")


@app.get("/admin/organisations")
async def list_organisations(authorization: Optional[str] = Header(None)):
    """Return organisations available for assignment during therapist approval."""
    await validate_admin_role(authorization)
    db = get_admin_supabase()

    try:
        result = db.table("organisations").select(
            "id, name, city, state"
        ).order("name").execute()
        return {"count": len(result.data or []), "data": result.data or []}
    except Exception as e:
        logger.error(f"Error listing organisations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch organisations")


@app.get("/admin/therapist-applications/{therapist_id}")
async def get_therapist_application(
    therapist_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Get detailed view of a single therapist application.
    Admin-only endpoint.
    """
    # Validate admin role
    await validate_admin_role(authorization)
    db = get_admin_supabase()
    
    try:
        result = db.table("therapist_profiles").select(
            "therapist_id, profile_id, organisation_id, profiles(id, full_name, email), "
            "license_number, practice_name, bio, specializations, "
            "verification_status, verified_at, verified_by_admin, "
            "created_at, updated_at"
        ).eq("therapist_id", therapist_id).limit(1).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Therapist application not found")
        
        app = result.data[0]
        profile = app.get("profiles", {})
        
        return {
            "therapist_id": app["therapist_id"],
            "profile_id": app["profile_id"],
            "full_name": profile.get("full_name"),
            "email": profile.get("email"),
            "license_number": app["license_number"],
            "practice_name": app.get("practice_name"),
            "bio": app.get("bio"),
            "specializations": app.get("specializations", []),
            "organisation_id": app.get("organisation_id"),
            "verification_status": app["verification_status"],
            "verified_at": app.get("verified_at"),
            "verified_by_admin": app.get("verified_by_admin"),
            "created_at": app["created_at"],
            "updated_at": app["updated_at"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching therapist application: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch application: {e}")


@app.patch("/admin/therapist-applications/{therapist_id}/approve")
async def approve_therapist_application(
    therapist_id: str,
    payload: TherapistApprovalRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Approve a therapist application and assign to organisation.
    Admin-only endpoint.
    
    Request body:
    - organisation_id: UUID of organisation to assign therapist to
    - notes: Optional approval notes
    """
    # Validate admin role
    admin_id = await validate_admin_role(authorization)
    db = get_admin_supabase()
    
    try:
        # Verify therapist exists
        app_check = db.table("therapist_profiles").select("therapist_id").eq("therapist_id", therapist_id).limit(1).execute()
        if not app_check.data:
            raise HTTPException(status_code=404, detail="Therapist not found")

        organisation = db.table("organisations").select("therapist_count").eq("id", payload.organisation_id).limit(1).execute()
        if not organisation.data:
            raise HTTPException(status_code=404, detail="Organisation not found")
        
        # Get admin email from profile
        admin_profile = db.table("profiles").select("email").eq("id", admin_id).limit(1).execute()
        admin_email = admin_profile.data[0]["email"] if admin_profile.data else "admin@unknown"
        
        # Update therapist_profiles
        now = datetime.now(timezone.utc).isoformat()
        update_result = db.table("therapist_profiles").update({
            "verification_status": "verified",
            "verified_at": now,
            "verified_by_admin": admin_email,
            "organisation_id": payload.organisation_id,
            "updated_at": now
        }).eq("therapist_id", therapist_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update therapist profile")
        
        # Increment therapist_count in organisations
        db.table("organisations").update({
            "therapist_count": organisation.data[0]["therapist_count"] + 1,
            "updated_at": now
        }).eq("id", payload.organisation_id).execute()
        
        logger.info(f"Therapist {therapist_id} approved and assigned to org {payload.organisation_id}")
        
        return {
            "therapist_id": therapist_id,
            "verification_status": "verified",
            "verified_at": now,
            "verified_by_admin": admin_email,
            "organisation_id": payload.organisation_id,
            "message": "Therapist approved successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving therapist: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to approve therapist: {e}")


@app.patch("/admin/therapist-applications/{therapist_id}/reject")
async def reject_therapist_application(
    therapist_id: str,
    payload: TherapistRejectionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Reject a therapist application.
    Admin-only endpoint.
    
    Request body:
    - notes: Optional rejection reason
    """
    # Validate admin role
    admin_id = await validate_admin_role(authorization)
    db = get_admin_supabase()
    
    try:
        # Verify therapist exists
        app_check = db.table("therapist_profiles").select("therapist_id").eq("therapist_id", therapist_id).limit(1).execute()
        if not app_check.data:
            raise HTTPException(status_code=404, detail="Therapist not found")
        
        # Get admin email from profile
        admin_profile = db.table("profiles").select("email").eq("id", admin_id).limit(1).execute()
        admin_email = admin_profile.data[0]["email"] if admin_profile.data else "admin@unknown"
        
        # Update therapist_profiles
        now = datetime.now(timezone.utc).isoformat()
        update_result = db.table("therapist_profiles").update({
            "verification_status": "rejected",
            "verified_at": now,
            "verified_by_admin": admin_email,
            "updated_at": now
        }).eq("therapist_id", therapist_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update therapist profile")
        
        logger.info(f"Therapist {therapist_id} rejected by {admin_email}")
        
        return {
            "therapist_id": therapist_id,
            "verification_status": "rejected",
            "verified_at": now,
            "verified_by_admin": admin_email,
            "message": f"Therapist rejected. Reason: {payload.notes or 'None provided'}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting therapist: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reject therapist: {e}")



async def health():
    """Health check endpoint"""
    if not provider_factory:
        return {
            "ok": False,
            "error": "Provider not initialized"
        }
    
    status = await provider_factory.health_check()
    return status

