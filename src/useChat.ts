import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { Message, Source, ImagePayload, Thread } from "./types"
// @ts-ignore
import systemPrompt from "./prompt.md?raw"

const MEMORY_LIMIT = 10
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
const SERPER_API = "https://google.serper.dev/search"
const MODEL = "openai/gpt-oss-120b"
const STORAGE_KEY = "ams_chat_threads_v1"
const ACTIVE_THREAD_KEY = "ams_chat_active_thread_v1"

const readFileAsText = (f: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(f)
  })

const readFileAsBase64 = (f: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(f)
  })

const isConversationalQuery = (query: string): boolean => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  // Check factual/current-event signals FIRST — these should always trigger
  // a web search even if the query also contains a question word like
  // "what" or "how" (e.g. "what's the latest news today").
  const factualSignals = /\b(news|latest|breaking|today|update|now|recent|release|launch|election|price|forecast|stock|sports|weather|travel|event|202[0-9])\b/
  if (factualSignals.test(normalized)) return false

  // Only treat as conversational (skip search) if it's clearly about the
  // assistant itself or prior chat context, not just phrased as a question.
  const conversationalSignals = /\b(you|your|yourself|who are you|what are you|remember|said|earlier|previous|this chat|this conversation)\b/
  if (conversationalSignals.test(normalized)) return true

  return false
}

const buildThreadPreview = (messages: Message[]) => {
  const text = messages
    .filter((message) => message.content && message.role !== "error")
    .slice(-2)
    .map((message) => message.content)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  return text.length > 80 ? `${text.slice(0, 77)}…` : text
}

const buildThreadTitle = (messages: Message[]) => {
  const firstUser = messages.find((message) => message.role === "user")
  const preview = firstUser?.content.replace(/\n/g, " ").replace(/\s+/g, " ").trim() || "new thread"
  return preview.length > 28 ? `${preview.slice(0, 25)}…` : preview
}

