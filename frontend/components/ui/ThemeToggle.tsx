'use client'

import { useTheme } from "../providers/ThemeProvider"
import { Theme } from "@/types"

export default function ThemeToggle(){
    const {theme, setTheme, resolvedTheme} = useTheme()

    const handleThemeChange = (newTheme: Theme) =>{
        setTheme(newTheme)
    }

    return (
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')} 
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle theme"
            >
                {resolvedTheme === 'dark' ? '🌙' : '☀️'}
            </button>

            <select 
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as Theme)} 
                className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </div>
    )
}