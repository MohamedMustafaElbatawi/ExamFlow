import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  HelpCircle,
  FileUp,
  FileSpreadsheet,
  GraduationCap,
  BarChart3,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';

export const InstructorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/instructor', icon: LayoutDashboard },
    { name: 'Students', path: '/instructor/students', icon: Users },
    { name: 'Question Bank', path: '/instructor/questions', icon: HelpCircle },
    { name: 'Import Questions', path: '/instructor/import', icon: FileUp },
    { name: 'Exams & Builder', path: '/instructor/exams', icon: FileSpreadsheet },
    { name: 'Grading & Results', path: '/instructor/results', icon: GraduationCap },
    { name: 'Reports & Analytics', path: '/instructor/analytics', icon: BarChart3 },
    { name: 'Notifications', path: '/instructor/notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-brand-400" />
          <span className="font-bold text-lg tracking-wide">ExamFlow</span>
          <span className="text-xs bg-brand-500/20 text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-400/30">
            Instructor
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded-md text-slate-400 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 z-20`}
      >
        <div className="hidden md:flex items-center space-x-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none">ExamFlow</h1>
            <p className="text-xs text-brand-400 font-medium mt-1">PMP & MPA Platform</p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-sm">
            {user?.name?.charAt(0) || 'I'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Instructor'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/instructor'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Instructor Portal
            </span>
            <span className="text-slate-400 text-sm hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Target Courses: PMP (Project Management Professional) & MPA
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/instructor/notifications')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <span className="text-sm font-medium text-slate-700">{user?.name}</span>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
