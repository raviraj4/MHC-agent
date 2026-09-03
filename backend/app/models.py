from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel
from sqlmodel import Field, SQLModel
from datetime import datetime, timezone

Role = Literal["system", "user", "assistant"]
UserRole = Literal["user", "therapist", "admin"]
VerificationStatus = Literal["pending_review", "verified", "rejected"]

# ─────────────────────────────────────────────────
# PROFILE & ROLE-SPECIFIC TABLES (Supabase ORM)
# ─────────────────────────────────────────────────

# class Profile(SQLModel, table=True):
#     """Base user profile, all users have this."""
#     __tablename__ = "profiles"
#     id: str = Field(primary_key=True)  # UUID from auth.users
#     email: Optional[str] = None
#     full_name: Optional[str] = None
#     user_name: Optional[str] = None
#     role: UserRole = Field(default="user")
#     onboarding_completed: bool = Field(default=False)
#     preferences: Dict[str, Any] = Field(default_factory=dict)
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# class Organisation(SQLModel, table=True):
#     """Mental health organisations/practices."""
#     __tablename__ = "organisations"
#     id: Optional[str] = Field(primary_key=True, default=None)
#     name: str
#     location: str
#     city: str
#     state: str
#     phone: Optional[str] = None
#     email: Optional[str] = None
#     website: Optional[str] = None
#     image_url: Optional[str] = None
#     capacity: Optional[int] = None
#     therapist_count: int = Field(default=0)
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# class TherapistProfile(SQLModel, table=True):
#     """Extended profile for therapists only."""
#     __tablename__ = "therapist_profiles"
#     therapist_id: str = Field(primary_key=True)  # FK to auth.users
#     profile_id: str = Field(foreign_key="profiles.id")
#     organisation_id: Optional[str] = Field(default=None, foreign_key="organisations.id")
#     license_number: str
#     verification_status: VerificationStatus = Field(default="pending_review")
#     verified_at: Optional[datetime] = None
#     verified_by_admin: Optional[str] = None  # admin email
#     practice_name: Optional[str] = None
#     bio: Optional[str] = None
#     specializations: List[str] = Field(default_factory=list)
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# class AdminProfile(SQLModel, table=True):
#     """Extended profile for admins only."""
#     __tablename__ = "admin_profiles"
#     admin_id: str = Field(primary_key=True)  # FK to auth.users
#     profile_id: str = Field(foreign_key="profiles.id")
#     privileges: Dict[str, Any] = Field(
#         default_factory=lambda: {
#             "can_approve_therapists": True,
#             "can_manage_organisations": True
#         }
#     )
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
#     updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────────────────
# CHAT & TRAINER MODELS (Existing)
# ─────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Role = "user"
    content: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    
    
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    messages: List[ChatMessage]
    preferred_provider: Optional[str] = None  # "groq", "ollama", or None for auto

class ChatResponse(BaseModel):
    conversation_id: str 
    message_id: Optional[str] = None
    message: ChatMessage
    model: dict
   
class EmergencyContact(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: str
    relationship: Optional[str] = None
    phone: str
    email: Optional[str] = None
    consent: bool = False
    is_primary: bool = True
   
class Conversations(SQLModel, table=True):
    __tablename__ = "conversations"
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str
    title: Optional[str] = "New Conversation"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Messages(SQLModel, table=True):
    __tablename__ = "messages"
    id: Optional[str] = Field(default=None, primary_key=True)
    conversation_id: str = Field(foreign_key="conversations.id")
    user_id: str
    role: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Trainer RAG-specific models
class ScenarioContext(BaseModel):
    """Retrieved scenario context for grounding trainer conversation."""
    scenario_id: str
    scenario_title: str
    description: str
    initial_system_prompt: Optional[str] = None
    critique_focus: Optional[str] = None
    retrieval_score: float


class TrainerRagChatRequest(BaseModel):
    """Request for per-turn RAG-grounded trainer chat."""
    conversation_id: str  # transient_playground or user conversation id
    user_message: str  # latest user turn message
    transcript: List[ChatMessage]  # rolling conversation history
    scenario_id: Optional[str] = None  # optional explicit scenario hint
    query_hint: Optional[str] = None  # optional tag-based query hint (e.g., "grief support")
    preferred_provider: Optional[str] = None  # "groq" or "ollama"


class TrainerRagChatResponse(BaseModel):
    """Response from per-turn RAG-grounded trainer chat."""
    conversation_id: str
    assistant_message: str  # generated response grounded in retrieved scenario
    scenario_context: ScenarioContext  # metadata about which scenario was selected
    model: dict  # provider metadata


# ─────────────────────────────────────────────────
# ADMIN ENDPOINT REQUEST/RESPONSE DTOs
# ─────────────────────────────────────────────────

class TherapistApplicationResponse(BaseModel):
    """Response for pending therapist application."""
    therapist_id: str
    profile_id: str
    full_name: Optional[str]
    email: Optional[str]
    license_number: str
    practice_name: Optional[str]
    bio: Optional[str]
    specializations: List[str]
    verification_status: VerificationStatus
    created_at: datetime


class TherapistApprovalRequest(BaseModel):
    """Request to approve a therapist application."""
    organisation_id: str
    notes: Optional[str] = None


class TherapistRejectionRequest(BaseModel):
    """Request to reject a therapist application."""
    notes: Optional[str] = None


class AdminApprovalResponse(BaseModel):
    """Response after approving a therapist."""
    therapist_id: str
    verification_status: VerificationStatus
    verified_at: datetime
    verified_by_admin: str
    organisation_id: str
    message: str


class TherapistConnectionRequest(BaseModel):
    therapist_id: str


class DirectMessageRequest(BaseModel):
    body: str
