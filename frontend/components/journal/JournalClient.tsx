"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  PencilLine,
  Lock,
  Heart,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  type JournalEntry as DbJournalEntry,
} from "@/app/journal/actions";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: Date;
  mood?: string;
  tags?: string[];
}

function toClientEntry(db: DbJournalEntry): JournalEntry {
  return {
    id: db.id,
    title: db.title,
    content: db.content,
    date: new Date(db.created_at),
    mood: db.mood ?? undefined,
    tags: db.tags ?? [],
  };
}

const moodOptions = ["😄", "😊", "😐", "😔", "😢"];

export function JournalClient() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "new">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Fetch entries on mount
  useEffect(() => {
    async function loadEntries() {
      setIsLoading(true);
      const { data, error: fetchError } = await getJournalEntries();
      if (fetchError) {
        setError(fetchError);
      } else if (data) {
        setEntries(data.map(toClientEntry));
      }
      setIsLoading(false);
    }
    loadEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const term = searchQuery.toLowerCase();
      return (
        entry.title.toLowerCase().includes(term) ||
        entry.content.toLowerCase().includes(term)
      );
    });
  }, [entries, searchQuery]);

  const handleSaveEntry = async () => {
    if (!newTitle.trim() && !newContent.trim()) return;

    setError(null);

    startSaveTransition(async () => {
      if (editingId) {
        const { data, error: updateError } = await updateJournalEntry(editingId, {
          title: newTitle.trim() || "Untitled reflection",
          content: newContent.trim(),
          mood: selectedMood ?? null,
        });

        if (updateError) {
          setError(updateError);
          return;
        }

        if (data) {
          setEntries((prev) =>
            prev.map((entry) => (entry.id === editingId ? toClientEntry(data) : entry))
          );
        }
      } else {
        const { data, error: createError } = await createJournalEntry({
          title: newTitle.trim() || "Untitled reflection",
          content: newContent.trim(),
          mood: selectedMood ?? null,
        });

        if (createError) {
          setError(createError);
          return;
        }

        if (data) {
          setEntries((prev) => [toClientEntry(data), ...prev]);
        }
      }

      setEditingId(null);
      setNewTitle("");
      setNewContent("");
      setSelectedMood(undefined);
      setView("list");
    });
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    startSaveTransition(async () => {
      const { error: deleteError } = await deleteJournalEntry(id);
      if (deleteError) {
        setError(deleteError);
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setNewTitle(entry.title);
    setNewContent(entry.content);
    setSelectedMood(entry.mood);
    setView("new");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      {error && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <button
            onClick={() => (view === "new" ? setView("list") : router.push("/dashboard"))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Journal</p>
            <h2 className="text-lg font-semibold">Your private reflection space</h2>
          </div>
          {view === "list" && (
            <button
              onClick={() => {
                setEditingId(null);
                setNewTitle("");
                setNewContent("");
                setSelectedMood(undefined);
                setView("new");
              }}
              className="inline-flex items-center rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === "list" ? (
          <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
          <section className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[color:var(--card)] to-[color:var(--muted)] p-6 text-[var(--foreground)] shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--card)] shadow">
                <Lock className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-medium">Your thoughts are safe here</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Entries stay on your device unless you choose to share them. Use this space to
                  reflect, process emotions, and track your wellbeing journey.
                </p>
              </div>
            </div>
          </section>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search your journal..."
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-12 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40"
            />
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Prompts</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {[ 
                {
                  title: "What made you smile today?",
                  subtitle: "Gratitude prompt",
                },
                {
                  title: "What challenge did you overcome?",
                  subtitle: "Reflection prompt",
                },
                {
                  title: "What do you need right now?",
                  subtitle: "Self-care prompt",
                },
              ].map((prompt) => (
                <button
                  key={prompt.title}
                  onClick={() => setView("new")}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition hover:border-[var(--ring)] hover:bg-[var(--muted)]"
                >
                  <p className="font-medium">{prompt.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{prompt.subtitle}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Entries</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {filteredEntries.length} saved reflections
              </p>
            </div>
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {entry.mood && <span className="text-2xl leading-none">{entry.mood}</span>}
                    <div>
                      <p className="text-lg font-medium">{entry.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {entry.date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditEntry(entry)}
                      className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:border-[var(--border)] hover:bg-[var(--muted)] hover:shadow-sm hover:-translate-y-[1px] active:bg-[var(--ring)]/15 active:translate-y-[1px] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/60 cursor-pointer"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1 text-xs font-medium text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm hover:-translate-y-[1px] active:bg-red-100 active:translate-y-[1px] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 disabled:opacity-50 dark:hover:border-red-900 dark:hover:bg-red-950 dark:active:bg-red-900/60 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                  {entry.content}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs text-[var(--muted-foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Entry title..."
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40"
              />

              <div className="space-y-3">
                <p className="text-sm text-[var(--muted-foreground)]">How are you feeling?</p>
                <div className="flex flex-wrap gap-3">
                  {moodOptions.map((emoji) => {
                    const isSelected = emoji === selectedMood;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          setSelectedMood((prev) => (prev === emoji ? undefined : emoji))
                        }
                        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${
                          isSelected
                            ? "border-transparent bg-gradient-to-br from-sky-100 via-white to-sky-200 shadow-[0_12px_24px_rgba(14,165,233,0.35)] scale-110"
                            : "border-transparent bg-[var(--muted)] hover:border-sky-200/80 hover:bg-[var(--muted)]/80"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute inset-[3px] rounded-full border border-sky-200/60 animate-pulse" aria-hidden />
                        )}
                        <span className="text-2xl drop-shadow-sm" role="img" aria-label="mood option">
                          {emoji}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={newContent}
                  onChange={(event) => setNewContent(event.target.value)}
                  placeholder="Write your thoughts... This is a safe space to express yourself freely."
                  className="min-h-64 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40"
                />
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Heart className="h-4 w-4" />
                  <span>Be kind to yourself. Your feelings are valid.</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => {
                    setView("list");
                    setNewTitle("");
                    setNewContent("");
                    setSelectedMood(undefined);
                    setEditingId(null);
                  }}
                  disabled={isSaving}
                  className="flex-1 rounded-full border border-[var(--border)] px-4 py-3 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEntry}
                  disabled={isSaving || (!newTitle.trim() && !newContent.trim())}
                  className="flex-1 rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingId ? (
                    "Update Entry"
                  ) : (
                    "Save Entry"
                  )}
                </button>
              </div>
            </div>
          </section>
        </main>
        )}
      </div>
    </div>
  );
}
