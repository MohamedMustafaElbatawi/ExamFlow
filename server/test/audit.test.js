const http = require('http');
const CRC32 = require('crc-32');
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
    const boundary = '----AuditDocxBoundary' + Date.now();
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

function buildDocxBuffer(questionParagraphs) {
  const bodyXml = questionParagraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join('');

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}</w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const files = [
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: relsXml },
    { name: 'word/document.xml', data: docXml },
  ];

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const crc = (CRC32.buf(dataBuf) >>> 0);
    const size = dataBuf.length;

    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBuf.copy(lh, 30);
    localParts.push(lh, dataBuf);

    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(size, 20);
    ch.writeUInt32LE(size, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    nameBuf.copy(ch, 46);
    centralParts.push(ch);

    offset += lh.length + dataBuf.length;
  });

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

async function runAuditTests() {
  console.log('=== Starting Phase 6: Final Integration, Security & UX Audit Tests ===');
  const uid = Date.now();

  // 1. Authenticate Instructor and primary Student
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
  const student1Token = studentLogin.body.token;
  const student1User = studentLogin.body.user;

  // 2. Create a second distinct student for data isolation testing
  const student2Email = `student2_${uid}@examflow.com`;
  const createStudent2Res = await request(
    'POST',
    '/api/students',
    {
      name: 'Youssef Isolation Test',
      email: student2Email,
      password: 'Password123!',
      phone: '+966512349999',
      category: 'PMP',
    },
    instructorToken
  );
  if (createStudent2Res.status !== 201) throw new Error('Failed to create second student');
  const student2User = createStudent2Res.body.student;

  const student2Login = await request('POST', '/api/auth/login', {
    email: student2Email,
    password: 'Password123!',
  });
  if (student2Login.status !== 200) throw new Error('Student 2 login failed');
  const student2Token = student2Login.body.token;

  console.log('✓ Successfully set up instructor and 2 isolated student accounts');

  // 3. SECURITY CHECK: Unauthorized Student Access to Grading & Instructor APIs
  const unauthorizedGradingRes = await request('GET', '/api/grading/attempts', null, student1Token);
  if (unauthorizedGradingRes.status !== 403) {
    throw new Error(`SECURITY VIOLATION: Expected 403 for student accessing /api/grading/attempts, got ${unauthorizedGradingRes.status}`);
  }

  const unauthorizedGradeQRes = await request(
    'PATCH',
    '/api/grading/attempts/6b0100000000000000000000/grade-question',
    { snapshotId: 'snap_1', scoreAwarded: 10 },
    student1Token
  );
  if (unauthorizedGradeQRes.status !== 403) {
    throw new Error(`SECURITY VIOLATION: Expected 403 for student modifying grades, got ${unauthorizedGradeQRes.status}`);
  }

  const unauthorizedApproveRes = await request(
    'PATCH',
    '/api/grading/attempts/6b0100000000000000000000/approve',
    {},
    student1Token
  );
  if (unauthorizedApproveRes.status !== 403) {
    throw new Error(`SECURITY VIOLATION: Expected 403 for student approving results, got ${unauthorizedApproveRes.status}`);
  }
  console.log('✓ Security check passed: All instructor grading endpoints strictly reject students with 403 Forbidden');

  // 4. Create Questions for Testing: Multiple-Choice Edge Cases & Isolation
  const mcqRes = await request(
    'POST',
    '/api/questions',
    {
      type: 'multiple_choice',
      category: 'PMP',
      topic: 'Quality Control',
      difficulty: 'hard',
      marks: 4,
      text: {
        en: `Which two charts are used in quality control? [${uid}]`,
        ar: `أي مخططين يستخدمان في مراقبة الجودة؟ [${uid}]`,
      },
      options: [
        { id: 'opt_1', letter: 'A', text: { en: 'Pareto Chart', ar: 'مخطط باريتو' } },
        { id: 'opt_2', letter: 'B', text: { en: 'Control Chart', ar: 'مخطط التحكم' } },
        { id: 'opt_3', letter: 'C', text: { en: 'Sprint Burndown', ar: 'مخطط الحرق' } },
      ],
      correctAnswers: ['opt_1', 'opt_2'], // Correct answer keys
      explanation: { en: 'Pareto and Control charts are standard 7 basic quality tools.', ar: 'شرح أدوات الجودة' },
    },
    instructorToken
  );
  if (mcqRes.status !== 201) throw new Error('Failed to create MCQ question: ' + JSON.stringify(mcqRes.body));
  const mcqQuestion = mcqRes.body.question;

  // Create an Exam assigned to BOTH Student 1 and Student 2
  const examRes = await request(
    'POST',
    '/api/exams',
    {
      title: `Audit Integration Exam [${uid}]`,
      category: 'PMP',
      selectionMode: 'manual',
      durationMinutes: 25,
      passingScore: 70,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      questions: [{ question: mcqQuestion._id, marks: 4 }],
      assignedStudents: [student1User._id, student2User._id],
      allowReviewAnswers: true,
    },
    instructorToken
  );
  if (examRes.status !== 201) throw new Error('Failed to create audit exam');
  const exam = examRes.body.exam;

  await request('PATCH', `/api/exams/${exam._id}/publish`, {}, instructorToken);
  console.log('✓ Created and published audit exam assigned to both students');

  // 5. DATA ISOLATION CHECK: Student 1 vs. Student 2 Attempts
  const startStudent1Res = await request('POST', `/api/engine/exams/${exam._id}/start`, null, student1Token);
  const attempt1 = startStudent1Res.body.attempt;
  const snapshotId = startStudent1Res.body.questions[0].snapshotId;

  // Student 2 starts their own attempt
  const startStudent2Res = await request('POST', `/api/engine/exams/${exam._id}/start`, null, student2Token);
  const attempt2 = startStudent2Res.body.attempt;

  // Student 2 maliciously attempts to answer Student 1's attempt
  const crossAnswerRes = await request(
    'PATCH',
    `/api/engine/attempts/${attempt1._id}/answer`,
    {
      snapshotId,
      selectedOptions: ['opt_3'],
      currentQuestionIndex: 0,
    },
    student2Token // Student 2's token!
  );
  if (crossAnswerRes.status !== 404) {
    throw new Error(`SECURITY VIOLATION: Student 2 was able to access Student 1 attempt: ${crossAnswerRes.status}`);
  }

  // Student 2 maliciously attempts to submit Student 1's attempt
  const crossSubmitRes = await request('POST', `/api/engine/attempts/${attempt1._id}/submit`, null, student2Token);
  if (crossSubmitRes.status !== 404) {
    throw new Error(`SECURITY VIOLATION: Student 2 was able to submit Student 1 attempt: ${crossSubmitRes.status}`);
  }
  console.log('✓ Security check passed: Strict student-to-student attempt isolation verified (cross-attempt tampering blocked)');

  // 6. ATTEMPT RECOVERY AFTER PAGE REFRESH
  // Student 1 answers the question
  await request(
    'PATCH',
    `/api/engine/attempts/${attempt1._id}/answer`,
    {
      snapshotId,
      selectedOptions: ['opt_1', 'opt_2'], // Correct answer
      currentQuestionIndex: 0,
    },
    student1Token
  );

  // Simulates refreshing the browser page by re-calling /start
  const refreshRecoveryRes = await request('POST', `/api/engine/exams/${exam._id}/start`, null, student1Token);
  if (refreshRecoveryRes.status !== 200) throw new Error('Attempt recovery failed');
  if (refreshRecoveryRes.body.attempt._id !== attempt1._id) {
    throw new Error('Recovery returned a different attempt ID instead of the in-progress session');
  }
  const restored = refreshRecoveryRes.body.attempt.savedAnswers?.[snapshotId];
  if (!restored || !restored.selectedOptions.includes('opt_1') || !restored.selectedOptions.includes('opt_2')) {
    throw new Error('Saved answer state was not properly restored after browser reload simulation');
  }
  console.log('✓ Attempt recovery verified: active attempt & saved answers fully restored after simulated page refresh');

  // 7. MULTIPLE-CHOICE EXACT-MATCH SCORING EDGE CASES
  // Case A: Student 1 submitted exact match (['opt_1', 'opt_2']) -> Should earn full 4 marks (100%)
  const submit1Res = await request('POST', `/api/engine/attempts/${attempt1._id}/submit`, null, student1Token);
  if (submit1Res.status !== 200) throw new Error('Submit 1 failed');

  // Student 2 answers with EXTRA incorrect selection (['opt_1', 'opt_2', 'opt_3']) -> Should earn 0 marks
  await request(
    'PATCH',
    `/api/engine/attempts/${attempt2._id}/answer`,
    {
      snapshotId,
      selectedOptions: ['opt_1', 'opt_2', 'opt_3'],
      currentQuestionIndex: 0,
    },
    student2Token
  );
  const submit2Res = await request('POST', `/api/engine/attempts/${attempt2._id}/submit`, null, student2Token);
  if (submit2Res.status !== 200) throw new Error('Submit 2 failed');

  // Check scoring in grading review
  const review1 = await request('GET', `/api/grading/attempts/${attempt1._id}`, null, instructorToken);
  const review2 = await request('GET', `/api/grading/attempts/${attempt2._id}`, null, instructorToken);

  if (review1.body.attempt.totalScore !== 4 || review1.body.attempt.percentage !== 100) {
    throw new Error(`Expected Student 1 to receive 4/4 marks for exact match, got ${review1.body.attempt.totalScore}`);
  }
  if (review2.body.attempt.totalScore !== 0 || review2.body.attempt.percentage !== 0) {
    throw new Error(`Expected Student 2 to receive 0 marks for extra incorrect choice, got ${review2.body.attempt.totalScore}`);
  }
  console.log('✓ MCQ exact-match scoring edge cases verified: exact match = 4 pts, extra incorrect choice = 0 pts');

  // 8. REAL TIMER EXPIRATION & AUTOMATIC SUBMISSION TEST
  const expiredExamRes = await request(
    'POST',
    '/api/exams',
    {
      title: `Timer Expiry Exam [${uid}]`,
      category: 'PMP',
      selectionMode: 'manual',
      durationMinutes: 5,
      passingScore: 50,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      questions: [{ question: mcqQuestion._id, marks: 4 }],
      assignedStudents: [student1User._id],
    },
    instructorToken
  );
  const expiredExam = expiredExamRes.body.exam;
  await request('PATCH', `/api/exams/${expiredExam._id}/publish`, {}, instructorToken);

  const startExpRes = await request('POST', `/api/engine/exams/${expiredExam._id}/start`, null, student1Token);
  const expAttempt = startExpRes.body.attempt;

  // Student answers question correctly before timer runs out
  await request(
    'PATCH',
    `/api/engine/attempts/${expAttempt._id}/answer`,
    {
      snapshotId: startExpRes.body.questions[0].snapshotId,
      selectedOptions: ['opt_1', 'opt_2'],
      currentQuestionIndex: 0,
    },
    student1Token
  );

  // Directly update database to simulate timer expiring into the past (beyond 60s grace period)
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examflow');
  }
  const ExamAttempt = require('../src/models/ExamAttempt');
  await ExamAttempt.findByIdAndUpdate(expAttempt._id, {
    examEndTime: new Date(Date.now() - 120000), // 2 minutes ago
  });

  // Now student tries to save an answer after expiration
  const expiredAnswerRes = await request(
    'PATCH',
    `/api/engine/attempts/${expAttempt._id}/answer`,
    {
      snapshotId: startExpRes.body.questions[0].snapshotId,
      selectedOptions: ['opt_1'],
    },
    student1Token
  );
  if (expiredAnswerRes.status !== 400 || expiredAnswerRes.body.isExpired !== true) {
    throw new Error('Expected 400 with isExpired: true when saving after expiration');
  }

  // Verify the attempt was automatically submitted AND answers were properly graded
  const finalizedAttempt = await ExamAttempt.findById(expAttempt._id);
  if (finalizedAttempt.status !== 'auto_submitted') {
    throw new Error(`Expected status 'auto_submitted', got '${finalizedAttempt.status}'`);
  }
  if (finalizedAttempt.totalScore !== 4) {
    throw new Error(`Expected auto-submitted attempt to be graded with 4 pts, got ${finalizedAttempt.totalScore}`);
  }
  console.log('✓ Real timer expiration verified: auto-submitted with correct objective grading and status transition');

  // 9. EXCEL AND WORD IMPORT REGRESSION TESTS
  // Excel (.xlsx) regression
  const wb = XLSX.utils.book_new();
  const wsData = [
    {
      Category: 'PMP',
      Topic: 'Integration',
      Difficulty: 'Medium',
      Type: 'single_choice',
      Marks: 2,
      'Question (EN)': `What is the output of Direct and Manage Project Work? [${uid}]`,
      'Question (AR)': `ما هو مخرج توجيه وإدارة عمل المشروع؟ [${uid}]`,
      'Option A': 'Deliverables',
      'Option B': 'Charter',
      'Correct Answer': 'A',
      Explanation: 'Deliverables are the primary output.',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const excelPreviewRes = await uploadMultipartFile(
    '/api/import/preview',
    'file',
    `audit_import_${uid}.xlsx`,
    xlsxBuffer,
    instructorToken
  );
  if (excelPreviewRes.status !== 200 || excelPreviewRes.body.validCount < 1) {
    throw new Error('Excel import regression check failed');
  }
  console.log('✓ Excel (.xlsx) import regression verified: 1 valid question parsed');

  // Word (.docx) regression
  const docxBuffer = buildDocxBuffer([
    `Question 1: Which risk response is used for positive risks/opportunities? [${uid}]`,
    'A. Exploit',
    'B. Mitigate',
    'C. Avoid',
    'Answer: A',
    'Explanation: Exploit is a strategy for opportunities.',
  ]);

  const docxPreviewRes = await uploadMultipartFile(
    '/api/import/preview',
    'file',
    `audit_import_${uid}.docx`,
    docxBuffer,
    instructorToken
  );
  if (docxPreviewRes.status !== 200 || docxPreviewRes.body.validCount < 1) {
    throw new Error('Word (.docx) import regression check failed');
  }
  console.log('✓ Word (.docx) import regression verified: 1 valid question parsed with Mammoth');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log('\n=== ALL PHASE 6 AUDIT & SECURITY TESTS PASSED SUCCESSFULLY! ===\n');
}

runAuditTests().catch((err) => {
  console.error('\n❌ PHASE 6 AUDIT TEST FAILED:', err);
  process.exit(1);
});
