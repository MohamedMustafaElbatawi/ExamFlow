import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileUp,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  RefreshCw,
  HelpCircle,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { importService } from '../../services/importService';

export const ImportQuestions = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null); // { filename, totalParsed, validCount, invalidCount, duplicateCount, preview: [] }
  const [excludedRows, setExcludedRows] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  // Handle file select
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
      setPreviewData(null);
      setImportSummary(null);
      setExcludedRows(new Set());
    }
  };

  // Upload and generate preview
  const handleUploadAndPreview = async () => {
    if (!file) return;

    setParsing(true);
    setError('');
    try {
      const res = await importService.previewImport(file);
      if (res.success) {
        setPreviewData(res);
        // By default, automatically exclude invalid rows
        const initialExcluded = new Set();
        res.preview.forEach((item, idx) => {
          if (!item.isValid) {
            initialExcluded.add(idx);
          }
        });
        setExcludedRows(initialExcluded);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل معالجة واستخراج الأسئلة من الملف' : 'Failed to parse questions from file'));
    } finally {
      setParsing(false);
    }
  };

  // Toggle row exclusion
  const toggleExcludeRow = (idx) => {
    const updated = new Set(excludedRows);
    if (updated.has(idx)) {
      updated.delete(idx);
    } else {
      updated.add(idx);
    }
    setExcludedRows(updated);
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!previewData) return;

    // Filter out excluded rows
    const questionsToImport = previewData.preview.filter((_, idx) => !excludedRows.has(idx));

    if (questionsToImport.length === 0) {
      setError(isAr ? 'لا توجد أسئلة صالحة محددة للاستيراد' : 'No valid questions selected for import');
      return;
    }

    setImporting(true);
    setError('');
    try {
      const res = await importService.confirmImport(questionsToImport);
      if (res.success) {
        setImportSummary(res.summary);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل إتمام استيراد الأسئلة' : 'Failed to commit question batch'));
    } finally {
      setImporting(false);
    }
  };

  // Compute live counts
  const totalCount = previewData?.preview?.length || 0;
  const activeImportCount = previewData
    ? previewData.preview.filter((_, idx) => !excludedRows.has(idx)).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center font-bold">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {t('instructor.import.title')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('instructor.import.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          {/* Format Guide Toggle */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center space-x-1.5 rtl:space-x-reverse bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Info className="w-4 h-4 text-brand-600" />
            <span>{isAr ? 'دليل الصيغ المدعومة' : 'Supported File Formats'}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Format Guide Expandable Section */}
      {showGuide && (
        <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-white font-bold text-sm flex items-center space-x-2 rtl:space-x-reverse">
              <FileSpreadsheet className="w-4 h-4 text-brand-400" />
              <span>{isAr ? 'معايير وتنسيق الملفات المدعومة' : 'Document Structure & Guidelines'}</span>
            </h3>
            <span className="text-xs text-brand-400 font-mono">XLSX & DOCX</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Excel Guide */}
            <div className="space-y-2">
              <h4 className="font-bold text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'تنسيق ملفات Excel (.xlsx)' : 'Excel (.xlsx) Columns'}</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {isAr
                  ? 'يجب أن يحتوي الصف الأول على عناوين الأعمدة. يدعم النظام كلاً من العناوين الإنجليزية والعربية:'
                  : 'The first row must contain standard column headers. Bilingual headers are fully recognized:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px] bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                <li>Question Text (EN) / Question Text (AR)</li>
                <li>Category (PMP / MPA / Both)</li>
                <li>Topic (e.g. Agile, Risk, Procurement)</li>
                <li>Type (single_choice, multiple_choice, true_false, essay)</li>
                <li>Option A (EN), Option A (AR), Option B (EN)...</li>
                <li>Correct Answer (e.g. A, B or A,C)</li>
                <li>Explanation (EN) / Explanation (AR)</li>
              </ul>
            </div>

            {/* Word Guide */}
            <div className="space-y-2">
              <h4 className="font-bold text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>{isAr ? 'تنسيق مستندات Word (.docx)' : 'Word (.docx) Paragraph Pattern'}</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {isAr
                  ? 'يتم فصل الأسئلة باستخدام أرقام الأسئلة مع الحروف للأجوبة:'
                  : 'Structured paragraphs parsed using Mammoth with automatic image extraction:'}
              </p>
              <pre className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 text-[11px] text-slate-300 font-mono overflow-x-auto">
{`Question 1: What is the primary role of Scrum Master?
Topic: Agile Frameworks
Category: PMP
A) Remove impediments and coach team
B) Assign tasks directly
C) Control project budget
Answer: A
Explanation: Servant leadership principles.`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone Card */}
      {!previewData && !importSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-brand-600 flex items-center justify-center mx-auto mb-2 border border-blue-100">
              <FileUp className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {t('instructor.import.dropzoneTitle')}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t('instructor.import.dropzoneSubtitle')}
            </p>

            <div className="pt-2">
              <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-white">
                <input
                  type="file"
                  accept=".xlsx, .docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-800 font-semibold text-sm">
                    {file.name.endsWith('.xlsx') ? (
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <FileText className="w-6 h-6 text-blue-600" />
                    )}
                    <span>{file.name}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <FileUp className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-700">
                      {t('instructor.import.dropzoneTitle')}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">{t('instructor.import.dropzoneSubtitle')}</span>
                  </>
                )}
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs rtl:space-x-reverse text-left rtl:text-right">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {file && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleUploadAndPreview}
                  disabled={parsing}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 transition-all flex items-center space-x-2 rtl:space-x-reverse"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('instructor.import.parsing')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('instructor.import.parseBtn')}</span>
                      <ArrowIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editable Preview Section */}
      {previewData && !importSummary && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-bold text-slate-900 text-sm">{previewData.filename}</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {totalCount} {isAr ? 'سؤال تم استخراجه' : 'Questions parsed'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium">
                <span className="flex items-center space-x-1 text-emerald-700 rtl:space-x-reverse">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{previewData.validCount} {t('instructor.import.validCount')}</span>
                </span>
                <span className="flex items-center space-x-1 text-red-600 rtl:space-x-reverse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{previewData.invalidCount} {t('instructor.import.invalidCount')}</span>
                </span>
                <span className="flex items-center space-x-1 text-amber-600 rtl:space-x-reverse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{previewData.duplicateCount} {t('instructor.import.duplicateCount')}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => {
                  setPreviewData(null);
                  setFile(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                {t('instructor.import.discardBtn')}
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || activeImportCount === 0}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-40 transition-colors flex items-center space-x-2 rtl:space-x-reverse"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('instructor.import.importing')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {t('instructor.import.confirmImportBtn')} ({activeImportCount})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Questions Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[65vh]">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-center">{t('instructor.import.colExclude')}</th>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">{t('instructor.import.colStatement')}</th>
                    <th className="px-4 py-3">{t('instructor.import.colCourse')}</th>
                    <th className="px-4 py-3">{t('instructor.questions.colType')}</th>
                    <th className="px-4 py-3">{t('instructor.import.colOptions')}</th>
                    <th className="px-4 py-3">{t('instructor.questions.selectCorrectKey')}</th>
                    <th className="px-4 py-3">{t('instructor.import.colStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview.map((q, idx) => {
                    const isExcluded = excludedRows.has(idx);
                    const qText = q.text?.en || q.text?.ar || '—';

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isExcluded
                            ? 'bg-slate-50/80 opacity-50'
                            : q.isValid && !q.isDuplicate
                            ? 'hover:bg-slate-50/70'
                            : !q.isValid
                            ? 'bg-red-50/30'
                            : 'bg-amber-50/30'
                        }`}
                      >
                        {/* Include / Exclude Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleExcludeRow(idx)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>

                        {/* Row # */}
                        <td className="px-4 py-3 font-mono text-slate-400 font-medium whitespace-nowrap">
                          #{q.rowNumber || idx + 1}
                        </td>

                        {/* Statement */}
                        <td className="px-4 py-3 max-w-sm">
                          <p className="font-semibold text-slate-900 line-clamp-2">{qText}</p>
                          {q.text?.ar && q.text?.en && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1" dir="rtl">
                              {q.text.ar}
                            </p>
                          )}
                        </td>

                        {/* Course & Topic */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-50 text-brand-700">
                            {q.category}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5 font-medium truncate max-w-[120px]">
                            {q.topic}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                            {t(`common.questionTypes.${q.type}`, q.type.replace('_', ' '))}
                          </span>
                        </td>

                        {/* Options count */}
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                          {q.options?.length || 0} {t('common.options')}
                        </td>

                        {/* Answer */}
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                          {q.correctAnswers?.length ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px]">
                              {q.correctAnswers.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">—</span>
                          )}
                        </td>

                        {/* Status / Errors */}
                        <td className="px-4 py-3">
                          {q.isValid && !q.isDuplicate && (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px] rtl:space-x-reverse">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{t('common.statuses.active')}</span>
                            </span>
                          )}

                          {q.isDuplicate && (
                            <span className="inline-flex items-center space-x-1 text-amber-700 font-semibold text-[11px] rtl:space-x-reverse" title={q.duplicateWith}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[130px]">{q.duplicateWith}</span>
                            </span>
                          )}

                          {!q.isValid && (
                            <div className="space-y-0.5">
                              {q.errors.map((err, errIdx) => (
                                <p key={errIdx} className="text-[10px] text-red-600 font-medium flex items-center space-x-1 rtl:space-x-reverse">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{err}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Final Summary Card on Completion */}
      {importSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {t('instructor.import.successSummaryTitle')}
          </h2>
          <p className="text-xs text-slate-500">
            {isAr
              ? `تم حفظ ${importSummary.totalImported} سؤال في بنك الأسئلة المركزي، وهي جاهزة الآن للاستخدام في بناء الامتحانات.`
              : `Successfully saved ${importSummary.totalImported} questions into the central Question Bank ready for exam creation.`}
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-around">
            <div>
              <span className="text-slate-400 block">{isAr ? 'تم استيرادها' : 'Imported'}</span>
              <span className="text-lg font-bold text-emerald-600">{importSummary.totalImported}</span>
            </div>
            <div>
              <span className="text-slate-400 block">{isAr ? 'تم تخطيها' : 'Skipped'}</span>
              <span className="text-lg font-bold text-slate-500">{importSummary.totalSkipped}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={() => {
                setImportSummary(null);
                setPreviewData(null);
                setFile(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              {isAr ? 'استيراد ملف آخر' : 'Import Another File'}
            </button>
            <button
              onClick={() => navigate('/instructor/questions')}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              {t('instructor.questions.title')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
