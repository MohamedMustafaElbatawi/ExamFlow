import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Globe,
  Award,
  Layers,
  FileText,
} from 'lucide-react';

export const QuestionPreviewModal = ({ isOpen, onClose, question }) => {
  const { t, i18n } = useTranslation();
  const [showAnswer, setShowAnswer] = useState(true);
  const [previewLang, setPreviewLang] = useState(i18n.language === 'ar' ? 'ar' : 'en');

  if (!isOpen || !question) return null;

  const isAr = previewLang === 'ar';
  const text = question.text?.[previewLang] || question.text?.en || question.text?.ar;
  const explanation = question.explanation?.[previewLang] || question.explanation?.en || question.explanation?.ar;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center border border-brand-400/30">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                {t('instructor.questions.previewTitle')}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">{question.code}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Toggle Preview Language */}
            <button
              onClick={() => setPreviewLang(previewLang === 'en' ? 'ar' : 'en')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse border border-slate-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-brand-400" />
              <span>{previewLang === 'en' ? 'عربي' : 'English'}</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-6 space-y-5 overflow-y-auto max-h-[78vh] ${isAr ? 'rtl' : 'ltr'}`} dir={isAr ? 'rtl' : 'ltr'}>
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {question.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
              {question.topic}
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
              {t(`common.questionTypes.${question.type}`, question.type.replace('_', ' '))}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-medium ${
              question.difficulty === 'easy'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : question.difficulty === 'hard'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {t(`common.difficulties.${question.difficulty}`, question.difficulty)}
            </span>
            <span className="text-slate-500 font-medium">
              {question.marks} {t('common.points')}
            </span>
          </div>

          {/* Question Statement */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-900 font-medium text-sm leading-relaxed">
            {text || <span className="text-slate-400 italic">{t('instructor.questions.noTextForLang', isAr ? 'لا يوجد نص محدد لهذه اللغة.' : 'No text provided for this language.')}</span>}
          </div>

          {/* Attached Image Diagram if any */}
          {question.image && (
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/50 flex justify-center">
              <img src={question.image} alt="Question diagram" className="max-h-56 rounded-lg object-contain" />
            </div>
          )}

          {/* Options */}
          {question.type !== 'essay' && question.options?.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {t('instructor.questions.optionsSection')}:
              </p>
              <div className="space-y-2">
                {question.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isCorrect = question.correctAnswers?.includes(opt.id);
                  const optText = opt.text?.[previewLang] || opt.text?.en || opt.text?.ar;

                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border flex items-start space-x-3 rtl:space-x-reverse transition-colors ${
                        showAnswer && isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                        showAnswer && isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {letter}
                      </span>
                      <span className="text-xs pt-0.5 flex-1">{optText || `Option ${letter}`}</span>
                      {showAnswer && isCorrect && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Solution & Explanation Block */}
          {showAnswer && explanation && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
              <p className="font-bold uppercase tracking-wider text-[11px] text-amber-800 mb-1">
                {t('common.explanation')}:
              </p>
              <p className="leading-relaxed whitespace-pre-line">{explanation}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors"
          >
            {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showAnswer ? (isAr ? 'إخفاء الحل النموذجي' : 'Hide Solution') : (isAr ? 'إظهار الحل والشرح' : 'Show Solution')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
