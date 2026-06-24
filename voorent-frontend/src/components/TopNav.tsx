import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TopNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoggedIn = !!localStorage.getItem('token');
  const ownerUser  = isLoggedIn;
  const [searchQuery, setSearchQuery] = useState('');

  const links = [
    { label: 'Browse',       path: '/browse' },
    { label: 'List an Item', path: '/list' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/browse?search=${encodeURIComponent(q)}`);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0]">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6" style={{ height: 64 }}>
        {/* Logo */}
        <button onClick={() => navigate('/')} className="text-2xl font-bold flex-shrink-0" style={{ color: '#2D6A4F' }}>
          Voorent
        </button>

        {/* City badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border flex-shrink-0" style={{ borderColor: '#2D6A4F', background: '#F0FAF5' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="text-xs font-semibold" style={{ color: '#2D6A4F' }}>Delhi NCR</span>
        </div>

        {/* Search bar — desktop */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search furniture, appliances…"
            className="w-full border border-[#E0E0E0] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#2D6A4F] pr-10 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#2D6A4F] transition-colors"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>

        {/* Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-6 flex-shrink-0">
          {links.map((l) => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className="text-sm font-medium transition-colors whitespace-nowrap"
              style={{ color: pathname === l.path ? '#2D6A4F' : '#555555' }}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          {isLoggedIn ? (
            <>
              {ownerUser && (
                <button
                  onClick={() => navigate('/dashboard/owner')}
                  className="hidden md:block text-sm font-medium whitespace-nowrap px-3 py-1.5 rounded-full border transition-colors hover:bg-[#F0FAF5]"
                  style={{ color: '#2D6A4F', borderColor: '#2D6A4F' }}
                >
                  Dashboard
                </button>
              )}
              <button
                onClick={() => navigate('/my-rentals')}
                className="hidden md:block text-sm font-medium whitespace-nowrap"
                style={{ color: '#555555' }}
              >
                My Rentals
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: '#2D6A4F' }}
                title="Profile"
              >
                {localStorage.getItem('user_name')?.[0]?.toUpperCase() || '👤'}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-full text-sm font-semibold text-white min-h-[40px]"
              style={{ background: '#2D6A4F' }}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
