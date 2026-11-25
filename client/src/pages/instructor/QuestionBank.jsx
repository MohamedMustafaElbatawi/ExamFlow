import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  PlusCircle,
  FileUp,
  Search,
  Filter,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileSpreadsheet,
  Loader2,
  X,
  ShieldAlert,
} from 'lucide-react';
import { questionService } from '../../services/questionService';
import { QuestionEditorModal } from '../../components/questions/QuestionEditorModal';
import { QuestionPreviewModal } from '../../components/questions/QuestionPreviewModal';

export const QuestionBank = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // State
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [qRes, statsRes, topicsRes] = await Promise.all([
        questionService.getQuestions({
          search,
          category: categoryFilter,
          type: typeFilter,
          difficulty: difficultyFilter,
          topic: topicFilter,
          status: statusFilter,
          page,
          limit: 15,
        }),
        questionService.getStats(),
        questionService.getTopics(categoryFilter === 'all' ? '' : categoryFilter),
      ]);

      if (qRes.success) {
        setQuestions(qRes.questions);
        setTotalPages(qRes.totalPages);
        setTotalQuestions(qRes.total);
      }
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
      if (topicsRes.success) {
        setTopics(topicsRes.topics);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل تحميل بنك الأسئلة' : 'Failed to fetch questions'));
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, typeFilter, difficultyFilter, topicFilter, statusFilter, page, isAr]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(questions.map((q) => q._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Archive / Restore single
  const handleToggleArchive = async (question) => {
    try {
      const res = await questionService.toggleArchive(question._id);
      if (res.success) {
        showToast(
          isAr
            ? `تم ${res.isArchived ? 'أرشفة' : 'استعادة'} السؤال بنجاح`
            : `Question ${res.isArchived ? 'archived' : 'restored'} successfully`
        );
        fetchQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  // Bulk Archive
  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await questionService.bulkArchive(selectedIds);
      if (res.success) {
        showToast(
          isAr
            ? `تمت أرشفة ${res.modifiedCount} سؤال بنجاح`
            : `Successfully archived ${res.modifiedCount} questions`
        );
        setSelectedIds([]);
        fetchQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    }
  };

  // Delete question handler
  const handleDelete = async (question) => {
    try {
      const res = await questionService.deleteQuestion(question._id);
      if (res.success) {
        showToast(res.message);
        fetchQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 rtl:space-x-reverse border border-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {t('instructor.questions.title')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('instructor.questions.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Import Button */}
          <button
            onClick={() => navigate('/instructor/import')}
            className="flex items-center space-x-1.5 rtl:space-x-reverse bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <FileUp className="w-4 h-4 text-brand-600" />
            <span>{t('instructor.dashboard.importQuestions')}</span>
          </button>

          {/* Add Question Button */}
          <button
            onClick={() => {
              setSelectedQuestion(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center space-x-2 rtl:space-x-reverse bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('instructor.questions.addQuestionBtn')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.questions.totalQuestions')}</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{stats?.total ?? totalQuestions}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.questions.pmpCount')}</span>
          <h3 className="text-xl font-bold text-blue-600 mt-1">{stats?.pmpCount ?? 0}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.questions.mpaCount')}</span>
          <h3 className="text-xl font-bold text-purple-600 mt-1">{stats?.mpaCount ?? 0}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.questions.archivedCount')}</span>
          <h3 className="text-xl font-bold text-amber-600 mt-1">{stats?.archivedCount ?? 0}</h3>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-3 left-3 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('instructor.questions.searchPlaceholder')}
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

          {/* Quick Refresh */}
          <button
            onClick={fetchQuestions}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors self-end md:self-auto"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* Course Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">{t('instructor.exams.allCategories')}</option>
            <option value="PMP">PMP</option>
            <option value="MPA">MPA</option>
          </select>

          {/* Question Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">{t('instructor.questions.allTypes')}</option>
            <option value="single_choice">{t('common.questionTypes.single_choice')}</option>
            <option value="multiple_choice">{t('common.questionTypes.multiple_choice')}</option>
            <option value="true_false">{t('common.questionTypes.true_false')}</option>
            <option value="essay">{t('common.questionTypes.essay')}</option>
          </select>

          {/* Difficulty */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">{t('instructor.questions.allDifficulties')}</option>
            <option value="easy">{t('common.difficulties.easy')}</option>
            <option value="medium">{t('common.difficulties.medium')}</option>
            <option value="hard">{t('common.difficulties.hard')}</option>
          </select>

          {/* Topic Filter */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white max-w-xs"
          >
            <option value="all">{t('instructor.questions.allTopics')}</option>
            {topics.map((top) => (
              <option key={top} value={top}>{top}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white"
          >
            <option value="active">{t('common.statuses.active')}</option>
            <option value="archived">{t('instructor.questions.archivedCount')}</option>
            <option value="all">{t('common.all')}</option>
          </select>

          {/* Bulk Action Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkArchive}
              className="ml-auto rtl:ml-0 rtl:mr-auto flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {t('instructor.questions.bulkArchive')} ({selectedIds.length})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs">
          <span>{error}</span>
          <button onClick={fetchQuestions} className="font-bold underline hover:text-red-900">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={questions.length > 0 && selectedIds.length === questions.length}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="px-4 py-3">{t('instructor.questions.colStatement')}</th>
                <th className="px-4 py-3">{t('instructor.exams.colCategory')}</th>
                <th className="px-4 py-3">{t('instructor.questions.colTopic')}</th>
                <th className="px-4 py-3">{t('instructor.questions.colType')}</th>
                <th className="px-4 py-3">{t('instructor.questions.colDifficulty')}</th>
                <th className="px-4 py-3">{t('instructor.questions.colMarks')}</th>
                <th className="px-4 py-3 text-center">{t('instructor.questions.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-14 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    <span>{t('common.loading')}</span>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-14 text-center text-slate-400">
                    <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">
                      {t('common.noData')}
                    </p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const displayText = isAr
                    ? q.text?.ar || q.text?.en
                    : q.text?.en || q.text?.ar;
                  const isSelected = selectedIds.includes(q._id);

                  return (
                    <tr
                      key={q._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-brand-50/40' : ''
                      } ${q.isArchived ? 'opacity-60 bg-slate-50/50' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(q._id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      {/* Code & Text Statement */}
                      <td className="px-4 py-3 max-w-sm sm:max-w-md">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            {q.code}
                          </span>
                          {q.isArchived && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                              {t('instructor.questions.archivedCount')}
                            </span>
                          )}
                          {q.image && (
                            <span className="text-[10px] text-brand-600 font-semibold flex items-center space-x-0.5 rtl:space-x-reverse">
                              <span>📷</span>
                              <span>{t('instructor.questions.imageUpload')}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                          {displayText}
                        </p>
                      </td>

                      {/* Course */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          q.category === 'PMP'
                            ? 'bg-blue-100 text-blue-800'
                            : q.category === 'MPA'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {q.category}
                        </span>
                      </td>

                      {/* Topic */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                        {q.topic}
                      </td>

                      {/* Question Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                          {t(`common.questionTypes.${q.type}`, q.type.replace('_', ' '))}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.difficulty === 'hard'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {t(`common.difficulties.${q.difficulty}`, q.difficulty)}
                        </span>
                      </td>

                      {/* Marks */}
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                        {q.marks}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1 rtl:space-x-reverse">
                          {/* Preview Question */}
                          <button
                            onClick={() => {
                              setSelectedQuestion(q);
                              setIsPreviewOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t('instructor.questions.previewQuestion')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Question */}
                          <button
                            onClick={() => {
                              setSelectedQuestion(q);
                              setIsEditorOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t('instructor.questions.editQuestion')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Toggle Archive */}
                          <button
                            onClick={() => handleToggleArchive(q)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              q.isArchived
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-500 hover:bg-amber-50'
                            }`}
                            title={q.isArchived ? t('instructor.questions.restoreQuestion') : t('instructor.questions.archiveQuestion')}
                          >
                            {q.isArchived ? (
                              <ArchiveRestore className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmDelete(q)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages} ({t('common.total')}: {totalQuestions})
            </span>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 font-medium"
              >
                {t('common.previous')}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 font-medium"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('instructor.questions.deleteConfirm')}
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف السؤال "${confirmDelete.code}"؟ إذا كان السؤال مستخدماً في أي اختبار حالي أو سابق، سيتم أرشفته تلقائياً للحفاظ على سلامة الامتحانات.`
                : `Are you sure you want to delete question "${confirmDelete.code}"? If this question is already referenced in any active or past exam, it will be automatically archived instead to safeguard exam integrity.`}
            </p>
            <div className="mt-6 flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        question={selectedQuestion}
        onSuccess={(msg) => {
          showToast(msg);
          fetchQuestions();
        }}
      />

      {/* Preview Modal */}
      <QuestionPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        question={selectedQuestion}
      />
    </div>
  );
};
