export interface Source {
  title: string
  url: string
  snippet: string
}

export interface Message {
  role: "user" | "assistant"
  content: string
  sources?: Source[]
}

export interface ImagePayload {
  type: "image_url"
  image_url: {
    url: string
  }
}
