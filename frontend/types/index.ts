import { Session } from "@supabase/supabase-js"
// tailwind types -----
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void 
    resolvedTheme: 'light' | 'dark'
}
// tailwind types -----

// authentication types ---
export interface User {
    id: string
    email:string
    user_metadata?:{
        name?: string
        avatar_url?: string
    }
}

export interface AuthContextType{
    session: Session | null
    signOut: ()=> Promise<void>
}
// authentication types ---


// Chat Types (for future use)
export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// Database Types (matching your Supabase schema)
export interface Profile {
  id: string
  first_name?: string
  last_name?: string
  preferred_name?: string
  avatar_id?: string
  created_at: string
  updated_at: string
}

export interface AvatarOption {
  id: string
  image_url: string
  avatar_name: string
  personality_traits: string[]
  color_palette: string[]
  symbolism: string
  sort_order: number
  is_active: boolean
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  email: string
  password: string
  confirmPassword?: string
}

