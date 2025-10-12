'use client'

import { createContext, useContext, useEffect, useState } from "react"

import { Theme, ThemeContextType } from "@/types"


const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const getInitialTheme = (defaultTheme: Theme): Theme => {
    if (typeof window === 'undefined') return defaultTheme
    const savedTheme = localStorage.getItem('theme') as Theme
    return savedTheme || defaultTheme
} 



export function ThemeProvider({
    children, 
    defaultTheme = 'system'
}:{
    children: React.ReactNode
    defaultTheme?: Theme
}){
    const [theme, setTheme] = useState<Theme>(getInitialTheme(defaultTheme))
    const [resolvedTheme, setResolvedTheme] = useState<'light'|'dark'>('light')


    useEffect(()=>{
        const root =  window.document.documentElement
        root.classList.remove('light', 'dark')

        let currentTheme: 'light'|'dark'

    if (theme === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      currentTheme = theme
    }
    root.classList.add(currentTheme)
    setResolvedTheme(currentTheme)
    localStorage.setItem('theme', theme)

    }, [theme])


    useEffect(()=> {
        if (theme !== 'system') return

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleChange = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light'
            document.documentElement.classList.remove('light', 'dark')
            document.documentElement.classList.add(newTheme)
            setResolvedTheme(newTheme)
        }

        mediaQuery.addEventListener('change', handleChange)
        return ()=> mediaQuery.removeEventListener('change', handleChange )
        
    }, [theme])

    return (
        <ThemeContext.Provider value={{theme, setTheme, resolvedTheme}}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () =>{
    const context = useContext(ThemeContext)
    if(context === undefined){
        throw new Error('useTheme must be used within a ThemeProvider! ')
    }
    return context
}