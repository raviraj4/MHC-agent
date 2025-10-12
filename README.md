
# Mental Health Companion - AI Agent

A full-stack mental health companion application featuring AI-powered emotional support, secure authentication, and a beautiful, accessible user interface.

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Modern utility-first CSS with custom theme
- **Supabase** - Authentication & real-time database
- **Sonner** - Toast notifications

### Backend
- **Python FastAPI** - High-performance API framework
- **LangChain** - AI agent orchestration
- **OpenAI API** - LLM integration for mental health support

## Architecture/File structure MetaData

frontend/                 # Next.js application
├── app/                 # App Router directory
│   ├── auth/           # Authentication pages
│   ├── chat/           # Protected chat interface
│   └── layout.tsx      # Root layout with providers
├── components/         # React components
│   ├── auth/          # Authentication components
│   ├── layouts/       # App layout components
│   ├── providers/     # Context providers
│   └── ui/            # Reusable UI components
└── lib/               # Utility libraries
    └── supabase/      # Supabase client configuration

backend/                # FastAPI application
├── app/               # FastAPI application code
├── agents/            # AI agent implementations
└── requirements.txt   # Python dependencies

## 🔐 Authentication System

### Features
- **Multi-provider Auth**: Email/password + Google OAuth
- **Secure Sessions**: JWT-based authentication with Supabase
- **Protected Routes**: Middleware-based route protection
- **Password Validation**: Real-time strength validation with visual feedback

## 🎨 Theme System

### Custom Beige Color Palette
- **Light Mode**: Soft beige background (`#f8f4f0`) with warm accents
- **Dark Mode**: Dark beige/charcoal (`#2a2623`) with amber highlights
- **OKLCH Colors**: Modern, perceptually uniform color space
- **Smooth Transitions**: 200ms transition duration for all theme changes

### Theme Configuration
Utilises the v4 tailwindcss
@import "tailwindcss";

@theme {
  /* Custom beige color scale */
  --color-beige-50: oklch(0.98 0.01 85);
  --color-beige-100: oklch(0.95 0.02 85);
  --color-beige-200: oklch(0.90 0.03 85);
  /* ... complete scale to 900 */
  
  /* Dark mode variants */
  --color-beige-950: oklch(0.15 0.02 85);
}

## 📱 UI/UX Features

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

## 🔧 Setup & Installation

### Frontend Setup

# Install dependencies
`npm install`

# Environment configuration
`cp .env.example .env.local`
# Add your Supabase credentials

# Development server
`npm run dev`


### Backend Setup
```
# Python environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload
```

## 🛠️ Development Features

### Code Quality
- **TypeScript**: Full type coverage
- **ESLint**: Code linting and formatting
- **Component Architecture**: Reusable, composable components

### Performance
- **Next.js 15**: Latest React features with Turbopack
- **Image Optimization**: Automatic WebP conversion
- **Code Splitting**: Dynamic imports for optimal loading

## 📦 Deployment

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

### Mental Health Agent
- **Context Awareness**: User-specific conversation history
- **Emotional Intelligence**: Tone-appropriate responses
- **Crisis Detection**: Automated support resource suggestions
- **Privacy First**: No persistent conversation storage without consent

## 📄 License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Note**: This application is designed for mental health support but is not a replacement for professional medical advice. Always consult qualified healthcare providers for mental health concerns.
```

This README provides comprehensive documentation covering:
- **Technical stack** and architecture decisions
- **Implementation details** for key features
- **Setup instructions** for development and deployment
- **Security considerations** and best practices
- **Contributing guidelines** for team collaboration

The format is GitHub-ready with proper markdown syntax, code blocks, and organized sections for easy navigation.
