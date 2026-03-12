
# Mental Health Companion - AI Agent

A full-stack mental health companion application featuring AI-powered emotional support, secure authentication, and a beautiful, accessible user interface.

## Tech Stack

### Frontend (current)
- **Next.js 15** - App Router UI
- **TypeScript** - Type-safe components
- **Tailwind CSS v4** - Tokenized theme system
- **Supabase** - Auth + profile storage
- **Sonner** - Toast notifications

### Backend (current)
- **Python FastAPI** - REST API + health checks
- **Ollama (Gemma3 / Asa Modelfile)** - Local LLM runtime
- **SQLite** - Lightweight persistence for conversations
- **httpx + Pydantic** - Async client + schema validation

### Future Enhancements (planned)
- **LangChain orchestration** for multi-tool agent flows
- **Managed LLM APIs** (OpenAI/Azure) as optional fallbacks when privacy budgets allow
- **Cloud-native storage** (Postgres, vector DB) for team deployments

## Architecture/File structure MetaData
```
frontend/
├── app/                 # App Router routes (auth, chat, dashboard, journal)
├── components/          # Layouts, onboarding flow, UI primitives
├── providers/           # Theme + Auth contexts
└── utils/supabase/      # Client/server helpers

backend/
├── app/
│   ├── main.py          # FastAPI entry, /api/chat + /health
│   └── models.py        # Pydantic request/response schemas
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
- **Context Awareness**: Trimmed conversation history persisted in SQLite + browser state.
- **Crisis Detection**: Keyword/sentiment hooks surface SOS flow and therapist referrals.

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

