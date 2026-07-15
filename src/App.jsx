import { useState, useRef, useEffect } from "react"
import { useChat } from "./useChat"
import { motion, AnimatePresence } from "motion/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} style={{
      background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px",
      color: copied ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
      fontSize: "11px", padding: "3px 8px", cursor: "pointer", transition: "all 0.2s",
      fontFamily: "monospace", letterSpacing: "0.05em"
    }}>
      {copied ? "copied" : "copy"}
    </button>
  )
}

const CodeBlock = ({ language, codeString }) => (
  <div style={{ margin: "14px 0", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0b0b0d" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 6px 12px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{language || "text"}</span>
      <CopyButton text={codeString} />
    </div>
    <div style={{ maxHeight: "420px", overflow: "auto" }}>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        wrapLongLines={false}
        customStyle={{ margin: 0, background: "transparent", padding: "14px", fontSize: "13px", lineHeight: 1.6 }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  </div>
)

const markdownComponents = {
  h1: ({ children }) => <h2 style={{ fontSize: "19px", fontWeight: 700, fontFamily: "sans-serif", margin: "20px 0 10px", color: "#f0ede6" }}>{children}</h2>,
  h2: ({ children }) => <h3 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "sans-serif", margin: "18px 0 8px", color: "#f0ede6" }}>{children}</h3>,
  h3: ({ children }) => <h4 style={{ fontSize: "14px", fontWeight: 700, fontFamily: "sans-serif", margin: "16px 0 6px", color: "#f0ede6" }}>{children}</h4>,
  h4: ({ children }) => <h5 style={{ fontSize: "13px", fontWeight: 700, fontFamily: "sans-serif", margin: "14px 0 6px", color: "rgba(255,255,255,0.85)" }}>{children}</h5>,
  h5: ({ children }) => <h6 style={{ fontSize: "12px", fontWeight: 700, margin: "12px 0 4px", color: "rgba(255,255,255,0.75)" }}>{children}</h6>,
  h6: ({ children }) => <h6 style={{ fontSize: "11px", fontWeight: 700, margin: "10px 0 4px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</h6>,
  p: ({ children }) => <p style={{ margin: "0 0 10px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: "#ffffff" }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: "italic", color: "rgba(255,255,255,0.82)" }}>{children}</em>,
  del: ({ children }) => <del style={{ opacity: 0.5 }}>{children}</del>,
  hr: () => <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "18px 0" }} />,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "#9ab8ff", textDecoration: "underline", textUnderlineOffset: "2px" }}>
      {children}
    </a>
  ),
  img: ({ src, alt }) => <img src={src} alt={alt} style={{ maxWidth: "100%", borderRadius: "8px", margin: "8px 0", display: "block" }} />,
  ul: ({ children }) => <ul style={{ margin: "0 0 10px 18px", padding: 0 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 10px 18px", padding: 0 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: "4px" }}>{children}</li>,
  blockquote: ({ children }) => <blockquote style={{ margin: "10px 0", padding: "0 0 0 10px", borderLeft: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.7)" }}>{children}</blockquote>,
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "10px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.14)", fontWeight: 700 }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{children}</td>,
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "")
    const codeString = String(children).replace(/\n$/, "")
    return !inline && match ? (
      <CodeBlock language={match[1]} codeString={codeString} />
    ) : (
      <code style={{ background: "rgba(255,255,255,0.08)", color: "#f2c879", padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }} {...props}>
        {children}
      </code>
    )
  }
}

