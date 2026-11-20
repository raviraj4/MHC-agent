
# Mental Health Companion - AI Agent

A full-stack mental health companion application featuring AI-powered emotional support, secure authentication, mood tracking, journaling, therapist connections, direct messaging, emergency-contact management, and an SOS escalation workflow.

This README is also an interview-oriented technical guide: it explains the main design decisions, request flows, trade-offs, and failure handling implemented in the system.

## Tech Stack

### Frontend (current)
- **Next.js 15** - App Router UI
- **TypeScript** - Type-safe components
- **Tailwind CSS v4** - Tokenized theme system
- **Supabase** - Auth + profile storage
- **Sonner** - Toast notifications

### Backend (current)
- **Python FastAPI** - REST API + health checks
- **Groq and Ollama** - Provider abstraction with fallback support
- **Supabase/Postgres** - Authenticated application data and relational workflows
- **SQLite/SQLModel** - Legacy/local conversation persistence
- **httpx + Pydantic** - Async client + schema validation

### Future Enhancements (planned)
- **LangChain orchestration** for multi-tool agent flows
- **Managed LLM APIs** (OpenAI/Azure) as optional fallbacks when privacy budgets allow
- **Cloud-native storage** (Postgres, vector DB) for team deployments

## Architecture/File structure MetaData
```
frontend/
├── app/                 # App Router routes and server actions
│   ├── dashboard/       # Mood dashboard and SOS entry point
│   ├── profile/         # Profile and emergency-contact management
│   ├── messages/        # Therapist direct-message route
│   └── playground/      # Role-play and consolation trainers
├── components/          # Layouts, feature clients, and UI primitives
│   ├── dashboard/       # SOS control
│   ├── messages/        # Direct-message client
│   ├── profile/         # Emergency-contact editor
│   └── layouts/         # Authenticated application shell
├── providers/           # Theme + Auth contexts
└── utils/supabase/      # Client/server helpers

backend/
├── app/
│   ├── main.py          # FastAPI routes, auth, therapist, SOS, and RAG flows
│   ├── models.py        # Pydantic request/response schemas
│   └── provider_factory.py # Provider selection, retry, and fallback
├── modelfiles/
│   └── asa-mental-health-coach/Modelfile  # Gemma3 persona + params
└── requirements.txt
```
## Authentication System

### Features
- **Multi-provider Auth**: Email/password + Google OAuth
- **Secure Sessions**: JWT-based authentication with Supabase
- **Protected Routes**: Middleware-based route protection
- **Password Validation**: Real-time strength validation with visual feedback

### Password Recovery Flow (Forgot / Reset Password)

**Routes added:**
| Route | Purpose |
|---|---|
| `/auth/forgot-password` | Email form — sends a Supabase password-reset link |
| `/auth/reset-password` | New-password form — shown after clicking the emailed link |

**Server actions** (`app/auth/actions.ts`):
- `forgotPassword` — calls `supabase.auth.resetPasswordForEmail()` with a `redirectTo` that routes through `/auth/callback` → `/auth/reset-password`. Returns a generic success to prevent email enumeration.
- `resetPassword` — calls `supabase.auth.updateUser({ password })` using the session that the callback exchange created. Validates length + confirmation match server-side.

**Callback** (`app/auth/callback/route.ts`):
Updated to read the `next` and `type` query params so it can redirect password-recovery tokens directly to `/auth/reset-password?type=<userType>`.

**Scalability for multiple user types:**
Both actions and pages accept a `userType` parameter (`user` | `professional` | `organisation`). It flows through the whole chain:
1. Forgot-password page reads `?userType=` from the URL (defaults to `user`).
2. The reset email's `redirectTo` includes `&type=<userType>`.
3. The callback forwards `type` to the reset-password page.
4. Post-reset routing can branch on `type` (e.g. redirect pros to a different dashboard).

To add a new role, pass `?userType=newRole` when linking to `/auth/forgot-password` — no code changes required.

**Login page** (`app/auth/login/page.tsx`):
Added a "Forgot password?" link below the password field.

##  UI/UX Features

### Authentication Forms
- **Real-time Validation**: Password strength indicators
- **Eye Toggle**: Temporary password visibility (1-second display)
- **Loading States**: Disabled forms during submission
- **Error Handling**: User-friendly error messages with toasts

### Chat Interface
- **Responsive Layout**: Sidebar + main chat area
- **Message History**: Persistent conversation storage
- **Dark/Light Mode**: System preference with manual override
- **Accessibility**: WCAG compliant contrast ratios

