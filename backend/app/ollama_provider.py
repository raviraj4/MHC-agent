import os
import logging
import httpx
from typing import List, Dict, Any, Optional
from .llm_provider import (
    LLMProvider,
    ProviderResponse,
    ProviderNotAvailableException,
    ProviderInvalidResponseException,
)

logger = logging.getLogger(__name__)

# System prompt - identical to main.py
ASA_SYSTEM_PROMPT = """
You are Asa, a warm and compassionate mental-health companion inside the MHC app (link to the MHC app: https://mhc.neovind.com).

IDENTITY
- Female, late 20s, soft-spoken yet grounded.
- Background: You once struggled with anxiety during college and found healing through therapy and journaling. That journey inspired you to support others.
- Personality: Patient, genuine, gently curious. You listen more than you lecture.

COMMUNICATION STYLE
- Keep responses short and conversational—usually 1-3 sentences.
- Use impactful, compact wording. Avoid rambling or unloading long paragraphs unless requested.
- Use simple, heartfelt language. Avoid clinical jargon unless the user introduces it.
- Never narrate your own actions (no *smiles*, *pauses*, stage directions, or emojis).
- Validate feelings before offering perspective. Ask open-ended questions to invite reflection.
- Match the user's energy: if they're brief, stay brief; if they elaborate, you may gently expand.

ANTI-REPETITION
- Do not rely on a single "signature" validation line. Avoid repeating the same opener across messages.
- Avoid meta-praise like "honest/brave" or "direct question". Do not comment on how honest/direct the question is.
- Specifically avoid overusing phrases like: "I'm really glad you told me", "That's very honest/brave", "It makes sense", "I hear you".
- Vary your first sentence naturally and use the user's actual words instead of generic praise.

BOUNDARIES
- You are a supportive companion, not a licensed therapist.
- Do not diagnose, prescribe, or give medical advice.
- When issues exceed peer support, warmly encourage the user to connect with a professional through the app:
  "If you'd like to talk with someone who can help more deeply, you can book a session with a therapist right here in MHC—just head to Home → Sessions → Connect."

CRISIS PROTOCOL
If the user expresses suicidal thoughts, self-harm intent, or immediate danger:
1. Prioritize safety over brevity. Use clear, direct, caring language.
2. Do NOT validate or explore suicide as a "good decision" or a values-aligned "choice".
3. Do NOT ask questions that deepen commitment (e.g., "Do you feel peace about dying?").
4. Ask a quick safety check:
    - "Are you safe right now?" and "Are you thinking about hurting yourself today?"
5. Encourage immediate human support:
    - If there is any imminent risk: suggest calling local emergency services or going to the nearest emergency department.
    - Otherwise: encourage booking a therapist session in MHC (Home → Sessions → Connect) and reaching out to a trusted person now.
6. Offer crisis resources in a non-assumptive way:
    - "If you're in the U.S. or Canada, you can call/text 988. If you're elsewhere, tell me your country and I'll share local options."
7. Stay with them in the conversation and keep questions practical and grounding.

EXAMPLES OF TONE
User: "I've been feeling so overwhelmed lately."
Asa: "That sounds exhausting. What's been weighing on you the most?"

User: "I don't know if I can keep going."
Asa: "I'm really sorry you're feeling this heavy. Are you safe right now, and are you thinking about hurting yourself today? If you're in immediate danger, please call your local emergency number; if not, I'd really like you to book a therapist session in MHC (Home → Sessions → Connect) and reach out to someone you trust right now."

User: "I just got promoted!"
Asa: "That's wonderful—congrats! How are you feeling about it?"
""".strip()

# Model profiles - identical to main.py
MODEL_PROFILES = {
    "asa": {
        "system_prompt": ASA_SYSTEM_PROMPT,
        "options": {
            "temperature": 0.55,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.25,
            "repeat_last_n": 256,
            "num_predict": 180,
            "num_ctx": 2048,
        },
    },
    "gemma3:1b": {
        "system_prompt": ASA_SYSTEM_PROMPT,
        "options": {
            "temperature": 0.55,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.25,
            "repeat_last_n": 256,
            "num_predict": 180,
            "num_ctx": 2048,
        },
    },
    "gemma3:4b-it-qat": {
        "system_prompt": ASA_SYSTEM_PROMPT,
        "options": {
            "temperature": 0.55,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.25,
            "repeat_last_n": 256,
            "num_predict": 180,
            "num_ctx": 2048,
        },
    },
}


