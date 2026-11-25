import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  HelpCircle,
  Users,
  Settings,
  Shuffle,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Loader2,
  Layers,
} from 'lucide-react';
import { examService } from '../../services/examService';
import { questionService } from '../../services/questionService';
import { studentService } from '../../services/studentService';

export const ExamBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const isEdit = !!id;

  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PMP',
    selectionMode: 'manual', // manual | random | hybrid
    durationMinutes: 60,
    passingScore: 70,
    maxAttempts: 1,
    startDate: new Date(Date.now() + 1000 * 60 * 10).toISOString().slice(0, 16), // 10 mins from now
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16), // 7 days from now
    shuffleQuestions: true,
    shuffleOptions: true,
    allowBackwardNavigation: true,
    autoSubmitOnExpiry: true,
    showResultsImmediately: false,
    allowReviewAnswers: false,
    assignedStudents: [],
    questions: [], // [{ questionId, code, text, marks, topic }]
    randomConfig: [{ topic: 'all', difficulty: 'all', count: 5, marksPerQuestion: 1 }],
  });

  // Auxiliary data
  const [bankQuestions, setBankQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [topics, setTopics] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTopicFilter, setBankTopicFilter] = useState('all');

  // Load existing exam for edit if ID is provided
  useEffect(() => {
    if (isEdit) {
      loadExam(id);
    }
    loadAuxiliaryData();
  }, [id, isEdit]);

  const loadExam = async (examId) => {
    setLoading(true);
    try {
      const res = await examService.getExamById(examId);
      if (res.success && res.exam) {
        const e = res.exam;
        setFormData({
          title: e.title || '',
          description: e.description || '',
          category: e.category || 'PMP',
          selectionMode: e.selectionMode || 'manual',
          durationMinutes: e.durationMinutes || 60,
          passingScore: e.passingScore || 70,
          maxAttempts: e.maxAttempts || 1,
          startDate: new Date(e.startDate).toISOString().slice(0, 16),
          endDate: new Date(e.endDate).toISOString().slice(0, 16),
          shuffleQuestions: e.shuffleQuestions ?? true,
          shuffleOptions: e.shuffleOptions ?? true,
          allowBackwardNavigation: e.allowBackwardNavigation ?? true,
          autoSubmitOnExpiry: e.autoSubmitOnExpiry ?? true,
          showResultsImmediately: e.showResultsImmediately ?? false,
          allowReviewAnswers: e.allowReviewAnswers ?? false,
          assignedStudents: (e.assignedStudents || []).map((s) => s._id || s),
          questions: (e.questions || []).map((q) => ({
            questionId: q.question?._id || q.question,
            code: q.question?.code,
            text: q.question?.text?.en || q.question?.text?.ar,
            marks: q.marks || 1,
            topic: q.question?.topic,
          })),
          randomConfig: e.randomConfig?.length
            ? e.randomConfig
            : [{ topic: 'all', difficulty: 'all', count: 5, marksPerQuestion: 1 }],
        });
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    try {
      const [qRes, sRes, tRes] = await Promise.all([
        questionService.getQuestions({ limit: 100, status: 'active' }),
        studentService.getStudents({ limit: 100, status: 'active' }),
        questionService.getTopics(),
      ]);
      if (qRes.success) setBankQuestions(qRes.questions);
      if (sRes.success) setStudents(sRes.students);
      if (tRes.success) setTopics(tRes.topics);
    } catch (e) {
      console.warn('Could not load auxiliary bank data');
    }
  };

  // Toggle question selection in manual mode
  const toggleSelectQuestion = (q) => {
    const exists = formData.questions.some((item) => item.questionId === q._id);
    if (exists) {
      setFormData({
        ...formData,
        questions: formData.questions.filter((item) => item.questionId !== q._id),
      });
    } else {
      setFormData({
        ...formData,
        questions: [
          ...formData.questions,
          {
            questionId: q._id,
            code: q.code,
            text: q.text?.en || q.text?.ar,
            marks: q.marks || 1,
            topic: q.topic,
          },
        ],
      });
    }
  };

  // Modify individual question marks
  const handleQuestionMarksChange = (idx, marksVal) => {
    const updated = [...formData.questions];
    updated[idx].marks = Number(marksVal) || 1;
    setFormData({ ...formData, questions: updated });
  };

  // Random pool rule management
  const addRandomRule = () => {
    setFormData({
      ...formData,
      randomConfig: [
        ...formData.randomConfig,
        { topic: 'all', difficulty: 'all', count: 5, marksPerQuestion: 1 },
      ],
    });
  };

  const updateRandomRule = (idx, field, value) => {
    const updated = [...formData.randomConfig];
    updated[idx][field] = field === 'count' || field === 'marksPerQuestion' ? Number(value) : value;
    setFormData({ ...formData, randomConfig: updated });
  };

  const removeRandomRule = (idx) => {
    if (formData.randomConfig.length <= 1) return;
    setFormData({
      ...formData,
      randomConfig: formData.randomConfig.filter((_, i) => i !== idx),
    });
  };

  // Student selection helpers
  const toggleSelectStudent = (sid) => {
    const exists = formData.assignedStudents.includes(sid);
    const updated = exists
      ? formData.assignedStudents.filter((id) => id !== sid)
      : [...formData.assignedStudents, sid];
    setFormData({ ...formData, assignedStudents: updated });
  };

  const handleSelectAllStudentsByTrack = (track) => {
    const matching = students
      .filter((s) => track === 'all' || s.category === track || s.category === 'Both')
      .map((s) => s._id);
    setFormData({ ...formData, assignedStudents: matching });
  };

  // Calculate live question totals
  const manualCount = formData.questions.length;
  const manualMarks = formData.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
  const randomEstimatedCount = formData.randomConfig.reduce((acc, r) => acc + (r.count || 0), 0);
  const randomEstimatedMarks = formData.randomConfig.reduce(
    (acc, r) => acc + (r.count || 0) * (r.marksPerQuestion || 1),
    0
  );

  const totalCalculatedQuestions =
    formData.selectionMode === 'manual'
      ? manualCount
      : formData.selectionMode === 'random'
      ? randomEstimatedCount
      : manualCount + randomEstimatedCount;

  const totalCalculatedMarks =
    formData.selectionMode === 'manual'
      ? manualMarks
      : formData.selectionMode === 'random'
      ? randomEstimatedMarks
      : manualMarks + randomEstimatedMarks;

  // Save / Publish
  const handleSaveExam = async (shouldPublish = false) => {
    setError('');

    if (!formData.title.trim()) {
      setError(isAr ? 'يرجى إدخال عنوان الامتحان' : 'Exam title is required');
      setActiveStep(1);
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError(isAr ? 'تاريخ نهاية الامتحان يجب أن يكون بعد تاريخ البدء' : 'End date must be after start date');
      setActiveStep(1);
      return;
    }

    if (formData.selectionMode === 'manual' && formData.questions.length === 0) {
      setError(isAr ? 'يرجى اختيار سؤال واحد على الأقل للاختبار اليدوي' : 'Please select at least 1 question');
      setActiveStep(3);
      return;
    }

    setSubmitting(true);
    try {
      let examId = id;
      if (isEdit) {
        const res = await examService.updateExam(id, formData);
        examId = res.exam._id;
      } else {
        const res = await examService.createExam(formData);
        examId = res.exam._id;
      }

      if (shouldPublish) {
        await examService.publishExam(examId);
      }

      navigate('/instructor/exams');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: t('instructor.builder.step1'), icon: Settings },
    { num: 2, title: isAr ? 'ضوابط الأمان' : 'Security & Rules', icon: Shuffle },
    { num: 3, title: t('instructor.builder.step2'), icon: HelpCircle },
    { num: 4, title: t('instructor.builder.step3'), icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={() => navigate('/instructor/exams')}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEdit
                ? t('instructor.builder.titleEdit')
                : t('instructor.builder.title')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('instructor.exams.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Wizard Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.num;
          const isDone = activeStep > step.num;

          return (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              className={`p-3.5 rounded-xl border text-left rtl:text-right transition-all flex items-center space-x-3 rtl:space-x-reverse ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : step.num}
              </div>
              <span className="text-xs font-semibold truncate">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2.5 text-red-700 text-xs rtl:space-x-reverse">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Wizard Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[420px]">
        {/* STEP 1: General Info */}
        {activeStep === 1 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {t('instructor.builder.step1')}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.builder.examTitleLabel')}
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('instructor.builder.examTitlePlaceholder')}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('instructor.builder.examDescLabel')}
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('instructor.builder.examDescPlaceholder')}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('instructor.builder.courseTrackLabel')}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="PMP">PMP</option>
                  <option value="MPA">MPA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('instructor.builder.durationLabel')}
                </label>
                <input
                  type="number"
                  min="5"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) || 60 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('instructor.builder.passingScoreLabel')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) || 70 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('instructor.builder.startDateLabel')}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('instructor.builder.endDateLabel')}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('instructor.builder.maxAttemptsLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: Number(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Security & Exam Rules */}
        {activeStep === 2 && (
          <div className="space-y-5 max-w-3xl">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {t('instructor.builder.settingsHeading')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shuffle Questions */}
              <label className="flex items-start space-x-3 rtl:space-x-reverse p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('instructor.builder.shuffleQuestions')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isAr
                      ? 'يتم تقديم الأسئلة بترتيب عشوائي مختلف لكل طالب'
                      : 'Delivers questions in randomized order for each candidate attempt'}
                  </span>
                </div>
              </label>

              {/* Shuffle Options */}
              <label className="flex items-start space-x-3 rtl:space-x-reverse p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.shuffleOptions}
                  onChange={(e) => setFormData({ ...formData, shuffleOptions: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('instructor.builder.shuffleOptions')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isAr
                      ? 'يبدل مواقع الخيارات (A, B, C, D) لكل طالب لمنع الغش'
                      : 'Shuffles option choices (A, B, C, D) dynamically to prevent copying'}
                  </span>
                </div>
              </label>

              {/* Backward Navigation */}
              <label className="flex items-start space-x-3 rtl:space-x-reverse p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowBackwardNavigation}
                  onChange={(e) => setFormData({ ...formData, allowBackwardNavigation: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('instructor.builder.allowBackward')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isAr
                      ? 'عند التعطيل، لا يمكن للطالب العودة للسؤال بعد الانتقال منه'
                      : 'When disabled, locks navigation forward only to simulate strict exams'}
                  </span>
                </div>
              </label>

              {/* Auto Submit */}
              <label className="flex items-start space-x-3 rtl:space-x-reverse p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoSubmitOnExpiry}
                  onChange={(e) => setFormData({ ...formData, autoSubmitOnExpiry: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('instructor.builder.autoSubmit')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isAr
                      ? 'يرسل الامتحان ويحفظ الإجابات بمجرد انتهاء المؤقت التنازلي'
                      : 'Enforces automatic submission by the server immediately upon countdown end'}
                  </span>
                </div>
              </label>

              {/* Show Results Immediately */}
              <label className="flex items-start space-x-3 rtl:space-x-reverse p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showResultsImmediately}
                  onChange={(e) => setFormData({ ...formData, showResultsImmediately: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('instructor.builder.showImmediate')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isAr
                      ? 'يعرض درجات الأسئلة الموضوعية مباشرة في إيصال التسليم'
                      : 'Displays objective score on submission receipt without waiting for review'}
                  </span>
                </div>
              </label>

              {/* Allow Review Answers */}
              <label className="flex items-start space-x-3 rtl:space-x-reverse p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowReviewAnswers}
                  onChange={(e) => setFormData({ ...formData, allowReviewAnswers: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('instructor.builder.allowReview')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isAr
                      ? 'يمكن الطالب من استعراض الإجابات الصحيحة والتفسير بعد اعتماد النتيجة'
                      : 'Permits candidate to inspect correct answers and explanations after release'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: Questions Selection (Manual, Random, Hybrid) */}
        {activeStep === 3 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {t('instructor.builder.selectionModeLabel')}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'اختر بين الانتقاء اليدوي، السحب العشوائي، أو الجمع بينهما' : 'Choose manual selection, random draw pools, or a hybrid combination'}
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selectionMode: 'manual' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    formData.selectionMode === 'manual'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('instructor.builder.modes.manual')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selectionMode: 'random' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    formData.selectionMode === 'random'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('instructor.builder.modes.random')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selectionMode: 'hybrid' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    formData.selectionMode === 'hybrid'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('instructor.builder.modes.hybrid')}
                </button>
              </div>
            </div>

            {/* Live Tally Bar */}
            <div className="bg-brand-50 p-3.5 rounded-xl border border-brand-200 flex items-center justify-between text-xs font-semibold text-brand-900">
              <span className="flex items-center space-x-2 rtl:space-x-reverse">
                <HelpCircle className="w-4 h-4 text-brand-600" />
                <span>
                  {t('instructor.builder.selectedQuestionsCount')} {totalCalculatedQuestions}
                </span>
              </span>
              <span>
                {t('instructor.builder.totalMarksSum')} {totalCalculatedMarks}
              </span>
            </div>

            {/* RANDOM POOL RULES (for Random & Hybrid) */}
            {['random', 'hybrid'].includes(formData.selectionMode) && (
              <div className="space-y-3 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Shuffle className="w-4 h-4 text-purple-600" />
                    <span>{t('instructor.builder.randomSelectTitle')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={addRandomRule}
                    className="flex items-center space-x-1 rtl:space-x-reverse text-xs text-purple-700 font-semibold hover:text-purple-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('instructor.builder.addRandomRule')}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.randomConfig.map((rule, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-white p-3 rounded-lg border border-purple-100 items-center"
                    >
                      {/* Topic */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">{t('instructor.builder.ruleTopic')}</label>
                        <select
                          value={rule.topic}
                          onChange={(e) => updateRandomRule(idx, 'topic', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                        >
                          <option value="all">{t('instructor.questions.allTopics')}</option>
                          {topics.map((top) => (
                            <option key={top} value={top}>{top}</option>
                          ))}
                        </select>
                      </div>

                      {/* Difficulty */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">{t('instructor.builder.ruleDifficulty')}</label>
                        <select
                          value={rule.difficulty}
                          onChange={(e) => updateRandomRule(idx, 'difficulty', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                        >
                          <option value="all">{t('instructor.questions.allDifficulties')}</option>
                          <option value="easy">{t('common.difficulties.easy')}</option>
                          <option value="medium">{t('common.difficulties.medium')}</option>
                          <option value="hard">{t('common.difficulties.hard')}</option>
                        </select>
                      </div>

                      {/* Count */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">{t('instructor.builder.ruleCount')}</label>
                        <input
                          type="number"
                          min="1"
                          value={rule.count}
                          onChange={(e) => updateRandomRule(idx, 'count', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md"
                        />
                      </div>

                      {/* Marks per Question */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">{t('instructor.builder.ruleMarks')}</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={rule.marksPerQuestion}
                          onChange={(e) => updateRandomRule(idx, 'marksPerQuestion', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="flex justify-end pt-3 sm:pt-0">
                        {formData.randomConfig.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRandomRule(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Remove rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MANUAL QUESTION PICKER (for Manual & Hybrid) */}
            {['manual', 'hybrid'].includes(formData.selectionMode) && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('instructor.builder.manualSelectTitle')} ({formData.questions.length})
                  </span>

                  {/* Search and Topic filter in picker */}
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder={t('instructor.builder.searchInBank')}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg w-40 sm:w-56"
                    />
                    <select
                      value={bankTopicFilter}
                      onChange={(e) => setBankTopicFilter(e.target.value)}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="all">{t('instructor.questions.allTopics')}</option>
                      {topics.map((top) => (
                        <option key={top} value={top}>{top}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Question List in Bank */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {bankQuestions
                    .filter((q) => {
                      const matchCategory = q.category === formData.category || q.category === 'Both';
                      const matchTopic = bankTopicFilter === 'all' || q.topic === bankTopicFilter;
                      const matchSearch =
                        !bankSearch ||
                        (q.text?.en && q.text.en.toLowerCase().includes(bankSearch.toLowerCase())) ||
                        (q.text?.ar && q.text.ar.includes(bankSearch)) ||
                        q.code.toLowerCase().includes(bankSearch.toLowerCase());
                      return matchCategory && matchTopic && matchSearch;
                    })
                    .map((q) => {
                      const isSelected = formData.questions.some((item) => item.questionId === q._id);
                      const qItem = formData.questions.find((item) => item.questionId === q._id);

                      return (
                        <div
                          key={q._id}
                          className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                            isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <label className="flex items-start space-x-2.5 rtl:space-x-reverse flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectQuestion(q)}
                              className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <div>
                              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-0.5">
                                <span className="font-mono text-[10px] font-bold text-slate-400">{q.code}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700">
                                  {q.topic}
                                </span>
                                <span className="text-[10px] text-purple-600 uppercase font-semibold">
                                  {t(`common.questionTypes.${q.type}`, q.type.replace('_', ' '))}
                                </span>
                              </div>
                              <p className="font-medium text-slate-800 line-clamp-1">
                                {isAr ? q.text?.ar || q.text?.en : q.text?.en || q.text?.ar}
                              </p>
                            </div>
                          </label>

                          {/* Editable marks for selected question */}
                          {isSelected && (
                            <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-shrink-0">
                              <span className="text-[11px] text-slate-500">{t('common.score')}:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={qItem?.marks || 1}
                                onChange={(e) => {
                                  const idx = formData.questions.findIndex((item) => item.questionId === q._id);
                                  if (idx > -1) handleQuestionMarksChange(idx, e.target.value);
                                }}
                                className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs text-center font-bold"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Student Assignment */}
        {activeStep === 4 && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {t('instructor.builder.assignedStudentsHeading')}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? `تم تعيين (${formData.assignedStudents.length}) طالب لهذا الامتحان`
                    : `Currently (${formData.assignedStudents.length}) students selected for this session`}
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => handleSelectAllStudentsByTrack(formData.category)}
                  className="px-2.5 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isAr ? `تحديد كافة طلاب ${formData.category}` : `Select All ${formData.category}`}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllStudentsByTrack('all')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  {t('common.all')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assignedStudents: [] })}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-semibold"
                >
                  {isAr ? 'مسح التحديد' : 'Clear'}
                </button>
              </div>
            </div>

            {/* Students List */}
            <div className="border border-slate-200 rounded-xl max-h-80 overflow-y-auto divide-y divide-slate-100">
              {students.map((s) => {
                const isSelected = formData.assignedStudents.includes(s._id);
                return (
                  <label
                    key={s._id}
                    className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStudent(s._id)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 block">{s.name}</span>
                        <span className="text-[11px] text-slate-400 block">{s.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {s.category}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Wizard Bottom Navigation & Save Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        {/* Previous Step */}
        <button
          type="button"
          disabled={activeStep === 1}
          onClick={() => setActiveStep(activeStep - 1)}
          className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('common.previous')}</span>
        </button>

        {/* Right Actions: Next Step / Save Draft / Publish */}
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          {activeStep < 4 ? (
            <button
              type="button"
              onClick={() => setActiveStep(activeStep + 1)}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
            >
              <span>{t('common.next')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <>
              {/* Save Draft */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveExam(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{t('instructor.builder.saveDraft')}</span>
              </button>

              {/* Publish Exam */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveExam(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50 flex items-center space-x-1.5 rtl:space-x-reverse transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.saving')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('instructor.builder.publishNow')}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
