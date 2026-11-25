const http = require('http');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function request(method, pathName, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: pathName,
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body || '{}');
          } catch (e) {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function uploadMultipartFile(urlPath, fieldName, fileName, fileBuffer, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----ExamFlowTestBoundary' + Date.now();
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${token}`,
    };

    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fullBody = Buffer.concat([header, fileBuffer, footer]);

    headers['Content-Length'] = fullBody.length;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: urlPath,
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body || '{}');
          } catch (e) {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function runQuestionTests() {
  console.log('=== Starting Question Bank & Import System Tests ===');

  // Step 1: Login
  const instructorLogin = await request('POST', '/api/auth/login', {
    email: 'instructor@examflow.com',
    password: 'Password123!',
  });
  if (instructorLogin.status !== 200) throw new Error('Instructor login failed');
  const instructorToken = instructorLogin.body.token;

  const studentLogin = await request('POST', '/api/auth/login', {
    email: 'student@examflow.com',
    password: 'Password123!',
  });
  if (studentLogin.status !== 200) throw new Error('Student login failed');
  const studentToken = studentLogin.body.token;

  // Test 1: Student blocked from question bank (RBAC 403)
  const forbiddenRes = await request('GET', '/api/questions', null, studentToken);
  console.log('1. Student RBAC block check status:', forbiddenRes.status);
  if (forbiddenRes.status !== 403) throw new Error('Student access was not blocked with 403');

  // Test 2: Create Single Choice Question (Bilingual)
  const uid = Date.now();
  const singleQ = await request(
    'POST',
    '/api/questions',
    {
      category: 'PMP',
      topic: 'Agile Frameworks',
      difficulty: 'medium',
      type: 'single_choice',
      text: {
        en: `What is the primary role of the Scrum Master during a sprint? [${uid}]`,
        ar: `ما هو الدور الأساسي لمدير سكروم (Scrum Master) أثناء السبرنت؟ [${uid}]`,
      },
      options: [
        { id: 'opt_1', text: { en: 'Remove impediments and coach team', ar: 'إزالة العوائق وتوجيه الفريق' } },
        { id: 'opt_2', text: { en: 'Assign daily tasks directly', ar: 'توزيع المهام اليومية بشكل مباشر' } },
        { id: 'opt_3', text: { en: 'Define product backlog priorities', ar: 'تحديد أولويات قائمة المنتجات' } },
        { id: 'opt_4', text: { en: 'Authorize budget changes', ar: 'اعتماد التغييرات في الميزانية' } },
      ],
      correctAnswers: ['opt_1'],
      explanation: {
        en: 'The Scrum Master acts as a servant-leader by shielding the team and removing obstacles.',
        ar: 'يعمل مدير سكروم كقائد خادم من خلال حماية الفريق وإزالة العقبات.',
      },
      marks: 1,
    },
    instructorToken
  );
  console.log('2. Create single-choice question status:', singleQ.status, '| code:', singleQ.body.question?.code);
  if (singleQ.status !== 201 || !singleQ.body.question?._id) {
    throw new Error('Failed to create single choice question: ' + JSON.stringify(singleQ.body));
  }
  const createdQId = singleQ.body.question._id;

  // Test 3: Create Multiple Choice (Multi-Select) Question
  const multiQ = await request(
    'POST',
    '/api/questions',
    {
      category: 'PMP',
      topic: 'Risk Management',
      difficulty: 'hard',
      type: 'multiple_choice',
      text: {
        en: `Which of the following are valid positive risk (opportunity) response strategies? (Select two) [${uid}]`,
        ar: `أي مما يلي يعد استراتيجيات صالحة للاستجابة للمخاطر الإيجابية (الفرص)؟ (اختر إجابتين) [${uid}]`,
      },
      options: [
        { id: 'opt_1', text: { en: 'Exploit', ar: 'استغلال' } },
        { id: 'opt_2', text: { en: 'Mitigate', ar: 'تخفيف' } },
        { id: 'opt_3', text: { en: 'Share', ar: 'مشاركة' } },
        { id: 'opt_4', text: { en: 'Avoid', ar: 'تجنب' } },
      ],
      correctAnswers: ['opt_1', 'opt_3'],
      marks: 2,
    },
    instructorToken
  );
  console.log('3. Create multiple-choice question status:', multiQ.status, '| answers count:', multiQ.body.question?.correctAnswers?.length);
  if (multiQ.status !== 201 || multiQ.body.question?.correctAnswers?.length !== 2) {
    throw new Error('Failed to create multiple choice question');
  }

  // Test 4: Create True/False Question
  const tfQ = await request(
    'POST',
    '/api/questions',
    {
      category: 'MPA',
      topic: 'Administrative Law',
      difficulty: 'easy',
      type: 'true_false',
      text: {
        en: `Public administrative agencies must operate within the delegated statutory authority. [${uid}]`,
        ar: `يجب على الأجهزة الإدارية العامة العمل ضمن حدود الصلاحيات النظامية المفوضة لها. [${uid}]`,
      },
      options: [
        { id: 'opt_1', text: { en: 'True', ar: 'صحيح' } },
        { id: 'opt_2', text: { en: 'False', ar: 'خطأ' } },
      ],
      correctAnswers: ['opt_1'],
      marks: 1,
    },
    instructorToken
  );
  console.log('4. Create True/False question status:', tfQ.status);
  if (tfQ.status !== 201) throw new Error('Failed to create True/False question');

  // Test 5: Create Essay Question (no options or correct answers required)
  const essayQ = await request(
    'POST',
    '/api/questions',
    {
      category: 'MPA',
      topic: 'Public Policy Formulation',
      difficulty: 'hard',
      type: 'essay',
      text: {
        en: `Discuss the key stages of public policy cycle with a relevant municipal case study. [${uid}]`,
        ar: `ناقش المراحل الرئيسية لدورة السياسة العامة مع دراسة حالة بلدية ذات صلة. [${uid}]`,
      },
      explanation: {
        en: 'Evaluation Rubric: Agenda setting (2 pts), Formulation (3 pts), Implementation (3 pts), Evaluation (2 pts).',
      },
      marks: 10,
    },
    instructorToken
  );
  console.log('5. Create essay question status:', essayQ.status);
  if (essayQ.status !== 201) throw new Error('Failed to create essay question');

  // Test 6: Duplicate Question Rejection (400)
  const dupQ = await request(
    'POST',
    '/api/questions',
    {
      category: 'PMP',
      topic: 'Agile Frameworks',
      text: {
        en: `What is the primary role of the Scrum Master during a sprint? [${uid}]`,
      },
      options: [
        { id: 'opt_1', text: { en: 'A' } },
        { id: 'opt_2', text: { en: 'B' } },
      ],
      correctAnswers: ['opt_1'],
    },
    instructorToken
  );
  console.log('6. Duplicate detection status:', dupQ.status);
  if (dupQ.status !== 400) throw new Error('Duplicate question was not detected');

  // Test 7: Update Question
  const updateRes = await request(
    'PUT',
    `/api/questions/${createdQId}`,
    {
      difficulty: 'hard',
      marks: 1.5,
      explanation: {
        en: 'Updated detailed explanation for the Scrum Master role.',
      },
    },
    instructorToken
  );
  console.log('7. Update question status:', updateRes.status, '| new marks:', updateRes.body.question?.marks);
  if (updateRes.status !== 200 || updateRes.body.question?.marks !== 1.5) {
    throw new Error('Failed to update question');
  }

  // Test 8: Archive & Restore Question
  const archiveRes = await request('PATCH', `/api/questions/${createdQId}/archive`, null, instructorToken);
  console.log('8a. Archive question status:', archiveRes.status, '| isArchived:', archiveRes.body.isArchived);
  if (archiveRes.status !== 200 || archiveRes.body.isArchived !== true) {
    throw new Error('Failed to archive question');
  }

  const restoreRes = await request('PATCH', `/api/questions/${createdQId}/archive`, null, instructorToken);
  console.log('8b. Restore question status:', restoreRes.status, '| isArchived:', restoreRes.body.isArchived);
  if (restoreRes.status !== 200 || restoreRes.body.isArchived !== false) {
    throw new Error('Failed to restore question');
  }

  // Test 9: Image Upload endpoint
  const dummyImage = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');
  const imgUploadRes = await uploadMultipartFile(
    '/api/questions/upload-image',
    'image',
    'sample-diagram.gif',
    dummyImage,
    instructorToken
  );
  console.log('9. Image upload status:', imgUploadRes.status, '| url:', imgUploadRes.body.imageUrl);
  if (imgUploadRes.status !== 200 || !imgUploadRes.body.imageUrl) {
    throw new Error('Image upload failed');
  }

  // Test 10: Excel File Import (.xlsx parsing, validation, duplicate check, preview)
  const sampleExcelRows = [
    {
      'Question Text (EN)': `Which process group involves formal acceptance of deliverables? [${uid}]`,
      'Question Text (AR)': `أي مجموعة عمليات تتضمن القبول الرسمي للمخرجات؟ [${uid}]`,
      'Category': 'PMP',
      'Topic': 'Integration Management',
      'Type': 'single_choice',
      'Option A (EN)': 'Closing Process Group',
      'Option A (AR)': 'مجموعة عمليات الإغلاق',
      'Option B (EN)': 'Executing Process Group',
      'Option B (AR)': 'مجموعة عمليات التنفيذ',
      'Option C (EN)': 'Monitoring & Controlling',
      'Option C (AR)': 'المراقبة والتحكم',
      'Option D (EN)': 'Planning Process Group',
      'Option D (AR)': 'مجموعة عمليات التخطيط',
      'Correct Answer': 'A',
      'Explanation (EN)': 'Closing involves formal acceptance and handover.',
      'Difficulty': 'Easy',
      'Marks': 1,
    },
    {
      // Missing text (malformed row)
      'Category': 'MPA',
      'Topic': 'Policy',
      'Option A (EN)': 'Choice 1',
      'Option B (EN)': 'Choice 2',
      'Correct Answer': 'A',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleExcelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const previewRes = await uploadMultipartFile(
    '/api/import/preview',
    'file',
    'sample_import.xlsx',
    excelBuffer,
    instructorToken
  );
  console.log('10a. Excel import preview status:', previewRes.status, '| totalParsed:', previewRes.body.totalParsed, '| valid:', previewRes.body.validCount, '| invalid:', previewRes.body.invalidCount);
  if (previewRes.status !== 200 || previewRes.body.totalParsed !== 2 || previewRes.body.validCount !== 1 || previewRes.body.invalidCount !== 1) {
    throw new Error('Excel preview parsing or validation failed');
  }

  // Test 11: Confirm and Batch Import the valid question
  const validQuestionToImport = previewRes.body.preview.filter((q) => q.isValid);
  const confirmRes = await request('POST', '/api/import/confirm', { questions: validQuestionToImport }, instructorToken);
  console.log('11. Confirm batch import status:', confirmRes.status, '| imported:', confirmRes.body.summary?.totalImported);
  if (confirmRes.status !== 200 || confirmRes.body.summary?.totalImported !== 1) {
    throw new Error('Batch import confirmation failed');
  }

  // Test 12: Verify Stats & Question List count updated
  const statsRes = await request('GET', '/api/questions/stats', null, instructorToken);
  console.log('12. Question bank stats status:', statsRes.status, '| total active:', statsRes.body.stats?.total);
  if (statsRes.status !== 200 || statsRes.body.stats?.total < 5) {
    throw new Error('Stats did not reflect imported and created questions');
  }

  // Test 13: Bulk Archive
  const bulkArchiveRes = await request('POST', '/api/questions/bulk-archive', { ids: [createdQId] }, instructorToken);
  console.log('13. Bulk archive status:', bulkArchiveRes.status, '| modified:', bulkArchiveRes.body.modifiedCount);
  if (bulkArchiveRes.status !== 200 || bulkArchiveRes.body.modifiedCount !== 1) {
    throw new Error('Bulk archive failed');
  }

  console.log('=== ALL QUESTION BANK & IMPORT TESTS PASSED (13/13) ===');
  process.exit(0);
}

runQuestionTests().catch((err) => {
  console.error('Question Bank test failed:', err);
  process.exit(1);
});
