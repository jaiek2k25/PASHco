import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, ChevronRight, Clipboard, Copy, Download, FileText, Globe2, History, Link2, LoaderCircle, Plus, Search, Sparkles, Trash2, WandSparkles } from 'lucide-react'
import ToolTabs from '../components/ToolTabs'
import PageHeader from '../components/PageHeader'
import { Badge, Button, EmptyState } from '../components/Common'
import { useApp } from '../context/AppContext'
import { createId, downloadText, safeFileName, truncate, wordCount } from '../lib/intelligence'
import { aiResearch } from '../lib/aiClient'

const SUGGESTIONS = [
  { label: 'Topic', text: 'Educational data science in higher education' },
  { label: 'Assignment', text: 'Write a literature review examining the relationship between technology and learning outcomes.' },
  { label: 'Question', text: 'How does in-class activity affect student learning?' },
]

export default function ResearchPage() {
  const [searchParams] = useSearchParams()
  const { state, saveResearch, toast } = useApp()
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [targetWords, setTargetWords] = useState(700)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceContent, setSourceContent] = useState('')
  const [sources, setSources] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setTopic(q)
  }, [searchParams])

  const addSource = () => {
    if (!sourceTitle.trim() && !sourceUrl.trim()) {
      toast('Add a source title or URL first.', 'error')
      return
    }
    setSources((items) => [...items, { id: createId('source'), title: sourceTitle.trim() || sourceUrl.trim(), url: sourceUrl.trim(), content: sourceContent.trim() }])
    setSourceTitle('')
    setSourceUrl('')
    setSourceContent('')
    toast('Source added to your research workspace.')
  }

  const generate = async () => {
    if (!topic.trim()) {
      toast('Enter a research topic or question first.', 'error')
      return
    }
    setLoading(true)
    const allSources = notes.trim() ? [...sources, { id: createId('source'), title: 'Research notes', content: notes }] : sources
    const [nextReport] = await Promise.all([
      aiResearch(topic, allSources, targetWords),
      new Promise((resolve) => window.setTimeout(resolve, 750)),
    ])
    setReport(nextReport)
    saveResearch(nextReport)
    setLoading(false)
    toast(nextReport.source === 'nvidia' ? 'Research draft generated with NVIDIA AI.' : 'Research draft is ready.')
  }

  const reportText = report ? [
    `# ${report.title}`,
    '',
    ...report.sections.flatMap((section) => [`## ${section.heading}`, ...section.paragraphs, '']),
    '## References',
    ...report.references,
  ].join('\n') : ''

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      toast('Report copied to clipboard.')
    } catch {
      toast('Clipboard access was blocked.', 'error')
    }
  }

  return (
    <div className="app-page research-page">
      <ToolTabs />
      <PageHeader
        eyebrow="AI RESEARCH"
        title="Research with a clear structure"
        description="Turn a topic, question, and your sources into an organized academic draft."
        actions={<Button variant="outline" icon={History} onClick={() => state.research[0] && setReport(state.research[0])}>Open latest</Button>}
      />

      <div className="research-layout">
        <div className="research-main">
          <div className="research-composer">
            <div className="research-composer-top"><div className="research-icon"><Search size={21} /></div><div><h2>What are you researching?</h2><p>Add your topic, assignment, and any notes or source excerpts.</p></div><span>{wordCount(`${topic} ${notes}`)} words</span></div>
            <textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Enter a topic, research question, or assignment prompt…" rows="3" />
            <div className="research-suggestions"><small>Or, try searching for:</small><div>{SUGGESTIONS.map((item) => <button key={item.label} onClick={() => setTopic(item.text)}><span>{item.label}</span>{truncate(item.text, 64)}<ChevronRight size={14} /></button>)}</div></div>
            <label className="field-label"><span>Your notes or key evidence <small>optional</small></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="5" placeholder="Paste quotes, findings, or bullet points that should shape the report…" /></label>
            <div className="research-settings">
              <label><span>Target length</span><select value={targetWords} onChange={(event) => setTargetWords(Number(event.target.value))}><option value={400}>Short brief · 400 words</option><option value={700}>Standard essay · 700 words</option><option value={1200}>Detailed report · 1200 words</option><option value={2000}>Long paper · 2000 words</option></select></label>
              <Button icon={loading ? LoaderCircle : WandSparkles} onClick={generate} disabled={loading}>{loading ? 'Researching…' : 'Search & draft'}</Button>
            </div>
          </div>

          {loading && <div className="research-loading"><LoaderCircle className="spin" size={20} /><div><strong>Organizing your research…</strong><p>Identifying themes, building an outline, and drafting each section.</p></div></div>}

          {!loading && !report && <EmptyState icon={BookOpen} title="Your research draft will appear here" description="Add a topic and sources, then generate an introduction, findings, analysis, conclusion, and reference list." />}

          {!loading && report && (
            <article className="research-report">
              <div className="report-header"><div><Badge tone={report.source === 'nvidia' ? 'green' : 'purple'}>{report.source === 'nvidia' ? 'NVIDIA AI' : 'LOCAL'} · {report.targetWords} WORD TARGET</Badge><h2>{report.title}</h2><p>Generated from {report.references.length} source{report.references.length === 1 ? '' : 's'} · {new Date(report.createdAt).toLocaleDateString()}</p></div><div className="report-actions"><button onClick={copyReport}>{copied ? <Check size={17} /> : <Copy size={17} />}</button><button onClick={() => { downloadText(`${safeFileName(report.title)}-research.md`, reportText, 'text/markdown'); toast('Research draft downloaded.') }}><Download size={17} /></button><button onClick={() => window.print()}><Clipboard size={17} /></button></div></div>
              {report.sections.map((section, index) => <section className="report-section" key={section.heading}><div className="report-section-number">0{index + 1}</div><div><h3>{section.heading}</h3>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div></section>)}
              <section className="report-references"><h3>References</h3>{report.references.map((reference) => <p key={reference}>{reference}</p>)}</section>
              <div className="report-disclaimer"><Sparkles size={16} /><p>This is a local draft based on the material you supplied. Verify every claim and citation before submitting academic work.</p></div>
            </article>
          )}
        </div>

        <aside className="research-side">
          <div className="side-card source-builder"><div className="side-card-head"><h3>Sources</h3><Badge tone="gray">{sources.length}</Badge></div><p>Add public webpages, documents, or excerpts manually.</p><div className="source-form"><input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="Source title" /><div className="input-with-icon"><Link2 size={16} /><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></div><textarea value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} rows="3" placeholder="Paste an important excerpt…" /><Button size="sm" className="full-width" icon={Plus} onClick={addSource}>Add source</Button></div>
            {sources.length > 0 && <div className="source-list">{sources.map((source, index) => <div key={source.id}><span>{index + 1}</span><div><strong>{truncate(source.title, 36)}</strong><small>{source.content ? `${wordCount(source.content)} words of notes` : 'No excerpt'}</small></div><button onClick={() => setSources((items) => items.filter((item) => item.id !== source.id))}><Trash2 size={14} /></button></div>)}</div>}
          </div>
          <div className="side-card research-history"><h3>Research history</h3>{state.research.length ? state.research.slice(0, 6).map((item) => <button key={item.id} onClick={() => setReport(item)}><FileText size={16} /><div><strong>{truncate(item.title, 40)}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div><ChevronRight size={15} /></button>) : <p>No reports yet. Your generated drafts will be saved here.</p>}</div>
          <div className="side-card research-tip"><Globe2 size={21} /><h3>Better sources, better drafts</h3><p>Include an excerpt and URL for each source. The more specific your evidence, the more focused the report becomes.</p></div>
        </aside>
      </div>
    </div>
  )
}
