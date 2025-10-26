'use client'
import { useActionState, useState } from 'react'
import { login } from '../actions'


const initialState = { error: false, message: '' }

export default function LoginPage() {
    const [state, formAction] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
 
  const togglePasswordVisibility = () => {
    setShowPassword(true)
    setTimeout(() => setShowPassword(false), 1000)
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">User Login</h1>
        


        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">continue with email</span>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email:
          </label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password:
          </label>
          <div className="relative">


          <input 
            id="password" 
            name="password" 
           type={showPassword ? "text" : "password"} 
 
              onBlur={() => setPasswordTouched(true)}
            required 
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200 pr-10"
              />
                      <button
              type="button"
              onClick={togglePasswordVisibility}
             className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors duration-200"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button 
          formAction={formAction}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        
        >
          Log in (User)
        </button>
  {state.error && <p className="text-red-500">{state.message}</p>}
  {!state.error && state.message && <p className="text-green-500">{state.message}</p>}
<div className='mt-8 text-center text-sm'>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have a member account?{' '}
        </p>
          <a href="/auth/signup" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Sign up as a Member!
          </a>
</div>
<div className='mt-8 text-center text-sm'>
        <p className=" text-gray-600 dark:text-gray-400">
          Registered mental health pro?{' '}
          
          
        </p>
          <a href="" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Sign Up as a Pro!
          </a>

</div>
      </form>
    </div>
  )
}