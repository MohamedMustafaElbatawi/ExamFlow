import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  Clock,
  Award,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Search,
  Filter,
  Eye,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { engineService } from '../../services/engineService';
import { formatDate } from '../../utils/formatters';

export const AvailableExams = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'in_progress' | 'completed' | 'archived' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' | 'PMP' | 'MPA'

  // Confirmation Modal for Hiding
  const [confirmHideExam, setConfirmHideExam] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await engineService.getAvailableExams();
      if (res.success) {
        setExams(res.exams);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle student personal hide / archive
  const handleHideExam = async (exam) => {
    if (exam.statusLabel === 'in_progress' || !!exam.activeAttemptId) {
      setError(isAr ? 'لا يمكن إخفاء اختبار قيد التنفيذ حالياً' : 'Cannot hide an exam while attempt is active');
      return;
    }

    setActionLoadingId(exam._id);
    try {
      const res = await engineService.hideExam(exam._id);
      if (res.success) {
        showToast(
          isAr
            ? `تم إخفاء الاختبار "${exam.title}" من قائمتك. يمكنك استعادته في أي وقت من تبويب المؤرشفة.`
            : `Exam "${exam.title}" hidden from your list. You can restore it anytime from the Archived tab.`
        );
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoadingId(null);
      setConfirmHideExam(null);
    }
  };

  // Handle student restore from archive
  const handleRestoreExam = async (exam) => {
    setActionLoadingId(exam._id);
    try {
      const res = await engineService.restoreExam(exam._id);
      if (res.success) {
        showToast(
          isAr
            ? `تمت استعادة الاختبار "${exam.title}" إلى قائمتك بنجاح.`
            : `Exam "${exam.title}" restored to your active list.`
        );
        fetchExams();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Tab counts
  const nonArchivedExams = exams.filter((e) => !e.isStudentArchived);
  const availableCount = nonArchivedExams.filter(
    (e) =>
      e.statusLabel !== 'in_progress' &&
      !e.activeAttemptId &&
      e.remainingAttempts > 0 &&
      e.statusLabel !== 'completed' &&
      e.statusLabel !== 'expired'
  ).length;

  const inProgressCount = nonArchivedExams.filter(
    (e) => e.statusLabel === 'in_progress' || !!e.activeAttemptId
  ).length;

  const completedCount = nonArchivedExams.filter(
    (e) => e.statusLabel === 'completed' || e.attemptsCount > 0
  ).length;

  const archivedCount = exams.filter((e) => e.isStudentArchived).length;
  const allCount = nonArchivedExams.length;

  // Filter exams according to activeTab, search, and course
  const filteredExams = exams.filter((exam) => {
    const hasActiveAttempt = exam.statusLabel === 'in_progress' || !!exam.activeAttemptId;
    const isArchived = !!exam.isStudentArchived;
    const isCompleted = exam.statusLabel === 'completed' || (exam.remainingAttempts === 0 && exam.attemptsCount > 0);

    // 1. Tab filter
    if (activeTab === 'archived') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;

      if (activeTab === 'available') {
        // Unstarted eligible exams, or ongoing with attempts remaining, strictly NOT completed and NOT in-progress
        if (hasActiveAttempt) return false;
        if (isCompleted) return false;
        if (exam.statusLabel === 'expired') return false;
        if (exam.remainingAttempts <= 0) return false;
      } else if (activeTab === 'in_progress') {
        if (!hasActiveAttempt) return false;
      } else if (activeTab === 'completed') {
        if (!isCompleted && exam.attemptsCount === 0) return false;
      }
    }

    // 2. Course filter
    if (courseFilter !== 'all' && exam.category !== courseFilter) {
      return false;
    }

    // 3. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const titleMatch = exam.title?.toLowerCase().includes(q);
      const descMatch = exam.description?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {t('student.exams.title')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('student.exams.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={fetchExams} className="font-bold underline hover:text-red-900">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Tabs & Search Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 rtl:space-x-reverse overflow-x-auto border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 rtl:space-x-reverse whitespace-nowrap ${
              activeTab === 'available'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'المتاحة' : 'Available'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-slate-200 text-slate-700 font-bold">
              {availableCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 rtl:space-x-reverse whitespace-nowrap ${
              activeTab === 'in_progress'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'قيد التنفيذ' : 'In Progress'}</span>
            {inProgressCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold animate-pulse">
                {inProgressCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 rtl:space-x-reverse whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'المكتملة' : 'Completed'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-slate-200 text-slate-700 font-bold">
              {completedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 rtl:space-x-reverse whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{isAr ? 'جميع الاختبارات' : 'All'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-slate-200 text-slate-700 font-bold">
              {allCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 rtl:space-x-reverse whitespace-nowrap ${
              activeTab === 'archived'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isAr ? 'المؤرشفة / المخفية' : 'Archived'}</span>
            {archivedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Bar (Search + Course Filter) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute top-2.5 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث في الاختبارات بالعنوان أو الوصف...' : 'Search exams by title or description...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="all">{isAr ? 'جميع المسارات (PMP / MPA)' : 'All Courses'}</option>
              <option value="PMP">PMP</option>
              <option value="MPA">MPA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
          <span className="text-xs">{t('common.loading')}</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">
            {activeTab === 'archived'
              ? (isAr ? 'لا توجد اختبارات مؤرشفة لديك.' : 'No archived exams in your list.')
              : activeTab === 'in_progress'
              ? (isAr ? 'لا توجد اختبارات قيد التنفيذ حالياً.' : 'No active exams in progress.')
              : activeTab === 'completed'
              ? (isAr ? 'لا توجد اختبارات مكتملة حتى الآن.' : 'No completed exams yet.')
              : t('student.exams.noExams')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'available'
              ? (isAr ? 'جميع الاختبارات المتاحة ستظهر هنا عند فتحها.' : 'Any newly available exams will appear here.')
              : null}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((exam) => {
            const hasActiveAttempt = exam.statusLabel === 'in_progress' || !!exam.activeAttemptId;
            const isArchived = !!exam.isStudentArchived;
            const isCompleted = exam.statusLabel === 'completed' || (exam.remainingAttempts === 0 && exam.attemptsCount > 0);

            return (
              <div
                key={exam._id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Category, Status Badge & Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                        {exam.category}
                      </span>

                      {hasActiveAttempt ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse flex items-center space-x-1 rtl:space-x-reverse">
                          <RotateCcw className="w-3 h-3" />
                          <span>{t('student.exams.resumeExam')}</span>
                        </span>
                      ) : isCompleted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center space-x-1 rtl:space-x-reverse">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('common.statuses.completed')}</span>
                        </span>
                      ) : exam.statusLabel === 'open' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1 rtl:space-x-reverse">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('common.statuses.open')}</span>
                        </span>
                      ) : exam.statusLabel === 'upcoming' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {t('common.statuses.upcoming')}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          {t('common.statuses.expired')}
                        </span>
                      )}
                    </div>

                    {/* Personal Hide / Archive / Restore action */}
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      {isArchived ? (
                        <button
                          onClick={() => handleRestoreExam(exam)}
                          disabled={actionLoadingId === exam._id}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center space-x-1 rtl:space-x-reverse transition disabled:opacity-50"
                          title={isAr ? 'استعادة الاختبار إلى قائمتك النشطة' : 'Restore exam to your active list'}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span>{isAr ? 'استعادة' : 'Restore'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (hasActiveAttempt) return;
                            setConfirmHideExam(exam);
                          }}
                          disabled={hasActiveAttempt || actionLoadingId === exam._id}
                          className={`p-1.5 rounded-lg text-slate-400 transition ${
                            hasActiveAttempt
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:text-purple-600 hover:bg-purple-50'
                          }`}
                          title={
                            hasActiveAttempt
                              ? (isAr ? 'لا يمكن إخفاء اختبار قيد التنفيذ' : 'Cannot hide an exam while attempt is active')
                              : (isAr ? 'إخفاء أو أرشفة الاختبار من قائمتك' : 'Hide or archive exam from your list')
                          }
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{exam.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {exam.description || (isAr ? 'لا يوجد وصف إضافي.' : 'No additional description.')}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>{exam.durationMinutes} {t('common.minutes')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      <span>{t('common.passMark')}: {exam.passingScore}%</span>
                    </div>
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t('instructor.students.colAttempts')}: {exam.attemptsCount}/{exam.maxAttempts}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{formatDate(exam.endDate, i18n.language)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {exam.recentScore !== null ? (
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <span className="text-xs font-semibold text-slate-700">
                        {isAr ? `النتيجة المعتمدة: ${exam.recentScore}%` : `Official Score: ${exam.recentScore}%`}
                      </span>
                      {exam.isPassed !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exam.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {exam.isPassed ? t('common.passed') : t('common.failed')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {t('student.exams.attemptsLeft')} {exam.remainingAttempts}
                    </span>
                  )}

                  {exam.canStart && !isArchived ? (
                    <button
                      onClick={() => {
                        if (hasActiveAttempt) {
                          navigate(`/student/exam/${exam._id}/live`);
                        } else {
                          navigate(`/student/exam/${exam._id}/instructions`);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow transition-colors flex items-center space-x-1.5 rtl:space-x-reverse ${
                        hasActiveAttempt
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-brand-600 hover:bg-brand-700'
                      }`}
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{hasActiveAttempt ? t('student.exams.resumeExam') : t('student.exams.startExam')}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </button>
                  ) : isCompleted && exam.recentScore !== null ? (
                    <button
                      onClick={() => navigate('/student/results')}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse transition shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'عرض النتيجة' : 'View Results'}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      {isArchived
                        ? (isAr ? 'مؤرشف لديك' : 'Archived in your list')
                        : isCompleted
                        ? (isAr ? 'تم استنفاد المحاولات' : 'Attempts Completed')
                        : (isAr ? 'غير متاح حالياً' : 'Not Available')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Personal Hide/Archive */}
      {confirmHideExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 rtl:space-x-reverse text-purple-700 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Archive className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? 'أرشفة / إخفاء الاختبار' : 'Archive / Hide Exam'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {isAr
                ? `هل أنت متأكد من رغبتك في إخفاء "${confirmHideExam.title}" من قائمتك؟ هذا الإجراء لا يحذف أي درجات أو محاولات سابقة، ويمكنك استعادة الاختبار في أي وقت من تبويب "المؤرشفة".`
                : `Are you sure you want to hide "${confirmHideExam.title}" from your active list? This only affects your personal view and does not delete your previous attempts or grades. You can restore it anytime from the Archived tab.`}
            </p>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => setConfirmHideExam(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleHideExam(confirmHideExam)}
                disabled={actionLoadingId === confirmHideExam._id}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center space-x-1 rtl:space-x-reverse shadow"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isAr ? 'نعم، قم بالأرشفة' : 'Yes, Archive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
