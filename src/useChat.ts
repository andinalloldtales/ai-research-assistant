import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { Message, Source, ImagePayload } from "./types"
// @ts-ignore
import systemPrompt from "./prompt.md?raw"

const MEMORY_LIMIT = 10
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
const SERPER_API = "https://google.serper.dev/search"
const MODEL = "openai/gpt-oss-120b"

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

const isConversationalQuery = (query: string): boolean =>
  (query.split(" ").length <= 3 && !query.includes("?")) ||
  /\b(you|your|yourself|who are you|what are you|capabilities|remember|said|earlier|previous|we|our|this chat|this conversation)\b/i.test(query)

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState("")
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSearch = async () => {
    const trimmedMessages = messages.slice(-MEMORY_LIMIT)
    const fileName = file?.name
    const currentQuery = query.trim() || "Please analyze the uploaded file."
    if (!currentQuery && !file) return

    const displayContent = fileName
      ? `📎 ${fileName}${query.trim() ? `\n${query}` : ""}`
      : query

    setMessages(prev => [...prev, { role: "user", content: displayContent }])
    setQuery("")
    setIsLoading(true)

    let fileContext = ""
    let imagePayload: ImagePayload | null = null
    const isImage = file && file.type.startsWith("image/")

    if (file) {
      try {
        if (isImage) {
          const b64 = await readFileAsBase64(file)
          imagePayload = { type: "image_url", image_url: { url: `data:${file.type};base64,${b64}` } }
        } else {
          const text = await readFileAsText(file)
          fileContext = `\n\nThe user has uploaded a file named "${fileName}". Its contents:\n\n${text.slice(0, 8000)}`
        }
        setFile(null)
      } catch {
        fileContext = `\n\nUser uploaded a file named "${fileName}" but it could not be read.`
      }
    }

    try {
      let searchResults = ""
      let sources: Source[] = []

      if (!isConversationalQuery(currentQuery) && currentQuery !== "Please analyze the uploaded file.") {
        const searchRes = await axios.post(
          SERPER_API,
          { q: currentQuery },
          { headers: { "X-API-KEY": import.meta.env.VITE_SERPER_API_KEY, "Content-Type": "application/json" } }
        )
        const organic = searchRes.data.organic.slice(0, 5)
        searchResults = organic.map((r: any) =>
          `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`
        ).join("\n\n")
        sources = organic.map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }))
      }

      const response = await fetch(GROQ_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: `${systemPrompt}${fileContext}\n\nSearch Results:\n${searchResults}` },
            ...trimmedMessages.map(m => ({ role: m.role, content: m.content })),
            {
              role: "user",
              content: imagePayload
                ? [imagePayload, { type: "text", text: currentQuery }]
                : currentQuery
            }
          ],
          max_tokens: 1024,
          stream: true
        })
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""
      setStreamingContent("")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter(l => l.startsWith("data: ") && l !== "data: [DONE]")
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
      setMessages(prev => [...prev, { role: "assistant", content: fullContent, sources }])
    } catch (error: any) {
      console.error("Full error:", error.response?.data || error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setFile(null)
  }

  return {
    messages,
    streamingContent,
    query,
    setQuery,
    isLoading,
    file,
    setFile,
    bottomRef,
    handleSearch,
    handleClear
  }
}
