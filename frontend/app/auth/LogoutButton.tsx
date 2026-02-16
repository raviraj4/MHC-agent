'use client'

import { useRouter } from 'next/navigation'
import { logout } from './actions'
export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }

  return (
    <button 
      onClick={handleLogout}
      className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
    >
      Sign Out
    </button>
  )
}