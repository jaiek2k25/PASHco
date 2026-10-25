import { useRef, useState } from 'react'
import { FileText, Link2, Plus, Sparkles, Upload, WandSparkles, X } from 'lucide-react'
import { Button, Modal } from './Common'
import { useApp } from '../context/AppContext'
import { createId, extractTextFromFile, sampleStudyMaterial, wordCount } from '../lib/intelligence'
import { aiStudyPack } from '../lib/aiClient'

export default function SourceModal({ open, onClose, title = 'Create a new study set', description = 'Add notes, paste text, or attach a supported file. WeSolve turns it into a connected study pack.', cta = 'Generate study set', onGenerate, generatedTitle = 'New study set' }) {
  const { toast } = useApp()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [sources, setSources] = useState([])
  const [sourceInput, setSourceInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef(null)

  const addFiles = async (incoming) => {
    const list = Array.from(incoming || []).slice(0, 10 - files.length)
    if (!list.length) return
    const mapped = []
    for (const file of list) {
      const item = { id: createId('source'), name: file.name, size: file.size, type: file.type, kind: 'file' }
      if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith('text/')) {
        try {
          const content = await extractTextFromFile(file)
          if (typeof content === 'string') {
            item.content = content.slice(0, 20000)
            setText((current) => `${current}${current ? '\n\n' : ''}${content.slice(0, 10000)}`)
          }
        } catch {
          toast(`Could not read ${file.name}.`, 'error')
        }
      }
      mapped.push(item)
    }
    setFiles((current) => [...current, ...mapped])
  }

  const generate = async () => {
    const material = text.trim() || files.map((file) => file.content).filter(Boolean).join('\n')
    if (!material && sources.length === 0) {
      toast('Add some notes, a TXT file, or a source link first.', 'error')
      return
    }
    setGenerating(true)
    const sourceText = material || `Course resources: ${sources.map((source) => source.name).join(', ')}. ${sampleStudyMaterial}`
    const [pack] = await Promise.all([
      aiStudyPack(sourceText, name.trim() || generatedTitle),
      new Promise((resolve) => window.setTimeout(resolve, 650)),
    ])
    pack.sources = [...files.map(({ id, name: sourceName, size, type }) => ({ id, name: sourceName, size, type })), ...sources]
    onGenerate?.(pack)
    setGenerating(false)
    setName('')
    setText('')
    setFiles([])
    setSources([])
    if (pack.source === 'nvidia') toast('Study set generated with NVIDIA AI.')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={description} width={720} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={generating ? Sparkles : WandSparkles} onClick={generate} disabled={generating}>{generating ? 'Generating…' : cta}</Button></>}>
      <div className="source-modal">
        <label className="field-label"><span>Study set name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Biology Unit 3 — Cell cycle" /></label>
        <div className="source-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}>
          <div className="drop-icon"><Upload size={22} /></div>
          <div><strong>Choose file</strong><p>or drag & drop to upload</p><small>PDF, Word, PPT, Excel, TXT, and images · up to 10 sources</small></div>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Browse</Button>
          <input ref={fileRef} type="file" hidden multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,image/*,audio/*" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
        </div>
        {files.length > 0 && <div className="source-chips">{files.map((file) => <span key={file.id}><FileText size={14} />{file.name}<button onClick={() => setFiles((items) => items.filter((item) => item.id !== file.id))}><X size={13} /></button></span>)}</div>}
        <div className="source-divider"><span>or paste your notes</span></div>
        <label className="field-label"><span>Study material <small>{wordCount(text)} words</small></span><textarea rows="6" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste lecture notes, textbook excerpts, or a reading here…" /></label>
        <div className="source-link-row"><div className="input-with-icon"><Link2 size={17} /><input value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} placeholder="Add a public webpage or document link" onKeyDown={(event) => { if (event.key === 'Enter' && sourceInput.trim()) { event.preventDefault(); setSources((items) => [...items, { id: createId('source'), name: sourceInput.trim(), url: sourceInput.trim(), kind: 'link' }]); setSourceInput('') } }} /></div><Button variant="outline" icon={Plus} onClick={() => { if (sourceInput.trim()) { setSources((items) => [...items, { id: createId('source'), name: sourceInput.trim(), url: sourceInput.trim(), kind: 'link' }]); setSourceInput('') } }}>Add</Button></div>
        {sources.length > 0 && <div className="source-chips">{sources.map((source) => <span key={source.id}><Link2 size={14} />{source.name.slice(0, 40)}<button onClick={() => setSources((items) => items.filter((item) => item.id !== source.id))}><X size={13} /></button></span>)}</div>}
        <button className="use-sample-button" onClick={() => { setText(sampleStudyMaterial); setName((current) => current || 'Biology foundations') }}><Sparkles size={15} /> Use a sample lecture instead</button>
      </div>
    </Modal>
  )
}
