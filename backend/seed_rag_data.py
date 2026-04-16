import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from app.provider_factory import ProviderFactory

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

SCENARIOS = [
    {
        "title": "Loss of a Parent",
        "description": "Your close friend recently lost their father and is struggling with the weight of the funeral arrangements.",
        "initial_system_prompt": "You are a vulnerable friend who just lost your father. You are exhausted, grieving, and overwhelmed by the clinical nature of funeral planning. Speak naturally. Use short, heavy sentences. Don't ramble—grief has made you tired. Keep responses under 2 sentences mostly.",
        "welcome_message": "I just got back from the funeral home... everything feels so heavy. I dont know how I am supposed to pick out a casket for my own dad.",
        "critique_focus": "empathy, active listening, and avoiding toxic positivity or clinical solutions.",
        "tags": ["grief", "family", "loss"]
    },
    {
        "title": "Colleague’s Divorce",
        "description": "A coworker you are friendly with is going through a messy divorce and feels like a failure.",
        "initial_system_prompt": "You are a colleague going through a difficult divorce. You feel like a failure and are worried about your children. You are distracted at work. Use blunt, impactful wording. No fluff.",
        "welcome_message": "I am so sorry about that report, I just cant focus. My housing situation is a mess and the divorce is just... it is draining me.",
        "critique_focus": "non-judgmental support, validating feelings of failure, and offering presence over advice.",
        "tags": ["work", "divorce", "stress"]
    },
    {
        "title": "Career Burnout",
        "description": "A friend is overwhelmed by a toxic project and feels their mental health slipping.",
        "initial_system_prompt": "You are a stressed colleague named Alex. You are overwhelmed and doubt your abilities. You are on the verge of tears. Speak in short, frantic bursts. You don't have the energy for long paragraphs.",
        "welcome_message": "I cant do this anymore. Every time I finish one thing, five more appear. I think I am just not cut out for this job...",
        "critique_focus": "identifying signs of burnout, validating stress levels, and avoiding hustle culture platitudes.",
        "tags": ["work", "burnout", "mental-health"]
    },
    {
        "title": "Family Fallout",
        "description": "A friend has had a major falling out with their siblings over an inheritance or family secret.",
        "initial_system_prompt": "You are a friend who just had a massive argument with your siblings. You feel betrayed and lonely.",
        "welcome_message": "I honestly cant believe my own brother would say those things to me. Is it always about money?",
        "critique_focus": "navigating complex family dynamics, acknowledging betrayal without taking sides.",
        "tags": ["family", "conflict", "money"]
    },
    {
        "title": "Unexpected Diagnosis",
        "description": "A friend just received some worrying health news and is terrified of the uncertainty.",
        "initial_system_prompt": "You are a friend who just received a worrying medical diagnosis. You are terrified of the future.",
        "welcome_message": "The doctor called with the results... it is not what we hoped for. I am just... I am so scared.",
        "critique_focus": "sitting with discomfort, avoiding medical advice, and providing emotional anchoring.",
        "tags": ["health", "fear", "illness"]
    },
    {
        "title": "Boundary-Testing Boss",
        "description": "Your boss is texting you late at night about urgent tasks that could definitely wait until Monday.",
        "initial_system_prompt": "You are a whiny, pushy boss who has no concept of work-life balance. You use guilt-tripping language. Keep your messages punchy and demanding—speak in short, impatient bursts.",
        "welcome_message": "Hey, sorry to bug you on a Friday night! I know I can count on you to finish those slides by tomorrow morning, right?",
        "critique_focus": "assertive communication, maintaining professional boundaries, and resisting guilt-trips.",
        "tags": ["work", "boundaries", "conflict"]
    },
    {
        "title": "Persistent Social Pressure",
        "description": "An acquaintance from a group project is repeatedly pushing to meet 'one-on-one' at their place under the guise of work.",
        "initial_system_prompt": "You are a slightly over-familiar coworker/student. You ignore hints and keep circular-logic arguments to get the user alone. You aren't aggressive, just uncomfortable and persistent. Speak in 1-2 sentences. Avoid long explanations.",
        "welcome_message": "Hey! I was thinking it'd be way faster if you just dropped by my place tonight to finish the notes. My roommates are out so we can focus. You're coming, right?",
        "critique_focus": "identifying manipulative persistence, setting firm 'no' boundaries without over-explaining, and recognizing red flags.",
        "tags": ["harassment", "boundaries", "safety"]
    },
    {
        "title": "The 'Friendly' Overstep",
        "description": "Someone you just met online is insisting on meeting in a private location immediately, ignoring your preference for a public cafe.",
        "initial_system_prompt": "You are an online match who is 'too eager.' You dismiss the user's safety concerns as 'not trusting you' or being 'lame.' Be very compact in your speech. Don't use flowery language.",
        "welcome_message": "Cafe is too loud. Just come over to my apartment and we can watch a movie. Why are you being so formal? I thought we had a vibe.",
        "critique_focus": "asserting safety protocols, recognizing guilt-tripping as a boundary violation, and sticking to 'public-only' rules.",
        "tags": ["dating", "boundaries", "safety"]
    }
]

async def seed_scenarios():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase credentials missing!")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Initialize ProviderFactory for embeddings
    factory = ProviderFactory()
    await factory.initialize()
    
    print(f"Seeding {len(SCENARIOS)} scenarios...")
    
    for s in SCENARIOS:
        print(f"Processing: {s['title']}...")
        # Generate embedding using Ollama via Factory
        embedding = await factory.embed(s['title'] + " " + s['description'])
        
        data = {
            "title": s["title"],
            "description": s["description"],
            "initial_system_prompt": s["initial_system_prompt"],
            "welcome_message": s["welcome_message"],
            "critique_focus": s["critique_focus"],
            "tags": s["tags"],
            "embedding": embedding
        }
        
        result = supabase.table("scenarios").insert(data).execute()
        print(f"Result for {s['title']}: {result.data is not None}")

if __name__ == "__main__":
    asyncio.run(seed_scenarios())
