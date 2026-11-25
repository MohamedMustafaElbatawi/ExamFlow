import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  User,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { formatDate } from '../../utils/formatters';

export const StudentDetailsModal = ({ isOpen, onClose, studentId }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && studentId) {
      fetchDetails();
    }
  }, [isOpen, studentId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentService.getStudentById(studentId);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const student = data?.student;
  const summary = data?.performanceSummary;
  const attempts = data?.attempts || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center border border-brand-400/30 font-bold text-lg">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {student?.name || t('instructor.students.detailsModalTitle')}
              </h3>
              <p className="text-xs text-slate-400">{student?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-xs text-slate-500">{t('common.loading')}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-sm rtl:space-x-reverse">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!loading && student && (
            <>
              {/* Profile Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">{t('instructor.students.colTrack')}</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 inline-block px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                    {student.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{t('instructor.students.colStatus')}</span>
                  <span className={`font-semibold text-xs mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full ${
                    student.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : student.status === 'suspended'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {student.status === 'active'
                      ? t('common.statuses.active')
                      : student.status === 'suspended'
                      ? t('common.statuses.suspended')
                      : t('common.statuses.deactivated')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{t('instructor.students.colPhone')}</span>
                  <span className="font-medium text-slate-700 text-sm mt-0.5 block">
                    {student.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{t('instructor.students.colJoined')}</span>
                  <span className="font-medium text-slate-700 text-sm mt-0.5 block">
                    {formatDate(student.createdAt, i18n.language)}
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <BarChart3 className="w-4 h-4 text-brand-600" />
                  <span>{t('instructor.students.examHistory')}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                    <span className="text-slate-500 text-xs">{t('common.total')}</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{summary?.totalAttempts || 0}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                    <span className="text-slate-500 text-xs">{t('common.statuses.completed')}</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{summary?.completedAttempts || 0}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                    <span className="text-slate-500 text-xs">{t('student.dashboard.kpiAvg')}</span>
                    <p className="text-xl font-bold text-brand-600 mt-1">{summary?.averageScore || 0}%</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                    <span className="text-slate-500 text-xs">{t('student.results.kpiPassed')}</span>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{summary?.passedCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Historical Exam Attempts */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Award className="w-4 h-4 text-brand-600" />
                  <span>{t('instructor.students.examHistory')}</span>
                </h4>

                {attempts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    {t('instructor.students.noExamsTaken')}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">{t('instructor.grading.examCol')}</th>
                          <th className="px-4 py-2.5">{t('instructor.exams.colCategory')}</th>
                          <th className="px-4 py-2.5">{t('common.date')}</th>
                          <th className="px-4 py-2.5">{t('common.score')}</th>
                          <th className="px-4 py-2.5">{t('common.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attempts.map((att) => (
                          <tr key={att._id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {att.exam?.title || 'Exam Session'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {att.exam?.category || 'PMP'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {formatDate(att.createdAt, i18n.language)}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {att.percentage}%
                            </td>
                            <td className="px-4 py-3">
                              {att.isPassed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                  {t('common.passed')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                  {t('common.failed')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-lg transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