const createThreadRecord = (messages: Message[] = [], id?: string): Thread => {
  const safeId = id ?? `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id: safeId,
    title: buildThreadTitle(messages),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preview: buildThreadPreview(messages),
    messages
  }
}

const summarizeMessages = (messages: Message[]) => {
  const relevant = messages.filter((message) => message.content && message.role !== "error")
  if (relevant.length === 0) return ""

  const latest = relevant.slice(-3).map((message) => message.content.replace(/\s+/g, " ").trim()).join(" ")
  const words = latest.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []
  const topicWords = [...new Set(words)].slice(0, 6).join(", ")
  const snippet = latest.length > 220 ? `${latest.slice(0, 217)}…` : latest

  return `Conversation memory: earlier turns covered ${topicWords || "the ongoing topic"}. The thread context was about ${snippet}.`
}

const readStoredThreads = (): Thread[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const readStoredActiveThreadId = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(ACTIVE_THREAD_KEY)
  } catch {
    return null
  }
}

export const useChat = () => {
  const [threads, setThreads] = useState<Thread[]>(() => readStoredThreads())
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => readStoredActiveThreadId())
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedThreads = readStoredThreads()
    const activeId = readStoredActiveThreadId()
    const activeThread = savedThreads.find((thread) => thread.id === activeId) ?? savedThreads[0]
    return activeThread?.messages ?? []
  })
  const [streamingContent, setStreamingContent] = useState("")
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileNotice, setFileNotice] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeThreadIdRef = useRef(activeThreadId)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<{ query: string; file: File | null; retryable: boolean }>({ query: "", file: null, retryable: false })

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  }, [activeThreadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
  }, [threads])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(ACTIVE_THREAD_KEY, activeThreadId ?? "")
  }, [activeThreadId])

  const persistMessages = (nextMessages: Message[], threadId = activeThreadIdRef.current) => {
    setMessages(nextMessages)
    if (!threadId) return

    setThreads((prevThreads) => {
      const nextThreads = prevThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              messages: nextMessages,
              updatedAt: Date.now(),
              preview: buildThreadPreview(nextMessages),
              title: thread.title === "new thread" ? buildThreadTitle(nextMessages) : thread.title
            }
          : thread
      )

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextThreads))
        window.localStorage.setItem(ACTIVE_THREAD_KEY, threadId)
      }

      return nextThreads
    })
  }

  const ensureThread = () => {
    if (activeThreadIdRef.current) return activeThreadIdRef.current

    const initialThread = createThreadRecord([])
    const nextThreads = [initialThread]
    setThreads(nextThreads)
    setActiveThreadId(initialThread.id)
    activeThreadIdRef.current = initialThread.id

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextThreads))
      window.localStorage.setItem(ACTIVE_THREAD_KEY, initialThread.id)
    }

    return initialThread.id
  }

  const createThread = () => {
    const currentThread = threads.find((thread) => thread.id === activeThreadIdRef.current)
    if (currentThread && currentThread.messages.length === 0) {
      // Already sitting on an empty thread — reuse it instead of stacking another blank one.
      setQuery("")
      setFile(null)
      setFileNotice(null)
      return
    }

    const freshThread = createThreadRecord([])
    const nextThreads = [freshThread, ...threads]
    setThreads(nextThreads)
    setActiveThreadId(freshThread.id)
    activeThreadIdRef.current = freshThread.id
    setMessages([])
    setQuery("")
    setFile(null)
    setFileNotice(null)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextThreads))
      window.localStorage.setItem(ACTIVE_THREAD_KEY, freshThread.id)
    }
  }

  const switchThread = (threadId: string) => {
    const selectedThread = threads.find((thread) => thread.id === threadId)
    if (!selectedThread) return
    setActiveThreadId(threadId)
    activeThreadIdRef.current = threadId
    setMessages(selectedThread.messages)
    setQuery("")
    setFile(null)
    setFileNotice(null)
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_THREAD_KEY, threadId)
  }

  const deleteThread = (threadId: string) => {
    const nextThreads = threads.filter((thread) => thread.id !== threadId)
    if (nextThreads.length === 0) {
      const fallbackThread = createThreadRecord([])
      nextThreads.push(fallbackThread)
    }

    const nextActiveId = threadId === activeThreadIdRef.current ? nextThreads[0].id : activeThreadIdRef.current
    const nextActiveThread = nextThreads.find((thread) => thread.id === nextActiveId)

    setThreads(nextThreads)
    setActiveThreadId(nextActiveId)
    activeThreadIdRef.current = nextActiveId
    setMessages(nextActiveThread?.messages ?? [])
    setQuery("")
    setFile(null)
    setFileNotice(null)

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextThreads))
      window.localStorage.setItem(ACTIVE_THREAD_KEY, nextActiveId ?? "")
    }
  }

  const stopCurrentRequest = () => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
    setStreamingContent("")
  }

  const handleSearch = async (overrideQuery?: string, retry = false) => {
    if (isLoading) return

    const threadId = ensureThread()
    const requestFile = retry ? lastRequestRef.current.file ?? file : file
    const currentQuery = (overrideQuery ?? query).trim() || (requestFile ? "Please analyze the uploaded file." : "")
    if (!currentQuery && !requestFile) return

    const displayContent = requestFile?.name
      ? `📎 ${requestFile.name}${currentQuery && currentQuery !== "Please analyze the uploaded file." ? `\n${currentQuery}` : ""}`
      : currentQuery

    const pendingMessages = [...messages, { role: "user" as const, content: displayContent }]
    persistMessages(pendingMessages, threadId)
    setQuery("")
    setIsLoading(true)
    setStreamingContent("")
    setFileNotice(null)
    lastRequestRef.current = { query: currentQuery, file: requestFile, retryable: true }

    if (requestFile) {
      setFile(null)
    }

    let fileContext = ""
    let imagePayload: ImagePayload | null = null
    const isImage = requestFile && requestFile.type.startsWith("image/")
    let truncatedNotice = ""

    if (requestFile) {
      try {
        if (isImage) {
          const b64 = await readFileAsBase64(requestFile)
          imagePayload = { type: "image_url", image_url: { url: `data:${requestFile.type};base64,${b64}` } }
        } else {
          const text = await readFileAsText(requestFile)
          const previewText = text.slice(0, 8000)
          const usedText = previewText.length < text.length ? previewText : text
          truncatedNotice = text.length > 8000 ? "Only the first 8,000 characters of this file were used." : ""
          fileContext = `\n\nThe user has uploaded a file named "${requestFile.name}". Its contents:\n\n${usedText}`
        }
      } catch {
        fileContext = `\n\nUser uploaded a file named "${requestFile.name}" but it could not be read.`
      }
    }

    if (truncatedNotice) {
      setFileNotice(truncatedNotice)
    }

    if (requestFile && !isImage && requestFile.name.toLowerCase().endsWith(".pdf")) {
      fileContext = `\n\nThe user uploaded a PDF named "${requestFile.name}", but PDF text extraction is not enabled in this build.`
    }

    const olderMessages = messages.slice(0, -MEMORY_LIMIT)
    const recentMessages = messages.slice(-MEMORY_LIMIT)
    const memoryNote = olderMessages.length > 0 ? summarizeMessages(olderMessages) : ""

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      let searchResults = ""
      let sources: Source[] = []

      if (!isConversationalQuery(currentQuery) && currentQuery !== "Please analyze the uploaded file.") {
        const searchRes = await axios.post(
          SERPER_API,
          { q: currentQuery },
          { headers: { "X-API-KEY": import.meta.env.VITE_SERPER_API_KEY, "Content-Type": "application/json" },
            signal: controller.signal }
        )
        const organic = searchRes.data.organic.slice(0, 5)
        searchResults = organic.map((r: any) => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`).join("\n\n")
        sources = organic.map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }))
      }

      const response = await fetch(GROQ_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: `${memoryNote ? `${memoryNote}\n\n` : ""}${systemPrompt}${fileContext}\n\nSearch Results:\n${searchResults}` },
            ...recentMessages.map((message) => ({ role: message.role, content: message.content })),
            {
              role: "user",
              content: imagePayload
                ? [imagePayload, { type: "text", text: currentQuery }]
                : currentQuery
            }
          ],
          max_tokens: 1024,
          stream: true
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Groq request failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body received from Groq")

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
        for (const line of lines) {
          try {
            const delta = JSON.parse(line.slice(6)).choices[0].delta.content
            if (delta) {
              fullContent += delta
              setStreamingContent(fullContent)
            }
          } catch {}
        }
      }

      setStreamingContent("")
      persistMessages([...pendingMessages, { role: "assistant", content: fullContent, sources }], threadId)
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.name === "CanceledError" || axios.isCancel(error)) {
        persistMessages([...pendingMessages, { role: "error", content: "Request stopped.", retryable: false }], threadId)
      } else {
        const errorMessage = error?.response?.data?.error?.message || error?.message || "Something went wrong while fetching the answer."
        persistMessages([...pendingMessages, { role: "error", content: `Request failed: ${errorMessage}`, retryable: true, retryQuery: currentQuery }], threadId)
      }
    } finally {
      abortControllerRef.current = null
      setIsLoading(false)
      setStreamingContent("")
    }
  }

  const handleClear = () => {
    persistMessages([], activeThreadIdRef.current)
    setFile(null)
    setFileNotice(null)
  }

  return {
    threads,
    activeThreadId,
    messages,
    streamingContent,
    query,
    setQuery,
    isLoading,
    file,
    setFile,
    fileNotice,
    bottomRef,
    handleSearch,
    handleClear,
    createThread,
    switchThread,
    deleteThread,
    stopCurrentRequest
  }
}