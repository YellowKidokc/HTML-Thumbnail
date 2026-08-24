import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteDocument, getDocuments, saveDocument } from './db.js'
import './styles.css'

const SIZE_LABELS = ['Small', 'Medium', 'Large']
const isHtml = file => /\.html?$/i.test(file.name)
const uid = () => `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`
const formatBytes = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
const formatDate = date => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)

function parseHtml(content) {
  const parsed = new DOMParser().parseFromString(content, 'text/html')
  return {
    title: parsed.title.trim(),
    searchableText: (parsed.body?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500000),
  }
}

function download(item) {
  const url = URL.createObjectURL(new Blob([item.content], { type: 'text/html;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = item.name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Preview({ item, position, total, onClose, onPrevious, onNext, onRemove }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const keydown = event => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onPrevious()
      if (event.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [onClose, onPrevious, onNext])

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <header className="modal-header">
        <div className="file-heading"><span className="eyebrow">Preview {position + 1} of {total}</span><h2 id="preview-title">{item.title || item.name}</h2><span>{item.path}</span></div>
        <div className="button-row">
          <button className="icon-button" onClick={onPrevious} disabled={total < 2} aria-label="Previous document">←</button>
          <button className="icon-button" onClick={onNext} disabled={total < 2} aria-label="Next document">→</button>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close preview">×</button>
        </div>
      </header>
      <div className="preview-frame-wrap"><iframe title={`Preview of ${item.name}`} sandbox="" srcDoc={item.content} /></div>
      <footer className="modal-footer">
        <div><strong>{item.name}</strong><span>{formatBytes(item.size)} · Modified {formatDate(item.modifiedAt)} · Imported {formatDate(item.importedAt)}</span></div>
        <div className="button-row"><button className="danger ghost" onClick={() => onRemove(item)}>Remove from library</button><button className="primary" onClick={() => download(item)}>Download HTML</button></div>
      </footer>
    </section>
  </div>
}

function DocumentCard({ item, onOpen, onDownload }) {
  const [renderFailed, setRenderFailed] = useState(false)
  return <article className="card">
    <button className="thumbnail" onClick={onOpen} aria-label={`Preview ${item.name}`}>
      {renderFailed && <div className="render-fallback">Preview unavailable<br /><span>Open the full preview to try again.</span></div>}
      <iframe title={`Thumbnail of ${item.name}`} sandbox="" srcDoc={item.content} onError={() => setRenderFailed(true)} tabIndex="-1" />
      <span className="open-label">Open preview</span>
    </button>
    <div className="card-body">
      <h2 title={item.name}>{item.name}</h2>
      <p className="document-title" title={item.title}>{item.title || 'Untitled HTML document'}</p>
      <p className="path" title={item.path}>{item.path}</p>
      <div className="meta"><span>{formatBytes(item.size)}</span><span>{formatDate(item.importedAt)}</span></div>
      <button className="text-button" onClick={onDownload}>Download HTML</button>
    </div>
  </article>
}

export default function App() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [size, setSize] = useState(() => Number(localStorage.getItem('html-library-thumbnail-size') || 1))
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(null)
  const [summary, setSummary] = useState(null)
  const [duplicate, setDuplicate] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const uploadRef = useRef(null)
  const folderRef = useRef(null)

  useEffect(() => { getDocuments().then(items => setDocuments(items)).catch(() => setSummary({ error: 'The local database could not be opened.' })).finally(() => setLoading(false)) }, [])
  useEffect(() => { localStorage.setItem('html-library-thumbnail-size', size) }, [size])

  const chooseDuplicate = (file, existing) => new Promise(resolve => setDuplicate({ file, existing, resolve }))
  const importFiles = async fileList => {
    const files = Array.from(fileList)
    let knownDocuments = [...documents]
    const counts = { imported: 0, replaced: 0, skipped: 0, failed: 0 }
    setSummary(null)
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      setProgress({ current: index + 1, total: files.length, name: file.name })
      if (!isHtml(file)) { counts.skipped += 1; continue }
      try {
        const path = file.webkitRelativePath || file.name
        const content = await file.text()
        const match = knownDocuments.find(item => item.path === path && item.name === file.name)
        let id = uid()
        if (match) {
          const action = await chooseDuplicate(file, match)
          if (action === 'skip') { counts.skipped += 1; continue }
          if (action === 'replace') { id = match.id; counts.replaced += 1 }
          else counts.imported += 1
        } else counts.imported += 1
        const details = parseHtml(content)
        const item = { id, name: file.name, path, size: file.size, modifiedAt: file.lastModified || Date.now(), importedAt: Date.now(), content, ...details }
        await saveDocument(item)
        knownDocuments = [item, ...knownDocuments.filter(entry => entry.id !== id)]
        setDocuments(current => [item, ...current.filter(entry => entry.id !== id)])
      } catch { counts.failed += 1 }
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    setProgress(null)
    setSummary(counts)
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const items = needle ? documents.filter(item => [item.name, item.title, item.path, item.searchableText].some(value => value?.toLowerCase().includes(needle))) : [...documents]
    return items.sort((a, b) => sort === 'oldest' ? a.importedAt - b.importedAt : sort === 'az' ? a.name.localeCompare(b.name) : sort === 'za' ? b.name.localeCompare(a.name) : sort === 'modified' ? b.modifiedAt - a.modifiedAt : b.importedAt - a.importedAt)
  }, [documents, query, sort])

  const remove = async item => {
    if (!window.confirm(`Remove “${item.name}” from this library? The source file will not be changed.`)) return
    await deleteDocument(item.id)
    setDocuments(current => current.filter(entry => entry.id !== item.id))
    setPreviewId(null)
  }
  const previewIndex = visible.findIndex(item => item.id === previewId)
  const movePreview = amount => visible.length && setPreviewId(visible[(previewIndex + amount + visible.length) % visible.length].id)

  return <main>
    <header className="app-header">
      <div><span className="brand-mark">&lt;/&gt;</span><div><h1>HTML Thumbnail Library</h1><p>Your private, visual shelf for local HTML files.</p></div></div>
      <div className="privacy"><span>●</span> Local only · IndexedDB</div>
    </header>

    <section className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragEnter={event => { event.preventDefault(); setDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files) }}>
      <div><strong>Drop HTML files here</strong><span>Original files always stay untouched.</span></div>
      <div className="button-row"><button className="primary" onClick={() => uploadRef.current.click()}>Upload HTML</button><button onClick={() => folderRef.current.click()}>Import Folder</button></div>
      <input ref={uploadRef} className="visually-hidden" type="file" accept=".html,.htm,text/html" multiple onChange={event => { importFiles(event.target.files); event.target.value = '' }} />
      <input ref={folderRef} className="visually-hidden" type="file" accept=".html,.htm,text/html" multiple webkitdirectory="" onChange={event => { importFiles(event.target.files); event.target.value = '' }} />
    </section>

    {progress && <div className="notice" role="status"><div><strong>Importing {progress.current} of {progress.total}</strong><span>{progress.name}</span></div><progress value={progress.current} max={progress.total} /></div>}
    {summary && <div className={`notice summary ${summary.error ? 'error' : ''}`} role="status">{summary.error || <><strong>Import complete</strong><span>{summary.imported} imported · {summary.replaced} replaced · {summary.skipped} skipped · {summary.failed} failed</span></>}</div>}

    <section className="toolbar" aria-label="Library controls">
      <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search filename, title, path, or page text…" aria-label="Search library" /></label>
      <label>Sort <select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest imported</option><option value="oldest">Oldest imported</option><option value="az">Filename A–Z</option><option value="za">Filename Z–A</option><option value="modified">Recently modified</option></select></label>
      <label className="size-control"><span>Thumbnail size</span><input type="range" min="0" max="2" value={size} onChange={event => setSize(Number(event.target.value))} aria-valuetext={SIZE_LABELS[size]} /><output>{SIZE_LABELS[size]}</output></label>
      <button disabled={!documents.length} onClick={() => documents.forEach((item, index) => setTimeout(() => download(item), index * 200))}>Download all</button>
    </section>

    <div className="library-heading"><h2>Library</h2><span>{visible.length === documents.length ? `${documents.length} file${documents.length === 1 ? '' : 's'}` : `${visible.length} of ${documents.length} files`}</span></div>
    {loading ? <div className="empty"><h2>Opening your library…</h2></div> : visible.length ? <section className={`grid size-${size}`} aria-label="HTML documents">{visible.map(item => <DocumentCard key={item.id} item={item} onOpen={() => setPreviewId(item.id)} onDownload={() => download(item)} />)}</section> : <section className="empty"><div className="empty-icon">&lt;/&gt;</div><h2>{documents.length ? 'No files match your search' : 'Add your first HTML file'}</h2><p>{documents.length ? 'Try another filename, title, path, or phrase.' : 'Upload files, import a folder, or drag .html and .htm files into the area above. They are stored only in this browser.'}</p>{!documents.length && <button className="primary" onClick={() => uploadRef.current.click()}>Choose HTML files</button>}</section>}

    {previewIndex >= 0 && <Preview item={visible[previewIndex]} position={previewIndex} total={visible.length} onClose={() => setPreviewId(null)} onPrevious={() => movePreview(-1)} onNext={() => movePreview(1)} onRemove={remove} />}
    {duplicate && <div className="modal-backdrop"><section className="duplicate-dialog" role="dialog" aria-modal="true" aria-labelledby="duplicate-title"><span className="eyebrow">Duplicate found</span><h2 id="duplicate-title">{duplicate.file.name}</h2><p>This path is already in your library. What would you like to do?</p><div className="duplicate-actions"><button className="primary" onClick={() => { duplicate.resolve('replace'); setDuplicate(null) }}>Replace existing</button><button onClick={() => { duplicate.resolve('keep'); setDuplicate(null) }}>Keep both</button><button className="ghost" onClick={() => { duplicate.resolve('skip'); setDuplicate(null) }}>Skip</button></div></section></div>}
  </main>
}
