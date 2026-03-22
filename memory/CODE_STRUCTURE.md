# Code Structure & Implementation Templates

This document provides the code structure and templates for each file to be created/modified.

---

## 1. Base Provider Interface

**File**: `backend/app/llm_provider.py`

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

@dataclass
class ProviderResponse:
    """Unified response format from any LLM provider"""
    content: str
    model_name: str
    provider_name: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class LLMProviderException(Exception):
    """Base exception for LLM provider errors"""
    pass

class ProviderNotAvailableException(LLMProviderException):
    """Raised when provider cannot be reached"""
    pass

class ProviderInvalidResponseException(LLMProviderException):
    """Raised when provider returns unexpected format"""
    pass

class LLMProvider(ABC):
    """Abstract base for LLM providers"""
    
    @abstractmethod
    async def initialize(self):
        """Initialize provider (setup clients, validate credentials)"""
        pass
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        timeout: float = 30.0
    ) -> ProviderResponse:
        """
        Send messages to LLM and get response.
        
        Args:
            messages: List of {role, content} dicts
            temperature: Sampling temperature (0-2)
            timeout: Request timeout in seconds
            
        Returns:
            ProviderResponse with content and metadata
            
        Raises:
            ProviderNotAvailableException: Cannot reach provider
            ProviderInvalidResponseException: Bad response format
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """
        Check if provider is available.
        
        Returns:
            True if provider is reachable and working
        """
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Return provider name (e.g., 'groq', 'ollama')"""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Return model name being used"""
        pass
```

---

## 2. Groq Provider Implementation

**File**: `backend/app/groq_provider.py`

```python
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

class GroqProvider(LLMProvider):
    """Groq LLM provider implementation"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.model = model or os.getenv("GROQ_MODEL", "llama3-8b-8192")
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
            if e.status_code == 429:  # Rate limited
                logger.warning("Groq rate limited")
            logger.error(f"Groq API error: {e}")
            raise ProviderNotAvailableException(f"Groq API error: {e}")
        
        except Exception as e:
            logger.error(f"Unexpected Groq error: {e}")
            raise ProviderInvalidResponseException(f"Groq error: {e}")
    
    def _call_groq_api(self, messages: List[Dict[str, str]], temperature: float):
        """Synchronous Groq API call (runs in thread pool)"""
        return self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=500,  # Limit response length
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
            # Simple test: list models (much faster than sending message)
            self.client.models.list()
            return True
        except Exception as e:
            logger.debug(f"Groq health check failed: {e}")
            return False
    
    def get_name(self) -> str:
        return "groq"
    
    def get_model_name(self) -> str:
        return self.model
```

---

## 3. Ollama Provider Implementation

**File**: `backend/app/ollama_provider.py`

```python
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

# Keep existing model profiles from main.py
ASA_SYSTEM_PROMPT = """
You are Asa, a warm and compassionate mental-health companion inside the MHC app...
[Full prompt text from main.py]
"""

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
    # ... other profiles ...
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
            response = await self.client.get("/api/tags", timeout=2.0)
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])
            
            # Check if our model is available
            model_available = any(
                self.model in {m.get("name"), m.get("model")}
                for m in models
            )
            return model_available
        
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
```

---

## 4. Provider Factory with Fallback Logic

**File**: `backend/app/provider_factory.py`

```python
import logging
from typing import Optional, Dict, Any
from .llm_provider import (
    LLMProvider,
    ProviderResponse,
    ProviderNotAvailableException,
)
from .groq_provider import GroqProvider
from .ollama_provider import OllamaProvider

logger = logging.getLogger(__name__)

