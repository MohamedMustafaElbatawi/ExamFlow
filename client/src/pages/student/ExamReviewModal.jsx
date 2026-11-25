import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  CheckCircle,
  XCircle,
  Award,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { engineService } from '../../services/engineService';
import { formatDate, formatNumber } from '../../utils/formatters';

export const ExamReviewModal = ({ attemptId, onClose }) => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviewData();
  }, [attemptId]);

  const fetchReviewData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await engineService.getStudentResultDetails(attemptId);
      setData(res.result);
    } catch (err) {
      setError(
        err.response?.data?.message || t('student.results.reviewUnavailable')
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium">{t('student.results.loadingReview')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="font-bold text-lg">{t('student.results.reviewUnavailable')}</h3>
          </div>
          <p className="text-slate-600 mb-6 text-sm">{error || t('student.results.reviewUnavailable')}</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-sm transition"
          >
            {t('student.results.close')}
          </button>
        </div>
      </div>
    );
  }

  const { exam, totalScore, maxScore, percentage, isPassed, instructorFeedback, questionsReview } =
    data;
  const allowReview = exam?.allowReviewAnswers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Award className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold">{t('student.results.reviewModalTitle')}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {exam.title} ({exam.category}) • {t('student.results.attemptNum', { num: formatNumber(data.attemptNumber, i18n.language) })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-6 rtl:space-x-reverse text-sm">
            <div>
              <span className="text-xs text-slate-500 block">{t('student.results.totalScore')}</span>
              <span className="text-lg font-bold text-slate-900">
                {formatNumber(totalScore, i18n.language)} / {formatNumber(maxScore, i18n.language)} {t('student.results.pts')}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-xs text-slate-500 block">{t('student.results.percentage')}</span>
              <span className="text-lg font-bold text-brand-600">
                {formatNumber(percentage, i18n.language)}%
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-xs text-slate-500 block">{t('student.results.status')}</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isPassed ? t('student.results.passedBadge') : t('student.results.retakeBadge')}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {t('student.results.publishedDate', { date: formatDate(data.publishedAt, i18n.language) })}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Instructor Feedback Note */}
          {instructorFeedback && (
            <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-brand-900 font-bold text-sm mb-1">
                <MessageSquare className="w-4 h-4 text-brand-600" />
                <span>{t('student.results.instructorGuidance')}</span>
              </div>
              <p className="text-slate-700 text-sm">{instructorFeedback}</p>
            </div>
          )}

          {!allowReview && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <p className="font-bold mb-1">{t('student.results.reviewDisabledTitle')}</p>
              <p className="text-xs text-amber-700">
                {t('student.results.reviewDisabledDesc')}
              </p>
            </div>
          )}

          {/* Question Breakdown */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-base">{t('student.results.answersBreakdown')}</h3>

            {questionsReview?.map((q) => {
              const studentAns = q.studentAnswer || {};
              const isCorrect = studentAns.isCorrect;
              const isEssay = q.type === 'essay';
              const questionText = q.text?.[i18n.language] || q.text?.ar || q.text?.en || q.text;

              return (
                <div
                  key={q.snapshotId}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        Q{formatNumber(q.questionIndex, i18n.language)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {q.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-bold">
                      <span
                        className={`px-2.5 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : isEssay
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t('student.results.awarded', {
                          awarded: formatNumber(studentAns.scoreAwarded || 0, i18n.language),
                          marks: formatNumber(q.marks, i18n.language),
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-3">
                    <p className="text-slate-800 text-sm font-medium leading-relaxed">{questionText}</p>
                  </div>

                  {/* Objective Options */}
                  {!isEssay && (
                    <div className="space-y-1.5 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {allowReview && q.options ? (
                        q.options.map((opt) => {
                          const isStudent = studentAns.selectedOptions?.includes(opt.id);
                          const isCorrectOpt = q.correctAnswers?.includes(opt.id);
                          const optText = opt.text?.[i18n.language] || opt.text?.ar || opt.text?.en || opt.text;

                          let optClasses = 'border-slate-200 bg-white text-slate-700';
                          if (isCorrectOpt && isStudent) {
                            optClasses = 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold';
                          } else if (isCorrectOpt) {
                            optClasses = 'border-emerald-300 bg-emerald-50/50 text-emerald-800 font-medium';
                          } else if (isStudent) {
                            optClasses = 'border-red-300 bg-red-50 text-red-900 line-through';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs ${optClasses}`}
                            >
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <span className="font-bold w-5">{opt.letter || opt.id}:</span>
                                <span>{optText}</span>
                              </div>
                              <div className="flex items-center space-x-2 rtl:space-x-reverse text-[11px]">
                                {isStudent && (
                                  <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                    {t('student.results.yourChoice')}
                                  </span>
                                )}
                                {isCorrectOpt && (
                                  <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                                    {t('student.results.correctKeyBadge')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold block mb-1">{t('student.results.yourChoice')}:</span>
                          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                            {studentAns.selectedOptions && studentAns.selectedOptions.length > 0
                              ? studentAns.selectedOptions.join(', ')
                              : (isAr ? 'لم يتم تسجيل إجابة' : 'No option selected')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Essay Response */}
                  {isEssay && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-slate-600 mb-1">{t('student.results.submittedResponse')}</p>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-mono">
                        {studentAns.textAnswer || (
                          <span className="text-slate-400 italic">{t('student.results.noTextSubmitted')}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instructor Feedback on this Question */}
                  {studentAns.feedback && (
                    <div className="p-2.5 bg-brand-50/50 rounded-lg border border-brand-100 text-xs text-brand-900 mb-2">
                      <span className="font-bold block">{t('student.results.instructorNote')}</span>
                      <p>{studentAns.feedback}</p>
                    </div>
                  )}

                  {/* Explanation (if allowed) */}
                  {allowReview && (q.explanation?.en || q.explanation?.ar) && (
                    <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-900">
                      <span className="font-bold block">{t('student.results.learningPoint')}</span>
                      <p>{q.explanation?.[i18n.language] || q.explanation?.ar || q.explanation?.en}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};