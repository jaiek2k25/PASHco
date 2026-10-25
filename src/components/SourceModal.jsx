import { useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Link2, LoaderCircle, Plus, Sparkles, Upload, WandSparkles, X } from 'lucide-react'
import { Button, Modal } from './Common'
import { useApp } from '../context/AppContext'
import { createId, sampleStudyMaterial, wordCount } from '../lib/intelligence'
import { aiStudyPackFromDocument, readImageText } from '../lib/aiClient'
import { condenseMaterial, extractDocumentText, fileKind } from '../lib/fileExtract'

const KIND_LABEL = {
  pdf: 'PDF',
  docx: 'Word',
  pptx: 'PowerPoint',
  xlsx: 'Excel',
  text: 'Text',
  image: 'Image',
  'legacy-office': 'Legacy Office',
  unsupported: 'Unsupported',
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SourceModal({ open, onClose, title = 'Create a new study set', description = 'Add notes, paste text, or attach a file. WeSolve reads the document and turns it into a connected study pack.', cta = 'Generate study set', onGenerate, generatedTitle = 'New study set' }) {
  const { toast } = useApp()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [sources, setSources] = useState([])
  const [sourceInput, setSourceInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(null)
  const fileRef = useRef(null)

  const reading = files.some((file) => file.status === 'reading')
  const fileText = useMemo(() => files.map((file) => file.content).filter(Boolean).join('\n\n'), [files])
  const material = [text.trim(), fileText.trim()].filter(Boolean).join('\n\n')
  const condensed = useMemo(() => condenseMaterial(material), [material])
  const readyFiles = files.filter((file) => file.status === 'ready')
  const failedFiles = files.filter((file) => file.status === 'error')
  const materialOrigin = [
    readyFiles.length ? `${readyFiles.length} file${readyFiles.length === 1 ? '' : 's'}` : '',
    text.trim() ? 'your notes' : '',
  ].filter(Boolean).join(' and ')

  const updateFile = (id, patch) => setFiles((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const addFiles = async (incoming) => {
    const room = 10 - files.length
    const list = Array.from(incoming || []).slice(0, Math.max(0, room))
    if (!list.length) {
      toast('You can attach up to 10 files.', 'error')
      return
    }

    for (const file of list) {
      const id = createId('source')
      const kind = fileKind(file)
      const base = { id, name: file.name, size: file.size, type: file.type, kind, status: 'reading', progress: '' }
      setFiles((current) => [...current, base])

      try {
        const result = await extractDocumentText(file, {
          onProgress: ({ page, pages }) => updateFile(id, { progress: `${page}/${pages}` }),
        })

        // Images carry no text; the vision model has to read them.
        if (result.meta?.needsOcr) {
          updateFile(id, { progress: 'reading text' })
          const ocr = await readImageText(result.image)
          if (!ocr.ok) {
            updateFile(id, { status: 'error', error: ocr.error, ocr: true })
            continue
          }
          updateFile(id, { status: 'ready', content: ocr.text, pages: 1, characters: ocr.text.length, note: 'Read with OCR' })
          continue
        }

        const characters = (result.text || '').length
        const notes = []
        if (result.pages) notes.push(`${result.pages} ${result.kind === 'pptx' ? 'slides' : result.kind === 'xlsx' ? 'sheets' : 'pages'}`)
        if (result.meta?.scannedPages) notes.push(`${result.meta.scannedPages} image-only`)
        if (result.meta?.notes) notes.push(`${result.meta.notes} speaker notes`)
        updateFile(id, {
          status: 'ready',
          content: result.text,
          pages: result.pages || null,
          characters,
          note: notes.join(' · '),
        })
      } catch (error) {
        updateFile(id, { status: 'error', error: error.message || 'Could not read this file.' })
      }
    }
  }

  const generate = async () => {
    if (!material.trim() && sources.length === 0) {
      toast('Add a file, paste some notes, or add a source link first.', 'error')
      return
    }
    if (reading) {
      toast('Still reading your files — one moment.', 'error')
      return
    }
    if (!material.trim()) {
      toast('Those files had no readable text. Check the upload notes.', 'error')
      return
    }

    setGenerating(true)
    setProgress({ stage: 'generating', done: 0, total: 1 })
    try {
      // Pass the full text: long documents are chunked and read in parts.
      const pack = await aiStudyPackFromDocument(material, name.trim() || generatedTitle, {
        onProgress: setProgress,
      })
      pack.sources = [
        ...files
          .filter((file) => file.status === 'ready')
          .map(({ id, name: sourceName, size, type, kind, pages, characters }) => ({ id, name: sourceName, size, type, kind, pages, characters })),
        ...sources,
      ]
      pack.materialStats = {
        characters: condensed.text.length,
        originalCharacters: condensed.originalLength,
        truncated: condensed.truncated,
        files: readyFiles.length,
      }
      onGenerate?.(pack)
      if (pack.source === 'nvidia') {
        toast(pack.deepRead ? `Read all ${pack.sectionsRead} sections and generated your study set.` : 'Study set generated with your AI key.')
      } else {
        toast('Study set built with the local engine. Connect an AI key for sharper results.', 'error')
      }
      setName('')
      setText('')
      setFiles([])
      setSources([])
      onClose()
    } catch (error) {
      toast(error.message || 'Could not generate the study set.', 'error')
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  const progressLabel = (() => {
    if (!progress) return ''
    if (progress.stage === 'reading') return `Reading part ${progress.done + 1} of ${progress.total - 1}…`
    if (progress.stage === 'generating') return 'Writing flashcards, quiz, and guide…'
    return 'Finishing…'
  })()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      width={720}
      footer={<><Button variant="ghost" onClick={onClose} disabled={generating}>Cancel</Button><Button icon={generating ? LoaderCircle : WandSparkles} onClick={generate} disabled={generating || reading}>{(generating ? progressLabel.replace('…', '') : cta)}</Button></>}
    >
      <div className="source-modal">
        <label className="field-label"><span>Study set name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Biology Unit 3 — Cell cycle" /></label>

        <div className="source-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}>
          <div className="drop-icon"><Upload size={22} /></div>
          <div><strong>Choose file</strong><p>or drag &amp; drop to upload</p><small>PDF, Word, PowerPoint, Excel, TXT, or images · up to 10 files</small></div>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={files.length >= 10}>Browse</Button>
          <input ref={fileRef} type="file" hidden multiple accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.rtf,.tex,image/*" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
        </div>

        {files.length > 0 && (
          <ul className="source-file-list">
            {files.map((file) => (
              <li key={file.id} className={`source-file is-${file.status}`}>
                <span className="source-file-icon">{file.kind === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}</span>
                <div className="source-file-body">
                  <div className="source-file-head">
                    <strong>{file.name}</strong>
                    <span className="source-file-kind">{KIND_LABEL[file.kind] || 'File'} · {formatSize(file.size)}</span>
                  </div>
                  <p className="source-file-status">
                    {file.status === 'reading' && <><LoaderCircle size={13} className="spin" /> Reading{file.progress ? ` ${file.progress}` : ''}…</>}
                    {file.status === 'ready' && <><CheckCircle2 size={13} /> {file.characters?.toLocaleString()} characters{file.note ? ` · ${file.note}` : ''}</>}
                    {file.status === 'error' && <><AlertCircle size={13} /> {file.error}</>}
                  </p>
                </div>
                <button className="source-file-remove" onClick={() => setFiles((items) => items.filter((item) => item.id !== file.id))} aria-label={`Remove ${file.name}`} disabled={generating}><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}

        {reading && <p className="modal-hint">Extracting text on your device. Large PDFs can take a few seconds.</p>}
        {failedFiles.length > 0 && <p className="modal-hint">Remove the files that could not be read, or add their text below manually.</p>}

        <div className="source-divider"><span>or paste your notes</span></div>
        <label className="field-label"><span>Study material <small>{wordCount(text)} words</small></span><textarea rows="5" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste lecture notes, textbook excerpts, or a reading here…" /></label>

        {material.length > 0 && (
          <div className={`source-material-summary ${condensed.truncated ? 'is-truncated' : ''}`}>
            <strong>{material.length.toLocaleString()} characters{materialOrigin ? ` from ${materialOrigin}` : ''}</strong>
            <span>{condensed.truncated
              ? 'This is a long document, so it is read in parts and every part contributes to your study set.'
              : 'Everything you added fits in a single request.'}</span>
          </div>
        )}

        <div className="source-link-row">
          <div className="input-with-icon"><Link2 size={17} /><input value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} placeholder="Add a public webpage or document link" onKeyDown={(event) => { if (event.key === 'Enter' && sourceInput.trim()) { event.preventDefault(); setSources((items) => [...items, { id: createId('source'), name: sourceInput.trim(), url: sourceInput.trim(), kind: 'link' }]); setSourceInput('') } }} /></div>
          <Button variant="outline" icon={Plus} onClick={() => { if (sourceInput.trim()) { setSources((items) => [...items, { id: createId('source'), name: sourceInput.trim(), url: sourceInput.trim(), kind: 'link' }]); setSourceInput('') } }}>Add</Button>
        </div>
        {sources.length > 0 && <div className="source-chips">{sources.map((source) => <span key={source.id}><Link2 size={14} />{source.name.slice(0, 40)}<button onClick={() => setSources((items) => items.filter((item) => item.id !== source.id))}><X size={13} /></button></span>)}</div>}

        <button className="use-sample-button" onClick={() => { setText(sampleStudyMaterial); setName((current) => current || 'Biology foundations') }}><Sparkles size={15} /> Use a sample lecture instead</button>
      </div>
    </Modal>
  )
}
