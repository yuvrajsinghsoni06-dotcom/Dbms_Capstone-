import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  Castle,
  Table2,
  CalendarCheck,
  Users,
  MessageSquare,
  ScrollText,
  FlaskConical,
  Library,
  Briefcase,
  HelpCircle,
  UserCircle,
  Award,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Eye,
  Sparkles
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import Atmosphere from '../components/Atmosphere';

const navItems = [
  { to: '/home', label: 'Club Home', icon: Castle },
  { to: '/bronze-table', label: 'Bronze Table', icon: Table2, badge: 'Gathering' },
  { to: '/gatherings', label: 'Gatherings & Events', icon: CalendarCheck },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/conversations', label: 'Conversations & Whispers', icon: MessageSquare },
  { to: '/intelligence', label: 'Intelligence Exchange', icon: ScrollText },
  { to: '/pathways', label: 'Pathways & Research', icon: FlaskConical },
  { to: '/artifacts', label: 'Artifact Repository', icon: Library },
  { to: '/commissions', label: 'Commissions', icon: Briefcase },
  { to: '/mysteries', label: 'Weekly Mysteries', icon: HelpCircle },
  { to: '/persona', label: 'My Persona', icon: UserCircle },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function MainLayout() {
  const { user, loading, logout, socket } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-bone grid place-items-center">
        <Atmosphere />
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-display text-gold tracking-widest text-sm animate-pulse">
            Ascending above the gray fog...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const codename = user.profile?.codename || user.username;
  const pathway = user.profile?.pathway || 'Mortal';
  const sequence = user.profile?.sequence !== undefined ? `Seq ${user.profile.sequence}` : '';
  const avatarCard = user.profile?.avatarCard || 'The Fool';

  return (
    <div className="min-h-screen bg-void text-bone flex flex-col md:flex-row relative selection:bg-crimson selection:text-gold">
      <Atmosphere />

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between p-3 bg-void/90 border-b border-bronze/50 backdrop-blur z-30 sticky top-0">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-gold hover:bg-gold/10 rounded transition"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display text-gold tracking-widest text-sm font-bold">TAROT CLUB</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-bronze/60 bg-bronze/20 text-bone">
            {sequence}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              socket.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-crimson'
            }`}
            title={`Socket: ${socket.status}`}
          />
          <button
            onClick={() => navigate('/persona')}
            className="w-7 h-7 rounded border border-gold/60 bg-fog grid place-items-center text-xs text-gold font-display"
          >
            {codename.slice(0, 1)}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-void/95 md:bg-void/85 border-r border-bronze/50 backdrop-blur-md flex flex-col z-40 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Tarot Club Emblem Header */}
        <div className="p-4 border-b border-bronze/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-gold/70 bg-gradient-to-br from-crimson/40 to-void flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.25)]">
              <Eye className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h1 className="font-display text-sm tracking-wider text-gold font-bold uppercase">
                The Tarot Club
              </h1>
              <p className="text-[11px] text-bone/60 tracking-tight">Above the Gray Fog</p>
            </div>
          </div>

          {/* Member Card Summary */}
          <div className="mt-3 p-2.5 rounded border border-bronze/40 bg-fog/40 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded border border-gold/50 bg-bronze/30 flex items-center justify-center text-gold font-display text-xs">
                {avatarCard.slice(0, 2)}
              </div>
              <div className="truncate">
                <div className="text-xs font-display text-gold truncate">{codename}</div>
                <div className="text-[10px] text-bone/60 truncate">
                  {pathway} {sequence ? `· ${sequence}` : ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/persona')}
              className="text-[10px] text-gold hover:underline border border-bronze/50 px-1.5 py-0.5 rounded"
            >
              Persona
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-sm text-xs font-display transition-all ${
                    isActive
                      ? 'bg-crimson/40 text-gold border-l-2 border-gold shadow-[0_0_10px_rgba(139,0,0,0.4)]'
                      : 'text-bone/80 hover:text-gold hover:bg-fog/50'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-gold/20 text-gold border border-gold/40">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Info & Logout */}
        <div className="p-3 border-t border-bronze/50 bg-void/60 text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-bone/60">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  socket.status === 'connected' ? 'bg-emerald-400' : 'bg-crimson'
                }`}
              />
              Sefirah Gateway
            </span>
            <span className="font-mono text-[10px] text-gold/80">{socket.status}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-bone/40">Lord of the Mysteries</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-[11px] text-bone/70 hover:text-crimson transition"
            >
              <LogOut size={13} />
              <span>Depart</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Outlet */}
      <main className="flex-1 p-3 md:p-6 min-w-0 max-w-full overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
