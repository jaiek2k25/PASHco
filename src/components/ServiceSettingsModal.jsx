import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Modal } from './Common'
import { useApp } from '../context/AppContext'
import { getAiStatus, requestAi } from '../lib/aiClient'
import { clearServiceSettings, getServiceSettings, maskKey, setServiceSettings } from '../lib/serviceSettings'

export default function ServiceSettingsModal() {
  const { serviceSettingsOpen, setServiceSettingsOpen, serviceSettingsVersion, refreshServiceSettings, toast } = useApp()
  const [settings, setSettings] = useState(getServiceSettings)
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!serviceSettingsOpen) return
    setSettings(getServiceSettings())
    setStatus(null)
  }, [serviceSettingsOpen, serviceSettingsVersion])

  useEffect(() => {
    getAiStatus().then(setStatus)
  }, [serviceSettingsOpen, serviceSettingsVersion])

  const save = () => {
    setServiceSettings({
      ...settings,
      nvidiaApiKey: settings.nvidiaApiKey.trim(),
      nvidiaModel: settings.nvidiaModel.trim(),
      nvidiaVisionModel: settings.nvidiaVisionModel.trim(),
      nvidiaBaseUrl: settings.nvidiaBaseUrl.trim(),
    })
    refreshServiceSettings()
    toast('AI settings saved in this browser.')
    setServiceSettingsOpen(false)
  }

  const clear = () => {
    const cleared = clearServiceSettings()
    setSettings(cleared)
    refreshServiceSettings()
    setStatus(null)
    toast('Local service settings cleared.')
  }

  const test = async () => {
    setTesting(true)
    try {
      // The test must use the fields on screen, not only what was last saved.
      setServiceSettings({ ...settings, nvidiaApiKey: settings.nvidiaApiKey.trim(), nvidiaBaseUrl: settings.nvidiaBaseUrl.trim() })
      refreshServiceSettings()
      await requestAi('tutor', { question: 'Reply with the word ready.', lesson: 'Connection test' }, { maxTokens: 128, retries: 1 })
      setStatus(await getAiStatus())
      toast('AI connection is working.')
    } catch (error) {
      toast(error.message || 'Could not connect to NVIDIA AI.', 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal
      open={serviceSettingsOpen}
      onClose={() => setServiceSettingsOpen(false)}
      title="Connect AI"
      subtitle="Your key stays in this browser. Every person can connect their own, or the site owner can share one on the server."
      width={620}
      footer={<><Button variant="ghost" icon={Trash2} onClick={clear}>Clear all</Button><Button variant="outline" onClick={() => setServiceSettingsOpen(false)}>Cancel</Button><Button icon={CheckCircle2} onClick={save}>Save settings</Button></>}
    >
      <div className="service-settings">
        <div className="service-status-row">
          <div className={`service-status-icon ${status?.configured ? 'ready' : ''}`}>{status?.configured ? <Sparkles size={20} /> : <KeyRound size={20} />}</div>
          <div>
            <strong>{status?.configured ? 'AI is ready' : 'AI is not connected'}</strong>
            <p>{status?.configured
              ? `${status.keySource === 'browser' ? 'Your personal key' : 'This site’s shared key'} · ${status.model}`
              : 'Add a key below, or have the site owner set NVIDIA_API_KEY on the server.'}</p>
          </div>
          <Badge tone={status?.configured ? 'green' : 'gray'}>{status?.configured ? 'READY' : 'LOCAL MODE'}</Badge>
        </div>

        <div className="service-section">
          <div className="service-section-head"><div><h3>Your API key</h3><p>Sent only to this app’s proxy, never stored on the server and never shared with other people.</p></div><ShieldCheck size={19} /></div>
          <label className="field-label"><span>API key <small>nvapi-… or any provider key</small></span><div className="input-with-icon secret-input"><KeyRound size={17} /><input type={showKey ? 'text' : 'password'} value={settings.nvidiaApiKey} onChange={(event) => setSettings((item) => ({ ...item, nvidiaApiKey: event.target.value }))} placeholder="Paste your build.nvidia.com API key" autoComplete="off" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide key' : 'Show key'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {settings.nvidiaApiKey && <p className="settings-mask">Stored locally as <strong>{maskKey(settings.nvidiaApiKey)}</strong></p>}
          <div className="service-field-grid">
            <label className="field-label"><span>Text model <small>optional</small></span><input value={settings.nvidiaModel} onChange={(event) => setSettings((item) => ({ ...item, nvidiaModel: event.target.value }))} placeholder="meta/llama-3.3-70b-instruct" /></label>
            <label className="field-label"><span>Vision / OCR model <small>optional</small></span><input value={settings.nvidiaVisionModel} onChange={(event) => setSettings((item) => ({ ...item, nvidiaVisionModel: event.target.value }))} placeholder="meta/llama-3.2-11b-vision-instruct" /></label>
          </div>
          <label className="field-label"><span>API base URL <small>optional · OpenAI-compatible</small></span><input value={settings.nvidiaBaseUrl} onChange={(event) => setSettings((item) => ({ ...item, nvidiaBaseUrl: event.target.value }))} placeholder="https://integrate.api.nvidia.com/v1" /></label>
          <p className="modal-hint">DeepSeek, Groq, OpenRouter, Together, or any OpenAI-compatible endpoint works. Leave it empty to use this site’s default (NVIDIA).</p>
          <Button variant="outline" size="sm" icon={testing ? LoaderCircle : RefreshCw} onClick={test} disabled={testing || !settings.nvidiaApiKey.trim()}>{testing ? 'Testing…' : 'Test connection'}</Button>
        </div>

        <div className="service-warning"><AlertTriangle size={18} /><p><strong>Who pays for the tokens:</strong> a key saved here is yours alone — other people using this site cannot spend it. If the site owner sets <code>NVIDIA_API_KEY</code> on the server instead, everyone shares that one key and its quota, which is why usage limits apply per person. Never commit a key to GitHub.</p></div>
      </div>
    </Modal>
  )
}
