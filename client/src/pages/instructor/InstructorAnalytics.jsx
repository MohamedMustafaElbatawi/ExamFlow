import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  CheckCircle,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { examService } from '../../services/examService';
import { gradingService } from '../../services/gradingService';
import { ExamReportModal } from './ExamReportModal';

export const InstructorAnalytics = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReportExamId, setActiveReportExamId] = useState(null);

  // Stats across exams
  const [stats, setStats] = useState({
    totalExams: 0,
    publishedExams: 0,
    totalSubmissions: 0,
    avgPassRate: 0,
  });

  useEffect(() => {
    fetchExamsAndStats();
  }, []);

  const fetchExamsAndStats = async () => {
    setLoading(true);
    setError('');
    try {
      const [examsRes, attemptsRes] = await Promise.all([
        examService.getExams(),
        gradingService.getAttempts({ limit: 1000 }),
      ]);

      const examsList = examsRes.exams || [];
      const attemptsList = attemptsRes.attempts || [];

      setExams(examsList);

      const published = examsList.filter((e) => e.status === 'published').length;
      const totalSubs = attemptsList.length;
      const passedSubs = attemptsList.filter((a) => a.isPassed).length;
      const avgRate = totalSubs > 0 ? Math.round((passedSubs / totalSubs) * 100) : 0;

      setStats({
        totalExams: examsList.length,
        publishedExams: published,
        totalSubmissions: totalSubs,
        avgPassRate: avgRate,
      });
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
            <BarChart3 className="w-7 h-7 text-brand-600" />
            <span>{t('instructor.analytics.title')}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('instructor.analytics.subtitle')}
          </p>
        </div>

        <button
          onClick={fetchExamsAndStats}
          className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition self-start sm:self-auto"
          title={t('common.refresh')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">{t('instructor.analytics.totalExams')}</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalExams}</div>
          <span className="text-xs text-brand-600 font-medium">{stats.publishedExams} {t('common.statuses.published')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block">{t('instructor.analytics.totalSubmissions')}</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalSubmissions}</div>
          <span className="text-xs text-slate-400">{t('instructor.grading.kpiTotal')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-xs text-emerald-800 font-semibold block">{t('instructor.analytics.avgPassRate')}</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.avgPassRate}%</div>
          <span className="text-xs text-emerald-600">{t('common.passed')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-sm">
          <span className="text-xs text-purple-800 font-semibold block">{t('common.track')}</span>
          <div className="text-2xl font-bold text-purple-700 mt-1">PMP & MPA</div>
          <span className="text-xs text-purple-600">PMP & MPA</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 bg-white"
          >
            <option value="all">{t('instructor.students.allTracks')}</option>
            <option value="PMP">PMP</option>
            <option value="MPA">MPA</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2.5" />
          <input
            type="text"
            placeholder={t('instructor.analytics.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Exam Analytics List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{t('instructor.analytics.examBreakdownTitle')}</h2>
          <span className="text-xs text-slate-400 font-medium">{t('instructor.analytics.subtitle')}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs text-slate-500">{t('common.loading')}</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            {t('common.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">{t('instructor.analytics.colExam')}</th>
                  <th className="px-6 py-3.5">{t('instructor.analytics.colCourse')}</th>
                  <th className="px-6 py-3.5">{t('instructor.analytics.colStatus')}</th>
                  <th className="px-6 py-3.5 text-center">{t('common.duration')}</th>
                  <th className="px-6 py-3.5 text-center">{t('common.passMark')}</th>
                  <th className="px-6 py-3.5 text-center">{t('common.total')}</th>
                  <th className="px-6 py-3.5 text-right rtl:text-left">{t('instructor.analytics.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((ex) => (
                  <tr key={ex._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div>{ex.title}</div>
                      <span className="text-xs text-slate-400 font-normal">
                        {ex.questions?.length || ex.questionSnapshots?.length || 0} {t('common.questions')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                        {ex.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          ex.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ex.status === 'draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t(`common.statuses.${ex.status}`, ex.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-slate-600">
                      {ex.durationMinutes} {t('common.minutes')}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-800">
                      {ex.passingScore}%
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-800">
                      {ex.totalMarks} {t('common.points')}
                    </td>
                    <td className="px-6 py-4 text-right rtl:text-left">
                      <button
                        onClick={() => setActiveReportExamId(ex._id)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('instructor.analytics.viewReport')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Exam Report Modal */}
      {activeReportExamId && (
        <ExamReportModal
          examId={activeReportExamId}
          onClose={() => setActiveReportExamId(null)}
        />
      )}
    </div>
  );
};
