import { FormEvent, useEffect, useState } from "react";

type Source = { title: string; url: string; source: string };
type Message = { role: "assistant" | "user"; content: string; sources?: Source[] };

const prompts = [
  "What does DarGlobal develop?",
  "Summarize the information collected from Wasalt.",
  "Compare the information available from both sources.",
];

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Welcome. I can answer questions using the public pages collected from DarGlobal and Wasalt. I’ll include source links and tell you when the available evidence is insufficient."
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{documents:number; sources:string[]; model_configured:boolean; model:string} | null>(null);

  useEffect(() => {
    fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => setError("Could not load API status."));
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setQuestion("");
    setError("");
    setMessages(old => [...old, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "The request failed.");
      setMessages(old => [...old, { role: "assistant", content: data.answer, sources: data.sources || [] }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(question);
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand-mark">P<span>+</span></div>
      <div className="brand-copy"><strong>PROPERTY INTELLIGENCE</strong><small>AI research assistant</small></div>
      <div className="status-pill"><span className="dot" /> {status?.documents ?? "…"} pages indexed</div>
    </header>

    <section className="hero">
      <div className="eyebrow">REAL ESTATE · RESEARCH · AI</div>
      <h1>Find your next<br/><em>property insight.</em></h1>
      <p>Ask questions about public real-estate information from DarGlobal and Wasalt. Answers are grounded in collected sources, not guesswork.</p>
      <div className="source-chips"><span>↗ DarGlobal</span><span>↗ Wasalt</span><span>◈ Source-backed answers</span></div>
    </section>

    <section className="workspace">
      <aside className="sidebar">
        <div className="side-label">START WITH A QUESTION</div>
        {prompts.map(p => <button className="prompt" key={p} onClick={() => void send(p)} disabled={loading}>{p}<span>↗</span></button>)}
        <div className="data-card">
          <div className="data-icon">◫</div>
          <strong>Knowledge base</strong>
          <p>{status?.documents ?? 0} public pages currently indexed.</p>
          <div className="progress"><span style={{width: status?.documents ? "100%" : "4%"}} /></div>
          <small>{status?.sources?.join(" · ") || "Awaiting collected data"}</small>
        </div>
        <div className="disclaimer">Information is for research only. Verify project details directly with the original publisher.</div>
      </aside>

      <section className="chat-panel">
        <div className="chat-head"><div><strong>Research chat</strong><small>Ask about projects, locations, and published details</small></div><span className="live-tag">● READY</span></div>
        <div className="messages">
          {messages.map((m, i) => <article className={`message ${m.role}`} key={i}>
            <div className="avatar">{m.role === "assistant" ? "P+" : "YOU"}</div>
            <div className="message-body"><div className="message-label">{m.role === "assistant" ? "PROPERTY AI" : "YOU"}</div>
              <p>{m.content}</p>
              {!!m.sources?.length && <div className="citations"><strong>Sources</strong>{m.sources.map((s, n) => <a href={s.url} target="_blank" rel="noreferrer" key={`${s.url}-${n}`}><span>[{n+1}]</span> {s.title || s.source} ↗</a>)}</div>}
            </div>
          </article>)}
          {loading && <article className="message assistant"><div className="avatar">P+</div><div className="message-body"><div className="message-label">PROPERTY AI</div><p className="typing">Searching sources and preparing an answer…</p></div></article>}
          <div id="bottom" />
        </div>
        {error && <div className="error">{error}</div>}
        <form className="composer" onSubmit={submit}>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about a project, location, or property…" maxLength={1200} />
          <button type="submit" disabled={loading || question.trim().length < 2}>Ask <span>↑</span></button>
        </form>
        <div className="composer-note">AI-generated responses can be incorrect. Source links are provided for verification.</div>
      </section>
    </section>
    <footer><span>PROPERTY INTELLIGENCE AI</span><span>Built for transparent, source-grounded discovery</span></footer>
  </main>;
}
