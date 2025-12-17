'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export interface JournalEntry {
  id: string
  user_id: string
  title: string
  content: string
  mood: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface JournalEntryPayload {
  title: string
  content: string
  mood?: string | null
  tags?: string[]
}

/**
 * Fetch all journal entries for the current user, ordered by most recent first.
 */
export async function getJournalEntries(): Promise<{ data: JournalEntry[] | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as JournalEntry[], error: null }
}

/**
 * Create a new journal entry for the current user.
 */
export async function createJournalEntry(
  payload: JournalEntryPayload
): Promise<{ data: JournalEntry | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const trimmedTitle = payload.title?.trim() || 'Untitled reflection'
  const trimmedContent = payload.content?.trim() || ''

  if (!trimmedContent) {
    return { data: null, error: 'Content is required' }
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      title: trimmedTitle,
      content: trimmedContent,
      mood: payload.mood || null,
      tags: payload.tags || [],
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/journal')
  return { data: data as JournalEntry, error: null }
}

/**
 * Update an existing journal entry. User must own the entry.
 */
export async function updateJournalEntry(
  id: string,
  payload: Partial<JournalEntryPayload>
): Promise<{ data: JournalEntry | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.title !== undefined) {
    updates.title = payload.title.trim() || 'Untitled reflection'
  }
  if (payload.content !== undefined) {
    updates.content = payload.content.trim()
  }
  if (payload.mood !== undefined) {
    updates.mood = payload.mood || null
  }
  if (payload.tags !== undefined) {
    updates.tags = payload.tags
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/journal')
  return { data: data as JournalEntry, error: null }
}

/**
 * Delete a journal entry. User must own the entry.
 */
export async function deleteJournalEntry(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journal')
  return { error: null }
}