const SourceCards = ({ sources }) => {
  if (!sources || sources.length === 0) return null
  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
        Sources
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {sources.map((s, i) => {
          const domain = (() => { try { return new URL(s.url).hostname } catch { return "" } })()
          return (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "6px",
              textDecoration: "none",
              transition: "background 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                width={16} height={16}
                style={{ marginTop: "2px", borderRadius: "2px", flexShrink: 0, opacity: 0.8 }}
                onError={e => e.target.style.display = "none"}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", fontWeight: 500, marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.snippet}</div>
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px", marginTop: "4px" }}>{domain}</div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

const WHATS_NEW_VERSION = "2026-07-15"

const WelcomeModal = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px"
    }}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25 }}
      onClick={e => e.stopPropagation()}
      style={{
        background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px", padding: "32px", maxWidth: "400px", width: "100%"
      }}
    >
      <h2 style={{ fontFamily: "sans-serif", fontStyle: "italic", fontWeight: 700, fontSize: "28px", marginBottom: "6px", letterSpacing: "-0.5px" }}>ams.dev</h2>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginBottom: "28px" }}>your personal research assistant | newest features</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
        {[
          { icon: "🗂", label: "Saved conversations", desc: "Your chats now persist and can be revisited after refresh" },
          { icon: "🧵", label: "Threaded chats", desc: "Start new conversations and switch between them with ease" },
          { icon: "↺", label: "Smarter replies", desc: "Short, current-event questions now trigger live web results" },
          { icon: "⏹", label: "Better control", desc: "Stop streams mid-flight and retry failed requests from the UI" },
        ].map(({ icon, label, desc }) => (
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ fontSize: "14px", opacity: 0.5, marginTop: "1px", width: "16px", flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{label}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          width: "100%", padding: "10px", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
          color: "#f0ede6", fontSize: "13px", fontFamily: "monospace",
          cursor: "pointer", transition: "background 0.2s"
        }}
        onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.1)"}
        onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.06)"}
      >
        got it
      </button>
    </motion.div>
  </motion.div>
)

