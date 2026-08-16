import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Navbar = ({ searchQuery, setSearchQuery }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="w-full bg-white border-b border-[#E5E5E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Project Name Left */}
        <Link to="/dashboard" className="font-bold text-lg text-[#111111] hover:text-gray-700 transition-colors shrink-0">
          AI Provenance
        </Link>

        {/* Simple Search Box */}
        {setSearchQuery && (
          <div className="flex-1 max-w-sm mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered images or creators..."
                className="w-full bg-white border border-[#E5E5E5] text-xs text-[#111111] placeholder-[#999999] pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-[#111111]"
              />
            </div>
          </div>
        )}

        {/* User Right */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover border border-[#E5E5E5]"
                />
                <span>{user.name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-xs text-[#666666] hover:text-red-600 hover:bg-gray-50 border border-[#E5E5E5] rounded-lg transition-colors flex items-center gap-1"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-medium text-[#111111] hover:text-gray-600 px-2.5 py-1.5"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-xs font-medium bg-[#111111] hover:bg-black text-white px-3 py-1.5 rounded-lg"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
