import { Component } from 'react'

/**
 * Catches render-time failures so a bug shows a readable message instead of
 * a blank white page. The reload button is enough to recover in practice,
 * because app state is persisted locally and on the account.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('WeSolve crashed while rendering:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <span className="crash-mark">wesolve<span>.ai</span></span>
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error. Your saved work is safe.</p>
          <pre>{String(error?.message || error)}</pre>
          <div className="crash-actions">
            <button type="button" onClick={() => this.setState({ error: null })}>Try again</button>
            <button type="button" className="crash-ghost" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </div>
    )
  }
}
