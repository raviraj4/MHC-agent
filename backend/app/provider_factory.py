import logging
from typing import Optional, Dict, Any, Tuple
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
        preferred_provider: Optional[str] = None,
    ) -> Tuple[ProviderResponse, str]:
        """
        Get chat response with intelligent fallback.
        
        Args:
            messages: List of chat messages
            temperature: Temperature for response generation
            preferred_provider: If specified, try this provider first before fallback
        
        Returns:
            Tuple of (ProviderResponse, provider_name_used)
        """
        # If preferred provider specified, try it first
        if preferred_provider and preferred_provider.lower() in self.providers:
            preferred = preferred_provider.lower()
            logger.info(f"Using preferred provider: {preferred}")
            response = await self._try_provider(preferred, messages, temperature)
            if response is not None:
                return response, preferred
            logger.warning(f"Preferred provider '{preferred}' failed, falling back")
        
        # Try primary provider first
        response = await self._try_provider(
            self.primary_provider_name,
            messages,
            temperature
        )
        
        if response is not None:
            logger.info(f"Using primary provider: {self.primary_provider_name}")
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

    async def embed(
        self,
        text: str,
        preferred_provider: Optional[str] = None,
    ) -> list:
        """Get embedding with fallback"""
        # If preferred provider specified, try it first
        if preferred_provider and preferred_provider.lower() in self.providers:
            provider = self.providers.get(preferred_provider.lower())
            try:
                return await provider.embed(text)
            except Exception:
                logger.warning(f"Preferred embedding provider '{preferred_provider}' failed")

        # Try Ollama first for embeddings as it's the primary provider for this
        if "ollama" in self.providers:
            try:
                return await self.providers["ollama"].embed(text)
            except Exception as e:
                logger.warning(f"Ollama embedding failed: {e}")

        # If everything fails
        raise Exception("No available provider for embeddings")
    
    async def shutdown(self):
        """Cleanup all providers"""
        for provider in self.providers.values():
            if hasattr(provider, 'close'):
                try:
                    await provider.close()
                except Exception as e:
                    logger.error(f"Error closing provider: {e}")