class ProviderFactory:
    """Factory for managing multiple LLM providers with fallback"""
    
    def __init__(
        self,
        primary_provider: str = "groq",
        fallback_provider: str = "ollama",
        retry_attempts: int = 2,
        timeout_seconds: float = 30.0,
    ):
        self.primary_provider_name = primary_provider.lower()
        self.fallback_provider_name = fallback_provider.lower()
        self.retry_attempts = retry_attempts
        self.timeout_seconds = timeout_seconds
        
        self.providers: Dict[str, LLMProvider] = {}
        self.provider_status: Dict[str, bool] = {}
    
    async def initialize(self):
        """Initialize all configured providers"""
        # Initialize primary provider
        if self.primary_provider_name == "groq":
            self.providers["groq"] = GroqProvider()
        elif self.primary_provider_name == "ollama":
            self.providers["ollama"] = OllamaProvider()
        
        # Initialize fallback provider
        if self.fallback_provider_name == "groq":
            if "groq" not in self.providers:
                self.providers["groq"] = GroqProvider()
        elif self.fallback_provider_name == "ollama":
            if "ollama" not in self.providers:
                self.providers["ollama"] = OllamaProvider()
        
        # Try to initialize all providers
        for name, provider in self.providers.items():
            try:
                await provider.initialize()
                self.provider_status[name] = True
                logger.info(f"Provider '{name}' initialized successfully")
            except Exception as e:
                self.provider_status[name] = False
                logger.warning(f"Provider '{name}' failed to initialize: {e}")
    
    async def chat(
        self,
        messages: list,
        temperature: float = 0.55,
    ) -> tuple[ProviderResponse, str]:
        """
        Get chat response with intelligent fallback.
        
        Returns:
            Tuple of (ProviderResponse, provider_name_used)
        """
        # Try primary provider first
        response = await self._try_provider(
            self.primary_provider_name,
            messages,
            temperature
        )
        
        if response is not None:
            return response, self.primary_provider_name
        
        # Try fallback provider
        logger.warning(f"Primary provider '{self.primary_provider_name}' failed, using fallback")
        response = await self._try_provider(
            self.fallback_provider_name,
            messages,
            temperature
        )
        
        if response is not None:
            logger.info(f"Fallback to '{self.fallback_provider_name}' succeeded")
            return response, self.fallback_provider_name
        
        # Both providers failed
        logger.error("Both primary and fallback providers failed")
        raise Exception(
            f"All providers failed: {self.primary_provider_name}, {self.fallback_provider_name}"
        )
    
    async def _try_provider(
        self,
        provider_name: str,
        messages: list,
        temperature: float,
    ) -> Optional[ProviderResponse]:
        """Try to get response from specific provider with retries"""
        provider = self.providers.get(provider_name)
        if not provider:
            logger.error(f"Provider '{provider_name}' not found")
            return None
        
        for attempt in range(self.retry_attempts):
            try:
                logger.debug(f"Attempt {attempt + 1}/{self.retry_attempts} with {provider_name}")
                
                response = await provider.chat(
                    messages=messages,
                    temperature=temperature,
                    timeout=self.timeout_seconds
                )
                
                logger.info(f"Got response from {provider_name}")
                return response
            
            except ProviderNotAvailableException as e:
                logger.warning(f"Attempt {attempt + 1} failed for {provider_name}: {e}")
                if attempt < self.retry_attempts - 1:
                    logger.debug(f"Retrying {provider_name}...")
                    continue
                else:
                    logger.error(f"All retries exhausted for {provider_name}")
                    return None
            
            except Exception as e:
                logger.error(f"Unexpected error with {provider_name}: {e}")
                return None
        
        return None
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all providers"""
        status = {
            "ok": False,
            "providers": {},
            "primary_provider": self.primary_provider_name,
            "fallback_provider": self.fallback_provider_name,
        }
        
        for name, provider in self.providers.items():
            try:
                is_healthy = await provider.health_check()
                status["providers"][name] = {
                    "available": is_healthy,
                    "model": provider.get_model_name(),
                }
                if is_healthy:
                    status["ok"] = True
            except Exception as e:
                logger.warning(f"Health check failed for {name}: {e}")
                status["providers"][name] = {
                    "available": False,
                    "model": provider.get_model_name(),
                }
        
        return status
    
    async def shutdown(self):
        """Cleanup all providers"""
        for provider in self.providers.values():
            if hasattr(provider, 'close'):
                try:
                    await provider.close()
                except Exception as e:
                    logger.error(f"Error closing provider: {e}")
```

---

## 5. Updated Main FastAPI File

**File**: `backend/app/main.py` (Key changes)

```python
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, create_engine
from .models import ChatResponse, ChatMessage, ChatRequest
from .provider_factory import ProviderFactory

logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
            temperature=0.55
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
```

---

## 6. Updated .env File

**File**: `backend/.env`

```env
# Groq Configuration (PRIMARY)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192

# Ollama Configuration (FALLBACK)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=asa

# Provider Strategy
LLM_PRIMARY_PROVIDER=groq
LLM_FALLBACK_PROVIDER=ollama
LLM_FALLBACK_ENABLED=true
LLM_RETRY_ATTEMPTS=2
LLM_TIMEOUT_SECONDS=30

# Database
DATABASE_URL=sqlite:///./local.db

# Logging
LOG_LEVEL=INFO
```

---

## 7. Updated requirements.txt

**File**: `backend/requirements.txt`

```
# Existing packages
fastapi==0.119.0
uvicorn[standard]==0.38.0
pydantic==2.12.3
scikit-learn==1.7.2
fastapi-cli==0.0.13
SQLAlchemy==2.0.44
sqlmodel==0.0.27
supabase==2.22.0
openai==2.5.0
langchain==1.0.0
langchain-openai==1.0.0
python-jose[cryptography]==3.5.0
python-multipart==0.0.20
python-dotenv==1.1.1
httpx==0.28.1

# NEW: Groq SDK
groq==0.10.0
```

---

## Testing Code Snippets

### Test Groq Provider
```python
# test_groq_provider.py
import asyncio
from app.groq_provider import GroqProvider

async def test_groq():
    provider = GroqProvider()
    await provider.initialize()
    
    messages = [
        {"role": "user", "content": "Hello, what is 2+2?"}
    ]
    
    response = await provider.chat(messages)
    print(f"Response: {response.content}")
    print(f"Tokens: in={response.input_tokens}, out={response.output_tokens}")

asyncio.run(test_groq())
```

### Test Provider Factory
```python
# test_factory.py
import asyncio
from app.provider_factory import ProviderFactory

async def test_factory():
    factory = ProviderFactory()
    await factory.initialize()
    
    messages = [
        {"role": "user", "content": "Hello!"}
    ]
    
    response, provider = await factory.chat(messages)
    print(f"Provider used: {provider}")
    print(f"Response: {response.content}")
    
    await factory.shutdown()

asyncio.run(test_factory())
```

---

## Notes on Templates

- [ ] Replace `your_groq_api_key_here` with actual API key
- [ ] Keep system prompts identical to current implementation
- [ ] Model profiles for Ollama should remain unchanged
- [ ] Frontend code needs NO changes
- [ ] Test each provider independently before combining

