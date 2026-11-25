import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  BarChart3,
  Users,
  Award,
  CheckCircle,
  XCircle,
  TrendingUp,
  Percent,
  HelpCircle,
} from 'lucide-react';
import { gradingService } from '../../services/gradingService';

export const ExamReportModal = ({ examId, onClose }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, [examId]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gradingService.getExamReport(examId);
      setData(res.report);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <h3 className="font-bold text-lg text-red-600 mb-2">{t('common.error')}</h3>
          <p className="text-slate-600 mb-6">{error || t('common.noData')}</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  const { exam, overview, questionAnalytics } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <BarChart3 className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold">{t('instructor.analytics.modalTitle')}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {exam.title} • {t('common.track')}: <span className="text-white font-medium">{exam.category}</span> • {t('common.passMark')}: {exam.passingScore}% • {t('instructor.builder.totalMarksSum')} {exam.totalMarks}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-semibold block">{t('common.statuses.completed')}</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {overview.completedCount}
                <span className="text-xs text-slate-400 font-normal ml-1 rtl:mr-1">/ {overview.assignedCount}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-semibold block">{t('instructor.analytics.colAvgScore')}</span>
              <div className="text-2xl font-bold text-brand-600 mt-1">
                {overview.averagePercentage}%
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-semibold block">{t('instructor.analytics.avgPassRate')}</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {overview.passRate}%
                <span className="text-xs text-slate-400 font-normal ml-1 rtl:mr-1">
                  ({overview.passCount} {t('common.passed')} / {overview.failCount} {t('common.failed')})
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <span className="text-xs text-slate-500 font-semibold block">{t('instructor.analytics.scoreDistribution')}</span>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {overview.highestScore}%
                <span className="text-xs text-slate-400 font-normal ml-1 rtl:mr-1">/ {overview.lowestScore}%</span>
              </div>
            </div>
          </div>

          {/* Pass / Fail Visual Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span>{t('instructor.analytics.avgPassRate')}</span>
              <span>{overview.passRate}%</span>
            </div>
            <div className="w-full bg-red-200 h-3.5 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${overview.passRate}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-medium">
              <span className="text-emerald-700">✓ {t('common.passed')}: {overview.passCount}</span>
              <span className="text-red-700">✗ {t('common.failed')}: {overview.failCount}</span>
            </div>
          </div>

          {/* Question Breakdown Table */}
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center space-x-2 rtl:space-x-reverse">
              <HelpCircle className="w-5 h-5 text-slate-600" />
              <span>{t('instructor.analytics.questionAnalyticsTitle')}</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left rtl:text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">{t('instructor.analytics.colQuestion')}</th>
                    <th className="px-4 py-3">{t('instructor.questions.colTopic')}</th>
                    <th className="px-4 py-3">{t('instructor.questions.colType')}</th>
                    <th className="px-4 py-3 text-center">{t('instructor.analytics.colAttempts')}</th>
                    <th className="px-4 py-3 text-center">{t('instructor.analytics.colCorrect')}</th>
                    <th className="px-4 py-3 text-right rtl:text-left">{t('common.score')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {questionAnalytics.map((q) => {
                    const textDisplay = isAr ? q.textAr || q.textEn : q.textEn || q.textAr || `Question ${q.questionIndex}`;
                    const isHard = q.successRate < 50;
                    const isEasy = q.successRate >= 80;

                    return (
                      <tr key={q.snapshotId} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-bold text-slate-700">Q{q.questionIndex}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate font-medium text-slate-800" title={textDisplay}>
                            {textDisplay}
                          </p>
                          <span className="text-[11px] text-slate-400">{q.code || 'Snapshot'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-slate-700">{q.topic}</div>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {t(`common.difficulties.${q.difficulty}`, q.difficulty)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600">
                          {t(`common.questionTypes.${q.type}`, q.type.replace('_', ' '))}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-slate-700">
                          {q.answeredCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                isEasy
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isHard
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {q.successRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right rtl:text-left text-xs font-bold text-slate-900">
                          {q.averageMarksAwarded} / {q.marks} {t('common.points')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
