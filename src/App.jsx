import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'page-board-data'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadPages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePages(pages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
}

function PageCard({ page, onDelete, onUpdateSummary, apiKey }) {
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const thumbUrl = `https://image.thum.io/get/width/600/crop/800/${page.url}`
  const thumbUrlFull = `https://image.thum.io/get/width/600/crop/2000/${page.url}`

  const fetchSummary = async () => {
    if (!apiKey) return
    setSummaryLoading(true)
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `Summarize this webpage in 2-3 sentences. URL: ${page.url}${page.label ? ` (labeled: "${page.label}")` : ''}. Describe what this page/tool/app is and what it does. Be concise.`
          }],
          max_tokens: 200,
        }),
      })
      const data = await res.json()
      const summary = data?.choices?.[0]?.message?.content || 'Could not generate summary.'
      onUpdateSummary(page.id, summary)
    } catch (err) {
      onUpdateSummary(page.id, 'Summary failed: ' + err.message)
    } finally { setSummaryLoading(false) }
  }

  return (
    <div style={{
      background: '#1a1a24',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid #2a2a3a',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a5a'}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a3a'}
    >
      <div
        style={{ position: 'relative', background: '#111118', minHeight: '180px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {!imgError ? (
          <img
            src={expanded ? thumbUrlFull : thumbUrl}
            alt={page.label || page.url}
            style={{
              width: '100%',
              display: 'block',
              objectFit: 'cover',
              maxHeight: expanded ? 'none' : '240px',
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            height: '180px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#444', fontSize: '13px',
            padding: '20px', textAlign: 'center',
          }}>
            Screenshot unavailable — site may block external capture
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 6, right: 8,
          background: 'rgba(0,0,0,0.7)', color: '#777',
          fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
        }}>
          {expanded ? 'collapse' : 'expand'}
        </div>
      </div>

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '15px', color: '#e0e0ec', lineHeight: 1.3 }}>
          {page.label || new URL(page.url).hostname}
        </div>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px', color: '#4a6cf7', textDecoration: 'none',
            wordBreak: 'break-all', lineHeight: 1.3,
          }}
        >
          {page.url.length > 80 ? page.url.slice(0, 80) + '…' : page.url}
        </a>

        {page.summary && (
          <div style={{
            fontSize: '13px', color: '#a0a0b8', lineHeight: 1.5,
            padding: '8px 10px', background: '#12121c',
            borderRadius: '6px', borderLeft: '3px solid #4a6cf7',
          }}>
            {page.summary}
          </div>
        )}

        {!page.summary && (
          <button
            onClick={fetchSummary}
            disabled={summaryLoading || !apiKey}
            title={!apiKey ? 'Add DeepSeek API key in settings first' : ''}
            style={{
              fontSize: '12px', padding: '5px 10px', background: 'transparent',
              border: '1px solid #2a2a3a', borderRadius: '5px',
              color: apiKey ? '#888' : '#444',
              cursor: summaryLoading ? 'wait' : apiKey ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-start',
            }}
          >
            {summaryLoading ? 'Summarizing…' : 'Get AI Summary'}
          </button>
        )}

        <div style={{
          marginTop: 'auto', paddingTop: '6px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#444' }}>
            {new Date(page.added).toLocaleDateString()}
          </span>
          <button onClick={() => onDelete(page.id)} style={{
            fontSize: '11px', color: '#a44', background: 'transparent',
            border: 'none', cursor: 'pointer', padding: '2px 6px',
          }}>
            remove
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [pages, setPages] = useState([])
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('page-board-apikey') || '' } catch { return '' }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [filter, setFilter] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setPages(loadPages()) }, [])

  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('page-board-apikey', key)
  }

  const addPage = () => {
    let cleanUrl = url.trim()
    if (!cleanUrl) return
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl
    const newPage = {
      id: generateId(),
      url: cleanUrl,
      label: label.trim() || '',
      summary: null,
      added: Date.now(),
    }
    const updated = [newPage, ...pages]
    setPages(updated)
    savePages(updated)
    setUrl('')
    setLabel('')
    inputRef.current?.focus()
  }

  const deletePage = (id) => {
    const updated = pages.filter(p => p.id !== id)
    setPages(updated)
    savePages(updated)
  }

  const updateSummary = (id, summary) => {
    const updated = pages.map(p => p.id === id ? { ...p, summary } : p)
    setPages(updated)
    savePages(updated)
  }

  const filtered = filter
    ? pages.filter(p =>
        (p.label || '').toLowerCase().includes(filter.toLowerCase()) ||
        p.url.toLowerCase().includes(filter.toLowerCase()) ||
        (p.summary || '').toLowerCase().includes(filter.toLowerCase())
      )
    : pages

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: '100vh',
      background: '#0e0e16',
      color: '#c8c8d8',
      padding: '32px 24px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '26px', fontWeight: 700, color: '#e8e8f4',
            margin: 0, letterSpacing: '-0.5px',
          }}>
            Page Reference Board
          </h1>
          <p style={{ fontSize: '13px', color: '#555', margin: '6px 0 0' }}>
            Paste a URL → see what it looks like → stop losing track.
            {pages.length > 0 && ` ${pages.length} page${pages.length !== 1 ? 's' : ''} saved.`}
          </p>
        </div>

        {/* Add form */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste URL here…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPage()}
            style={{
              flex: '2 1 280px', padding: '11px 14px', fontSize: '14px',
              border: '1px solid #2a2a3a', borderRadius: '8px',
              background: '#1a1a24', color: '#ddd', outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPage()}
            style={{
              flex: '1 1 160px', padding: '11px 14px', fontSize: '14px',
              border: '1px solid #2a2a3a', borderRadius: '8px',
              background: '#1a1a24', color: '#ddd', outline: 'none',
            }}
          />
          <button onClick={addPage} style={{
            padding: '11px 24px', fontSize: '14px', fontWeight: 600,
            background: '#4a6cf7', color: '#fff', border: 'none',
            borderRadius: '8px', cursor: 'pointer',
          }}>
            Add
          </button>
          <button onClick={() => setShowSettings(!showSettings)} style={{
            padding: '11px 16px', fontSize: '14px', background: 'transparent',
            border: '1px solid #2a2a3a', borderRadius: '8px',
            cursor: 'pointer', color: '#666',
          }}>
            ⚙
          </button>
        </div>

        {/* Settings */}
        {showSettings && (
          <div style={{
            padding: '14px 18px', background: '#12121c',
            border: '1px solid #2a2a3a', borderRadius: '8px',
            marginBottom: '14px', fontSize: '13px',
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 600, color: '#c0c0d0' }}>
              DeepSeek API Key
            </div>
            <input
              type="password"
              placeholder="sk-…"
              value={apiKey}
              onChange={e => saveApiKey(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', fontSize: '13px',
                border: '1px solid #2a2a3a', borderRadius: '6px',
                background: '#1a1a24', color: '#ddd', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: '6px', color: '#555', fontSize: '11px' }}>
              Saved in your browser's localStorage. Enables the "Get AI Summary" button on each card.
            </div>
          </div>
        )}

        {/* Filter */}
        {pages.length > 5 && (
          <input
            type="text"
            placeholder="Filter pages…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px', fontSize: '13px',
              border: '1px solid #2a2a3a', borderRadius: '8px',
              background: '#1a1a24', color: '#ddd', outline: 'none',
              marginBottom: '18px', boxSizing: 'border-box',
            }}
          />
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '100px 20px',
            color: '#444', fontSize: '14px',
          }}>
            {pages.length === 0
              ? 'No pages yet. Paste a URL above to get started.'
              : 'No pages match your filter.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
          }}>
            {filtered.map(page => (
              <PageCard
                key={page.id}
                page={page}
                onDelete={deletePage}
                onUpdateSummary={updateSummary}
                apiKey={apiKey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
