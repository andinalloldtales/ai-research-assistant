# ams.dev Research

An AI-powered research assistant that searches the web and synthesizes results in real time.

**Live demo:** https://amsresearch.vercel.app

## What it does

- Takes any question or topic from the user
- Searches the web via Serper API for current results
- Passes results to PT OSS 120B via Groq for summarization
- Returns a response based on results.

## Tech Stack I used

- React + Vite
- Groq API (GPT OSS 120B)
- Serper API (web search)
- Motion (animations)
- React Markdown + Syntax Highlighter

## Running locally

1. Clone the repo
2. Run `npm install`
3. Create a `.env` file with:
```
VITE_GROQ_API_KEY=your_groq_key
VITE_SERPER_API_KEY=your_serper_key
```
4. Run `npm run dev`