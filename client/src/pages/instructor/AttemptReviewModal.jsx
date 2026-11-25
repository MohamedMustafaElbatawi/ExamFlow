import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Award,
  Save,
  Send,
  Check,
  History,
  FileText,
  User,
} from 'lucide-react';
import { gradingService } from '../../services/gradingService';
import { formatDateTime } from '../../utils/formatters';

export const AttemptReviewModal = ({ attemptId, onClose, onUpdated }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState('');

  // Editable question grading state { [snapshotId]: { score: number, feedback: string } }
  const [edits, setEdits] = useState({});

  React.useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gradingService.getAttemptDetails(attemptId);
      setData(res.attempt);
      setOverallFeedback(res.attempt.instructorFeedback || '');

      // Initialize edits from current question answers
      const initialEdits = {};
      (res.attempt.questions || []).forEach((q) => {
        initialEdits[q.snapshotId] = {
          score: q.studentAnswer?.scoreAwarded ?? 0,
          feedback: q.studentAnswer?.feedback ?? '',
        };
      });
      setEdits(initialEdits);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (snapshotId, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [snapshotId]: {
        ...prev[snapshotId],
        [field]: value,
      },
    }));
  };

  const handleSaveQuestionGrade = async (snapshotId) => {
    const edit = edits[snapshotId];
    if (!edit) return;

    setSavingQuestionId(snapshotId);
    setError('');
    try {
      await gradingService.gradeQuestion(attemptId, {
        snapshotId,
        scoreAwarded: Number(edit.score),
        feedback: edit.feedback,
      });

      // Refresh to get recalculated total and history
      await fetchAttemptDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleApprove = async () => {
    setSubmittingAction(true);
    setError('');
    try {
      await gradingService.approveAttempt(attemptId, {
        instructorFeedback: overallFeedback,
      });
      await fetchAttemptDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handlePublish = async () => {
    setSubmittingAction(true);
    setError('');
    try {
      await gradingService.publishAttempt(attemptId);
      await fetchAttemptDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmittingAction(false);
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

  if (error && !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center space-x-2 text-red-600 mb-4 rtl:space-x-reverse">
            <AlertCircle className="w-6 h-6" />
            <h3 className="font-bold text-lg">{t('common.error')}</h3>
          </div>
          <p className="text-slate-600 mb-6">{error}</p>
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_grading':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-full">
            {t('common.statuses.pending_grading')}
          </span>
        );
      case 'ready_for_approval':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-full">
            {t('common.statuses.ready_for_approval')}
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold rounded-full">
            {t('common.statuses.approved')}
          </span>
        );
      case 'published':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full">
            {t('common.statuses.published')}
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const objectiveScore = (data?.questions || [])
    .filter((q) => q.type !== 'essay')
    .reduce((acc, q) => acc + (q.studentAnswer?.scoreAwarded || 0), 0);

  const objectiveMax = (data?.questions || [])
    .filter((q) => q.type !== 'essay')
    .reduce((acc, q) => acc + (q.marks || 1), 0);

  const essayQuestions = (data?.questions || []).filter((q) => q.type === 'essay');
  const hasEssay = essayQuestions.length > 0;
  const essayScore = essayQuestions.reduce((acc, q) => acc + (q.studentAnswer?.scoreAwarded || 0), 0);
  const essayMax = essayQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <h2 className="text-lg font-bold">{t('instructor.grading.reviewModalTitle')}</h2>
              {getStatusBadge(data.gradingStatus)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('instructor.grading.examCol')}: <span className="text-white font-medium">{data.exam?.title}</span> • {t('instructor.grading.studentCol')}:{' '}
              <span className="text-white font-medium">{data.student?.name}</span> ({data.student?.email}) • {t('instructor.grading.attemptCol')} #{data.attemptNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Summary Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-6 rtl:space-x-reverse text-sm">
            <div>
              <span className="text-xs text-slate-500 block">{t('common.score')}</span>
              <span className="text-lg font-bold text-slate-900">
                {data.totalScore} / {data.maxScore} {t('common.points')}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-xs text-slate-500 block">{t('common.percentage')}</span>
              <span className="text-lg font-bold text-brand-600">{data.percentage}%</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-xs text-slate-500 block">{isAr ? 'الدرجة الموضوعية' : 'Objective Score'}</span>
              <span className="text-sm font-bold text-slate-800">
                {objectiveScore} / {objectiveMax}
              </span>
            </div>
            {hasEssay && (
              <>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'الدرجة المقالية' : 'Essay Score'}</span>
                  <span className="text-sm font-bold text-blue-700">
                    {essayScore} / {essayMax}
                  </span>
                </div>
              </>
            )}
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-xs text-slate-500 block">{t('common.status')}</span>
              <span
                className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  data.isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {data.isPassed ? t('common.passed') : t('common.failed')} ({t('common.passMark')}: {data.exam?.passingScore}%)
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-xs text-slate-500 block">{t('instructor.grading.submittedCol')}</span>
              <span className="text-xs font-medium text-slate-700">
                {formatDateTime(data.submittedAt, i18n.language)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {data.gradingStatus !== 'published' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={submittingAction || data.gradingStatus === 'pending_grading'}
                  title={
                    data.gradingStatus === 'pending_grading'
                      ? 'Grade all essay questions before approving'
                      : t('instructor.grading.approveAttemptBtn')
                  }
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm flex items-center space-x-1 rtl:space-x-reverse"
                >
                  <Check className="w-4 h-4" />
                  <span>{data.gradingStatus === 'approved' ? t('common.statuses.approved') : t('instructor.grading.approveAttemptBtn')}</span>
                </button>

                <button
                  onClick={handlePublish}
                  disabled={submittingAction || data.gradingStatus === 'pending_grading'}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm flex items-center space-x-1 rtl:space-x-reverse"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('instructor.grading.publishAttemptBtn')}</span>
                </button>
              </>
            )}

            {data.gradingStatus === 'published' && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                ✓ {t('instructor.grading.publishedNotice')}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center space-x-2 rtl:space-x-reverse">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Question Review Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-base">
              {isAr ? 'الأسئلة والإجابات المسجلة' : 'Questions & Submitted Answers'}
            </h3>

            {data.questions?.map((q, idx) => {
              const currentEdit = edits[q.snapshotId] || {
                score: q.studentAnswer?.scoreAwarded || 0,
                feedback: q.studentAnswer?.feedback || '',
              };
              const isEssay = q.type === 'essay';
              const maxMarks = q.marks || 1;

              return (
                <div
                  key={q.snapshotId}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-sm"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {t(`common.questionTypes.${q.type}`, q.type.replace('_', ' '))}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {q.topic}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                        {t(`common.difficulties.${q.difficulty}`, q.difficulty)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-bold">
                      <span className="text-slate-500">{t('instructor.grading.maxMarks')} {maxMarks}</span>
                      <span
                        className={`px-2 py-0.5 rounded ${
                          q.studentAnswer?.isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : isEssay
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t('student.results.scoreEarned')} {q.studentAnswer?.scoreAwarded} {t('common.points')}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-3 space-y-1">
                    {q.text?.en && <p className="text-slate-800 text-sm font-medium">{q.text.en}</p>}
                    {q.text?.ar && (
                      <p className="text-slate-700 text-sm font-medium text-right font-sans" dir="rtl">
                        {q.text.ar}
                      </p>
                    )}
                  </div>

                  {/* Question Image if present */}
                  {q.image && (
                    <div className="mb-3">
                      <img
                        src={q.image}
                        alt="Question Reference"
                        className="max-h-48 rounded-lg border border-slate-200 object-contain"
                      />
                    </div>
                  )}

                  {/* Options & Answers for Objective Questions */}
                  {!isEssay && (
                    <div className="space-y-1.5 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-500 mb-1">{t('common.options')}:</p>
                      {q.options?.map((opt) => {
                        const isStudentChoice = q.studentAnswer?.selectedOptions?.includes(opt.id);
                        const isCorrectAnswer = q.correctAnswers?.includes(opt.id);

                        let optClasses = 'border-slate-200 bg-white text-slate-700';
                        if (isCorrectAnswer && isStudentChoice) {
                          optClasses = 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold';
                        } else if (isCorrectAnswer) {
                          optClasses = 'border-emerald-300 bg-emerald-50/50 text-emerald-800 font-medium';
                        } else if (isStudentChoice) {
                          optClasses = 'border-red-300 bg-red-50 text-red-900 line-through';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs ${optClasses}`}
                          >
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="font-bold w-5">{opt.letter || opt.id}:</span>
                              <span>{isAr ? opt.text?.ar || opt.text?.en : opt.text?.en || opt.text?.ar}</span>
                            </div>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-[11px]">
                              {isStudentChoice && (
                                <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                  {isAr ? 'إجابة المتدرب' : 'Student Answer'}
                                </span>
                              )}
                              {isCorrectAnswer && (
                                <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                                  {isAr ? 'الإجابة النموذجية ✓' : 'Correct Key ✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Student Essay Response */}
                  {isEssay && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-slate-600 mb-1">{t('instructor.grading.essayAnswerLabel')}</p>
                      <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/80 text-sm text-slate-800 whitespace-pre-wrap font-mono">
                        {q.studentAnswer?.textAnswer || (
                          <span className="text-slate-400 italic">{t('instructor.grading.noEssayAnswer')}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Explanation if exists */}
                  {(q.explanation?.en || q.explanation?.ar) && (
                    <div className="mb-3 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-900">
                      <span className="font-bold block">{t('common.explanation')}:</span>
                      {q.explanation.en && <p>{q.explanation.en}</p>}
                      {q.explanation.ar && <p className="text-right mt-1" dir="rtl">{q.explanation.ar}</p>}
                    </div>
                  )}

                  {/* Manual Grading / Score Override Panel */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 -mx-4 -mb-4 p-3 rounded-b-xl">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse flex-1">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          {t('instructor.grading.awardMarks')}
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={maxMarks}
                          value={currentEdit.score}
                          onChange={(e) => handleEditChange(q.snapshotId, 'score', e.target.value)}
                          className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 font-bold text-slate-900"
                        />
                        <span className="text-xs text-slate-500">/ {maxMarks}</span>
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={isAr ? 'ملاحظة أو تعليق لهذا السؤال (اختياري)...' : 'Optional feedback for this question...'}
                          value={currentEdit.feedback}
                          onChange={(e) => handleEditChange(q.snapshotId, 'feedback', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveQuestionGrade(q.snapshotId)}
                      disabled={savingQuestionId === q.snapshotId}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 rtl:space-x-reverse transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingQuestionId === q.snapshotId ? t('common.saving') : t('instructor.grading.saveGrade')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Instructor Feedback Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-2">{t('instructor.grading.overallFeedback')}</h4>
            <textarea
              rows="3"
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder={t('instructor.grading.overallFeedbackPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Audit History Log */}
          {data.gradingHistory && data.gradingHistory.length > 0 && (
            <div className="p-4 bg-slate-100/60 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-bold text-slate-600 mb-2">
                <History className="w-4 h-4" />
                <span>{t('instructor.grading.auditTrail')} ({data.gradingHistory.length})</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-slate-600">
                {data.gradingHistory.map((item, hIdx) => (
                  <div
                    key={hIdx}
                    className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{item.notes}</span>
                      <span className="text-slate-400 ml-2 rtl:mr-2">
                        ({t('common.score')}: {item.previousScore} → {item.newScore})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(item.gradedAt, i18n.language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
