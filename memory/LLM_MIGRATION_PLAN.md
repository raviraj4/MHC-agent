# LLM Migration Plan: Ollama → Groq + Fallback

## Executive Summary
Switch the MHC Agent from using **Ollama Asa:latest** as the primary LLM to **Groq's llama3-8b-8192 model** with automatic fallback to Ollama if Groq is unavailable.

---

## Current Architecture

### Stack Overview
```
Frontend (Next.js)
    └─→ POST /api/chat (localhost:8000)
        └─→ FastAPI Backend
            └─→ HTTP calls to Ollama (localhost:11434/api/chat)
                └─→ Ollama Asa Model
```

### Key Components
| Component | Current | Location |
|-----------|---------|----------|
| Main Server | FastAPI | `backend/app/main.py` |
| Models | Pydantic | `backend/app/models.py` |
| LLM Provider | Ollama (httpx) | `backend/app/main.py` (inline) |
| Config | Env vars + hardcoded | `backend/app/main.py` (lines 19-26) |
| Health Check | Ollama only | `backend/app/main.py` (lines 196+) |

### Response Flow
1. Frontend sends: `{ conversation_id, messages: [{role, content}] }`
2. Backend builds messages with system prompt
3. Backend calls Ollama `/api/chat`
4. Ollama returns: `{ message: {role, content}, ...}`
5. Backend transforms to: `ChatResponse { conversation_id, message, model, message_id }`

---

## Target Architecture

### New Stack Overview
```
Frontend (Next.js)
    └─→ POST /api/chat (localhost:8000)
        └─→ FastAPI Backend
            └─→ LLM Provider (Abstraction Layer)
                ├─→ PRIMARY: Groq API (llama3-8b-8192)
                │   └─→ REST API via groq SDK
                └─→ FALLBACK: Ollama (localhost:11434/api/chat)
                    └─→ Ollama Asa Model
```

### Key Changes
- **New abstraction layer** decouples provider implementation
- **Dual provider support** with intelligent fallback
- **Enhanced health checks** for both providers
- **Configuration flexibility** via environment variables

---

## File Structure Changes

### New Files
```
backend/app/
├── llm_provider.py          (NEW - Provider abstraction)
├── groq_provider.py         (NEW - Groq implementation)
├── ollama_provider.py       (NEW - Ollama implementation)
├── provider_factory.py      (NEW - Provider selection logic)
├── main.py                  (MODIFIED)
├── models.py                (UNCHANGED)
```

### Modified Files
```
backend/
├── requirements.txt         (MODIFIED - Add groq SDK)
├── .env                     (MODIFIED - Add Groq config)
```

---

## Detailed Implementation Plan

### Step 1: Update Dependencies

**File**: `backend/requirements.txt`

**Add**:
```
groq==0.10.0  # Latest Groq SDK
```

**Reason**: Required for Groq API interactions

---

### Step 2: Create LLM Provider Abstraction

**File**: `backend/app/llm_provider.py` (NEW)

This file defines:
- `LLMProvider` base class (abstract interface)
- `ProviderResponse` data class (unified response format)
- Exception classes for each provider

**Key Methods**:
```python
class LLMProvider(ABC):
    async def chat(messages: list) -> ProviderResponse
    async def health_check() -> bool
    def get_name() -> str
```

---

### Step 3: Create Groq Provider

**File**: `backend/app/groq_provider.py` (NEW)

**Responsibilities**:
- Initialize Groq client with API key
- Format messages for Groq API
- Handle Groq-specific response format
- Implement timeout and error handling
- Adapt Groq response to unified format

**Key Implementation**:
```python
class GroqProvider(LLMProvider):
    - Initialize with API key from ENV
    - Map model options to Groq parameters
    - Handle streaming vs non-streaming
    - Convert Groq response to ProviderResponse
```

---

### Step 4: Create Ollama Provider

**File**: `backend/app/ollama_provider.py` (NEW)

