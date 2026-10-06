import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ShieldCheck,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

export const Header = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/gallery?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'AV';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 h-18 bg-[#090d16]/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Mobile Brand / Toggle */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-[#0c1220] rounded-[6px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="font-bold text-sm text-white">VeriFrame</span>
        </Link>
      </div>

      {/* Global Search */}
      <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assets, title, creator, or hash..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all font-sans"
        />
      </form>

      {/* Action Buttons & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Action: Register */}
        <Link to="/register" className="hidden lg:block">
          <Button size="sm" variant="primary" icon={Plus}>
            Register Work
          </Button>
        </Link>

        {/* Quick Action: Verify */}
        <Link to="/verify">
          <Button size="sm" variant="glow" icon={Search} className="text-xs sm:text-sm">
            Verify Image
          </Button>
        </Link>

        {/* User Profile Menu with initials badge */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0">
              {getInitials(user?.name)}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[100px] truncate">
              {user?.name || 'Alex Vance'}
            </span>
            <ChevronDown className="hidden sm:inline w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2.5 border-b border-slate-800/80">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Alex Vance'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'alex.vance@studioaurora.com'}</p>
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile & Settings</span>
                </Link>
                <Link
                  to="/assets"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span>My Assets ({user?.stats?.registeredAssets || 14})</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-800/80">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
