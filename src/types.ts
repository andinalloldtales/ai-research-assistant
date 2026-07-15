export interface Source {
  title: string
  url: string
  snippet: string
}

export interface Message {
  role: "user" | "assistant" | "error"
  content: string
  sources?: Source[]
  retryable?: boolean
  retryQuery?: string
}

export interface Thread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  preview: string
  messages: Message[]
}

export interface ImagePayload {
  type: "image_url"
  image_url: {
    url: string
  }
}
