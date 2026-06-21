import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { label: 'Home',       path: '/',                  icon: '🏠' },
  { label: 'Browse',     path: '/browse',             icon: '🔍' },
  { label: 'List',       path: '/list',               icon: '➕' },
  { label: 'My Rentals', path: '/my-rentals',         icon: '📋' },
  { label: 'Profile',    path: '/profile',            icon: '👤' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#E0E0E0] z-50"
      style={{ height: 64 }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-full">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
            >
              <span className="text-xl">{tab.icon}</span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: active ? '#2D6A4F' : '#999999' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
