export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="app-page-header">
      <div className="app-page-heading">
        {eyebrow && <div className="app-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actions && <div className="app-page-actions">{actions}</div>}
    </div>
  )
}
