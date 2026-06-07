import { useState } from "react"
import axios from "axios"

const App = () => {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

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
    <div>
      <h1>AI Research Assistant</h1>
      <div>
        {messages.map((m, i) => (
          <div key={i}>
            <strong>{m.role === "user" ? "You" : "AI"}:</strong> {m.content}
          </div>
        ))}
        {isLoading && <div>Searching and thinking...</div>}
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="Ask anything..." />
      <button onClick={handleSearch}>Search</button>
    </div>
  )
}

export default App