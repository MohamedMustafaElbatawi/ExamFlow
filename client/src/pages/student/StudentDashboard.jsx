import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  // Mock list of assigned exams for Phase 1 view
  const assignedExams = [
    {
      id: '1',
      title: isRtl ? 'اختبار محاكاة PMP التجريبي الأول' : 'PMP Practice Simulation Exam #1',
      category: 'PMP',
      durationMinutes: 180,
      totalQuestions: 180,
      passingScore: 75,
      status: 'available',
      deadline: isRtl ? 'غداً، 11:59 مساءً' : 'Tomorrow, 11:59 PM',
    },
    {
      id: '2',
      title: isRtl ? 'اختبار إدارة المشاريع الرشيقة والهجينة' : 'Agile & Hybrid Methodologies Quiz',
      category: 'PMP',
      durationMinutes: 45,
      totalQuestions: 30,
      passingScore: 70,
      status: 'completed',
      score: 83,
      isPassed: true,
      submittedAt: isRtl ? '18 نوفمبر 2026' : 'Nov 18, 2026',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Student Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                {t('student.dashboard.trackBadge', { track: user?.category || 'PMP' })}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {t('student.dashboard.statusActive')}
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-2">
              {t('student.dashboard.welcome', { name: user?.name || '' })}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {t('student.dashboard.subtitle')}
            </p>
          </div>
          <div>
            <button
              onClick={() => navigate('/student/exams')}
              className="flex items-center space-x-2 rtl:space-x-reverse bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors text-sm"
            >
              <PlayCircle className="w-4 h-4" />
              <span>{t('student.dashboard.goToExams')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Available Exams Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2 rtl:space-x-reverse">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            <span>{t('student.dashboard.assignedHeading')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {exam.category}
                  </span>
                  {exam.status === 'available' ? (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1 rtl:space-x-reverse">
                      <Clock className="w-3 h-3" />
                      <span>{t('student.dashboard.readyToStart')}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center space-x-1 rtl:space-x-reverse">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>{t('student.dashboard.completedWithScore', { score: exam.score })}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-slate-900 text-base">{exam.title}</h3>

                <div className="mt-3 flex items-center space-x-4 rtl:space-x-reverse text-xs text-slate-500">
                  <span className="flex items-center space-x-1 rtl:space-x-reverse">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exam.durationMinutes} {t('common.minutes')}</span>
                  </span>
                  <span className="flex items-center space-x-1 rtl:space-x-reverse">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{exam.totalQuestions} {t('common.questions')}</span>
                  </span>
                  <span>{t('student.dashboard.passMark', { score: exam.passingScore })}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                {exam.status === 'available' ? (
                  <>
                    <span className="text-xs text-amber-600 font-medium">
                      {t('student.dashboard.due', { deadline: exam.deadline })}
                    </span>
                    <button
                      onClick={() => navigate('/student/exams')}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
                    >
                      <span>{t('student.dashboard.startAttempt')}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-slate-500">
                      {t('student.dashboard.submitted', { date: exam.submittedAt })}
                    </span>
                    <button
                      onClick={() => navigate(`/student/results/${exam.id}`)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
                    >
                      <span>{t('student.dashboard.reviewScore')}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
