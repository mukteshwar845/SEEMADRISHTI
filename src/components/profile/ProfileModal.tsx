import React, { useState } from 'react';
import {
  User,
  Shield,
  Clock,
  MapPin,
  Mail,
  Key,
  Save,
  CheckCircle,
  AlertCircle,
  X,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const ProfileModal: React.FC = () => {
  const { user, updateProfile, isProfileModalOpen, setIsProfileModalOpen, logout } = useAuth();
  const { isDaylight } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [shift, setShift] = useState(user?.shift || 'Day Shift (0600 - 1800)');
  const [assignedSector, setAssignedSector] = useState(user?.assigned_sector || 'Sector Alpha - Main Gate');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isProfileModalOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        name,
        email,
        shift,
        assigned_sector: assignedSector,
        password: newPassword ? newPassword : undefined,
      });
      setSuccessMsg('Operator credentials and sector profile updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleClearanceBadges: Record<string, { label: string; color: string; border: string; bg: string }> = {
    Commander: { label: 'LVL-4 SUPREME COMMAND', color: 'text-pink-300', border: 'border-pink-400/50', bg: 'bg-pink-950/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]' },
    'Surveillance Operator': { label: 'LVL-3 TACTICAL OPERATOR', color: 'text-cyan-300', border: 'border-cyan-400/50', bg: 'bg-cyan-950/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]' },
    'Patrol Officer': { label: 'LVL-2 RAPID PATROL', color: 'text-emerald-300', border: 'border-emerald-400/50', bg: 'bg-emerald-950/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
    'AI Analyst': { label: 'LVL-3 NEURAL ANALYST', color: 'text-purple-300', border: 'border-purple-400/50', bg: 'bg-purple-950/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]' },
  };

  const badge = roleClearanceBadges[user.role] || {
    label: `CLEARANCE: ${user.role.toUpperCase()}`,
    color: 'text-cyan-300',
    border: 'border-cyan-400/50',
    bg: 'bg-cyan-950/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]',
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 font-mono text-slate-200 select-none">
      <div
        className="w-full max-w-xl rounded-3xl backdrop-blur-2xl bg-slate-950/75 border border-cyan-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(0,240,255,0.25)] overflow-hidden flex flex-col max-h-[90vh] relative"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.10] flex items-center justify-between bg-black/30 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                OPERATOR PROFILE SETUP
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Manage operational clearance, assigned sector, and security credentials
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 overflow-y-auto">
          {/* Identity & Clearance Tag */}
          <div className="p-4 rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                AUTHENTICATED OPERATOR ID
              </span>
              <span className="text-sm font-black text-white font-mono">{user.username}</span>
              <span className="text-[10px] text-cyan-300/80 block font-mono mt-0.5">
                SYS-ID: {user.id} &bull; ACTIVE STATUS: {user.status.toUpperCase()}
              </span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black font-mono flex items-center gap-1.5 ${badge.bg} ${badge.border} ${badge.color}`}>
              <ShieldCheck size={14} />
              <span>{badge.label}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <CheckCircle size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} className="text-cyan-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-white text-xs outline-none transition-all font-mono shadow-inner focus:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-cyan-400" />
                <span>Gov / Department Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-white text-xs outline-none transition-all font-mono shadow-inner focus:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-cyan-400" />
                <span>Assigned Border Sector</span>
              </label>
              <select
                value={assignedSector}
                onChange={(e) => setAssignedSector(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-cyan-300 text-xs outline-none transition-all font-mono cursor-pointer"
              >
                <option value="All Border Sectors (HQ)">All Border Sectors (HQ Command)</option>
                <option value="Sector Alpha - Main Gate">Sector Alpha - Main Gate</option>
                <option value="Sector Bravo - Exclusion Fence">Sector Bravo - Exclusion Fence</option>
                <option value="Sector Charlie - Vehicle Checkpoint">Sector Charlie - Vehicle Checkpoint</option>
                <option value="Sector Delta - Tactical Outpost 4">Sector Delta - Tactical Outpost 4</option>
                <option value="Sector Echo - Dense Forest Canopy">Sector Echo - Dense Forest Canopy</option>
                <option value="Sector Foxtrot - Mountain Ridge Pass">Sector Foxtrot - Mountain Ridge Pass</option>
                <option value="Sector Golf - Desert Perimeter">Sector Golf - Desert Perimeter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400" />
                <span>Operational Shift</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-cyan-300 text-xs outline-none transition-all font-mono cursor-pointer"
              >
                <option value="Day Shift (0600 - 1800)">Day Shift (0600 - 1800)</option>
                <option value="Night Shift (1800 - 0600)">Night Shift (1800 - 0600)</option>
                <option value="24/7 Command Standby">24/7 Command Standby</option>
              </select>
            </div>
          </div>

          {/* Change Security Password */}
          <div className="pt-3 border-t border-white/[0.10] space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Key size={13} className="text-cyan-400" />
              <span>Update Passphrase / Password (Optional)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-white text-xs outline-none transition-all font-mono shadow-inner"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-white text-xs outline-none transition-all font-mono shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-white/[0.10] flex items-center justify-between">
            <button
              type="button"
              id="profile-modal-logout-btn"
              onClick={async () => {
                setIsProfileModalOpen(false);
                await logout();
              }}
              className="tactical-btn-3d flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/40 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="tactical-btn-3d px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-bold text-slate-300 uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="tactical-btn-3d flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
