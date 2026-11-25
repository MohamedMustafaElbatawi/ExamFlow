import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  Check,
  FileCheck,
} from 'lucide-react';
import { engineService } from '../../services/engineService';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { formatNumber } from '../../utils/formatters';

export const ActiveExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Core Data
  const [attempt, setAttempt] = useState(null);
  const [examSettings, setExamSettings] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers State: { [snapshotId: string]: { selectedOptions: string[], textAnswer: string } }
  const [userAnswers, setUserAnswers] = useState({});

  // Timer & Heartbeat
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'

  // Loading & Submissions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);

  const timerRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);
  const startingRef = useRef(false);

  // Load / Start attempt
  useEffect(() => {
    if (!startingRef.current) {
      startingRef.current = true;
      startExam();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [id]);

  const startExam = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await engineService.startOrResumeAttempt(id);
      if (res.success) {
        setAttempt(res.attempt);
        setExamSettings(res.examSettings);
        setQuestions(res.questions);
        setCurrentIndex(res.attempt.currentQuestionIndex || 0);
        setSecondsRemaining(res.attempt.remainingSeconds);

        // Preload existing answers
        const preloaded = {};
        if (res.attempt.savedAnswers) {
          Object.entries(res.attempt.savedAnswers).forEach(([sid, ans]) => {
            preloaded[sid] = {
              selectedOptions: ans.selectedOptions || [],
              textAnswer: ans.textAnswer || '',
            };
          });
        }
        setUserAnswers(preloaded);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('student.activeExam.sessionError'));
    } finally {
      setLoading(false);
    }
  };

  // Synchronized countdown timer
  useEffect(() => {
    if (secondsRemaining === null || submissionReceipt) return;

    if (secondsRemaining <= 0) {
      // Auto-submit when countdown hits zero
      handleFinalSubmit(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [secondsRemaining, submissionReceipt]);

  // Format seconds to HH:MM:SS
  const formatTimer = (secs) => {
    if (secs === null) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Immediate debounced autosave to server
  const triggerAutosave = (snapshotId, updatedAnswer) => {
    setSaveStatus('saving');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!attempt) return;
      try {
        const res = await engineService.saveAnswer(attempt._id, {
          snapshotId,
          selectedOptions: updatedAnswer.selectedOptions || [],
          textAnswer: updatedAnswer.textAnswer || '',
          currentQuestionIndex: currentIndex,
        });
        if (res.success) {
          setSaveStatus('saved');
          // Re-sync server remaining seconds if returned
          if (res.remainingSeconds !== undefined) {
            setSecondsRemaining(res.remainingSeconds);
          }
        }
      } catch (err) {
        if (err.response?.data?.isExpired) {
          handleFinalSubmit(true);
        } else {
          setSaveStatus('error');
        }
      }
    }, 400); // 400ms debounce
  };

  // Handle Option Click
  const handleOptionSelect = (snapshotId, type, optionId) => {
    const current = userAnswers[snapshotId] || { selectedOptions: [], textAnswer: '' };
    let newOptions = [];

    if (type === 'multiple_choice') {
      const exists = current.selectedOptions.includes(optionId);
      newOptions = exists
        ? current.selectedOptions.filter((id) => id !== optionId)
        : [...current.selectedOptions, optionId];
    } else {
      newOptions = [optionId];
    }

    const updated = { ...current, selectedOptions: newOptions };
    setUserAnswers((prev) => ({ ...prev, [snapshotId]: updated }));
    triggerAutosave(snapshotId, updated);
  };

  // Handle Essay Text Change
  const handleEssayChange = (snapshotId, textVal) => {
    const current = userAnswers[snapshotId] || { selectedOptions: [], textAnswer: '' };
    const updated = { ...current, textAnswer: textVal };
    setUserAnswers((prev) => ({ ...prev, [snapshotId]: updated }));
    triggerAutosave(snapshotId, updated);
  };

  // Submit attempt handler
  const handleFinalSubmit = async (isAuto = false) => {
    if (!attempt || submitting) return;

    setSubmitting(true);
    setIsSubmitModalOpen(false);

    try {
      const res = await engineService.submitAttempt(attempt._id);
      if (res.success && res.receipt) {
        setSubmissionReceipt(res.receipt);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
        <p className="text-sm font-semibold">{t('student.activeExam.securingSession')}</p>
      </div>
    );
  }

  if (error && !submissionReceipt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-red-200 text-center shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">{t('student.activeExam.sessionError')}</h2>
          <p className="text-xs text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => navigate('/student/exams')}
            className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
          >
            {t('student.activeExam.returnToExams')}
          </button>
        </div>
      </div>
    );
  }

  // Final Submission Receipt Screen
  if (submissionReceipt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <FileCheck className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {t('student.activeExam.submissionConfirmedBadge')}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              {t('student.activeExam.submissionSuccessTitle')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {t('student.activeExam.submissionSuccessDesc')}
            </p>
          </div>

          {/* If Results Shown Immediately */}
          {submissionReceipt.showResultsImmediately && submissionReceipt.percentage !== null ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-2">
              <span className="text-xs text-slate-400">{t('student.activeExam.finalScore')}</span>
              <p className="text-3xl font-extrabold text-slate-900">
                {formatNumber(submissionReceipt.percentage, i18n.language)}%
              </p>
              <div>
                {submissionReceipt.isPassed ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 inline-flex items-center space-x-1 rtl:space-x-reverse">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('student.activeExam.passed')}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    {t('student.activeExam.didNotPass')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold">{t('student.activeExam.pendingReview')}</p>
              <p className="text-[11px] text-amber-700 mt-1">
                {t('student.activeExam.pendingReviewDesc')}
              </p>
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono">
            {t('student.activeExam.receiptId')} {submissionReceipt.attemptId}
          </div>

          <button
            onClick={() => navigate('/student/exams')}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            {t('student.activeExam.returnHome')}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.snapshotId] || { selectedOptions: [], textAnswer: '' } : null;

  // Question navigation check
  const allowBackward = examSettings?.allowBackwardNavigation !== false;

  // Answered count
  const answeredCount = Object.values(userAnswers).filter(
    (ans) => (ans.selectedOptions && ans.selectedOptions.length > 0) || (ans.textAnswer && ans.textAnswer.trim().length > 0)
  ).length;

  const isTimerCritical = secondsRemaining !== null && secondsRemaining < 300; // less than 5 mins

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Fixed Sticky Exam Bar */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-slate-800">
        {/* Exam Title & Track */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold text-xs border border-brand-400/30">
            {formatNumber(currentIndex + 1, i18n.language)}
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight truncate max-w-xs sm:max-w-md">
              {examSettings?.title}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 rtl:space-x-reverse">
              <span>
                {t('student.activeExam.questionProgress', {
                  current: formatNumber(currentIndex + 1, i18n.language),
                  total: formatNumber(questions.length, i18n.language),
                })}
              </span>
              <span>•</span>
              {/* Autosave Status Indicator */}
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    <span className="text-amber-400">{t('student.activeExam.autosaveSaving')}</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{t('student.activeExam.autosaveSaved')}</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{t('student.activeExam.autosaveError')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timer & Language Switcher & Submit Action */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <LanguageSwitcher />

          {/* Countdown Timer Display */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 rtl:space-x-reverse font-mono text-xs font-bold transition-colors ${
              isTimerCritical
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-slate-800 text-emerald-400 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow transition-colors flex items-center space-x-1 rtl:space-x-reverse"
          >
            <Send className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t('student.activeExam.finishExam')}</span>
          </button>
        </div>
      </header>

      {/* Main Examination Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Active Question Card */}
        <div className="lg:col-span-3 space-y-5">
          {currentQuestion && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[460px]">
              <div className="space-y-5">
                {/* Question Header & Meta */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {currentQuestion.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {currentQuestion.topic}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700">
                      {currentQuestion.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {formatNumber(currentQuestion.marks, i18n.language)}{' '}
                    {currentQuestion.marks === 1 ? t('student.activeExam.mark') : t('student.activeExam.marks')}
                  </span>
                </div>

                {/* Question Statement */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                  {currentQuestion.text?.[i18n.language] || currentQuestion.text?.ar || currentQuestion.text?.en || currentQuestion.text}
                </div>

                {/* Image if any */}
                {currentQuestion.image && (
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center">
                    <img src={currentQuestion.image} alt="Diagram" className="max-h-56 rounded-lg object-contain" />
                  </div>
                )}

                {/* Answer Options according to question type */}
                {currentQuestion.type === 'essay' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      {t('student.activeExam.essayPrompt')}
                    </label>
                    <textarea
                      rows="7"
                      value={currentAnswer?.textAnswer || ''}
                      onChange={(e) => handleEssayChange(currentQuestion.snapshotId, e.target.value)}
                      placeholder={t('student.activeExam.essayPlaceholder')}
                      className="w-full p-3.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 font-sans"
                    />
                    <span className="text-[11px] text-slate-400">
                      {t('student.activeExam.wordsCount', {
                        count: formatNumber((currentAnswer?.textAnswer || '').split(/\s+/).filter(Boolean).length, i18n.language)
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {currentQuestion.type === 'multiple_choice' && (
                      <p className="text-xs text-brand-600 font-medium">
                        {t('student.activeExam.multipleChoicePrompt')}
                      </p>
                    )}

                    <div className="space-y-2.5">
                      {currentQuestion.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isSelected = currentAnswer?.selectedOptions?.includes(opt.id);
                        const optText = opt.text?.[i18n.language] || opt.text?.ar || opt.text?.en || opt.text;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleOptionSelect(currentQuestion.snapshotId, currentQuestion.type, opt.id)}
                            className={`p-3.5 rounded-xl border flex items-center space-x-3 rtl:space-x-reverse cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-50 border-brand-500 text-brand-950 font-medium shadow-sm'
                                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="text-xs sm:text-sm flex-1">{optText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Question Navigation Controls */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                {allowBackward ? (
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold disabled:opacity-30 flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                    <span>{t('student.activeExam.prevQuestion')}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    {t('student.activeExam.forwardOnlyMode')}
                  </span>
                )}

                {!isLastQuestion ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
                  >
                    <span>{t('student.activeExam.nextQuestion')}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('student.activeExam.reviewAndSubmit')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Question Grid Navigation Drawer */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                {t('student.activeExam.paletteTitle')}
              </h4>
              <span className="text-xs font-bold text-brand-600">
                {formatNumber(answeredCount, i18n.language)} / {formatNumber(questions.length, i18n.language)}
              </span>
            </div>

            {/* Questions Buttons Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const ans = userAnswers[q.snapshotId];
                const isAnswered =
                  (ans?.selectedOptions && ans.selectedOptions.length > 0) ||
                  (ans?.textAnswer && ans.textAnswer.trim().length > 0);

                // Check backward navigation restriction
                const isClickable = allowBackward || idx >= currentIndex;

                return (
                  <button
                    key={q.snapshotId}
                    disabled={!isClickable}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'bg-brand-600 text-white ring-2 ring-brand-400 shadow-md'
                        : isAnswered
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    } ${!isClickable ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {formatNumber(idx + 1, i18n.language)}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                <span>{t('student.activeExam.answered')}</span>
              </div>
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                <span>{t('student.activeExam.unanswered')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
              <Send className="w-6 h-6 rtl:rotate-180" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              {t('student.activeExam.confirmSubmitTitle')}
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <p>
                {t('student.activeExam.answeredCount')}{' '}
                <strong className="text-emerald-700">{formatNumber(answeredCount, i18n.language)}</strong> / {formatNumber(questions.length, i18n.language)}
              </p>
              {answeredCount < questions.length && (
                <p className="text-amber-600 font-semibold pt-1">
                  ⚠️ {t('student.activeExam.unansweredWarning', { count: formatNumber(questions.length - answeredCount, i18n.language) })}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">
              {t('student.activeExam.confirmSubmitLockNotice')}
            </p>

            <div className="pt-2 flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                {t('student.activeExam.continueExamBtn')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50 flex items-center space-x-1.5 rtl:space-x-reverse transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('student.activeExam.submittingExam')}</span>
                  </>
                ) : (
                  <span>{t('student.activeExam.confirmSubmitBtn')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};