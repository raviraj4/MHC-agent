import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
from groq import Groq, APIConnectionError, APITimeoutError, APIStatusError
from .llm_provider import (
    LLMProvider,
    ProviderResponse,
    ProviderNotAvailableException,
    ProviderInvalidResponseException,
)

logger = logging.getLogger(__name__)

# System prompt for ASA
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
- Never narrate your own actiotrins (no *smiles*, *pauses*, stage directions, or emojis).
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
"""


class GroqProvider(LLMProvider):
    """Groq LLM provider implementation"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.client = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize Groq client"""
        if not self.api_key:
            raise ProviderNotAvailableException(
                "GROQ_API_KEY not found in environment"
            )
        
        try:
            # Groq client is synchronous, but we'll wrap async calls
            self.client = Groq(api_key=self.api_key)
            # Test connection
            await self.health_check()
            self.is_initialized = True
            logger.info(f"Groq provider initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Groq: {e}")
            self.is_initialized = False
            raise ProviderNotAvailableException(f"Groq initialization failed: {e}")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.55,
        timeout: float = 30.0
    ) -> ProviderResponse:
        """Send messages to Groq API"""
        if not self.is_initialized or not self.client:
            raise ProviderNotAvailableException("Groq provider not initialized")
        
        try:
            # Run sync Groq call in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    self._call_groq_api,
                    messages,
                    temperature
                ),
                timeout=timeout
            )
            
            return ProviderResponse(
                content=response.choices[0].message.content,
                model_name=self.model,
                provider_name="groq",
                input_tokens=response.usage.prompt_tokens if response.usage else None,
                output_tokens=response.usage.completion_tokens if response.usage else None,
            )
        
        except asyncio.TimeoutError:
            logger.error("Groq request timeout")
            raise ProviderNotAvailableException("Groq request timeout")
        
        except (APIConnectionError, APITimeoutError) as e:
            logger.error(f"Groq connection error: {e}")
            raise ProviderNotAvailableException(f"Groq connection error: {e}")
        
        except APIStatusError as e:
            if e.status_code == 429:
                logger.warning("Groq rate limited")
            logger.error(f"Groq API error: {e}")
            raise ProviderNotAvailableException(f"Groq API error: {e}")
        
        except Exception as e:
            logger.error(f"Unexpected Groq error: {e}")
            raise ProviderInvalidResponseException(f"Groq error: {e}")

    async def embed(
        self,
        text: str,
        timeout: float = 10.0
    ) -> List[float]:
        """Groq does not support embeddings yet"""
        raise ProviderNotAvailableException("Groq does not support embeddings")
    
    def _call_groq_api(self, messages: List[Dict[str, str]], temperature: float):
        """Synchronous Groq API call (runs in thread pool)"""
        # Convert messages to dicts if they're Pydantic models
        converted_messages = []
        for m in messages:
            if isinstance(m, dict):
                converted_messages.append(m)
            else:
                # Handle Pydantic model or object with attributes
                converted_messages.append({
                    "role": getattr(m, "role", "user"),
                    "content": getattr(m, "content", "")
                })
        
        # Add system prompt if not already present
        messages_with_system = converted_messages
        if not any(m.get("role") == "system" for m in converted_messages):
            messages_with_system = [
                {"role": "system", "content": ASA_SYSTEM_PROMPT},
                *converted_messages
            ]
        
        return self.client.chat.completions.create(
            model=self.model,
            messages=messages_with_system,
            temperature=temperature,
            max_tokens=500,
        )
    
    async def health_check(self) -> bool:
        """Check if Groq API is accessible"""
        try:
            loop = asyncio.get_event_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(None, self._health_check_sync),
                timeout=5.0
            )
            return response
        except Exception:
            return False
    
    def _health_check_sync(self) -> bool:
        """Synchronous health check"""
        try:
            # Simple test: list models
            self.client.models.list()
            return True
        except Exception as e:
            logger.debug(f"Groq health check failed: {e}")
            return False
    
    def get_name(self) -> str:
        return "groq"
    
    def get_model_name(self) -> str:
        return self.model
