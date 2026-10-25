import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CloudCog, Eye, EyeOff, KeyRound, LoaderCircle, Lock, RefreshCw, Sparkles, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Modal } from './Common'
import { useApp } from '../context/AppContext'
import { getAiStatus, requestAi } from '../lib/aiClient'
import { accounts } from '../lib/accounts'
import { getServiceSettings, maskKey, setServiceSettings } from '../lib/serviceSettings'

const EMPTY = { nvidiaApiKey: '', nvidiaModel: '', nvidiaVisionModel: '', nvidiaBaseUrl: '' }

// Hosts that accept requests straight from a browser (CORS enabled). On the
// static build these are the only providers that can work without a server.
const PRESETS = [
  { id: 'nvidia', label: 'NVIDIA', base: '', model: 'meta/llama-3.3-70b-instruct', vision: 'meta/llama-3.2-11b-vision-instruct', browser: false },
  { id: 'openrouter', label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct', vision: 'meta-llama/llama-3.2-11b-vision-instruct', browser: true },
  { id: 'groq', label: 'Groq', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', vision: 'meta-llama/llama-4-scout-17b-16e-instruct', browser: true },
  { id: 'gemini', label: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash', vision: 'gemini-2.0-flash', browser: true },
  { id: 'deepseek', label: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', vision: '', browser: false },
]

export default function ServiceSettingsModal() {
  const { serviceSettingsOpen, setServiceSettingsOpen, serviceSettingsVersion, refreshServiceSettings, isAuthenticated, setAuthOpen, toast, hasBackend } = useApp()
  const [settings, setSettings] = useState(getServiceSettings)
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState(null)
  const [accountKey, setAccountKey] = useState(null)
  const [testing, setTesting] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadAccount = useCallback(async (signedIn) => {
    if (!signedIn) {
      setAccountKey(null)
      return
    }
    try {
      const result = await accounts.getAiKey()
      setAccountKey(result.aiKey)
    } catch {
      setAccountKey(null)
    }
  }, [])

  // Load the form only when the dialog opens. Auth status often resolves a
  // moment later; re-running this then would erase what the user is typing.
  useEffect(() => {
    if (!serviceSettingsOpen) return
    setSettings(getServiceSettings())
    setStatus(null)
  }, [serviceSettingsOpen, serviceSettingsVersion])

  // Keep the ownership panel and status in sync with sign-in state.
  useEffect(() => {
    if (!serviceSettingsOpen) return
    loadAccount(isAuthenticated).then(() => getAiStatus().then(setStatus))
  }, [serviceSettingsOpen, serviceSettingsVersion, isAuthenticated, loadAccount])

  const refreshStatus = async () => {
    setStatus(await getAiStatus())
    refreshServiceSettings()
  }

  const save = async () => {
    const cleaned = {
      nvidiaApiKey: settings.nvidiaApiKey.trim(),
      nvidiaModel: settings.nvidiaModel.trim(),
      nvidiaVisionModel: settings.nvidiaVisionModel.trim(),
      nvidiaBaseUrl: settings.nvidiaBaseUrl.trim(),
    }

    if (!isAuthenticated) {
      setServiceSettings(cleaned)
      refreshServiceSettings()
      toast('Key saved in this browser. Sign in to sync it across your devices.')
      setServiceSettingsOpen(false)
      return
    }

    setBusy(true)
    try {
      if (staticHost) {
        // No server: the key stays in this browser, which is the only option.
        const result = await accounts.saveAiKey({
          ...(cleaned.nvidiaApiKey ? { key: cleaned.nvidiaApiKey } : {}),
          baseUrl: cleaned.nvidiaBaseUrl,
          model: cleaned.nvidiaModel,
          visionModel: cleaned.nvidiaVisionModel,
        })
        setAccountKey(result.aiKey)
        refreshServiceSettings()
        toast('Key saved in this browser.')
        setServiceSettingsOpen(false)
        return
      }
      // Personal key lives on the account, encrypted at rest. Keep this browser
      // free of it so a shared machine cannot read it later.
      const result = await accounts.saveAiKey({
        ...(cleaned.nvidiaApiKey ? { key: cleaned.nvidiaApiKey } : {}),
        baseUrl: cleaned.nvidiaBaseUrl,
        model: cleaned.nvidiaModel,
        visionModel: cleaned.nvidiaVisionModel,
      })
      setAccountKey(result.aiKey)
      setServiceSettings({ ...EMPTY, nvidiaApiKey: '' })
      setSettings((current) => ({ ...current, nvidiaApiKey: '' }))
      refreshServiceSettings()
      toast('Your key is saved to your account and encrypted.')
      setServiceSettingsOpen(false)
    } catch (error) {
      toast(error.message || 'Could not save your key.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      if (isAuthenticated) {
        const result = await accounts.clearAiKey()
        setAccountKey(result.aiKey)
      }
      setServiceSettings({ ...EMPTY })
      setSettings({ ...EMPTY })
      setStatus(null)
      refreshServiceSettings()
      toast('AI key removed.')
    } catch (error) {
      toast(error.message || 'Could not remove the key.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setTesting(true)
    const previous = getServiceSettings()
    try {
      // Test with what is on screen, then put the stored value back.
      setServiceSettings({
        ...previous,
        nvidiaApiKey: settings.nvidiaApiKey.trim() || previous.nvidiaApiKey,
        nvidiaBaseUrl: settings.nvidiaBaseUrl.trim(),
        nvidiaModel: settings.nvidiaModel.trim(),
        nvidiaVisionModel: settings.nvidiaVisionModel.trim(),
      })
      await requestAi('tutor', { question: 'Reply with the word ready.', lesson: 'Connection test' }, { maxTokens: 128, retries: 1 })
      await refreshStatus()
      await loadAccount(isAuthenticated)
      toast('AI connection is working.')
    } catch (error) {
      toast(error.message || 'Could not connect to the AI provider.', 'error')
    } finally {
      setServiceSettings(previous)
      setTesting(false)
    }
  }

  const savedOnAccount = Boolean(accountKey?.configured)
  const staticHost = !hasBackend
  const hasLocalKey = Boolean(settings.nvidiaApiKey)
  const ready = Boolean(status?.configured)
  const providerHost = (() => {
    const value = settings.nvidiaBaseUrl || accountKey?.baseUrl || status?.baseUrl || status?.provider || ''
    try {
      return new URL(value).host
    } catch {
      return 'NVIDIA'
    }
  })()

  return (
    <Modal
      open={serviceSettingsOpen}
      onClose={() => setServiceSettingsOpen(false)}
      title="Connect AI"
      subtitle="Each person connects their own key. Yours is never shared with other users."
      width={620}
      footer={<><Button variant="ghost" icon={Trash2} onClick={clear} disabled={busy || (!savedOnAccount && !hasLocalKey)}>Remove key</Button><Button variant="outline" onClick={() => setServiceSettingsOpen(false)}>Cancel</Button><Button icon={busy ? LoaderCircle : CheckCircle2} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save key'}</Button></>}
    >
      <div className="service-settings">
        <div className="service-status-row">
          <div className={`service-status-icon ${ready ? 'ready' : ''}`}>{ready ? <Sparkles size={20} /> : <KeyRound size={20} />}</div>
          <div>
            <strong>{ready ? 'AI is ready' : 'AI is not connected'}</strong>
            <p>{ready
              ? `${status?.keySource === 'shared' ? 'Site-wide key' : 'Your own key'} · ${providerHost} · ${status?.model}`
              : 'Add your key below to turn on live AI answers.'}</p>
          </div>
          <Badge tone={ready ? 'green' : 'gray'}>{ready ? 'READY' : 'LOCAL MODE'}</Badge>
        </div>

        <div className={`service-owner ${isAuthenticated && !staticHost ? 'is-account' : 'is-guest'}`}>
          {staticHost
            ? <><UserRound size={18} /><div><strong>Saved in this browser</strong><p>There is no WeSolve server on this build, so the key cannot be stored on an account.</p></div></>
            : isAuthenticated
              ? <><CloudCog size={18} /><div><strong>Saved to your account</strong><p>Encrypted on the server, so it follows you to every device you sign in on.</p></div></>
              : <><UserRound size={18} /><div><strong>This browser only</strong><p>Sign in to keep your key across devices. <button type="button" className="link-button" onClick={() => { setServiceSettingsOpen(false); setAuthOpen(true) }}>Create an account</button></p></div></>}
        </div>

        <div className="service-section">
          <div className="service-section-head"><div><h3>{isAuthenticated ? 'Your API key' : 'API key'}</h3><p>{isAuthenticated ? 'Stored encrypted on your account. The server only returns a masked hint.' : 'Stored in this browser and sent with each request.'}</p></div><Lock size={19} /></div>

          {savedOnAccount && (
            <div className="saved-key-row">
              <span className="saved-key-hint"><KeyRound size={15} /> {accountKey.hint || 'Saved key'}</span>
              <span className="saved-key-note">{hasLocalKey ? 'Enter a new key below to replace it.' : 'Leave the field empty to keep this key.'}</span>
            </div>
          )}

          <label className="field-label"><span>API key</span><div className="input-with-icon secret-input"><KeyRound size={17} /><input type={showKey ? 'text' : 'password'} value={settings.nvidiaApiKey} onChange={(event) => setSettings((item) => ({ ...item, nvidiaApiKey: event.target.value }))} placeholder={savedOnAccount ? '•••••••• (saved)' : 'nvapi-… or your provider key'} autoComplete="off" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide key' : 'Show key'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {!isAuthenticated && hasLocalKey && <p className="settings-mask">Stored locally as <strong>{maskKey(settings.nvidiaApiKey)}</strong></p>}

          <div className="service-field-grid">
            <label className="field-label"><span>Text model <small>optional</small></span><input value={settings.nvidiaModel} onChange={(event) => setSettings((item) => ({ ...item, nvidiaModel: event.target.value }))} placeholder="meta/llama-3.3-70b-instruct" /></label>
            <label className="field-label"><span>Vision / OCR model <small>optional</small></span><input value={settings.nvidiaVisionModel} onChange={(event) => setSettings((item) => ({ ...item, nvidiaVisionModel: event.target.value }))} placeholder="meta/llama-3.2-11b-vision-instruct" /></label>
          </div>
          <div className="provider-presets">
            <span>Quick set-up</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={((settings.nvidiaBaseUrl || '') === preset.base) ? 'is-active' : ''}
                onClick={() => setSettings((item) => ({
                  ...item,
                  nvidiaBaseUrl: preset.base,
                  nvidiaModel: preset.model,
                  nvidiaVisionModel: preset.vision,
                }))}
              >
                {preset.label}
                {staticHost && !preset.browser && <small>server</small>}
                {staticHost && preset.browser && <small className="ok">browser-ready</small>}
              </button>
            ))}
          </div>

          <label className="field-label"><span>API base URL <small>optional · OpenAI-compatible</small></span><input value={settings.nvidiaBaseUrl} onChange={(event) => setSettings((item) => ({ ...item, nvidiaBaseUrl: event.target.value }))} placeholder="https://integrate.api.nvidia.com/v1" /></label>
          <p className="modal-hint">Any OpenAI-compatible endpoint works — including your own proxy URL. Leave it empty to use NVIDIA from the WeSolve server.</p>

          <Button variant="outline" size="sm" icon={testing ? LoaderCircle : RefreshCw} onClick={test} disabled={testing || busy || (!hasLocalKey && !savedOnAccount)}>{testing ? 'Testing…' : 'Test connection'}</Button>
        </div>

        {!hasBackend && (
          <div className="service-warning"><AlertTriangle size={18} /><p><strong>Preview build, no server.</strong> Your key is saved in this browser and sent straight to the provider. Many providers block browser requests (CORS), so this only works with one that allows them — NVIDIA and most others need the Node deployment.</p></div>
        )}

        <div className="service-warning"><AlertTriangle size={18} /><p><strong>Your key, your bill.</strong> Requests are billed to the key you connect here, so other people using WeSolve never spend your credits. Keys are encrypted at rest and never sent back to the browser. Never commit a key to GitHub.</p></div>
      </div>
    </Modal>
  )
}
