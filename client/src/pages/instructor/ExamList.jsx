import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Copy,
  Ban,
  Trash2,
  Archive,
  ArchiveRestore,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Calendar,
  Loader2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { examService } from '../../services/examService';
import { formatDate } from '../../utils/formatters';

export const ExamList = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [archivedTab, setArchivedTab] = useState('active'); // 'active' | 'archived'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExams, setTotalExams] = useState(0);

  // Modals & Confirmation
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'publish' | 'cancel' | 'delete' | 'archive' | 'restore', exam }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await examService.getExams({
        search,
        category: categoryFilter,
        status: statusFilter,
        archived: archivedTab === 'archived' ? 'true' : 'false',
        page,
        limit: 12,
      });
      if (res.success) {
        setExams(res.exams);
        setTotalPages(res.totalPages);
        setTotalExams(res.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل تحميل قائمة الامتحانات' : 'Failed to fetch exams list'));
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, archivedTab, page, isAr]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Publish exam handler
  const handlePublish = async (exam) => {
    try {
      const res = await examService.publishExam(exam._id);
      if (res.success) {
        showToast(
          isAr
            ? `تم نشر الامتحان بنجاح وتوليد ${res.exam.questionSnapshots.length} لقطة ثابتة للأسئلة.`
            : `Exam published! ${res.exam.questionSnapshots.length} question snapshots locked in.`
        );
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setConfirmAction(null);
    }
  };

  // Duplicate exam handler
  const handleDuplicate = async (exam) => {
    try {
      const res = await examService.duplicateExam(exam._id);
      if (res.success) {
        showToast(isAr ? 'تم استنساخ الامتحان كمسودة جديدة' : 'Exam duplicated as draft');
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  // Cancel exam handler
  const handleCancel = async (exam) => {
    try {
      const res = await examService.cancelExam(exam._id);
      if (res.success) {
        showToast(isAr ? 'تم إلغاء الامتحان' : 'Exam cancelled');
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setConfirmAction(null);
    }
  };

  // Delete draft exam handler
  const handleDelete = async (exam) => {
    try {
      const res = await examService.deleteExam(exam._id);
      if (res.success) {
        showToast(isAr ? 'تم حذف مسودة الامتحان' : 'Exam draft deleted');
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setConfirmAction(null);
    }
  };

  // Archive exam handler
  const handleArchive = async (exam) => {
    try {
      const res = await examService.archiveExam(exam._id);
      if (res.success) {
        showToast(isAr ? 'تم أرشفة الامتحان بنجاح' : 'Exam archived successfully');
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setConfirmAction(null);
    }
  };

  // Restore exam handler
  const handleRestore = async (exam) => {
    try {
      const res = await examService.restoreExam(exam._id);
      if (res.success) {
        showToast(isAr ? 'تمت استعادة الامتحان بنجاح' : 'Exam restored successfully');
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setConfirmAction(null);
    }
  };

  // Compute status helpers
  const getExamComputedBadge = (exam) => {
    if (exam.status === 'cancelled') {
      return {
        label: t('common.statuses.cancelled'),
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    }
    if (exam.status === 'draft') {
      return {
        label: t('common.statuses.draft'),
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
    }
    const now = new Date();
    if (now < new Date(exam.startDate)) {
      return {
        label: t('common.statuses.upcoming'),
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (now >= new Date(exam.startDate) && now <= new Date(exam.endDate)) {
      return {
        label: t('common.statuses.open'),
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    return {
      label: t('common.statuses.closed'),
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
    };
  };

  const draftCount = exams.filter((e) => e.status === 'draft').length;
  const publishedCount = exams.filter((e) => e.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 rtl:space-x-reverse border border-emerald-500/30 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {t('instructor.exams.title')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('instructor.exams.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Create Exam Button */}
          <button
            onClick={() => navigate('/instructor/exams/create')}
            className="flex items-center space-x-2 rtl:space-x-reverse bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('instructor.exams.createBtn')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('common.total')}</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{totalExams}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('common.statuses.published')}</span>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">{publishedCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('common.statuses.draft')}</span>
          <h3 className="text-xl font-bold text-purple-600 mt-1">{draftCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('common.statuses.cancelled')}</span>
          <h3 className="text-xl font-bold text-slate-500 mt-1">
            {exams.filter((e) => e.status === 'cancelled').length}
          </h3>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Active vs Archived Tab toggle */}
        <div className="flex items-center space-x-1 rtl:space-x-reverse bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setArchivedTab('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              archivedTab === 'active'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'الامتحانات النشطة' : 'Active Exams'}
          </button>
          <button
            onClick={() => setArchivedTab('archived')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center space-x-1 rtl:space-x-reverse ${
              archivedTab === 'archived'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isAr ? 'الأرشيف' : 'Archived'}</span>
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 left-3 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('instructor.analytics.searchPlaceholder')}
            className="w-full pl-9 pr-9 rtl:pl-9 rtl:pr-9 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-2.5 right-3 rtl:right-auto rtl:left-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">{t('instructor.exams.allCategories')}</option>
            <option value="PMP">PMP</option>
            <option value="MPA">MPA</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">{t('instructor.students.allStatuses')}</option>
            <option value="draft">{t('common.statuses.draft')}</option>
            <option value="published">{t('common.statuses.published')}</option>
            <option value="cancelled">{t('common.statuses.cancelled')}</option>
          </select>

          <button
            onClick={fetchExams}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs">
          <span>{error}</span>
          <button onClick={fetchExams} className="font-bold underline hover:text-red-900">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Exams Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
          <span className="text-xs">{t('common.loading')}</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">{t('instructor.dashboard.noRecentExams')}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {t('instructor.exams.subtitle')}
          </p>
          <button
            onClick={() => navigate('/instructor/exams/create')}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
          >
            {t('instructor.exams.createBtn')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => {
            const badge = getExamComputedBadge(exam);
            const isDraft = exam.status === 'draft';
            const isPublished = exam.status === 'published';

            return (
              <div
                key={exam._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                      {exam.category}
                    </span>
                    <span className={`inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{exam.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {exam.description || (isAr ? 'لا يوجد وصف مضاف لهذا الامتحان.' : 'No description provided.')}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>{exam.durationMinutes} {t('common.minutes')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                      <span>{exam.questionCount} {t('common.questions')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{exam.assignedCount} {isAr ? 'طالب معين' : 'assigned'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{exam.attemptCount} {t('instructor.students.colAttempts')}</span>
                    </div>
                  </div>

                  {/* Date Window */}
                  <div className="mt-3 text-[11px] text-slate-500 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {formatDate(exam.startDate, i18n.language)} - {formatDate(exam.endDate, i18n.language)}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Left: Publish / Status action */}
                  {isDraft ? (
                    <button
                      onClick={() => setConfirmAction({ type: 'publish', exam })}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('instructor.exams.publishBtn')}</span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">
                      {t('common.passMark')}: {exam.passingScore}%
                    </span>
                  )}

                  {/* Right: Quick actions */}
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    {/* Edit */}
                    {isDraft && (
                      <button
                        onClick={() => navigate(`/instructor/exams/edit/${exam._id}`)}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(exam)}
                      className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title={t('instructor.exams.duplicateBtn')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Cancel (if published) */}
                    {isPublished && (
                      <button
                        onClick={() => setConfirmAction({ type: 'cancel', exam })}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={t('instructor.exams.cancelBtn')}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete or Archive / Restore Action */}
                    {exam.isArchived ? (
                      <button
                        onClick={() => setConfirmAction({ type: 'restore', exam })}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={isAr ? 'استعادة الامتحان للأرشيف النشط' : 'Restore exam to active list'}
                      >
                        <ArchiveRestore className="w-4 h-4" />
                      </button>
                    ) : isDraft && exam.attemptCount === 0 ? (
                      <button
                        onClick={() => setConfirmAction({ type: 'delete', exam })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ type: 'archive', exam })}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={isAr ? 'أرشفة الامتحان' : 'Archive exam'}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 text-center">
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              confirmAction.type === 'publish'
                ? 'bg-emerald-100 text-emerald-600'
                : confirmAction.type === 'cancel'
                ? 'bg-amber-100 text-amber-600'
                : confirmAction.type === 'archive'
                ? 'bg-purple-100 text-purple-600'
                : confirmAction.type === 'restore'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-rose-100 text-rose-600'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              {confirmAction.type === 'publish'
                ? t('instructor.exams.publishBtn')
                : confirmAction.type === 'cancel'
                ? t('instructor.exams.cancelBtn')
                : confirmAction.type === 'archive'
                ? (isAr ? 'أرشفة الامتحان' : 'Archive Exam')
                : confirmAction.type === 'restore'
                ? (isAr ? 'استعادة الامتحان' : 'Restore Exam')
                : t('instructor.exams.confirmDelete')}
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {confirmAction.type === 'publish'
                ? t('instructor.exams.confirmPublish')
                : confirmAction.type === 'cancel'
                ? t('instructor.exams.confirmCancel')
                : confirmAction.type === 'archive'
                ? (isAr
                    ? 'هل أنت متأكد من رغبتك في أرشفة هذا الامتحان؟ سيتم حفظ جميع النتائج والمحاولات السابقة بأمان والوصول إليها عبر فلتر الأرشيف.'
                    : 'Are you sure you want to archive this exam? All previous attempts, snapshots, and official grades will be preserved and accessible via the archive filter.')
                : confirmAction.type === 'restore'
                ? (isAr
                    ? 'هل أنت متأكد من رغبتك في استعادة هذا الامتحان إلى قائمة الامتحانات النشطة؟'
                    : 'Are you sure you want to restore this exam back to the active list?')
                : t('instructor.exams.confirmDelete')}
            </p>

            <div className="mt-6 flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'publish') handlePublish(confirmAction.exam);
                  else if (confirmAction.type === 'cancel') handleCancel(confirmAction.exam);
                  else if (confirmAction.type === 'archive') handleArchive(confirmAction.exam);
                  else if (confirmAction.type === 'restore') handleRestore(confirmAction.exam);
                  else handleDelete(confirmAction.exam);
                }}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold shadow transition-colors ${
                  confirmAction.type === 'publish'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmAction.type === 'cancel'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmAction.type === 'archive'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : confirmAction.type === 'restore'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
