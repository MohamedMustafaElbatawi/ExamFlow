import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Save,
  HelpCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { questionService } from '../../services/questionService';

export const QuestionEditorModal = ({ isOpen, onClose, question, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const isEdit = !!question;

  const [formData, setFormData] = useState({
    category: 'PMP',
    topic: '',
    difficulty: 'medium',
    type: 'single_choice',
    text: { en: '', ar: '' },
    options: [
      { id: 'opt_1', text: { en: '', ar: '' } },
      { id: 'opt_2', text: { en: '', ar: '' } },
      { id: 'opt_3', text: { en: '', ar: '' } },
      { id: 'opt_4', text: { en: '', ar: '' } },
    ],
    correctAnswers: [],
    explanation: { en: '', ar: '' },
    marks: 1,
    image: null,
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (question) {
      setFormData({
        category: question.category || 'PMP',
        topic: question.topic || '',
        difficulty: question.difficulty || 'medium',
        type: question.type || 'single_choice',
        text: {
          en: question.text?.en || '',
          ar: question.text?.ar || '',
        },
        options: question.options?.length
          ? question.options.map((opt) => ({
              id: opt.id,
              text: { en: opt.text?.en || '', ar: opt.text?.ar || '' },
            }))
          : [
              { id: 'opt_1', text: { en: '', ar: '' } },
              { id: 'opt_2', text: { en: '', ar: '' } },
            ],
        correctAnswers: question.correctAnswers || [],
        explanation: {
          en: question.explanation?.en || '',
          ar: question.explanation?.ar || '',
        },
        marks: question.marks || 1,
        image: question.image || null,
      });
    } else {
      setFormData({
        category: 'PMP',
        topic: '',
        difficulty: 'medium',
        type: 'single_choice',
        text: { en: '', ar: '' },
        options: [
          { id: 'opt_1', text: { en: '', ar: '' } },
          { id: 'opt_2', text: { en: '', ar: '' } },
          { id: 'opt_3', text: { en: '', ar: '' } },
          { id: 'opt_4', text: { en: '', ar: '' } },
        ],
        correctAnswers: ['opt_1'],
        explanation: { en: '', ar: '' },
        marks: 1,
        image: null,
      });
    }
    setError('');
    setFieldErrors({});
  }, [question, isOpen]);

  if (!isOpen) return null;

  // Handle Question Type Change
  const handleTypeChange = (newType) => {
    let newOptions = [...formData.options];
    let newAnswers = [];

    if (newType === 'true_false') {
      newOptions = [
        { id: 'opt_1', text: { en: 'True', ar: 'صحيح' } },
        { id: 'opt_2', text: { en: 'False', ar: 'خطأ' } },
      ];
      newAnswers = ['opt_1'];
    } else if (newType === 'essay') {
      newOptions = [];
      newAnswers = [];
    } else if (newOptions.length < 2) {
      newOptions = [
        { id: 'opt_1', text: { en: '', ar: '' } },
        { id: 'opt_2', text: { en: '', ar: '' } },
        { id: 'opt_3', text: { en: '', ar: '' } },
        { id: 'opt_4', text: { en: '', ar: '' } },
      ];
      newAnswers = ['opt_1'];
    }

    setFormData({
      ...formData,
      type: newType,
      options: newOptions,
      correctAnswers: newAnswers,
    });
  };

  // Option text changes
  const handleOptionChange = (idx, langKey, value) => {
    const updated = [...formData.options];
    updated[idx].text[langKey] = value;
    setFormData({ ...formData, options: updated });
  };

  // Add Option
  const addOption = () => {
    const newId = `opt_${Date.now()}`;
    setFormData({
      ...formData,
      options: [...formData.options, { id: newId, text: { en: '', ar: '' } }],
    });
  };

  // Remove Option
  const removeOption = (idx) => {
    if (formData.options.length <= 2) return;
    const removedId = formData.options[idx].id;
    const updated = formData.options.filter((_, i) => i !== idx);
    const updatedAnswers = formData.correctAnswers.filter((a) => a !== removedId);
    setFormData({ ...formData, options: updated, correctAnswers: updatedAnswers });
  };

  // Toggle correct answer
  const toggleCorrectAnswer = (optId) => {
    if (formData.type === 'single_choice' || formData.type === 'true_false') {
      setFormData({ ...formData, correctAnswers: [optId] });
    } else if (formData.type === 'multiple_choice') {
      const exists = formData.correctAnswers.includes(optId);
      const updated = exists
        ? formData.correctAnswers.filter((id) => id !== optId)
        : [...formData.correctAnswers, optId];
      setFormData({ ...formData, correctAnswers: updated });
    }
  };

  // Image Upload handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    try {
      const res = await questionService.uploadImage(file);
      if (res.success) {
        setFormData((prev) => ({ ...prev, image: res.imageUrl }));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.text.en.trim() && !formData.text.ar.trim()) {
      errors.text = isAr
        ? 'يجب إدخال نص السؤال باللغة الإنجليزية أو العربية'
        : 'Question text in either English or Arabic is required';
    }

    if (!formData.topic.trim()) {
      errors.topic = isAr ? 'يجب تحديد موضوع السؤال' : 'Topic is required';
    }

    if (formData.type !== 'essay') {
      if (formData.options.length < 2) {
        errors.options = isAr
          ? 'يجب توفير خيارين على الأقل'
          : 'At least 2 options are required';
      }
      if (formData.correctAnswers.length === 0) {
        errors.answers = isAr
          ? 'يجب تحديد الإجابة الصحيحة'
          : 'Please select at least one correct answer';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError('');

    try {
      if (isEdit) {
        const res = await questionService.updateQuestion(question._id, formData);
        if (res.success) {
          onSuccess(isAr ? 'تم تعديل السؤال بنجاح' : 'Question updated successfully');
          onClose();
        }
      } else {
        const res = await questionService.createQuestion(formData);
        if (res.success) {
          onSuccess(isAr ? 'تمت إضافة السؤال إلى بنك الأسئلة' : 'Question added to question bank');
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center border border-brand-400/30 font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isEdit
                  ? isAr ? 'تعديل السؤال' : 'Edit Question'
                  : isAr ? 'إضافة سؤال جديد إلى البنك' : 'Add Question to Bank'}
              </h3>
              <p className="text-xs text-slate-400">
                {t('instructor.questions.subtitle')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-700 text-xs rtl:space-x-reverse">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Controls Grid: Category, Topic, Type, Difficulty, Marks */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.exams.colCategory')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500"
              >
                <option value="PMP">PMP</option>
                <option value="MPA">MPA</option>
                <option value="Both">{t('common.both')}</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.questions.colType')}
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500"
              >
                <option value="single_choice">{t('common.questionTypes.single_choice')}</option>
                <option value="multiple_choice">{t('common.questionTypes.multiple_choice')}</option>
                <option value="true_false">{t('common.questionTypes.true_false')}</option>
                <option value="essay">{t('common.questionTypes.essay')}</option>
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.questions.colTopic')} *
              </label>
              <input
                type="text"
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Agile, Risk, Scope"
                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500 ${
                  fieldErrors.topic ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {fieldErrors.topic && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.topic}</p>}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.questions.colDifficulty')}
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500"
              >
                <option value="easy">{t('common.difficulties.easy')}</option>
                <option value="medium">{t('common.difficulties.medium')}</option>
                <option value="hard">{t('common.difficulties.hard')}</option>
              </select>
            </div>

            {/* Marks */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.questions.colMarks')}
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Bilingual Question Text */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1 rtl:space-x-reverse">
                <span>{t('instructor.questions.colStatement')} *</span>
                <span className="text-[11px] font-normal text-slate-400">({t('instructor.questions.tabBilingual')})</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {t('instructor.questions.statementEn')}
                </span>
                <textarea
                  rows="3"
                  value={formData.text.en}
                  onChange={(e) => setFormData({ ...formData, text: { ...formData.text, en: e.target.value } })}
                  placeholder="Enter question statement in English..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                  dir="ltr"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {t('instructor.questions.statementAr')}
                </span>
                <textarea
                  rows="3"
                  value={formData.text.ar}
                  onChange={(e) => setFormData({ ...formData, text: { ...formData.text, ar: e.target.value } })}
                  placeholder="أدخل نص السؤال باللغة العربية..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                  dir="rtl"
                />
              </div>
            </div>
            {fieldErrors.text && <p className="text-[11px] text-red-500 font-medium">{fieldErrors.text}</p>}
          </div>

          {/* Question Image (Optional) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                <ImageIcon className="w-4 h-4 text-brand-600" />
                <span>{t('instructor.questions.imageUpload')}</span>
              </span>
              {formData.image && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: null })}
                  className="text-xs text-red-600 hover:underline"
                >
                  {isAr ? 'حذف الصورة' : 'Remove Image'}
                </button>
              )}
            </div>

            {formData.image ? (
              <div className="relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-white p-1">
                <img src={formData.image} alt="Question Diagram" className="max-h-36 rounded object-contain" />
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                {uploadingImage ? (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-brand-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-700">
                      {isAr ? 'انقر لرفع مخطط أو صورة توضيحية للسؤال' : 'Click to upload question image or diagram'}
                    </span>
                    <span className="text-[10px] text-slate-400">{isAr ? 'PNG, JPG, WEBP بحد أقصى 5 ميجابايت' : 'PNG, JPG, WEBP up to 5MB'}</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Answer Options (For Objective Questions) */}
          {formData.type !== 'essay' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('instructor.questions.optionsSection')} *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {formData.type === 'multiple_choice'
                      ? (isAr ? 'اختر كافة الإجابات الصحيحة (اختيار متعدد)' : 'Check all options that are correct (Multiple Select)')
                      : (isAr ? 'حدد الخيار الصحيح الوحيد' : 'Select the single correct option')}
                  </p>
                </div>
                {formData.type !== 'true_false' && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center space-x-1 rtl:space-x-reverse text-xs text-brand-600 font-semibold hover:text-brand-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('instructor.questions.addOption')}</span>
                  </button>
                )}
              </div>

              {fieldErrors.answers && <p className="text-[11px] text-red-500 font-medium">{fieldErrors.answers}</p>}

              <div className="space-y-2.5">
                {formData.options.map((opt, idx) => {
                  const isChecked = formData.correctAnswers.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border transition-colors flex items-start gap-3 ${
                        isChecked ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Checkbox / Radio */}
                      <button
                        type="button"
                        onClick={() => toggleCorrectAnswer(opt.id)}
                        className={`mt-1.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                          formData.type === 'multiple_choice' ? 'rounded-md' : 'rounded-full'
                        } ${
                          isChecked
                            ? 'bg-emerald-600 text-white'
                            : 'border-2 border-slate-300 hover:border-emerald-500'
                        }`}
                        title="Mark as correct answer"
                      >
                        {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                      </button>

                      {/* Option Labels: EN & AR */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={opt.text.en}
                          onChange={(e) => handleOptionChange(idx, 'en', e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + idx)} (English)...`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500"
                          dir="ltr"
                        />
                        <input
                          type="text"
                          value={opt.text.ar}
                          onChange={(e) => handleOptionChange(idx, 'ar', e.target.value)}
                          placeholder={`الخيار ${String.fromCharCode(65 + idx)} (عربي)...`}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500"
                          dir="rtl"
                        />
                      </div>

                      {/* Remove Option Button */}
                      {formData.type !== 'true_false' && formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="mt-1 text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Delete option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bilingual Explanation */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {formData.type === 'essay'
                ? (isAr ? 'معايير التقييم والإجابة النموذجية' : 'Grading Rubric & Ideal Answer Points')
                : (isAr ? 'شرح وتوضيح الإجابة (Explanation)' : 'Explanation & Justification')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <textarea
                rows="2"
                value={formData.explanation.en}
                onChange={(e) => setFormData({ ...formData, explanation: { ...formData.explanation, en: e.target.value } })}
                placeholder="English explanation or evaluation rubric..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
              <textarea
                rows="2"
                value={formData.explanation.ar}
                onChange={(e) => setFormData({ ...formData, explanation: { ...formData.explanation, ar: e.target.value } })}
                placeholder="الشرح أو معايير التقييم باللغة العربية..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                dir="rtl"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3 rtl:space-x-reverse flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50 transition-colors flex items-center space-x-1.5 rtl:space-x-reverse"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('common.save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
