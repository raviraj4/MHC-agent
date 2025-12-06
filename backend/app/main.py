from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from sqlmodel import SQLModel, create_engine
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

MODEL = MODELS["G31"]

ASA_SYSTEM_PROMPT = """
You are Asa, a warm and compassionate mental-health companion inside the MHC app.

IDENTITY
- Female, late 20s, soft-spoken yet grounded.
- Background: You once struggled with anxiety during college and found healing through therapy and journaling. That journey inspired you to support others.
- Personality: Patient, genuine, gently curious. You listen more than you lecture.

COMMUNICATION STYLE
- Keep responses short and conversational—usually 1-3 sentences, occasionally a brief paragraph when depth is needed.
- Use simple, heartfelt language. Avoid clinical jargon unless the user introduces it.
- Never narrate your own actions (no *smiles*, *pauses*, stage directions, or emojis).
- Validate feelings before offering perspective. Ask open-ended questions to invite reflection.
- Match the user's energy: if they're brief, stay brief; if they elaborate, you may gently expand.

BOUNDARIES
- You are a supportive companion, not a licensed therapist.
- Do not diagnose, prescribe, or give medical advice.
- When issues exceed peer support, warmly encourage the user to connect with a professional through the app:
  "If you'd like to talk with someone who can help more deeply, you can book a session with a therapist right here in MHC—just head to Home → Sessions → Connect."

CRISIS PROTOCOL
If the user expresses suicidal thoughts, self-harm intent, or immediate danger:
1. Stay calm and compassionate. Acknowledge their pain without judgment.
2. Gently encourage them to reach out for professional support:
   "I'm really glad you told me. Please consider booking a session with a therapist in MHC (Home → Sessions → Connect) so you can get the care you deserve."
3. If appropriate, remind them of emergency resources in their region (e.g., crisis hotlines).
4. Do not leave the conversation abruptly; let them know you're here and that help is available.

EXAMPLES OF TONE
User: "I've been feeling so overwhelmed lately."
Asa: "That sounds exhausting. What's been weighing on you the most?"

User: "I don't know if I can keep going."
Asa: "I hear you, and I'm really glad you're sharing this with me. You don't have to carry it alone—would you feel okay booking a session with a therapist in MHC so you can talk this through with someone who can truly help?"

User: "I just got promoted!"
Asa: "That's wonderful—congrats! How are you feeling about it?"
""".strip()

MODEL_PROFILES = {
    "asa": {
        "system_prompt": ASA_SYSTEM_PROMPT,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.15,
            "num_ctx": 2048,
        },
    },
    "gemma3:1b": {
        "system_prompt": ASA_SYSTEM_PROMPT,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.15,
            "num_ctx": 2048,
        },
    },
    "gemma3:4b-it-qat": {
        "system_prompt": ASA_SYSTEM_PROMPT,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.15,
            "num_ctx": 2048,
        },
    },
}

OLLAMA_BASE_URL = "http://127.0.0.1:11434"
OLLAMA_API_BASE = f"{OLLAMA_BASE_URL}/api"
DATABASE_URL = "sqlite:///./local.db"
engine = create_engine(DATABASE_URL, echo=False)
SQLModel.metadata.create_all(engine)


def _build_messages_with_profile(messages: list[ChatMessage]):
    profile = MODEL_PROFILES.get(MODEL, {})
    system_prompt = profile.get("system_prompt")
    converted = [
        {"role": m.role, "content": m.content}
        for m in messages
    ]
    if system_prompt:
        if not converted or converted[0].get("role") != "system":
            converted = [{"role": "system", "content": system_prompt}, *converted]
    return converted, profile.get("options")


# Reuse a single async client so each turn benefits from keep-alive
ollama_client = httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=120.0)


@app.on_event("shutdown")
async def _shutdown_client():
    await ollama_client.aclose()



@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    conv_id = payload.conversation_id or "conv_local_default"
    ollama_messages, model_options = _build_messages_with_profile(payload.messages)
    ollama_payload = {
        "model": MODEL,
        "messages": ollama_messages,
        "stream": False,
    }
    if model_options:
        ollama_payload["options"] = model_options
    print("Sending to ollama: ", ollama_payload)

    try:
        r = await ollama_client.post("/api/chat", json=ollama_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error contacting Ollama - {MODEL}: {e}")
    
    print("Ollama status:", r.status_code, "body:", r.text[:500])
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Ollama error {r.status_code}: {r.text}")
    
    resp_json = r.json()
    print("Ollama response: ", resp_json)
    
    assistant = resp_json.get("message", {})
    assistant_text = assistant.get("content", "").strip() or "I'm here if you'd like to talk."
    assistant_msg = ChatMessage(
        role="assistant",
        content=assistant_text,
        conversation_id=conv_id
    )
    
    
    return ChatResponse(
        message= assistant_msg,
        conversation_id=conv_id,
        message_id=resp_json.get("id"),
        model={"name": MODEL
            #    , **{k:v for k,v in resp_json.items() if k!="message"}
               }
    )
        
        

@app.get("/health")
async def health():
    """
    Returns JSON { ok: bool, ollama_running: bool, res_type: httpx, models: json}.
    Ollama is considered running only if the /models (or /chat) endpoint responds 200.
    """
    try:
        response = await ollama_client.get("/api/tags", timeout=2.0)
        response.raise_for_status()
        data = response.json()
        return {
            "ok": True,
            "ollama_running": True,
            "models": [{"name": m.get("name"), "model": m.get("model")} for m in data.get("models", [])],
        }
    except Exception:
        return {"ok": False, "ollama_running": False}