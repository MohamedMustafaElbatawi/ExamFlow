import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileCheck,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { engineService } from '../../services/engineService';
import { ExamReviewModal } from './ExamReviewModal';
import { formatDateTime, formatDate, formatNumber } from '../../utils/formatters';

export const StudentResults = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReviewAttemptId, setActiveReviewAttemptId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await engineService.getStudentResults();
      setResults(res.results || []);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  // KPI calculations
  const totalCompleted = results.length;
  const passedCount = results.filter((r) => r.isPassed).length;
  const avgPercentage =
    totalCompleted > 0
      ? Math.round(results.reduce((acc, r) => acc + (r.percentage || 0), 0) / totalCompleted)
      : 0;

  // Filtered results
  const filteredResults = results.filter((r) => {
    if (courseFilter !== 'all' && r.exam?.category !== courseFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const titleMatch = r.exam?.title?.toLowerCase().includes(q);
      if (!titleMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
          <Award className="w-7 h-7 text-brand-600" />
          <span>{t('student.results.title')}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('student.results.subtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 rtl:space-x-reverse">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">{t('student.results.kpiCompleted')}</span>
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(totalCompleted, i18n.language)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm flex items-center space-x-4 rtl:space-x-reverse">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-emerald-700 font-medium block">{t('student.results.kpiPassed')}</span>
            <div className="text-2xl font-bold text-emerald-700">
              {formatNumber(passedCount, i18n.language)}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({formatNumber(totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0, i18n.language)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 rtl:space-x-reverse">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">{t('student.results.kpiAvg')}</span>
            <div className="text-2xl font-bold text-purple-700">
              {formatNumber(avgPercentage, i18n.language)}%
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center space-x-2 rtl:space-x-reverse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-2.5 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
          <input
            type="text"
            placeholder={isAr ? 'بحث في النتائج باسم الامتحان...' : 'Search results by exam title...'}
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

      {/* Results List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{t('student.results.officialRecords')}</h2>

        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">{t('student.results.retrieving')}</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">{t('student.results.noResultsYet')}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {t('student.results.noResultsYetDesc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredResults.map((att) => {
              const allowReview = att.allowReviewAnswers;
              const hasEssay = att.essayQuestionsCount > 0;

              return (
                <div
                  key={att._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2.5 flex-1">
                    {/* Header line: Course badge, Title, Attempt # */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                        {att.exam?.category || 'PMP'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{att.exam?.title}</h3>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {t('student.results.attemptNum', { num: formatNumber(att.attemptNumber, i18n.language) })}
                      </span>
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                        ✓ {isAr ? 'معتمد ومنشور' : 'Official & Published'}
                      </span>
                    </div>

                    {/* Metadata & Timestamp */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(att.submittedAt, i18n.language)}</span>
                      </span>
                      <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {t('student.results.duration', {
                            mins: formatNumber(att.exam?.durationMinutes || 60, i18n.language),
                          })}
                        </span>
                      </span>
                      <span>
                        {t('common.passMark')}: {formatNumber(att.exam?.passingScore || 70, i18n.language)}%
                      </span>
                    </div>

                    {/* Performance Chips: Correct / Incorrect / Essay status */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {typeof att.correctAnswersCount === 'number' && (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{isAr ? `إجابات صحيحة: ${att.correctAnswersCount}` : `Correct: ${att.correctAnswersCount}`}</span>
                        </span>
                      )}

                      {typeof att.incorrectAnswersCount === 'number' && (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>{isAr ? `إجابات خاطئة: ${att.incorrectAnswersCount}` : `Incorrect: ${att.incorrectAnswersCount}`}</span>
                        </span>
                      )}

                      {hasEssay && (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>{isAr ? 'تم تقييم الأسئلة المقالية' : 'Essay Questions Evaluated'}</span>
                        </span>
                      )}
                    </div>

                    {/* Instructor Feedback banner */}
                    {att.instructorFeedback && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start space-x-2.5 rtl:space-x-reverse">
                        <MessageSquare className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-800">{t('student.results.instructorNote')}: </span>
                          <span className="leading-relaxed">{att.instructorFeedback}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Score & Review Action Column */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-4 flex-shrink-0">
                    <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                      <div className="text-right rtl:text-left">
                        <div className="text-2xl font-black text-slate-900 leading-tight">
                          {formatNumber(att.percentage, i18n.language)}%
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatNumber(att.totalScore, i18n.language)} / {formatNumber(att.maxScore, i18n.language)} {t('student.results.pts')}
                        </div>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          att.isPassed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {att.isPassed ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveReviewAttemptId(att._id)}
                      className="px-4 py-2 bg-slate-900 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{allowReview ? (isAr ? 'مراجعة الإجابات والنتائج' : 'Review Result & Answers') : (isAr ? 'ملخص النتيجة' : 'Review Summary')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {activeReviewAttemptId && (
        <ExamReviewModal
          attemptId={activeReviewAttemptId}
          onClose={() => setActiveReviewAttemptId(null)}
        />
      )}
    </div>
  );
};