const App = () => {
  const [showWelcome, setShowWelcome] = useState(() => {
    const seenVersion = localStorage.getItem("ams_whats_new_version")
    return seenVersion !== WHATS_NEW_VERSION
  })
  const [isThreadsCollapsed, setIsThreadsCollapsed] = useState(false)
  const fileRef = useRef(null)
  const {
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
  } = useChat()

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__showWhatsNewModal = () => setShowWelcome(true)
    }

    return () => {
      if (typeof window !== "undefined") {
        delete window.__showWhatsNewModal
      }
    }
  }, [])

  const handleCloseWelcome = () => {
    localStorage.setItem("ams_whats_new_version", WHATS_NEW_VERSION)
    setShowWelcome(false)
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
    e.target.value = ""
  }

  return (
    <div style={{ background: "transparent", height: "100dvh", color: "#f0ede6", fontFamily: "monospace", display: "flex", flexDirection: "column", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <div className="bg" style={{ pointerEvents: "none" }}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <AnimatePresence>
        {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 32px 0" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowWelcome(true)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 10px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "monospace", fontSize: "12px" }}>
            what's new
          </button>
          <button onClick={createThread} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 10px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "monospace", fontSize: "12px" }}>
            new thread
          </button>
          {messages.length > 0 && (
            <button onClick={handleClear} title="Clear chat" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.24)", cursor: "pointer", fontFamily: "monospace", fontSize: "12px", padding: "8px 2px" }}>
              clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <h1 style={{ fontSize: "48px", fontStyle: "italic", fontWeight: 700, letterSpacing: "-1px", fontFamily: "sans-serif", lineHeight: 1 }}>ams</h1>
          <a href="https://github.com/andinalloldtales" target="_blank" rel="noreferrer"
            style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#fff"}
            onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}>
            github
          </a>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {threads.length > 1 && (
          <aside style={{ width: isThreadsCollapsed ? "56px" : "260px", borderRight: "1px solid rgba(255,255,255,0.07)", padding: isThreadsCollapsed ? "16px 8px" : "20px 16px", overflowY: "auto", transition: "width 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: isThreadsCollapsed ? "center" : "space-between", marginBottom: isThreadsCollapsed ? "0" : "14px" }}>
              <button onClick={() => setIsThreadsCollapsed(!isThreadsCollapsed)} title={isThreadsCollapsed ? "Expand threads" : "Collapse threads"} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.28)", cursor: "pointer", fontSize: "12px", padding: "0", lineHeight: 1 }}>
                {isThreadsCollapsed ? "▸" : "▾"}
              </button>
              {!isThreadsCollapsed && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>threads</div>}
            </div>
            {!isThreadsCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {threads.map((thread) => (
                  <div key={thread.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button onClick={() => switchThread(thread.id)} style={{ flex: 1, textAlign: "left", background: thread.id === activeThreadId ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 10px", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                      <div style={{ fontSize: "12px", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.title}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.preview || "empty thread"}</div>
                    </button>
                    <button onClick={() => deleteThread(thread.id)} title="Delete thread" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: "12px" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "32px", maxWidth: "720px", width: "100%", margin: "0 auto" }}>
            {messages.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", marginTop: "120px" }}>
                <p style={{ fontSize: "22px", fontWeight: 600, marginBottom: "8px", fontFamily: "sans-serif" }}>What do you want to know?</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>searches the web · reads files</p>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={`${m.role}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ marginBottom: "32px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      {m.role === "user" ? "you" : m.role === "error" ? "error" : "ams.dev research"}
                    </div>
                    {m.role === "assistant" && <CopyButton text={m.content} />}
                  </div>

                  {m.role === "error" ? (
                    <div style={{ padding: "12px 14px", border: "1px solid rgba(255,96,96,0.2)", borderRadius: "8px", background: "rgba(255,96,96,0.08)", maxWidth: "100%" }}>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: "1.75", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>
                      {m.retryable && (
                        <button onClick={() => handleSearch(m.retryQuery || "", true)} style={{ marginTop: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#f0ede6", padding: "6px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: "12px" }}>
                          retry
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      fontSize: "14px", lineHeight: "1.75",
                      color: m.role === "user" ? "rgba(255,255,255,0.5)" : "#f0ede6",
                      paddingLeft: m.role === "assistant" ? "14px" : "0",
                      borderLeft: m.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                      maxWidth: "100%",
                      overflow: "hidden"
                    }}>
                      <div style={{ display: "block", maxWidth: "100%", overflowWrap: "anywhere" }}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>

                      {m.role === "assistant" && <SourceCards sources={m.sources} />}
                    </div>
                  )}

                  {i < messages.length - 1 && (
                    <div style={{ marginTop: "32px", height: "1px", background: "rgba(255,255,255,0.04)" }} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {streamingContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                  ams.dev research
                </div>
                <div style={{ paddingLeft: "14px", borderLeft: "1px solid rgba(255,255,255,0.08)", fontSize: "14px", lineHeight: "1.75", maxWidth: "100%", overflow: "hidden" }}>
                  <div style={{ display: "block", maxWidth: "100%", overflowWrap: "anywhere" }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{streamingContent}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}

            {isLoading && !streamingContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
                  ams.dev research
                </div>
                <div style={{ display: "flex", gap: "5px", paddingLeft: "14px", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(255,255,255,0.5)" }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "16px 32px 24px", maxWidth: "720px", width: "100%", margin: "0 auto" }}>
            {file && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                <span>📎 {file.name}</span>
                <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: 0, marginLeft: "auto" }}>×</button>
              </div>
            )}
            {fileNotice && (
              <div style={{ marginBottom: "8px", padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>{fileNotice}</div>
            )}

            <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px 16px" }}>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFile} accept=".txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.py,.html,.css,image/*" />
              <button onClick={() => fileRef.current.click()} title="Upload file"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", fontSize: "16px", padding: "0", lineHeight: 1, transition: "color 0.2s", flexShrink: 0 }}
                onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.7)"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.25)"}
              >
                ⊕
              </button>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Ask anything..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f0ede6", fontSize: "14px", fontFamily: "monospace" }}
              />
              {isLoading ? (
                <button onClick={stopCurrentRequest} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "13px", padding: "0", lineHeight: 1, transition: "color 0.2s", flexShrink: 0 }}>
                  stop
                </button>
              ) : (
                <button onClick={() => handleSearch()} disabled={isLoading}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "18px", padding: "0", lineHeight: 1, transition: "color 0.2s", flexShrink: 0 }}
                  onMouseEnter={e => e.target.style.color = "#fff"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}
                >
                  ↵
                </button>
              )}
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", marginTop: "10px", textAlign: "center" }}>
              powered by Groq · GPT OSS 120B · built by <a href="https://ams8dev.vercel.app" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>ams.dev</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App