**Responsibilities**:
- Maintain existing Ollama httpx client logic
- Implement provider interface
- Keep all current model profiles
- Health check via `/api/tags`

**Key Implementation**:
```python
class OllamaProvider(LLMProvider):
    - Use existing httpx client (move from main.py)
    - Keep existing model profiles
    - Keep existing message building logic
    - Convert Ollama response to ProviderResponse
```

---

### Step 5: Create Provider Factory with Fallback

**File**: `backend/app/provider_factory.py` (NEW)

**Responsibilities**:
- Instantiate primary and fallback providers
- Implement intelligent routing logic
- Handle provider failures and fallback
- Log provider switching

**Key Logic**:
```python
class ProviderFactory:
    - Try primary (Groq) first
    - If Groq fails, retry logic (2-3 attempts)
    - If all retries fail, use fallback (Ollama)
    - Log which provider is being used
    - Return response with provider metadata
```

---

### Step 6: Update FastAPI Backend

**File**: `backend/app/main.py` (MODIFIED)

**Changes**:
1. Import provider factory
2. Initialize providers at startup
3. Update `/api/chat` endpoint:
   - Use `provider_factory.get_response()` instead of direct Ollama call
   - Handle fallback transparently
4. Update `/health` endpoint:
   - Check both Groq and Ollama availability
   - Return provider status for each

**New Endpoint Response**:
```json
{
  "ok": true,
  "providers": {
    "groq": { 
      "available": true, 
      "model": "llama3-8b-8192" 
    },
    "ollama": { 
      "available": true, 
      "model": "asa",
      "is_fallback": true 
    },
    "active_provider": "groq"
  }
}
```

---

### Step 7: Environment Configuration

**File**: `backend/.env` (MODIFIED)

**Add**:
```env
# Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192

# Ollama Configuration (existing)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=asa

# Provider Strategy
LLM_PRIMARY_PROVIDER=groq
LLM_FALLBACK_PROVIDER=ollama
LLM_FALLBACK_ENABLED=true
LLM_RETRY_ATTEMPTS=2
LLM_TIMEOUT_SECONDS=30
```

---

## System Prompt & Configuration

### Model Profiles Strategy
- Keep existing `MODEL_PROFILES` in `main.py`
- Add profiles for Groq models:
  ```python
  MODEL_PROFILES["llama3-8b-8192"] = {
      "system_prompt": ASA_SYSTEM_PROMPT,
      "options": {
          "temperature": 0.55,
          "top_p": 0.9,
          # Groq params (if supported)
      }
  }
  ```

### System Prompt
- Same `ASA_SYSTEM_PROMPT` for both providers
- Ensures consistent behavior across providers
- 200+ line prompt ensures quality responses

---

## Fallback Logic Flow

```
User Message
    ↓
Try Groq (Primary)
    ├─ Success → Return response
    ├─ Timeout/Network Error → Retry (max 2 times)
    └─ All retries fail → Try Ollama
         ├─ Success → Return response (note: fallback used)
         ├─ Timeout/Network Error → Return error
         └─ Fail → Return error to frontend
```

---

## Error Handling

### Provider-Specific Errors
| Scenario | Groq | Ollama | Action |
|----------|------|--------|--------|
| API Key Invalid | ❌ | → Ollama | Fallback |
| Rate Limited | ⏱️ Retry | → Ollama | Fallback after retries |
| Network Timeout | ⏱️ Retry | → Ollama | Fallback after retries |
| Model Not Found | ❌ | ← | Error to frontend |
| Invalid Request | ❌ | → Ollama | Fallback |

### Response to Frontend
```json
{
  "conversation_id": "...",
  "message": { "role": "assistant", "content": "..." },
  "model": {
    "name": "llama3-8b-8192",
    "provider": "groq",
    "fallback_used": false
  }
}
```

---

## Testing Strategy

### Unit Tests
1. **Groq Provider Tests**
   - Successful response parsing
   - Error handling (timeout, invalid key)
   - Message formatting
   
2. **Ollama Provider Tests**
   - Successful response parsing
   - Model profile application
   - Health check

