import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  Database
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';

export const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState(user?.name || 'Alex Vance');
  const [title, setTitle] = useState(user?.title || 'Digital Artist & Photographer');
  const [bio, setBio] = useState(user?.bio || 'Specializing in digital photography, 3D compositions, and image protection.');
  const [organization, setOrganization] = useState(user?.organization || 'Aurora Studio');
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'AV';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        title,
        bio,
        organization
      });
      toast.success('Profile Updated', 'Your profile details have been saved.');
    } catch (err) {
      toast.error('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Badge variant="cyan" size="sm" icon={User}>
            Account Settings
          </Badge>
          <span className="text-xs text-slate-400 font-mono">{user?.role || 'Creator'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          User Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage your creator profile and personal account information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Initials Avatar & Quick Info */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 text-center">
          <div className="relative inline-block mx-auto">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold text-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 border-2 border-slate-700 mx-auto">
              {getInitials(name)}
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <Badge variant="success" size="xs" className="mt-2">
              Verified Creator
            </Badge>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Registered:</span>
              <span className="text-slate-200">{user?.stats?.registeredAssets || 14} Works</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account ID:</span>
              <span className="text-cyan-400 font-bold">{user?.id || 'usr_88421'}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-rose-400 hover:bg-rose-950/40"
            icon={LogOut}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>

        {/* Right Column: Profile Form */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Personal Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Professional Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Organization / Studio
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none font-sans"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" icon={Save} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
