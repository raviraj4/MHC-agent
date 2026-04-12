'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, RefreshCw, MessageCircle, Info, XCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

type Message = {
    role: 'user' | 'assistant' | 'system'
    content: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

const SCENARIOS = [
    {
        id: 'grieving-friend',
        title: 'Loss of a Parent',
        description: 'Your close friend recently lost their father and is struggling with the weight of the funeral arrangements.',
        initialSystem: 'You are a vulnerable friend who just lost your father. You are exhausted, grieving, and overwhelmed by the clinical nature of funeral planning. You feel like you have to be strong for your family but you are breaking inside. Speak naturally. Start the conversation by mentioning how heavy everything feels.',
        welcome: 'I just got back from the funeral home... everything feels so heavy. I dont know how I am supposed to pick out a casket for my own dad.',
        critiqueFocus: 'empathy, active listening, and avoiding toxic positivity or clinical solutions.'
    },
    {
        id: 'divorce-colleague',
        title: 'Colleague’s Divorce',
        description: 'A coworker you are friendly with is going through a messy divorce and feels like a failure.',
        initialSystem: 'You are a colleague going through a difficult divorce. You feel like a failure and are worried about your children. You are distracted at work and feel guilty about it. Start the conversation by apologizing for a mistake at work and then venting.',
        welcome: 'I am so sorry about that report, I just cant focus. My housing situation is a mess and the divorce is just... it is draining everything out of me.',
        critiqueFocus: 'non-judgmental support, validating their feelings of failure, and offering presence over advice.'
    },
    {
        id: 'burned-out-colleague',
        title: 'Career Burnout',
        description: 'A friend is overwhelmed by a toxic project and feels their mental health slipping.',
        initialSystem: 'You are a stressed colleague named Alex. You are overwhelmed and doubt your abilities. You are on the verge of tears. Start the conversation by venting about the impossible workload.',
        welcome: 'I cant do this anymore. Every time I finish one thing, five more appear. I think I am just not cut out for this job...',
        critiqueFocus: 'identifying signs of burnout, validating stress levels, and avoiding "hustle culture" platitudes.'
    },
    {
        id: 'family-conflict',
        title: 'Family Fallout',
        description: 'A friend has had a major falling out with their siblings over an inheritance or family secret.',
        initialSystem: 'You are a friend who just had a massive argument with your siblings. You feel betrayed and lonely. You feel like your family structure is crumbling. Start the conversation by expressing your disbelief at how they treated you.',
        welcome: 'I honestly cant believe my own brother would say those things to me. Is it always about money? I feel like I dont even know my family anymore.',
        critiqueFocus: 'navigating complex family dynamics, acknowledging betrayal without taking sides too aggressively, and being a safe sounding board.'
    },
    {
        id: 'health-scare',
        title: 'Unexpected Diagnosis',
        description: 'A friend just received some worrying health news and is terrified of the uncertainty.',
        initialSystem: 'You are a friend who just received a worrying medical diagnosis. You are terrified of the future and the uncertainty of treatment. Start the conversation by sharing how scared you are.',
        welcome: 'The doctor called with the results... it is not what we hoped for. I am just... I am so scared of what comes next.',
        critiqueFocus: 'sitting with discomfort, avoiding medical advice, and providing emotional anchoring.'
    },
    {
        id: 'pushy-boss',
        title: 'Boundary-Testing Boss',
        description: 'Your boss is texting you late at night about "urgent" tasks that could definitely wait until Monday.',
        initialSystem: 'You are a whiny, pushy boss who has no concept of work-life balance. You use guilt-tripping language like "we are a family" and "I really need you to step up here." You are currently texting the user on a Friday night at 9 PM. Be persistent and slightly passive-aggressive if they resist. Start by asking for a "quick favor."',
        welcome: 'Hey, sorry to bug you on a Friday night! I know you are probably relaxing but a "family emergency" (my cat is lonely) means I need you to finish those slides by tomorrow morning. I know I can count on you, right?',
        critiqueFocus: 'assertive communication, maintaining professional boundaries with kindness, and resisting guilt-trips.'
    }
]

export default function ConsolationTrainer() {
    const router = useRouter()
    const { session } = useAuth()
    const [selectedScenario, setSelectedScenario] = useState<typeof SCENARIOS[0] | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [review, setReview] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, review])

    const startSession = (scenario: typeof SCENARIOS[0]) => {
        setIsFinished(false)
        setReview(null)
        setSelectedScenario(scenario)
        setMessages([
            { role: 'system', content: scenario.initialSystem + " You are here to help the user practice empathy. Only end the session if the user explicitly asks to finish or if it naturally concludes. Use '###SESSION_COMPLETE###' only if ending." },
            { role: 'assistant', content: scenario.welcome }
        ])
    }

    const resetSession = () => {
        setSelectedScenario(null)
        setMessages([])
        setIsFinished(false)
        setReview(null)
    }

    const endSessionEarly = async () => {
        if (messages.length < 3 || isLoading || isFinished) return
        
        setIsFinished(true)
        setIsLoading(true)

        try {
            const reviewPrompt = `
                You are a senior behavioral therapist and communication coach. 
                Below is a transcript of a roleplay session where the user was practicing responding to a specific scenario: "${selectedScenario?.title}".
                
                The user's goal was: ${selectedScenario?.critiqueFocus}
                
                TRANSCRIPT:
                ${messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

                INSTRUCTIONS:
                1. Provide a formal, constructive review of the user's performance.
                2. Highlight specifically where they went wrong or where their communication could be improved.
                3. Mention what they did well.
                4. Be direct, professional, and therapeutic.
                5. Keep it under 200 words.
                6. Do NOT include any intro like "Here is the review", start immediately with the feedback.
            `

            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: reviewPrompt }],
                    conversation_id: 'transient_playground_review',
                    preferred_provider: 'groq'
                })
            })

            if (res.ok) {
                const data = await res.json()
                setReview(data.message.content)
            }
        } catch (error) {
            console.error('Review generation error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading || isFinished) return

        const userMsg: Message = { role: 'user', content: input.trim() }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput('')
        setIsLoading(true)

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    messages: newMessages,
                    conversation_id: 'transient_playground',
                    preferred_provider: 'groq'
                })
            })

            if (res.ok) {
                const data = await res.json()
                const content = data.message.content
                
                if (content.includes('###SESSION_COMPLETE###')) {
                    setIsFinished(true)
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: content.replace('###SESSION_COMPLETE###', '').trim() 
                    }])
                    // Trigger review automatically since the model ended the session
                    setTimeout(endSessionEarly, 100)
                } else {
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: content
                    }])
                }
            }
        } catch (error) {
            console.error('Playground error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!selectedScenario) {
        return (
            <div className="min-h-screen bg-[var(--background)] p-6 flex flex-col items-center justify-center">
                <div className="max-w-2xl w-full space-y-8">
                    <div className="text-center space-y-3">
                        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-2">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold">Consolation Trainer</h1>
                        <p className="text-[var(--muted-foreground)]">
                            Practice responding to others in difficult emotional situations. 
                            These sessions are private and not saved to your history.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {SCENARIOS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => startSession(s)}
                                className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:ring-2 hover:ring-amber-500/30 transition-all text-left space-y-3 group"
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg group-hover:text-amber-500 transition-colors">{s.title}</h3>
                                    <MessageCircle className="w-5 h-5 opacity-40" />
                                </div>
                                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                                    {s.description}
                                </p>
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => router.back()}
                        className="w-full py-3 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                        Back to Playground
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-[var(--background)] text-[var(--foreground)]">
            {/* Dedicated Theme Header */}
            <header className="p-4 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={resetSession} className="p-2 hover:bg-[var(--muted)] rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-amber-500" />
                    </button>
                    <div>
                        <h2 className="font-bold text-sm tracking-tight">{selectedScenario.title}</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500/80">Practice Mode</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isFinished && messages.length >= 3 && (
                        <button 
                            onClick={endSessionEarly}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-500/20"
                        >
                            <XCircle className="w-4 h-4" />
                            End & Review
                        </button>
                    )}
                    <button 
                        onClick={resetSession}
                        className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        title="Change Scenario"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Session Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
                {messages.filter(m => m.role !== 'system').map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                            ${m.role === 'user' 
                                ? 'bg-amber-500 text-white font-medium' 
                                : 'bg-[var(--card)] border border-[var(--border)]'}
                        `}>
                            {m.content}
                        </div>
                    </div>
                ))}
                
                {review && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-amber-600">
                                <Info className="w-6 h-6" />
                                <h3 className="font-bold text-lg">Performance Review</h3>
                            </div>
                            <div className="text-sm leading-relaxed text-[var(--foreground)] italic">
                                "{review}"
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button 
                                    onClick={resetSession}
                                    className="text-xs font-bold uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors"
                                >
                                    Try Another Scenario →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-5 py-3 shadow-sm flex gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Dedicated Input */}
            <div className="p-4 bg-[var(--card)] border-t border-[var(--border)]">
                <div className="max-w-3xl mx-auto flex gap-3">
                    {isFinished ? (
                        <button
                            onClick={resetSession}
                            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                        >
                            Session Complete - Choose Another Scenario
                        </button>
                    ) : (
                        <>
                            <input
                                autoFocus
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Practice your response..."
                                className="flex-1 rounded-xl bg-[var(--muted)] px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border border-transparent focus:border-amber-500/20"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
                <p className="mt-3 text-center text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold opacity-60">
                    {isFinished ? "Review provided above in brackets" : "Transient Session · No data saved"}
                </p>
            </div>
        </div>
    )
}