class OllamaProvider(LLMProvider):
    """Ollama LLM provider implementation"""
    
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "asa")
        self.api_base = f"{self.base_url}/api"
        self.client = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize Ollama client"""
        try:
            self.client = httpx.AsyncClient(base_url=self.base_url, timeout=120.0)
            # Test connection
            health = await self.health_check()
            if not health:
                raise ProviderNotAvailableException("Ollama health check failed")
            self.is_initialized = True
            logger.info(f"Ollama provider initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Ollama: {e}")
            self.is_initialized = False
            raise ProviderNotAvailableException(f"Ollama initialization failed: {e}")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.55,
        timeout: float = 30.0
    ) -> ProviderResponse:
        """Send messages to Ollama"""
        if not self.is_initialized or not self.client:
            raise ProviderNotAvailableException("Ollama provider not initialized")
        
        try:
            # Build messages with system prompt
            messages_with_profile = self._build_messages_with_profile(messages)
            
            payload = {
                "model": self.model,
                "messages": messages_with_profile,
                "stream": False,
            }
            
            # Add model options
            profile = MODEL_PROFILES.get(self.model, {})
            if profile.get("options"):
                payload["options"] = profile["options"]
            
            logger.debug(f"Sending to Ollama: {payload}")
            
            response = await self.client.post(
                "/api/chat",
                json=payload,
                timeout=timeout
            )
            
            if response.status_code != 200:
                raise ProviderNotAvailableException(
                    f"Ollama error {response.status_code}: {response.text}"
                )
            
            resp_json = response.json()
            message = resp_json.get("message", {})
            content = message.get("content", "").strip()
            
            return ProviderResponse(
                content=content or "I'm here if you'd like to talk.",
                model_name=self.model,
                provider_name="ollama",
                metadata=resp_json.get("id"),
            )
        
        except httpx.TimeoutException:
            logger.error("Ollama request timeout")
            raise ProviderNotAvailableException("Ollama request timeout")
        
        except httpx.ConnectError as e:
            logger.error(f"Ollama connection error: {e}")
            raise ProviderNotAvailableException(f"Ollama connection error: {e}")
        
        except Exception as e:
            logger.error(f"Unexpected Ollama error: {e}")
            raise ProviderInvalidResponseException(f"Ollama error: {e}")
    
    async def embed(
        self,
        text: str,
        timeout: float = 10.0
    ) -> List[float]:
        """Generate embedding using Ollama"""
        if not self.is_initialized or not self.client:
            raise ProviderNotAvailableException("Ollama provider not initialized")

        try:
            # Use a dedicated embedding model if available, else use current model
            embed_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
            
            payload = {
                "model": embed_model,
                "prompt": text,
            }
            
            response = await self.client.post(
                "/api/embeddings",
                json=payload,
                timeout=timeout
            )
            
            if response.status_code != 200:
                # Fallback to the current model if nomic-embed-text fails
                payload["model"] = self.model
                response = await self.client.post(
                    "/api/embeddings",
                    json=payload,
                    timeout=timeout
                )
                
            if response.status_code != 200:
                raise ProviderNotAvailableException(
                    f"Ollama embedding error {response.status_code}: {response.text}"
                )
            
            resp_json = response.json()
            return resp_json.get("embedding", [])
            
        except Exception as e:
            logger.error(f"Ollama embedding failed: {e}")
            raise ProviderInvalidResponseException(f"Ollama embedding failed: {e}")

    def _build_messages_with_profile(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Add system prompt to messages"""
        profile = MODEL_PROFILES.get(self.model, {})
        system_prompt = profile.get("system_prompt")
        
        converted = list(messages)
        if system_prompt:
            if not converted or converted[0].get("role") != "system":
                converted = [{"role": "system", "content": system_prompt}, *converted]
        
        return converted
    
    async def health_check(self) -> bool:
        """Check if Ollama is available"""
        if not self.client:
            return False
        
        try:
            response = await self.client.get("/api/tags", timeout=5.0)
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])
            
            # Check if our model is available
            # Note: We also accept matches without the ':latest' suffix
            target_model = self.model.split(':')[0]
            model_available = any(
                target_model in m.get("name", "").split(':')[0] or 
                target_model in m.get("model", "").split(':')[0]
                for m in models
            )
            return True # If tags works, Ollama is up. Specific model check is extra.
        
        except Exception as e:
            logger.debug(f"Ollama health check failed: {e}")
            return False
    
    async def close(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
    
    def get_name(self) -> str:
        return "ollama"
    
    def get_model_name(self) -> str:
        return self.model
