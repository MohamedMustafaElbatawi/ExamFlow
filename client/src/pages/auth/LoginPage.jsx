import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'instructor' ? '/instructor' : '/student', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      const target = result.user.role === 'instructor' ? '/instructor' : '/student';
      navigate(target, { replace: true });
    } else {
      if (result.message?.includes('suspended')) {
        setError(t('auth.suspendedNotice'));
      } else if (result.message?.includes('credentials')) {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(result.message || t('common.error'));
      }
    }
  };

  const handleDemoFill = (demoRole) => {
    setError('');
    if (demoRole === 'instructor') {
      setEmail('instructor@examflow.com');
      setPassword('Password123!');
    } else {
      setEmail('student@examflow.com');
      setPassword('Password123!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Top Language Switcher */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 z-10">
        <LanguageSwitcher className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-brand-500/25 ring-4 ring-white/10">
            <BookOpen className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-white">
          {t('common.appName')}
        </h2>
        <p className="mt-1 text-center text-sm text-slate-300">
          {t('common.appTagline')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 rtl:space-x-reverse text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.emailLabel')}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="block w-full pl-10 rtl:pl-3 rtl:pr-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 text-left rtl:text-right"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t('auth.passwordLabel')}
                </label>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="block w-full pl-10 rtl:pl-3 rtl:pr-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 text-left rtl:text-right"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
              >
                {loading ? t('auth.signingIn') : t('auth.signInButton')}
                {!loading && (
                  isAr ? <ArrowLeft className="mr-2 w-4 h-4" /> : <ArrowRight className="ml-2 w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 text-center mb-3">
              {t('auth.demoAccountsTitle')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('instructor')}
                className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                <span>{t('auth.demoInstructor')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('student')}
                className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('auth.demoStudent')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
