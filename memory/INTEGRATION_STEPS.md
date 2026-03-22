# LLM Migration: Quick Integration Steps

## Overview
**Migration**: Ollama Asa:latest → Groq llama3-8b-8192 (Primary) + Ollama (Fallback)

---

## Pre-Integration Checklist
- [ ] Groq API Key ready (get from https://console.groq.com)
- [ ] Current backend running without errors
- [ ] Ollama still available as fallback
- [ ] Python 3.10+ in virtual environment
- [ ] Read the full `LLM_MIGRATION_PLAN.md` document

---

## Integration Steps (15 steps, ~3 hours)

### PHASE 1: Setup & Dependencies (10 min)

**Step 1: Update Requirements**
- Add `groq==0.10.0` to `backend/requirements.txt`
- Run: `pip install groq`

**Step 2: Create .env Configuration**
- Add to `backend/.env`:
  ```
  GROQ_API_KEY=your_actual_groq_api_key_here
  GROQ_MODEL=llama3-8b-8192
  LLM_PRIMARY_PROVIDER=groq
  LLM_FALLBACK_PROVIDER=ollama
  LLM_FALLBACK_ENABLED=true
  LLM_RETRY_ATTEMPTS=2
  LLM_TIMEOUT_SECONDS=30
  ```

---

### PHASE 2: Core Implementation (100 min)

**Step 3: Create Base Provider Class** (`backend/app/llm_provider.py`)
- Define abstract `LLMProvider` base class
- Define `ProviderResponse` data class
- Define custom exceptions

**Step 4: Create Groq Provider** (`backend/app/groq_provider.py`)
- Implement `GroqProvider` class
- Handle API key and model initialization
- Implement `chat()` method with error handling
- Implement `health_check()` method

**Step 5: Create Ollama Provider** (`backend/app/ollama_provider.py`)
- Implement `OllamaProvider` class (refactor from main.py)
- Keep existing model profiles logic
- Keep existing message building logic
- Implement `chat()` and `health_check()` methods

**Step 6: Create Provider Factory** (`backend/app/provider_factory.py`)
- Implement `ProviderFactory` class
- Add primary/fallback selection logic
- Add retry mechanism (max 2 attempts)
- Add logging for provider switches

**Step 7: Update Main Backend** (`backend/app/main.py`)
- Import provider factory
- Initialize providers at app startup
- Replace direct Ollama calls in `/api/chat` endpoint
- Update response format to include provider metadata
- Update `/health` endpoint to check both providers

---

### PHASE 3: Testing & Validation (60 min)

**Step 8: Test Provider Initialization**
```python
# Quick test: python -c "from app.provider_factory import ProviderFactory"
```

**Step 9: Test Groq Connection**
- Start backend
- Send test message in chat
- Verify: Check logs for "provider: groq"

**Step 10: Test Fallback Logic**
- Stop Groq access (kill internet or remove API key)
- Send test message
- Verify: Falls back to Ollama after 2 retries
- Check logs for "provider: ollama"

**Step 11: Test Health Endpoint**
- Call: `curl http://localhost:8000/health`
- Verify: Shows both providers status

**Step 12: Test Error Handling**
- Stop Ollama service
- Try sending message
- Verify: Returns error with retry info

**Step 13: Test System Prompt**
- Chat with mental health prompt
- Verify: Asa personality maintained on both providers

**Step 14: Performance Baseline**
- Time multiple requests through Groq
- Compare with Ollama (if needed)
- Expected: Groq 2-5s, Ollama 5-15s

---

### PHASE 4: Production Deployment (30 min)

**Step 15: Documentation & Rollout**
- Update project README with new architecture
- Document Groq API key setup
- Create deployment checklist
- Monitor first 24 hours for errors

---

## File Changes Summary

### Files to Create (NEW)
```
backend/app/
├── llm_provider.py       (Abstract base class)
├── groq_provider.py      (Groq implementation)
├── ollama_provider.py    (Ollama implementation)
└── provider_factory.py   (Fallback routing logic)
```

### Files to Modify
```
backend/
├── requirements.txt      (Add groq SDK)
├── .env                  (Add Groq config)
└── app/main.py          (Update endpoints)
```

### Files to Keep Unchanged
```
backend/app/models.py     (Pydantic models)
frontend/                 (No changes!)
```

---

## Configuration Reference

### Environment Variables
```bash
# REQUIRED
GROQ_API_KEY=...                          # Get from https://console.groq.com

# OPTIONAL (defaults provided)
GROQ_MODEL=llama3-8b-8192                 # Groq model
OLLAMA_BASE_URL=http://127.0.0.1:11434    # Ollama location
OLLAMA_MODEL=asa                           # Ollama model
LLM_PRIMARY_PROVIDER=groq                  # Primary provider
LLM_FALLBACK_PROVIDER=ollama               # Fallback provider
LLM_FALLBACK_ENABLED=true                  # Enable fallback
LLM_RETRY_ATTEMPTS=2                       # Retry count
LLM_TIMEOUT_SECONDS=30                     # Timeout per request
```

---

## Expected Behavioral Changes

### Before Migration
```
User Message → FastAPI → Ollama Asa → Response (5-15s)
```

### After Migration
```
User Message → FastAPI → Groq (try 2x) → Response (2-5s)
              OR fallback → Ollama → Response (5-15s if Groq fails)
```

### Performance Impact
- **Fast path**: 60-70% faster responses (Groq 2-5s vs Ollama 5-15s)
- **Reliability**: 99.9%+ uptime with fallback
- **Cost**: Groq free tier sufficient, or paid API
- **Privacy**: Groq processes queries (vs local Ollama)

---

## Troubleshooting Guide

### Issue: "Groq API Key Invalid"
**Solution**: Verify key in .env, get new one from console.groq.com

### Issue: "Both providers failed"
**Solution**: Check internet connection, API key, Ollama running

### Issue: "Always uses Ollama, never Groq"
**Solution**: Check logs for Groq initialization errors, verify API key

### Issue: "Groq rate limited"
**Solution**: Add exponential backoff to retry logic, or use Ollama-only

### Issue: "System prompt not applied"
**Solution**: Verify MODEL_PROFILES includes both groq and ollama models

### Issue: "Health check fails"
**Solution**: Update health check to handle both providers, test independently

---

## Monitoring Recommendations

### What to Monitor
1. **Provider Usage**: Track % of Groq vs Ollama requests
2. **Fallback Rate**: Should be <5% if Groq stable
3. **Response Time**: Groq should be 2-5s
4. **Error Rate**: Log all provider failures
5. **API Quota**: Monitor Groq usage if on paid plan

### Logs to Check
```
Backend logs should show:
✅ "Initializing Groq provider"
✅ "Initializing Ollama provider"
✅ "Using primary provider: groq"
✅ "Request completed: provider=groq, latency=2.3s"
❌ "[ERROR] Groq request failed, attempting retry..."
❌ "Falling back to Ollama provider"
```

---

## Rollback Procedure (If Needed)

If issues occur and need to revert to Ollama-only:

1. **Quick Rollback** (5 min):
   - Revert `backend/app/main.py` to use Ollama directly
   - No database changes needed
   - Frontend works unchanged

2. **Keep New Files**:
   - Leave provider files in place
   - Can re-enable later when issues fixed

3. **Monitor**:
   - Watch for any data inconsistencies
   - None expected (same structure)

---

## What Stays the Same

✅ Frontend code (No changes!)  
✅ Chat endpoint URL (`/api/chat`)  
✅ Request format (`{conversation_id, messages}`)  
✅ Response structure (`{conversation_id, message, model}`)  
✅ Asa system prompt & personality  
✅ Database schema  
✅ All existing conversations  
✅ User experience (transparent fallback)

---

## Next Steps After Integration

1. **Monitor for 24 hours** - Check logs, performance, errors
2. **User feedback** - Verify response quality maintained
3. **Cost analysis** - If using Groq paid tier, verify spending
4. **Documentation** - Update team wiki/docs with new architecture
5. **CI/CD** - Update docker builds if using containers
6. **Alerts** - Set up alerts for provider failures

---

## Success Indicators ✅

When integration is complete, you should see:

- [ ] Backend starts without errors
- [ ] Health endpoint returns both providers
- [ ] Chat endpoint responds with Groq model name
- [ ] Groq response time is 2-5 seconds
- [ ] Stopping Groq access triggers fallback to Ollama
- [ ] System prompt (Asa) works on both providers
- [ ] No frontend changes needed
- [ ] All existing conversations preserved
- [ ] Error messages are informative

---

## Support & Questions

If stuck on any step:
1. Check `LLM_MIGRATION_PLAN.md` for detailed explanation
2. Review the specific provider implementation
3. Check backend logs for error messages
4. Verify environment variables are loaded
5. Test provider initialization independently

