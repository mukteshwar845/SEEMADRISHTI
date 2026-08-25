import React, { useState } from 'react';
import { Users, Shield, UserPlus, Key, CheckCircle, Mail, Phone } from 'lucide-react';

interface SurveillanceUser {
  id: string;
  name: string;
  role: 'Commander' | 'Surveillance Operator' | 'Patrol Officer' | 'AI Analyst';
  email: string;
  shift: string;
  status: 'active' | 'on_duty' | 'off_duty';
  assignedSector: string;
}

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<SurveillanceUser[]>([
    {
      id: 'usr-1',
      name: 'Major Vikram Sen',
      role: 'Commander',
      email: 'v.sen@surveillance.trinetra.gov',
      shift: 'Day Shift (0600 - 1800)',
      status: 'on_duty',
      assignedSector: 'All Border Sectors',
    },
    {
      id: 'usr-2',
      name: 'Officer Rajesh Kumar',
      role: 'Surveillance Operator',
      email: 'r.kumar@surveillance.trinetra.gov',
      shift: 'Day Shift (0600 - 1800)',
      status: 'on_duty',
      assignedSector: 'Gate Alpha & Checkpoint 1',
    },
    {
      id: 'usr-3',
      name: 'Havaldar Amit Patel',
      role: 'Patrol Officer',
      email: 'a.patel@surveillance.trinetra.gov',
      shift: 'Rotational 24/7',
      status: 'active',
      assignedSector: 'East Perimeter Border Fence',
    },
    {
      id: 'usr-4',
      name: 'Dr. Ananya Sharma',
      role: 'AI Analyst',
      email: 'a.sharma@trinetra.ai',
      shift: 'Standard (0900 - 1700)',
      status: 'active',
      assignedSector: 'Neural Net Model Training',
    },
  ]);

  return (
    <div className="space-y-4" id="user-management-view-root">
      {/* Header */}
      <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Users size={18} />
            </span>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              PERSONNEL ROSTER & ACCESS CONTROL
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Border guard duty shifts, command privileges, and patrol dispatch units
          </p>
        </div>

        <button
          onClick={() => alert('Add New Surveillance Operator dialog...')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Add Operator</span>
        </button>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl flex flex-col justify-between shadow-md space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{user.name}</h3>
                  <span className="text-[11px] font-semibold text-blue-400">{user.role}</span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  user.status === 'on_duty'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {user.status === 'on_duty' ? '● ON DUTY' : 'STANDBY'}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-300 font-mono pt-2 border-t border-[#1c273c]">
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-slate-500" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-amber-400" />
                <span>Sector: {user.assignedSector}</span>
              </div>
              <div className="flex items-center gap-2">
                <Key size={12} className="text-emerald-400" />
                <span>Shift: {user.shift}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
