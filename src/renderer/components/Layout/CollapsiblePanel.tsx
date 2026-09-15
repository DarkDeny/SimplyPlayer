import { useState, type ReactNode } from 'react';
import './CollapsiblePanel.css';

interface CollapsiblePanelProps {
  title: string;
  storageKey: string;
  headerActions?: ReactNode;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

function loadCollapsed(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(`panel:${key}`);
    return val === null ? fallback : val === '1';
  } catch {
    return fallback;
  }
}

export function CollapsiblePanel({
  title,
  storageKey,
  headerActions,
  defaultCollapsed = false,
  children,
}: CollapsiblePanelProps) {
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(storageKey, defaultCollapsed));

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(`panel:${storageKey}`, next ? '1' : '0');
    } catch { /* */ }
  };

  return (
    <div className={`collapsible-panel${collapsed ? ' collapsible-panel--collapsed' : ''}`}>
      <div className="collapsible-panel__header">
        <button className="collapsible-panel__toggle" onClick={toggle} aria-expanded={!collapsed}>
          <ChevronIcon />
          <span className="collapsible-panel__title">{title}</span>
        </button>
        {headerActions && (
          <div className="collapsible-panel__actions">{headerActions}</div>
        )}
      </div>
      {!collapsed && (
        <div className="collapsible-panel__body">{children}</div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="collapsible-panel__chevron" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}
