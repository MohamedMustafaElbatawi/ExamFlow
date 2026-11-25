const XLSX = require('xlsx');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const Question = require('../models/Question');

/**
 * Normalizes question type
 */
const normalizeType = (typeStr, optionsCount, hasOptions) => {
  if (!typeStr) {
    if (!hasOptions) return 'essay';
    return optionsCount === 2 ? 'true_false' : 'single_choice';
  }
  const clean = String(typeStr).toLowerCase().trim().replace(/[\s-]/g, '_');
  if (clean.includes('essay') || clean.includes('مقالي')) return 'essay';
  if (clean.includes('true') || clean.includes('false') || clean.includes('صح') || clean.includes('خطأ')) return 'true_false';
  if (clean.includes('multi_select') || clean.includes('multiple_choice') || clean.includes('متعدد')) return 'multiple_choice';
  return 'single_choice';
};

/**
 * Normalizes category (PMP / MPA / Both)
 */
const normalizeCategory = (catStr) => {
  if (!catStr) return 'PMP';
  const clean = String(catStr).toUpperCase().trim();
  if (clean.includes('MPA')) return 'MPA';
  if (clean.includes('BOTH') || clean.includes('كلا') || clean.includes('الكل')) return 'Both';
  return 'PMP';
};

/**
 * Normalizes difficulty (easy / medium / hard)
 */
const normalizeDifficulty = (diffStr) => {
  if (!diffStr) return 'medium';
  const clean = String(diffStr).toLowerCase().trim();
  if (clean.includes('easy') || clean.includes('سهل')) return 'easy';
  if (clean.includes('hard') || clean.includes('صعب')) return 'hard';
  return 'medium';
};

/**
 * Parse an Excel (.xlsx) file into structured question objects
 */
const parseExcel = async (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const parsedQuestions = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // header is row 1

    // Extract text in EN or AR
    const textEn = (row['Question Text (EN)'] || row['Text_EN'] || row['Question'] || row['Question (EN)'] || row['text_en'] || '').toString().trim();
    const textAr = (row['Question Text (AR)'] || row['Text_AR'] || row['السؤال'] || row['Question (AR)'] || row['text_ar'] || '').toString().trim();

    const topic = (row['Topic'] || row['Category Topic'] || row['الموضوع'] || 'General').toString().trim();
    const category = normalizeCategory(row['Category'] || row['Course'] || row['المسار']);
    const difficulty = normalizeDifficulty(row['Difficulty'] || row['الصعوبة']);
    const marks = Number(row['Marks'] || row['الدرجات'] || 1) || 1;

    // Build options
    const options = [];
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    optionLetters.forEach((letter, idx) => {
      const optEn = (
        row[`Option ${letter} (EN)`] ||
        row[`Option ${letter}`] ||
        row[`Option_${letter}_EN`] ||
        row[`opt_${letter.toLowerCase()}_en`] ||
        row[`Option_${letter}`] ||
        ''
      ).toString().trim();

      const optAr = (
        row[`Option ${letter} (AR)`] ||
        row[`الخيار ${letter}`] ||
        row[`Option_${letter}_AR`] ||
        row[`opt_${letter.toLowerCase()}_ar`] ||
        ''
      ).toString().trim();

      if (optEn || optAr) {
        options.push({
          id: `opt_${idx + 1}`,
          letter,
          text: { en: optEn, ar: optAr },
        });
      }
    });

    // Determine type
    const rawType = row['Type'] || row['Question Type'] || row['النوع'];
    const type = normalizeType(rawType, options.length, options.length > 0);

    // Parse correct answers
    const rawAnswer = (row['Correct Answer'] || row['Answer'] || row['الإجابة'] || '').toString().trim();
    const correctAnswers = [];

    if (type !== 'essay') {
      const answerTokens = rawAnswer.split(/[,;/+]/).map((t) => t.trim().toUpperCase());
      options.forEach((opt) => {
        if (
          answerTokens.includes(opt.letter) ||
          answerTokens.includes(opt.id) ||
          answerTokens.some((t) => t === opt.text.en.toUpperCase() || t === opt.text.ar.toUpperCase())
        ) {
          correctAnswers.push(opt.id);
        }
      });

      // True/False fallback
      if (type === 'true_false' && correctAnswers.length === 0 && options.length === 2) {
        if (rawAnswer.toUpperCase().includes('TRUE') || rawAnswer.includes('صح')) {
          correctAnswers.push(options[0].id);
        } else if (rawAnswer.toUpperCase().includes('FALSE') || rawAnswer.includes('خطأ')) {
          correctAnswers.push(options[1].id);
        }
      }
    }

    const explanationEn = (row['Explanation (EN)'] || row['Explanation'] || row['الشرح'] || '').toString().trim();
    const explanationAr = (row['Explanation (AR)'] || row['التفسير'] || '').toString().trim();

    parsedQuestions.push({
      rowNumber: rowNum,
      category,
      topic,
      difficulty,
      type,
      text: { en: textEn, ar: textAr },
      options,
      correctAnswers,
      explanation: { en: explanationEn, ar: explanationAr },
      marks,
    });
  }

  return parsedQuestions;
};

