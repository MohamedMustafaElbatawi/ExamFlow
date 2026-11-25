import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const InstructorLayout = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAr = i18n.language === 'ar';

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Lock body scroll and close on Escape key when drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { name: t('nav.dashboard'), path: '/instructor', icon: LayoutDashboard },
    { name: t('nav.students'), path: '/instructor/students', icon: Users },
    { name: t('nav.questionBank'), path: '/instructor/questions', icon: HelpCircle },
    { name: t('nav.import'), path: '/instructor/import', icon: FileUp },
    { name: t('nav.exams'), path: '/instructor/exams', icon: FileSpreadsheet },
    { name: t('nav.grading'), path: '/instructor/results', icon: GraduationCap },
    { name: t('nav.analytics'), path: '/instructor/analytics', icon: BarChart3 },
    { name: t('nav.notifications'), path: '/instructor/notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header (Visible only on screens below 768px) */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile menu"
            className="p-1.5 -ml-1.5 rtl:-ml-0 rtl:-mr-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <BookOpen className="w-5 h-5 text-brand-400" />
            <span className="font-bold text-base tracking-tight">{t('common.appName')}</span>
            <span className="text-[10px] bg-brand-500/20 text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-400/30">
              {t('common.instructorPortal')}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <NotificationDropdown />
          <LanguageSwitcher className="bg-slate-800 text-slate-200 border-slate-700" />
        </div>
      </header>

      {/* Mobile Slide-Over Drawer & Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className="mobile-drawer-panel fixed top-0 bottom-0 w-72 sm:w-80 bg-slate-900 text-slate-300 shadow-2xl flex flex-col z-50"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-700 flex items-center justify-center text-white shadow-md">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white tracking-tight leading-none">{t('common.appName')}</h2>
                  <p className="text-[11px] text-brand-400 font-medium mt-0.5">{t('common.instructorPortal')}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close mobile menu"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="px-4 py-3 mx-4 my-3 bg-slate-800/70 rounded-xl border border-slate-700/60 flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0) || 'I'}
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{user?.name || t('common.instructorPortal')}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/instructor'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Drawer Footer: Language Switcher & Logout */}
            <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/95">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{t('common.language')}</span>
                <LanguageSwitcher className="bg-slate-800 text-slate-200 border-slate-700" />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation (Unchanged, visible on md and up) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r rtl:border-l rtl:border-r-0 border-slate-800 flex-shrink-0 z-20">
        <div className="flex items-center space-x-3 rtl:space-x-reverse px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none">{t('common.appName')}</h1>
            <p className="text-xs text-brand-400 font-medium mt-1">{t('common.appTagline')}</p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center font-bold text-sm">
            {user?.name?.charAt(0) || 'I'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name || t('common.instructorPortal')}</p>
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
                className={({ isActive }) =>
                  `flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
            className="w-full flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen flex flex-col">
        {/* Top Navbar for Desktop */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-6 py-3.5 items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {t('common.instructorPortal')}
            </span>
            <span className="text-slate-400 text-sm">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {t('common.appTagline')}
            </span>
          </div>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <LanguageSwitcher />
            <NotificationDropdown />
            <div className="h-6 w-px bg-slate-200"></div>
            <span className="text-sm font-medium text-slate-700">{user?.name}</span>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="p-4 sm:p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};