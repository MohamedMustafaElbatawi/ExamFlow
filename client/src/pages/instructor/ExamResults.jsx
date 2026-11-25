import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Send,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { gradingService } from '../../services/gradingService';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { AttemptReviewModal } from './AttemptReviewModal';
import { ExamReportModal } from './ExamReportModal';
import { formatDateTime } from '../../utils/formatters';

export const ExamResults = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingGrading: 0,
    readyForApproval: 0,
    approved: 0,
    published: 0,
  });
  const [examsList, setExamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Modals
  const [activeReviewAttemptId, setActiveReviewAttemptId] = useState(null);
  const [activeReportExamId, setActiveReportExamId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchExamsList();
    fetchStudentsList();
  }, []);

  useEffect(() => {
    fetchAttempts();
  }, [selectedExamId, selectedStudentId, categoryFilter, statusFilter, page]);

  const fetchExamsList = async () => {
    try {
      const res = await examService.getExams({ limit: 100 });
      setExamsList(res.exams || []);
    } catch (err) {
      console.error('Failed to load exams dropdown', err);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await studentService.getStudents({ limit: 100 });
      setStudentsList(res.students || []);
    } catch (err) {
      console.error('Failed to load students dropdown', err);
    }
  };

  const fetchAttempts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gradingService.getAttempts({
        examId: selectedExamId || undefined,
        studentId: selectedStudentId || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        gradingStatus: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        page,
        limit: 20,
      });

      setAttempts(res.attempts || []);
      setStats(res.stats || {});
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAttempts();
  };

  const handlePublishAllForExam = async () => {
    if (!selectedExamId) return;
    const confirm = window.confirm(
      isAr
        ? 'هل أنت متأكد من رغبتك في اعتماد ونشر كافة النتائج الجاهزة لهذا الامتحان؟ سيتلقى الطلاب إشعارات بالنتائج.'
        : 'Are you sure you want to approve and publish all ready results for this exam? Enrolled students will receive notifications.'
    );
    if (!confirm) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await gradingService.publishExamResults(selectedExamId);
      setSuccessMsg(res.message);
      fetchAttempts();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminders = async () => {
    if (!selectedExamId) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await gradingService.sendExamReminders(selectedExamId);
      setSuccessMsg(res.message);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_grading':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {t('common.statuses.pending_grading')}
          </span>
        );
      case 'ready_for_approval':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            {t('common.statuses.ready_for_approval')}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            {t('common.statuses.approved')}
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {t('common.statuses.published')}
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
            <GraduationCap className="w-7 h-7 text-brand-600" />
            <span>{t('instructor.grading.title')}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('instructor.grading.subtitle')}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {selectedExamId && (
            <>
              <button
                onClick={() => setActiveReportExamId(selectedExamId)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t('instructor.grading.analyticsBtn')}</span>
              </button>

              <button
                onClick={handleSendReminders}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition disabled:opacity-50"
              >
                <Bell className="w-4 h-4" />
                <span>{t('instructor.grading.remindBtn')}</span>
              </button>

              <button
                onClick={handlePublishAllForExam}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{t('instructor.grading.publishAllBtn')}</span>
              </button>
            </>
          )}

          <button
            onClick={fetchAttempts}
            className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">{t('instructor.grading.kpiTotal')}</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <span className="text-xs text-amber-700 font-semibold block">{t('instructor.grading.kpiPending')}</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingGrading || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <span className="text-xs text-blue-700 font-semibold block">{t('instructor.grading.kpiReady')}</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.readyForApproval || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
          <span className="text-xs text-purple-700 font-semibold block">{t('instructor.grading.kpiApproved')}</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.approved || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold block">{t('instructor.grading.kpiPublished')}</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.published || 0}</div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Exam Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">{t('instructor.grading.filterExam')}</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 font-medium bg-white"
            >
              <option value="">{t('instructor.grading.allExams')}</option>
              {examsList.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.title} ({ex.category})
                </option>
              ))}
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">{isAr ? 'تصفية بالطالب' : 'Filter by Student'}</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 font-medium bg-white"
            >
              <option value="">{isAr ? 'جميع الطلاب' : 'All Students'}</option>
              {studentsList.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name} ({st.email})
                </option>
              ))}
            </select>
          </div>

          {/* Track Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">{t('instructor.students.filterTrack')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 font-medium bg-white"
            >
              <option value="all">{t('instructor.students.allTracks')}</option>
              <option value="PMP">PMP</option>
              <option value="MPA">MPA</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">{t('instructor.grading.filterStatus')}</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 font-medium bg-white"
            >
              <option value="all">{t('instructor.students.allStatuses')}</option>
              <option value="pending_grading">{t('common.statuses.pending_grading')}</option>
              <option value="ready_for_approval">{t('common.statuses.ready_for_approval')}</option>
              <option value="approved">{t('common.statuses.approved')}</option>
              <option value="published">{t('common.statuses.published')}</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">{t('common.search')}</label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder={t('instructor.students.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2.5" />
            </form>
          </div>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">{t('common.loading')}</p>
          </div>
        ) : attempts.length === 0 ? (
          <div className="py-16 text-center">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">{t('common.noData')}</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                <tr>
                  <th className="px-5 py-3">{t('instructor.grading.studentCol')}</th>
                  <th className="px-5 py-3">{t('instructor.grading.examCol')}</th>
                  <th className="px-5 py-3 text-center">{t('instructor.grading.attemptCol')}</th>
                  <th className="px-5 py-3">{t('instructor.grading.submittedCol')}</th>
                  <th className="px-5 py-3 text-center">{t('instructor.grading.scoreCol')}</th>
                  <th className="px-5 py-3 text-center">{t('common.status')}</th>
                  <th className="px-5 py-3 text-center">{t('instructor.grading.statusCol')}</th>
                  <th className="px-5 py-3 text-right rtl:text-left">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((att) => (
                  <tr key={att._id} className="hover:bg-slate-50/70 transition">
                    {/* Student */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{att.student?.name}</div>
                      <div className="text-xs text-slate-500">{att.student?.email}</div>
                    </td>

                    {/* Exam */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800 max-w-xs truncate" title={att.exam?.title}>
                        {att.exam?.title}
                      </div>
                      <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        {att.exam?.category}
                      </span>
                    </td>

                    {/* Attempt */}
                    <td className="px-5 py-3.5 text-center font-bold text-xs text-slate-700">
                      #{att.attemptNumber}
                    </td>

                    {/* Submitted At */}
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {att.submittedAt ? formatDateTime(att.submittedAt, i18n.language) : t('common.statuses.in_progress')}
                    </td>

                    {/* Score */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="font-bold text-slate-900">{att.percentage}%</div>
                      <span className="text-[11px] text-slate-400">
                        {att.totalScore} / {att.maxScore} {t('common.points')}
                      </span>
                    </td>

                    {/* Result */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          att.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {att.isPassed ? t('common.passed') : t('common.failed')}
                      </span>
                    </td>

                    {/* Grading Status */}
                    <td className="px-5 py-3.5 text-center">{getStatusBadge(att.gradingStatus)}</td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right rtl:text-left">
                      <button
                        onClick={() => setActiveReviewAttemptId(att._id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition inline-flex items-center space-x-1 rtl:space-x-reverse shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('instructor.grading.reviewAttempt')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              {t('common.pagination.showing')} {(page - 1) * pagination.limit + 1} {t('common.pagination.to')}{' '}
              {Math.min(page * pagination.limit, pagination.total)} {t('common.pagination.of')} {pagination.total} {t('common.pagination.records')}
            </span>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
              <span className="px-2 font-bold">
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Grading Modal */}
      {activeReviewAttemptId && (
        <AttemptReviewModal
          attemptId={activeReviewAttemptId}
          onClose={() => setActiveReviewAttemptId(null)}
          onUpdated={fetchAttempts}
        />
      )}

      {/* Analytics Report Modal */}
      {activeReportExamId && (
        <ExamReportModal
          examId={activeReportExamId}
          onClose={() => setActiveReportExamId(null)}
        />
      )}
    </div>
  );
};