### Dashboard and wellbeing features
- **Mood check-ins**: Users record mood, energy, stress, notes, and tags.
- **Monthly mood view**: The dashboard loads the current month and today's latest check-in.
- **Journal**: Server actions persist private journal entries and related metadata.
- **Onboarding**: Captures preferred name, goals, activities, and a consented emergency contact.
- **Profile management**: Emergency contacts can be added or updated after onboarding; the editor supports multiple contacts and consent validation.
- **Role-aware navigation**: Admins and therapists receive links to their role-specific dashboards.

## Therapist connection and messaging flow

1. A signed-in user searches verified therapists through `GET /therapists`.
2. The user selects a therapist through `POST /therapist-connections`.
3. The backend creates or reuses a unique `therapist_connections` row.
4. A `direct_conversations` row is created or reused for that connection.
5. `DirectMessageClient` reads and sends messages through:
   - `GET /direct-conversations/{conversation_id}/messages`
   - `POST /direct-conversations/{conversation_id}/messages`
6. Every message creates a notification for the other participant.
7. The therapist dashboard lists connected users and links to their conversations.

The backend checks that the authenticated user belongs to the conversation before reading or writing messages. The browser never chooses an arbitrary recipient; the recipient is derived from the verified connection.

## SOS emergency-support flow

The SOS control is intentionally a three-press action rather than a single-click action to reduce accidental alerts.

### User flow

1. The user presses the glowing SOS button three times within a short window.
2. The client displays press progress, sending state, success state, and recoverable errors.
3. The client calls `POST /sos` with the Supabase access token.
4. The backend authenticates the user and verifies that the account is a normal user account.
5. It loads consented emergency contacts from `emergency_contacts`.
6. It finds the user's most recent therapist connection and direct conversation.
7. It creates a templated direct message containing:
   - User name and email
   - Emergency contact name
   - Relationship
   - Phone number
   - Optional email
8. It updates the conversation timestamp and creates a therapist notification.

### Why the SOS message is sent through direct messaging

The system already has an authenticated therapist conversation, notification delivery, and therapist inbox. Reusing that path means an SOS alert is visible in the same workflow the therapist already monitors instead of introducing an unconnected alert system.

### Failure handling

- No consented emergency contact: the API returns a clear validation error and the UI links to Profile.
- No therapist connection: the API asks the user to connect with a therapist first.
- Invalid/expired token: the API returns an authentication error.
- Browser/backend origin mismatch: local CORS supports both `localhost` and `127.0.0.1`.
- Unsupported notification kinds are avoided by using the existing `new_direct_message` database constraint.

The SOS feature is an in-app therapist alert, not a replacement for local emergency services. Immediate danger should always be escalated to the appropriate emergency number or emergency department.

## AI provider architecture

All model calls go through `ProviderFactory`. The API can try a preferred provider, then fall back to the configured primary/fallback providers. This keeps route code independent from a specific LLM vendor and makes local-first development possible.

### Standard ASA chat

`POST /api/chat` accepts a conversation ID and message list. The backend:

1. Authenticates the user when a bearer token is supplied.
2. Creates or reuses a persistent conversation where appropriate.
3. Sends the conversation to the configured provider.
4. Persists user and assistant messages for authenticated conversations.
5. Returns provider metadata with the assistant response.

### Role-play trainer and RAG grounding

The trainer uses `POST /api/trainer/rag-chat`:

1. The client sends the latest user turn and the full transient transcript.
2. The backend retrieves scenario metadata from the scenario catalog.
3. The selected scenario is locked for the session by UUID or by its title.
4. The backend assembles a grounded system prompt containing the scenario, persona, critique focus, and response style.
5. The model replies in character.

The scenario lock is important. Without it, semantic retrieval on every turn could switch from a family-conflict scenario to a work-conflict scenario merely because a later user message contains overlapping words.

The role-play persona is instructed to:

- Stay inside the selected scenario and relationship.
- Use one to three short sentences and stay under approximately 60 words.
- Reveal information gradually rather than summarizing the entire situation.
- Leave room for the trainee to respond.
- Briefly steer unrelated user messages back to the scenario.

### Coach review

When a session ends, the client sends a separate review request to `/api/chat`. The review prompt labels role-play partner turns as context and asks the model to evaluate only trainee turns. The UI displays the review in a compact card with structured headings and exposes a visible retry state if generation fails.

## Authentication and authorization

