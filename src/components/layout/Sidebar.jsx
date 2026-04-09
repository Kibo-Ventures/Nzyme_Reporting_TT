import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/timetracker', label: 'Time Tracker',     icon: '⏱', group: 'STAFFING' },
  { to: '/team',        label: 'Staffing Report',  icon: '📈', group: 'STAFFING' },
  { to: '/pipeline',    label: 'Board View',        icon: '📋', group: 'REPORTING' },
  { to: '/channels',    label: 'Channels',          icon: '📊', group: 'REPORTING' },
  { to: '/advisers',    label: 'Adviser Coverage',  icon: '🤝', group: 'REPORTING' },
  { to: '/funnel',      label: 'Funnel Analysis',   icon: '🔽', group: 'REPORTING' },
  { to: '/analysis',   label: 'Dynamic Analysis',  icon: '⬡', group: 'REPORTING' },
  { to: '/proprietary', label: 'Proprietary',       icon: '🎯', group: 'REPORTING', disabled: true },
]

export default function Sidebar() {
  const [open, setOpen] = useState(true)
  const { user, signOut } = useAuth()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
      isActive
        ? 'font-semibold'
        : 'hover:bg-black/5'
    }`

  const activeLinkStyle = ({ isActive }) =>
    isActive
      ? { background: 'var(--accent-light)', color: 'var(--accent)' }
      : {}

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded"
        style={{ background: 'var(--rule)' }}
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle sidebar"
      >
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current mb-1" />
        <span className="block w-5 h-0.5 bg-current" />
      </button>

      {/* Sidebar panel */}
      <aside
        className={`
          flex flex-col w-56 shrink-0 border-r h-full
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          fixed md:static z-40 md:translate-x-0
        `}
        style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
      >
        {/* Logo */}
        <div className="px-4 py-3 border-b flex items-center" style={{ borderColor: 'var(--rule)' }}>
          <img src="/nzyme-logo.png" alt="Nzyme" style={{ height: 32, width: 'auto' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item, i) => (
            <div key={item.to}>
              {item.group && (i === 0 || navItems[i - 1].group !== item.group) && (
                <div
                  className="px-3 pt-4 pb-1 text-xs font-semibold tracking-widest uppercase flex items-center"
                  style={{ color: 'var(--muted)' }}
                >
                  {item.group}
                  {item.group === 'REPORTING' && (
                    <span
                      className="ml-2 px-1.5 text-xs rounded"
                      style={{ background: 'var(--rule)', color: 'var(--muted)', letterSpacing: 'normal', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}
                    >
                      Beta
                    </span>
                  )}
                </div>
              )}
              {item.disabled ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm cursor-not-allowed"
                  style={{ color: 'var(--muted)', opacity: 0.5 }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ) : (
                <NavLink
                  to={item.to}
                  className={linkClass}
                  style={activeLinkStyle}
                  onClick={() => window.innerWidth < 768 && setOpen(false)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* User + sign-out */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--rule)' }}>
          {user && (
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          )}
          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid var(--rule)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--muted)',
              textAlign: 'left',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
