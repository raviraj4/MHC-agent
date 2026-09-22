from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional

from datetime import datetime

class Session:
    id: str
    as_of_date: datetime # as of date when session firs begins in that day
    start: datetime # session start time - timestamp when user clicks login. 
    end: datetime # session end time - timestamp when user clicks logout
    as_of_frequency: int # how many times a user logged in that particular day

class User(BaseModel):
    user_id:  str
    # need to get through personalised questionaire
    personality_extraversion: Optional[float] = Field(None, ge=0, le=1)      # Big Five scores (0-1)
    personality_agreeableness: Optional[float] = Field(None, ge=0, le=1)
    personality_conscientiousness: Optional[float] = Field(None, ge=0, le=1)
    personality_neuroticism: Optional[float] = Field(None, ge=0, le=1)
    personality_openness: Optional[float] = Field(None, ge=0, le=1)
    personality_assessment_date: Optional[datetime]
    baseline_preferred_frequency: Optional[int]    # initial baseline from personality
    current_learned_frequency: Optional[int]       # updated by RL
    last_model_update: Optional[datetime]
    # derived from Session
    session_length: list[Decimal] # duration of a single app visit from open to close.
    session_interval: list[Decimal] # time gap between consecutive user visits.
    session_frequency: list[Decimal] # number of screens viewed or actions taken per session

class UserActions():
    action_id: str
    user_id: str
    timestamp: datetime
    action_type: str
    session_id: str
    duration_seconds: Decimal
    context_data: str # JSON
    metadata: str #JSON - additional action-specific data
    