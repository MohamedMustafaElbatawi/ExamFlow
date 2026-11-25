import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Radio,
  History,
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { formatDateTime } from '../../utils/formatters';

export const InstructorNotifications = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'all', // 'all' | 'PMP' | 'MPA'
    type: 'general',
  });

  useEffect(() => {
    fetchNotificationHistory();
  }, []);

  const fetchNotificationHistory = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getMyNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setError(isAr ? 'يرجى إدخال عنوان ونص الإعلان' : 'Please provide both notification title and announcement text');
      return;
    }

    setSending(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await notificationService.broadcastNotification(formData);
      setSuccessMsg(res.message || t('common.success'));
      setFormData({
        title: '',
        message: '',
        category: 'all',
        type: 'general',
      });
      fetchNotificationHistory();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
          <Bell className="w-7 h-7 text-brand-600" />
          <span>{t('instructor.notifications.title')}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('instructor.notifications.subtitle')}
        </p>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold text-emerald-600">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="font-bold text-red-600">
            ×
          </button>
        </div>
      )}

      {/* Broadcast Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-100 pb-3">
          <Radio className="w-5 h-5 text-brand-600 animate-pulse" />
          <h2 className="text-base font-bold text-slate-900">{t('instructor.notifications.composeTitle')}</h2>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('instructor.notifications.announcementTitle')}
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t('instructor.notifications.announcementTitlePlaceholder')}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('instructor.notifications.targetCohort')}
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 font-medium bg-white"
              >
                <option value="all">{t('instructor.notifications.cohortAll')}</option>
                <option value="PMP">{t('instructor.notifications.cohortPMP')}</option>
                <option value="MPA">{t('instructor.notifications.cohortMPA')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {t('instructor.notifications.contentLabel')}
            </label>
            <textarea
              name="message"
              rows="3"
              value={formData.message}
              onChange={handleChange}
              placeholder={t('instructor.notifications.contentPlaceholder')}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 rtl:space-x-reverse shadow-md shadow-brand-500/20 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? t('instructor.notifications.sending') : t('instructor.notifications.sendBroadcastBtn')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Notification Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-slate-600" />
          <h2 className="text-base font-bold text-slate-900">{t('instructor.notifications.historyTitle')}</h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">{t('common.loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            {t('instructor.notifications.noHistory')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.slice(0, 15).map((n) => (
              <div
                key={n._id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-xs font-bold text-slate-900">{n.title}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {t(`notifications.types.${n.type}`, n.type.replace('_', ' '))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {formatDateTime(n.createdAt, i18n.language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
