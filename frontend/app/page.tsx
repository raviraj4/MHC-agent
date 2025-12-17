import { createClient } from '../utils/supabase/server'
import { redirect } from 'next/navigation'
import PublicLayout from '@/components/layouts/PublicLayout'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (user && !error) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.onboarding_completed) {
      redirect('/chat')
    }
    redirect('/dashboard')
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Mental Health Companion
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your AI-powered companion for mental wellness and emotional support
          </p>
        </div>

        {/* REPLACE SignInButtons with simple links */}
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-900 dark:text-white">
            Get Started
          </h2>
          <div className="space-y-4">
            <Link 
              href="/auth/login"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/signup" 
              className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Features section remains the same */}
        <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}

const features = [
  {
    icon: '💬',
    title: 'Always Available',
    description: '24/7 support whenever you need it'
  },
  {
    icon: '🔒',
    title: 'Private & Secure',
    description: 'Your conversations are completely confidential'
  },
  {
    icon: '🤖',
    title: 'AI Powered',
    description: 'Smart, empathetic responses tailored to you'
  }
]