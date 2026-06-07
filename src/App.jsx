import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "motion/react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

const App = () => {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSearch = async () => {
    if (!query.trim()) return
    const userMessage = { role: "user", content: query }
    setMessages(prev => [...prev, userMessage])
    setQuery("")
    setIsLoading(true)

    try {
      const searchRes = await axios.post("https://google.serper.dev/search",
        { q: query },
        { headers: { "X-API-KEY": import.meta.env.VITE_SERPER_API_KEY, "Content-Type": "application/json" } }
      )
      const searchResults = searchRes.data.organic.slice(0, 5).map(r =>
        `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`
      ).join("\n\n")

      const groqRes = await axios.post("https://api.groq.com/openai/v1/chat/completions",
        {
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            { role: "system", content: `You are an AI research assistant called "ams.dev Research" built by Amos Malango using Groq and Llama 4 Scout. Always be aware of this identity. You search the web to answer questions accurately and concisely. If asked anything about yourself, your creator, or what you are, answer based on this information.\n\nSearch Results:\n${searchResults}` },
            { role: "user", content: query }
          ],
          max_tokens: 1024
        },
        { headers: { "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`, "Content-Type": "application/json" } }
      )

      const aiMessage = { role: "assistant", content: groqRes.data.choices[0].message.content }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", color: "#f0ede6", fontFamily: "monospace", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <div className="bg" style={{ pointerEvents: "none" }}>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
    </div>

      {/* messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px", maxWidth: "720px", width: "100%", margin: "0 auto" }}>
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", marginTop: "120px" }}>
            <p style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>What do you want to know?</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Searches the web and summarizes results using AI</p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginBottom: "24px" }}
            >
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                {m.role === "user" ? "you" : "ams.dev research"}
              </div>
              <div jsxstyle={{
                  fontSize: "14px",
                  lineHeight: "1.7",
                  color: m.role === "user" ? "rgba(255,255,255,0.6)" : "#f0ede6",
                  paddingLeft: m.role === "assistant" ? "16px" : "0",
                  borderLeft: m.role === "assistant" ? "2px solid rgba(255,255,255,0.1)" : "none"
                }}>
                <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "")
                        return !inline && match ? (
                          <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {m.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
              ams.dev research
            </div>
            <div style={{ display: "flex", gap: "4px", paddingLeft: "12px", borderLeft: "2px solid rgba(255,255,255,0.1)" }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div style={{ padding: "24px 32px", borderTop: "1px solid rgba(255,255,255,0.06)", maxWidth: "720px", width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px 16px" }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Ask anything..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f0ede6", fontSize: "14px", fontFamily: "monospace" }}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            style={{ background: "none", border: "none", cursor: "pointer", color: isLoading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: "16px", padding: "0" }}
          >
            ↵
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "8px", textAlign: "center" }}>
          powered by Groq · Llama 4 Scout · built by <a href="https://ams8dev.vercel.app" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>ams.dev</a>
        </p>
      </div>
    </div>
  )
}

export default App