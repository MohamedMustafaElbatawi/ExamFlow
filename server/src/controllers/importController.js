const fs = require('fs');
const path = require('path');
const { parseExcel, parseWord, validateAndCheckDuplicates } = require('../services/importParserService');
const Question = require('../models/Question');
const ActivityLog = require('../models/ActivityLog');

// @desc    Upload file (.xlsx or .docx) and generate validation preview
// @route   POST /api/import/preview
// @access  Private (Instructor only)
const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel (.xlsx) or Word (.docx) file',
      });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let rawQuestions = [];
    if (ext === '.xlsx') {
      rawQuestions = await parseExcel(filePath);
    } else if (ext === '.docx') {
      rawQuestions = await parseWord(filePath);
    } else {
      // Remove temporary file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format. Please upload .xlsx or .docx',
      });
    }

    // Clean up temporary file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // ignore unlink error
      }
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions could be parsed from the uploaded file. Please verify file format and structure.',
      });
    }

    // Validate and check for duplicates
    const validatedQuestions = await validateAndCheckDuplicates(rawQuestions);

    const validCount = validatedQuestions.filter((q) => q.isValid && !q.isDuplicate).length;
    const invalidCount = validatedQuestions.filter((q) => !q.isValid).length;
    const duplicateCount = validatedQuestions.filter((q) => q.isDuplicate).length;

    res.status(200).json({
      success: true,
      filename: req.file.originalname,
      totalParsed: validatedQuestions.length,
      validCount,
      invalidCount,
      duplicateCount,
      preview: validatedQuestions,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};

// @desc    Confirm and batch-import valid questions into Question Bank
// @route   POST /api/import/confirm
// @access  Private (Instructor only)
const confirmImport = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions provided for import',
      });
    }

    const importedQuestions = [];
    const skippedQuestions = [];

    const existingCount = await Question.countDocuments();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Skip invalid items if sent
      const hasEn = q.text?.en && q.text.en.trim().length > 0;
      const hasAr = q.text?.ar && q.text.ar.trim().length > 0;
      if (!hasEn && !hasAr) {
        skippedQuestions.push({ row: q.rowNumber || i + 1, reason: 'Missing question text' });
        continue;
      }

      const category = ['PMP', 'MPA', 'Both'].includes(q.category) ? q.category : 'PMP';
      const prefix = `Q-${category === 'Both' ? 'GEN' : category}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `${prefix}-${existingCount + importedQuestions.length + 1}-${randomSuffix}`;

      const newQ = new Question({
        code,
        category,
        topic: q.topic?.trim() || 'General',
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
        type: ['single_choice', 'multiple_choice', 'true_false', 'essay'].includes(q.type)
          ? q.type
          : 'single_choice',
        text: {
          en: q.text?.en ? q.text.en.trim() : '',
          ar: q.text?.ar ? q.text.ar.trim() : '',
        },
        options: (q.options || []).map((opt, idx) => ({
          id: opt.id || `opt_${idx + 1}`,
          text: {
            en: opt.text?.en || '',
            ar: opt.text?.ar || '',
          },
        })),
        correctAnswers: q.correctAnswers || [],
        explanation: {
          en: q.explanation?.en ? q.explanation.en.trim() : '',
          ar: q.explanation?.ar ? q.explanation.ar.trim() : '',
        },
        marks: Number(q.marks) || 1,
        image: q.image || null,
        status: 'active',
        isArchived: false,
        createdBy: req.user._id,
      });

      await newQ.save();
      importedQuestions.push(newQ);
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTIONS_IMPORTED',
      details: {
        totalImported: importedQuestions.length,
        skipped: skippedQuestions.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Successfully imported ${importedQuestions.length} questions into Question Bank`,
      summary: {
        totalImported: importedQuestions.length,
        totalSkipped: skippedQuestions.length,
        skippedDetails: skippedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get import format guide & template columns
// @route   GET /api/import/template-guide
// @access  Private (Instructor only)
const getTemplateGuide = (req, res) => {
  res.status(200).json({
    success: true,
    excel: {
      columns: [
        { name: 'Question Text (EN)', required: true, description: 'Question text in English' },
        { name: 'Question Text (AR)', required: false, description: 'Question text in Arabic' },
        { name: 'Category', required: true, options: ['PMP', 'MPA', 'Both'], default: 'PMP' },
        { name: 'Topic', required: true, example: 'Agile & Hybrid, Scope Management' },
        { name: 'Type', required: true, options: ['single_choice', 'multiple_choice', 'true_false', 'essay'], default: 'single_choice' },
        { name: 'Option A (EN)', required: true, description: 'First option English text' },
        { name: 'Option A (AR)', required: false, description: 'First option Arabic text' },
        { name: 'Option B (EN)', required: true, description: 'Second option English text' },
        { name: 'Option B (AR)', required: false, description: 'Second option Arabic text' },
        { name: 'Option C (EN)', required: false, description: 'Third option English text' },
        { name: 'Option C (AR)', required: false, description: 'Third option Arabic text' },
        { name: 'Option D (EN)', required: false, description: 'Fourth option English text' },
        { name: 'Option D (AR)', required: false, description: 'Fourth option Arabic text' },
        { name: 'Correct Answer', required: true, example: 'A, B or A,C (comma-separated for multiple choice)' },
        { name: 'Explanation (EN)', required: false, description: 'Explanation shown during review' },
        { name: 'Explanation (AR)', required: false, description: 'Arabic explanation' },
        { name: 'Difficulty', required: false, options: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
        { name: 'Marks', required: false, default: 1 },
      ],
    },
    word: {
      formatStructure: [
        'Question 1: <Text of question>',
        'Topic: <Topic name>',
        'Category: PMP or MPA',
        'Difficulty: Easy / Medium / Hard',
        'A) <First choice>',
        'B) <Second choice>',
        'C) <Third choice>',
        'D) <Fourth choice>',
        'Answer: A',
        'Explanation: <Explanation text>',
      ],
      notes: 'Arabic question numbers and options (سؤال 1: / أ) ب) ج) د) / الإجابة: أ) are also fully supported.',
    },
  });
};

module.exports = {
  previewImport,
  confirmImport,
  getTemplateGuide,
};
