import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  LayoutDashboard,
  FileSpreadsheet,
  Award,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const StudentLayout = () => {
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

  const navLinks = [
    { name: t('nav.dashboard'), path: '/student', icon: LayoutDashboard },
    { name: t('nav.myExams'), path: '/student/exams', icon: FileSpreadsheet },
    { name: t('nav.myResults'), path: '/student/results', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            {/* Hamburger Button for Mobile (< 768px) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              className="md:hidden p-2 -ml-1.5 rtl:-ml-0 rtl:-mr-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">{t('common.appName')}</span>
              <span className="ml-2 rtl:mr-2 rtl:ml-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {t('common.studentPortal')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (>= 768px) */}
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/student'}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Profile & Header Actions */}
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <NotificationDropdown />

            {/* Desktop User Tag */}
            <div className="hidden sm:flex flex-col items-end rtl:items-start">
              <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="text-xs text-brand-600 font-medium">
                {t('common.track')}: {t(`common.tracks.${user?.category}`) || user?.category || 'PMP'}
              </span>
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-1 rtl:space-x-reverse text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer & Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className="mobile-drawer-panel fixed top-0 bottom-0 w-72 sm:w-80 bg-white text-slate-800 shadow-2xl flex flex-col z-50 border-r rtl:border-l rtl:border-r-0 border-slate-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-700 flex items-center justify-center text-white shadow-md">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 tracking-tight leading-none">{t('common.appName')}</h2>
                  <p className="text-[11px] text-brand-600 font-semibold mt-0.5">{t('common.studentPortal')}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close mobile menu"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Profile Card */}
            <div className="px-4 py-3 mx-4 my-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 rounded-full bg-brand-100 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || t('common.studentPortal')}</p>
                <p className="text-xs text-brand-600 font-medium truncate">
                  {t('common.track')}: {t(`common.tracks.${user?.category}`) || user?.category || 'PMP'}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/student'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-medium">{t('common.language')}</span>
                <LanguageSwitcher />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        © 2026 {t('common.appName')} – {t('common.appTagline')}
      </footer>
    </div>
  );
};