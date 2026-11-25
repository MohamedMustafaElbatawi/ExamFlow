import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { engineService } from '../../services/engineService';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { formatNumber } from '../../utils/formatters';

export const ExamInstructions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInstructions();
  }, [id]);

  const fetchInstructions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await engineService.getExamInstructions(id);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('student.instructions.unableToAccess'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    navigate(`/student/exam/${id}/live`);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
        <span className="text-xs">{t('student.instructions.loadingInstructions')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-8 border border-red-200 text-center shadow-sm">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">{t('student.instructions.unableToAccess')}</h3>
        <p className="text-xs text-slate-500 mt-2">{error}</p>
        <button
          onClick={() => navigate('/student/exams')}
          className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
        >
          {t('student.instructions.backToExams')}
        </button>
      </div>
    );
  }

  const { exam, timing } = data;
  const isResume = !!timing?.activeAttempt;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/student/exams')}
          className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('student.instructions.backToExams')}</span>
        </button>

        <LanguageSwitcher />
      </div>

      {/* Main Instructions Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {t('student.instructions.track', { category: exam.category })}
            </span>
            {isResume && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                {t('student.instructions.resumeAttemptBadge')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {exam.description || (i18n.language === 'ar' ? 'جلسة امتحان إلكترونية خاضعة للوقت والضوابط المحددة.' : 'Standard timed examination session.')}
          </p>
        </div>

        {/* Exam Parameter Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-center">
          <div>
            <span className="text-[11px] text-slate-500 block">{t('student.instructions.duration')}</span>
            <span className="text-lg font-bold text-slate-900 block mt-0.5">
              {formatNumber(exam.durationMinutes, i18n.language)} {t('student.instructions.mins')}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">{t('student.instructions.passingMark')}</span>
            <span className="text-lg font-bold text-emerald-600 block mt-0.5">
              {formatNumber(exam.passingScore, i18n.language)}%
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">{t('student.instructions.maxAttempts')}</span>
            <span className="text-lg font-bold text-slate-900 block mt-0.5">
              {formatNumber(exam.maxAttempts, i18n.language)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">{t('student.instructions.remaining')}</span>
            <span className="text-lg font-bold text-brand-600 block mt-0.5">
              {formatNumber(timing.remainingAttempts, i18n.language)}
            </span>
          </div>
        </div>

        {/* Critical Instructions Checklist */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('student.instructions.rulesHeading')}</span>
          </h3>

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{t('student.instructions.rule1')}</span>
            </li>
            <li className="flex items-start space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{t('student.instructions.rule2')}</span>
            </li>
            <li className="flex items-start space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{t('student.instructions.rule3')}</span>
            </li>
            <li className="flex items-start space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                {exam.allowBackwardNavigation
                  ? t('student.instructions.ruleBackwardAllowed')
                  : t('student.instructions.ruleBackwardLocked')}
              </span>
            </li>
            <li className="flex items-start space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{t('student.instructions.ruleAutoSubmit')}</span>
            </li>
          </ul>
        </div>

        {/* Start Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            {t('student.instructions.pledgeNotice')}
          </p>

          <button
            onClick={handleStartExam}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse ${
              isResume
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>
              {isResume ? t('student.instructions.resumeNowBtn') : t('student.instructions.startNowBtn')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};