/**
 * Parse a Word (.docx) file into structured question objects using Mammoth
 */
const parseWord = async (filePath) => {
  const extractedImages = [];

  // Mammoth custom image handler to extract embedded images if present
  const options = {
    convertImage: mammoth.images.imgElement(async (image) => {
      try {
        const imageBuffer = await image.read();
        const ext = image.contentType.split('/')[1] || 'png';
        const filename = `docx-img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const destPath = path.join(__dirname, '../../uploads/questions', filename);
        fs.writeFileSync(destPath, imageBuffer);
        const relativeUrl = `/uploads/questions/${filename}`;
        extractedImages.push(relativeUrl);
        return { src: relativeUrl };
      } catch (e) {
        return { src: '' };
      }
    }),
  };

  const result = await mammoth.extractRawText({ path: filePath });
  const rawText = result.value;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedQuestions = [];
  let currentQ = null;
  let rowCount = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Question start: "Question 1:", "Q1:", "سؤال 1:", "1."
    const qMatch = line.match(/^(?:Question\s*(\d+)[:.]?|Q(\d+)[:.]?|سؤال\s*(\d+)[:.]?|(\d+)[.)])\s*(.*)/i);

    if (qMatch) {
      if (currentQ) {
        parsedQuestions.push(currentQ);
      }

      rowCount++;
      const qText = (qMatch[5] || '').trim();
      const isArabic = /[\u0600-\u06FF]/.test(qText);

      currentQ = {
        rowNumber: rowCount,
        category: 'PMP',
        topic: 'General',
        difficulty: 'medium',
        type: 'single_choice',
        text: {
          en: isArabic ? '' : qText,
          ar: isArabic ? qText : '',
        },
        options: [],
        correctAnswers: [],
        explanation: { en: '', ar: '' },
        marks: 1,
        image: extractedImages[parsedQuestions.length] || null,
      };
      continue;
    }

    if (!currentQ) continue;

    // Metadata lines: "Topic: ...", "Category: ...", "الموضوع: ..."
    if (/^(?:Topic|الموضوع)[:]\s*(.*)/i.test(line)) {
      currentQ.topic = line.replace(/^(?:Topic|الموضوع)[:]\s*/i, '').trim();
      continue;
    }
    if (/^(?:Category|Course|المسار)[:]\s*(.*)/i.test(line)) {
      currentQ.category = normalizeCategory(line.replace(/^(?:Category|Course|المسار)[:]\s*/i, '').trim());
      continue;
    }
    if (/^(?:Difficulty|الصعوبة)[:]\s*(.*)/i.test(line)) {
      currentQ.difficulty = normalizeDifficulty(line.replace(/^(?:Difficulty|الصعوبة)[:]\s*/i, '').trim());
      continue;
    }

    // Option lines: "A) ...", "A. ...", "أ) ..."
    const optMatch = line.match(/^([A-Fأ-ي])[).]\s*(.*)/i);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim();
      const isArabicOpt = /[\u0600-\u06FF]/.test(optText);
      const optId = `opt_${currentQ.options.length + 1}`;

      currentQ.options.push({
        id: optId,
        letter,
        text: {
          en: isArabicOpt ? '' : optText,
          ar: isArabicOpt ? optText : '',
        },
      });
      continue;
    }

    // Answer lines: "Answer: A", "الإجابة: A", "Correct: ..."
    const ansMatch = line.match(/^(?:Answer|Correct Answer|Correct|الإجابة)[:]\s*(.*)/i);
    if (ansMatch) {
      const answerVal = ansMatch[1].trim().toUpperCase();
      currentQ.options.forEach((opt) => {
        if (answerVal.includes(opt.letter)) {
          currentQ.correctAnswers.push(opt.id);
        }
      });
      continue;
    }

    // Explanation lines: "Explanation: ...", "الشرح: ..."
    const expMatch = line.match(/^(?:Explanation|الشرح|التفسير)[:]\s*(.*)/i);
    if (expMatch) {
      const expText = expMatch[1].trim();
      const isArabicExp = /[\u0600-\u06FF]/.test(expText);
      if (isArabicExp) {
        currentQ.explanation.ar = expText;
      } else {
        currentQ.explanation.en = expText;
      }
      continue;
    }

    // Additional text line appending to question text
    if (currentQ.options.length === 0) {
      const isArabicMore = /[\u0600-\u06FF]/.test(line);
      if (isArabicMore) {
        currentQ.text.ar = currentQ.text.ar ? `${currentQ.text.ar} ${line}` : line;
      } else {
        currentQ.text.en = currentQ.text.en ? `${currentQ.text.en} ${line}` : line;
      }
    }
  }

  if (currentQ) {
    parsedQuestions.push(currentQ);
  }

  return parsedQuestions;
};

/**
 * Validate parsed questions, check duplicates against existing database and within file
 */
const validateAndCheckDuplicates = async (questions) => {
  const existingQuestions = await Question.find({ isArchived: false }).select('text code').lean();

  const validatedQuestions = [];
  const fileTextSet = new Set();

  for (const q of questions) {
    const errors = [];
    let isDuplicate = false;
    let duplicateWith = null;

    // 1. Text presence validation
    const hasEn = q.text?.en && q.text.en.trim().length > 0;
    const hasAr = q.text?.ar && q.text.ar.trim().length > 0;
    if (!hasEn && !hasAr) {
      errors.push('Question text is missing (English or Arabic is required)');
    }

    // 2. Options and answers validation
    if (q.type !== 'essay') {
      if (!q.options || q.options.length < 2) {
        errors.push(`At least 2 answer options are required for ${q.type || 'objective'} questions`);
      }
      if (!q.correctAnswers || q.correctAnswers.length === 0) {
        errors.push('No correct answer was identified for this question');
      }
    }

    // 3. Topic validation
    if (!q.topic || q.topic.trim().length === 0) {
      q.topic = 'General';
    }

    // 4. Duplicate detection
    const normalizedEn = (q.text?.en || '').toLowerCase().trim();
    const normalizedAr = (q.text?.ar || '').trim();

    // Check duplicate within the same uploaded file
    const fileKey = normalizedEn || normalizedAr;
    if (fileKey) {
      if (fileTextSet.has(fileKey)) {
        isDuplicate = true;
        duplicateWith = 'Duplicate within this uploaded file';
      } else {
        fileTextSet.add(fileKey);
      }
    }

    // Check duplicate against existing database questions
    if (!isDuplicate && (normalizedEn || normalizedAr)) {
      const dbMatch = existingQuestions.find((eq) => {
        const eqEn = (eq.text?.en || '').toLowerCase().trim();
        const eqAr = (eq.text?.ar || '').trim();
        return (normalizedEn && eqEn === normalizedEn) || (normalizedAr && eqAr === normalizedAr);
      });

      if (dbMatch) {
        isDuplicate = true;
        duplicateWith = `Matches existing question code ${dbMatch.code}`;
      }
    }

    validatedQuestions.push({
      ...q,
      isValid: errors.length === 0,
      errors,
      isDuplicate,
      duplicateWith,
    });
  }

  return validatedQuestions;
};

module.exports = {
  parseExcel,
  parseWord,
  validateAndCheckDuplicates,
};