- Supabase Auth provides email/password and OAuth sessions.
- Server components use `supabase.auth.getUser()` before rendering protected pages.
- Client API calls send the current access token as a bearer token.
- FastAPI validates the token with Supabase before protected operations.
- Admin database access is isolated behind the server-only service-role client.
- Therapist and admin endpoints verify the authenticated profile role.
- Conversation access is checked against the connection participants.
- Emergency contacts are scoped to the authenticated user's ID.

The service-role key must never be exposed to the browser. Frontend code uses the public Supabase URL/key; privileged database access remains in the backend or server actions.

## Interview talking points

### Why Next.js App Router?

It allows protected data to be loaded in server components, keeps secrets out of browser bundles, and still supports interactive client components for chat, mood check-ins, SOS presses, and profile forms.

### Why FastAPI instead of putting everything in Next.js?

FastAPI gives the AI and therapist workflows a dedicated API boundary, clear Pydantic contracts, Python-native LLM integration, and a natural place for provider fallback and backend authorization.

### Why use both server actions and FastAPI?

Server actions are useful for tightly coupled Supabase mutations such as onboarding, journal entries, and profile contacts. FastAPI handles cross-client workflows, LLM calls, therapist messaging, notifications, and operations that benefit from explicit REST endpoints.

### How is privacy handled?

The application uses authenticated queries, user-scoped records, server-side authorization, and a server-only service-role client. The role-play trainer uses a transient conversation ID and is not intended to save the practice transcript as a normal user conversation.

### What happens if the LLM provider is unavailable?

`ProviderFactory` attempts the preferred provider, then configured primary and fallback providers. The API logs provider failures and returns an explicit error if no provider can answer. The UI should show a recoverable error rather than a fabricated success response.

### What would you improve next?

- Add automated integration tests for SOS, therapist authorization, and scenario locking.
- Add database migrations and an explicit notification-kind enum shared by API and schema.
- Add rate limiting and audit logging for SOS alerts.
- Add structured review JSON instead of parsing free-form review text.
- Stream assistant responses for a more natural typing experience.
- Add observability dashboards for provider latency, failures, and SOS delivery.

## Setup & Installation

### Frontend Setup
```
cd frontend
# Install dependencies
npm install

# Environment configuration (create a .env file) and add:
NEXT_PUBLIC_SUPABASE_URL=urlhere
NEXT_PUBLIC_SUPABASE_ANON_KEY=anonkeyhere

# Add your Supabase credentials

# Development server
npm run dev
```

### Backend Setup
```
cd backend

# (Recommended) reuse the bundled virtual env name
python -m venv myenv
myenv\Scripts\activate    # Windows
# source myenv/bin/activate # macOS/Linux

pip install -r requirements.txt

# ensure Ollama is running with the asa Modelfile loaded
uvicorn app.main:app --reload
```

### One-click Dev Startup
From repo root run:
```
powershell -ExecutionPolicy Bypass -File .\start.ps1
```
This opens two terminals: `npm run dev` (frontend) and `uvicorn app.main:app --reload` (backend).
##  Development Features

### Code Quality
- **TypeScript**: Full type coverage
- **ESLint**: Code linting and formatting
- **Component Architecture**: Reusable, composable components

### Performance
- **Next.js 15**: Latest React features with Turbopack
- **Image Optimization**: Automatic WebP conversion
- **Code Splitting**: Dynamic imports for optimal loading

## Deployment

### Frontend (Vercel)
```bash
# Automatic deployment from main branch
vercel --prod
```

### Backend (Railway)
```bash
# Connect GitHub repository
railway link
railway deploy
```

## Security

- **Row Level Security**: Database-level permission system
- **HTTPS Enforcement**: Secure connections only
- **Input Validation**: Server-side form validation
- **XSS Protection**: Sanitized user input handling

## AI Integration

### Mental Health Agent (current)
- **Local-first models**: Asa Modelfile (Gemma3 base) served through Ollama—no cloud data leakage by default.
- **Persona injection**: FastAPI adds system prompts + safety parameters before every `/api/chat` call.
- **Context Awareness**: Conversation history is passed through typed request models and persisted for authenticated standard chat.
- **Provider fallback**: Groq/Ollama selection is centralized in `ProviderFactory`.
- **Trainer grounding**: Scenario retrieval and session locking keep role-play responses on topic.
- **Crisis support**: The in-app SOS workflow alerts a connected therapist with consented emergency-contact information.

### Future AI Work
- LangChain-based tool use (journaling summaries, grounding exercises)
- Managed API failover for low-resource devices
- Fine-tuned emotional classifiers + InitNet scheduling heuristics

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Note**: This application is designed for mental health support but is not a replacement for professional medical advice. Always consult qualified healthcare providers for mental health concerns.