3. **Factory Tests**
   - Fallback triggered correctly
   - Retry logic works
   - Provider selection based on availability

### Integration Tests
1. Happy path: Groq succeeds
2. Groq fails: Fallback to Ollama succeeds
3. Both fail: Error returned to frontend
4. Health endpoint reflects provider status

### Manual Testing
1. Start with Groq only (simulate Ollama offline)
   - Verify messages work
   - Check response quality
   
2. Groq + Ollama both online
   - Verify Groq used by default
   - Check health endpoint
   
3. Groq offline
   - Kill Groq access
   - Verify Ollama fallback works
   - Check logs show provider switch

---

## Configuration Mapping

### Groq vs Ollama Parameters
| Concept | Groq | Ollama |
|---------|------|--------|
| Model ID | `llama3-8b-8192` | `asa` |
| Temperature | 0-2 | 0-2 |
| Top-P | 0-1 | 0-1 |
| Top-K | N/A | 0-100 |
| Max Tokens | `max_tokens` | `num_predict` |
| Response Format | JSON field in message | JSON field in message |
| System Prompt | In messages array | In messages array |

---

## Docker Considerations

### If Using Docker
1. Build image with updated requirements
2. Mount `.env` file for credentials
3. Document Groq API key requirement
4. Keep Ollama service as fallback

### docker-compose.yml Updates (if applicable)
```yaml
services:
  backend:
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - LLM_PRIMARY_PROVIDER=groq
  ollama:
    # Keep as fallback service
```

---

## Step-by-Step Execution Order

```
1. ✅ Read current codebase (Understanding phase) - Current step
2. ⬜ Update requirements.txt
3. ⬜ Create llm_provider.py (base class)
4. ⬜ Create groq_provider.py
5. ⬜ Create ollama_provider.py
6. ⬜ Create provider_factory.py
7. ⬜ Update main.py (/api/chat endpoint)
8. ⬜ Update main.py (/health endpoint)
9. ⬜ Create/update .env with Groq API key
10. ⬜ Test provider initialization
11. ⬜ Test chat endpoint (Groq primary)
12. ⬜ Test fallback (simulate Groq failure)
13. ⬜ Verify health endpoint
14. ⬜ Documentation update
15. ⬜ Production deployment
```

---

## Key Design Decisions

1. **Abstraction Pattern**: Provider interface for testability
2. **Retry Logic**: 2 attempts before fallback (balance speed vs reliability)
3. **Timeout**: 30 seconds per request (Groq typical response: 2-5s)
4. **Logging**: Track provider switches and failures
5. **Frontend Transparency**: Frontend doesn't need changes
6. **Graceful Degradation**: Always has fallback (user experience first)

---

## Success Criteria

✅ Groq available → Uses Groq consistently (90%+ latency improvement expected)  
✅ Groq fails → Automatically uses Ollama (zero user impact)  
✅ Both fail → Returns useful error to user  
✅ Health check → Reports both provider statuses  
✅ Response format → Identical to current (frontend no changes)  
✅ System prompt → Maintains Asa personality across providers  
✅ No data loss → All conversation history preserved  

---

## Rollback Plan

If issues occur:
1. Revert `main.py` to use Ollama only
2. Keep provider files for reference
3. Monitor Ollama performance
4. No database migration needed
5. No frontend changes required

---

## Documentation Updates Needed

- [ ] Update README.md with "Groq as Primary LLM"
- [ ] Add Groq API setup instructions
- [ ] Document environment variables
- [ ] Add provider status to health check documentation
- [ ] Update API response examples in docs

---

## Estimated Effort

| Phase | Duration | Priority |
|-------|----------|----------|
| Setup & Abstraction | 30 min | Critical |
| Groq Provider | 20 min | Critical |
| Factory & Fallback | 30 min | Critical |
| Main.py Updates | 40 min | Critical |
| Testing | 40 min | Critical |
| Documentation | 15 min | Medium |
| **Total** | **~3 hours** | - |

