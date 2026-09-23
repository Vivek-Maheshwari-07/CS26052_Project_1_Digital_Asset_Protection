import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Lock,
  Bell,
  Sliders,
  LogOut,
  Save,
  CheckCircle2,
  Database,
  Key
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
  const [title, setTitle] = useState(user?.title || 'Lead Visual Designer & Crypto-Photographer');
  const [bio, setBio] = useState(user?.bio || 'Specializing in generative synthetic aesthetics and digital authenticity research.');
  const [emailAlerts, setEmailAlerts] = useState(user?.preferences?.emailAlertsOnMatch ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        title,
        bio,
        preferences: {
          ...user?.preferences,
          emailAlertsOnMatch: emailAlerts
        }
      });
      toast.success('Profile Saved', 'Your user preferences have been updated.');
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
          <span className="text-xs text-slate-400 font-mono">{user?.role || 'Verified Creator'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage your creator identity, encryption keys, and alert preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Avatar & Quick Info */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 text-center">
          <div className="relative inline-block mx-auto">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt={user?.name}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-cyan-500/30 shadow-2xl mx-auto"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <Badge variant="success" size="xs" className="mt-2">
              FastAPI Verified Enclave
            </Badge>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Registered:</span>
              <span className="text-slate-200">{user?.stats?.registeredAssets || 14} Assets</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Enclave ID:</span>
              <span className="text-cyan-400 font-bold">{user?.id || 'usr_vf_9942a'}</span>
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

        {/* Right Column: Profile Form & Security */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Creator Profile Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Display Name
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
                  Creator Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none font-sans"
                />
              </div>
            </div>

            <h3 className="text-base font-bold text-white border-b border-slate-800 pt-4 pb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>Notification Preferences</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <p className="font-semibold text-white">Email Match Alerts</p>
                  <p className="text-slate-400">Receive alerts when web crawlers flag suspected derivative matches.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" icon={Save} isLoading={isSaving}>
                Save Preferences
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
