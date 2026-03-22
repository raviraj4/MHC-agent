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
