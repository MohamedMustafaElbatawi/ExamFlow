const http = require('http');
const CRC32 = require('crc-32');

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
    const boundary = '----ExamFlowDocxTest' + Date.now();
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${token}`,
    };

    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`
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

// Generate valid standard .docx ZIP buffer for testing Mammoth import
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

async function runGradingTests() {
  console.log('=== Starting Phase 5: Grading, Results & Notifications Tests ===');
  const uid = Date.now();

  // 1. Log in instructor and student
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
  const studentUser = studentLogin.body.user;

  console.log('✓ Authentication successful for instructor and student');

  // 2. Create questions in Question Bank
  // Q1: Single choice (3 pts)
  const q1Res = await request(
    'POST',
    '/api/questions',
    {
      type: 'single_choice',
      category: 'PMP',
      topic: 'Project Integration Management',
      difficulty: 'medium',
      marks: 3,
      text: { en: `What does the project charter do? [${uid}]`, ar: `ماذا يفعل ميثاق المشروع؟ [${uid}]` },
      options: [
        { id: 'opt_1', letter: 'A', text: { en: 'Authorizes project manager', ar: 'يفوض مدير المشروع' } },
        { id: 'opt_2', letter: 'B', text: { en: 'Defines code commits', ar: 'يحدد التعديلات' } },
      ],
      correctAnswers: ['opt_1'],
      explanation: { en: 'Formally authorizes the project existence', ar: 'يفوض رسميا وجود المشروع' },
    },
    instructorToken
  );
  if (q1Res.status !== 201) throw new Error('Failed creating Q1: ' + JSON.stringify(q1Res.body));
  const q1 = q1Res.body.question;

  // Q2: Multiple choice (4 pts)
  const q2Res = await request(
    'POST',
    '/api/questions',
    {
      type: 'multiple_choice',
      category: 'PMP',
      topic: 'Scope Management',
      difficulty: 'hard',
      marks: 4,
      text: { en: `Select two key scope baseline components. [${uid}]`, ar: `اختر مكونين لخط الأساس [${uid}]` },
      options: [
        { id: 'opt_1', letter: 'A', text: { en: 'WBS', ar: 'هيكل تجزئة العمل' } },
        { id: 'opt_2', letter: 'B', text: { en: 'WBS Dictionary', ar: 'قاموس هيكل تجزئة العمل' } },
        { id: 'opt_3', letter: 'C', text: { en: 'Network diagram', ar: 'مخطط الشبكة' } },
      ],
      correctAnswers: ['opt_1', 'opt_2'],
      explanation: { en: 'Scope baseline contains scope statement, WBS, and WBS dictionary', ar: 'شرح خط الأساس' },
    },
    instructorToken
  );
  if (q2Res.status !== 201) throw new Error('Failed creating Q2: ' + JSON.stringify(q2Res.body));
  const q2 = q2Res.body.question;

  // Q3: True/False (2 pts)
  const q3Res = await request(
    'POST',
    '/api/questions',
    {
      type: 'true_false',
      category: 'PMP',
      topic: 'Quality Management',
      difficulty: 'easy',
      marks: 2,
      text: { en: `Prevention is cheaper than inspection. [${uid}]`, ar: `الوقاية أرخص من الفحص [${uid}]` },
      options: [
        { id: 'opt_1', letter: 'A', text: { en: 'True', ar: 'صح' } },
        { id: 'opt_2', letter: 'B', text: { en: 'False', ar: 'خطأ' } },
      ],
      correctAnswers: ['opt_1'],
      explanation: { en: 'Prevention costs less than inspection in quality management', ar: 'الوقاية أقل كلفة' },
    },
    instructorToken
  );
  if (q3Res.status !== 201) throw new Error('Failed creating Q3: ' + JSON.stringify(q3Res.body));
  const q3 = q3Res.body.question;

  // Q4: Essay question (5 pts)
  const q4Res = await request(
    'POST',
    '/api/questions',
    {
      type: 'essay',
      category: 'PMP',
      topic: 'Risk Management',
      difficulty: 'hard',
      marks: 5,
      text: { en: `Describe secondary risk and residual risk differences. [${uid}]`, ar: `وضح الفرق بين المخاطر الثانوية والمتبقية [${uid}]` },
      options: [],
      correctAnswers: [],
      explanation: { en: 'Secondary risk arises from risk response; residual remains after response', ar: 'شرح المخاطر' },
    },
    instructorToken
  );
  if (q4Res.status !== 201) throw new Error('Failed creating Q4: ' + JSON.stringify(q4Res.body));
  const q4 = q4Res.body.question;

  console.log('✓ Created 4 diverse test questions (Single, Multi, T/F, Essay)');

  // 3. Create & publish exam with all 4 questions (Total Marks = 3 + 4 + 2 + 5 = 14)
  const examRes = await request(
    'POST',
    '/api/exams',
    {
      title: `Grading Integration Exam [${uid}]`,
      description: 'Comprehensive test for Phase 5 grading engine',
      category: 'PMP',
      selectionMode: 'manual',
      durationMinutes: 30,
      passingScore: 70,
      maxAttempts: 2,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      questions: [
        { question: q1._id, marks: 3 },
        { question: q2._id, marks: 4 },
        { question: q3._id, marks: 2 },
        { question: q4._id, marks: 5 },
      ],
      assignedStudents: [studentUser._id],
      allowReviewAnswers: true,
    },
    instructorToken
  );
  if (examRes.status !== 201) throw new Error('Failed creating exam: ' + JSON.stringify(examRes.body));
  const exam = examRes.body.exam;

  const pubExamRes = await request('PATCH', `/api/exams/${exam._id}/publish`, {}, instructorToken);
  if (pubExamRes.status !== 200) throw new Error('Failed publishing exam: ' + JSON.stringify(pubExamRes.body));
  const publishedExam = pubExamRes.body.exam;

  console.log(`✓ Published exam with ${publishedExam.questionSnapshots.length} question snapshots (Total: ${publishedExam.totalMarks} marks)`);

  // 4. Student takes exam:
  // Starts attempt
  const startRes = await request('POST', `/api/engine/exams/${exam._id}/start`, {}, studentToken);
  if (startRes.status !== 200) throw new Error('Failed starting exam: ' + JSON.stringify(startRes.body));
  const attempt = startRes.body.attempt;
  const questions = startRes.body.questions;

  // Find snapshots for each question type
  const snapSingle = questions.find((q) => q.type === 'single_choice');
  const snapMulti = questions.find((q) => q.type === 'multiple_choice');
  const snapTF = questions.find((q) => q.type === 'true_false');
  const snapEssay = questions.find((q) => q.type === 'essay');

  // Student answers:
  // - Single choice: correct ('opt_1') -> +3 marks
  await request(
    'PATCH',
    `/api/engine/attempts/${attempt._id}/answer`,
    {
      snapshotId: snapSingle.snapshotId,
      selectedOptions: ['opt_1'],
      textAnswer: '',
      currentQuestionIndex: 0,
    },
    studentToken
  );

  // - Multiple choice: exact match ('opt_1', 'opt_2') -> +4 marks
  await request(
    'PATCH',
    `/api/engine/attempts/${attempt._id}/answer`,
    {
      snapshotId: snapMulti.snapshotId,
      selectedOptions: ['opt_1', 'opt_2'],
      textAnswer: '',
      currentQuestionIndex: 1,
    },
    studentToken
  );

  // - True/False: incorrect ('opt_2') -> 0 marks
  await request(
    'PATCH',
    `/api/engine/attempts/${attempt._id}/answer`,
    {
      snapshotId: snapTF.snapshotId,
      selectedOptions: ['opt_2'],
      textAnswer: '',
      currentQuestionIndex: 2,
    },
    studentToken
  );

  // - Essay: text response -> 0 marks auto, pending manual instructor grading
  await request(
    'PATCH',
    `/api/engine/attempts/${attempt._id}/answer`,
    {
      snapshotId: snapEssay.snapshotId,
      selectedOptions: [],
      textAnswer: 'Secondary risks are introduced by responses, while residual risks remain.',
      currentQuestionIndex: 3,
    },
    studentToken
  );

  // Submit attempt
  const submitRes = await request('POST', `/api/engine/attempts/${attempt._id}/submit`, {}, studentToken);
  if (submitRes.status !== 200) throw new Error('Submit failed: ' + JSON.stringify(submitRes.body));

  // Check attempt receipt and status
  if (submitRes.body.receipt.gradingStatus !== 'pending_grading') {
    throw new Error(`Expected gradingStatus 'pending_grading', got '${submitRes.body.receipt.gradingStatus}'`);
  }
  console.log('✓ Auto-grading evaluated objective questions (3 + 4 + 0 = 7 pts) and marked status pending_grading');

  // 5. TEST: Student Result Privacy Gate before instructor approval/publication
  const studentResultsBeforePub = await request('GET', '/api/engine/results', null, studentToken);
  const foundAttempt = (studentResultsBeforePub.body.results || []).find((r) => r._id === attempt._id);
  if (foundAttempt) {
    throw new Error('SECURITY VIOLATION: Unpublished exam result exposed in student results list');
  }

  const directResultBeforePub = await request('GET', `/api/engine/results/${attempt._id}`, null, studentToken);
  if (directResultBeforePub.status !== 403) {
    throw new Error(`SECURITY VIOLATION: Expected 403 for unpublished attempt, got ${directResultBeforePub.status}`);
  }
  console.log('✓ Student privacy gate strictly enforced: Unpublished results hidden from student APIs');

  // 6. TEST: Instructor Review, Score Validation, and Manual Essay Grading
  const attemptDetails = await request('GET', `/api/grading/attempts/${attempt._id}`, null, instructorToken);
  if (attemptDetails.status !== 200) throw new Error('Failed to get attempt review');
  if (attemptDetails.body.attempt.totalScore !== 7) {
    throw new Error(`Expected auto-graded score of 7, got ${attemptDetails.body.attempt.totalScore}`);
  }

  // Attempting to award more than max marks (5) should fail with 400
  const invalidScoreRes = await request(
    'PATCH',
    `/api/grading/attempts/${attempt._id}/grade-question`,
    {
      snapshotId: snapEssay.snapshotId,
      scoreAwarded: 99,
      feedback: 'Too high',
    },
    instructorToken
  );
  if (invalidScoreRes.status !== 400) {
    throw new Error(`Expected 400 when exceeding question max marks, got ${invalidScoreRes.status}`);
  }

  // Instructor awards 4.5 pts on essay
  const gradeEssayRes = await request(
    'PATCH',
    `/api/grading/attempts/${attempt._id}/grade-question`,
    {
      snapshotId: snapEssay.snapshotId,
      scoreAwarded: 4.5,
      feedback: 'Good explanation of residual and secondary risks.',
    },
    instructorToken
  );
  if (gradeEssayRes.status !== 200) throw new Error('Failed grading essay: ' + JSON.stringify(gradeEssayRes.body));
  if (gradeEssayRes.body.totalScore !== 11.5) {
    throw new Error(`Expected totalScore 11.5 (7 + 4.5), got ${gradeEssayRes.body.totalScore}`);
  }
  if (gradeEssayRes.body.gradingStatus !== 'ready_for_approval') {
    throw new Error(`Expected gradingStatus 'ready_for_approval', got ${gradeEssayRes.body.gradingStatus}`);
  }
  console.log('✓ Manual essay grading updated total score to 11.5/14 and transitioned status to ready_for_approval');

  // Verify audit trail in gradingHistory
  const updatedAttemptDetails = await request('GET', `/api/grading/attempts/${attempt._id}`, null, instructorToken);
  const history = updatedAttemptDetails.body.attempt.gradingHistory;
  if (!history || history.length === 0) {
    throw new Error('Grading audit history was not recorded');
  }
  console.log(`✓ Audit history verified with ${history.length} logged grading change(s)`);

  // 7. TEST: Result Approval & Publication Workflow
  const approveRes = await request(
    'PATCH',
    `/api/grading/attempts/${attempt._id}/approve`,
    { instructorFeedback: 'Well prepared. Keep up the high standard.' },
    instructorToken
  );
  if (approveRes.status !== 200 || approveRes.body.attempt.gradingStatus !== 'approved') {
    throw new Error('Approval workflow failed');
  }
  console.log('✓ Attempt result approved by instructor');

  const publishRes = await request('PATCH', `/api/grading/attempts/${attempt._id}/publish`, {}, instructorToken);
  if (publishRes.status !== 200 || publishRes.body.attempt.gradingStatus !== 'published') {
    throw new Error('Publish workflow failed');
  }
  console.log('✓ Attempt published to student');

  // Verify in-app notification delivered to student
  const studentNotifs = await request('GET', '/api/notifications', null, studentToken);
  const resultNotif = (studentNotifs.body.notifications || []).find((n) => n.type === 'result_published');
  if (!resultNotif) {
    throw new Error('Expected result_published notification for student');
  }
  console.log('✓ Student received in-app result_published notification');

  // 8. TEST: Student Views Published Result & Detailed Question Review
  const studentResultsAfterPub = await request('GET', '/api/engine/results', null, studentToken);
  const publishedAttemptInList = (studentResultsAfterPub.body.results || []).find((r) => r._id === attempt._id);
  if (!publishedAttemptInList) {
    throw new Error('Published attempt was not returned in student results list');
  }
  if (publishedAttemptInList.totalScore !== 11.5) {
    throw new Error(`Expected student score 11.5, got ${publishedAttemptInList.totalScore}`);
  }

  const studentDetailRes = await request('GET', `/api/engine/results/${attempt._id}`, null, studentToken);
  if (studentDetailRes.status !== 200) {
    throw new Error('Student failed to fetch published result details');
  }
  const review = studentDetailRes.body.result;
  if (!review.questionsReview || review.questionsReview.length !== 4) {
    throw new Error(`Expected 4 questions in review, got ${review.questionsReview?.length}`);
  }
  // Because allowReviewAnswers is true, correctAnswers and explanations must be present
  const singleReview = review.questionsReview.find((q) => q.type === 'single_choice');
  if (!singleReview.correctAnswers || !singleReview.explanation) {
    throw new Error('Expected correctAnswers and explanation when allowReviewAnswers is true');
  }
  console.log('✓ Student accessed published result with full question review and explanations');

  // 9. TEST: Answer Review Privacy Gate (When allowReviewAnswers is false)
  const noReviewExamRes = await request(
    'POST',
    '/api/exams',
    {
      title: `No Review Exam [${uid}]`,
      category: 'PMP',
      selectionMode: 'manual',
      durationMinutes: 15,
      passingScore: 70,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      questions: [{ question: q1._id, marks: 3 }],
      assignedStudents: [studentUser._id],
      allowReviewAnswers: false, // RESTRICTED
    },
    instructorToken
  );
  const noReviewExam = noReviewExamRes.body.exam;
  await request('PATCH', `/api/exams/${noReviewExam._id}/publish`, {}, instructorToken);

  const startNoRev = await request('POST', `/api/engine/exams/${noReviewExam._id}/start`, {}, studentToken);
  const attemptNoRev = startNoRev.body.attempt;
  await request('POST', `/api/engine/attempts/${attemptNoRev._id}/submit`, {}, studentToken);
  await request('PATCH', `/api/grading/attempts/${attemptNoRev._id}/publish`, {}, instructorToken);

  const studentNoRevDetails = await request('GET', `/api/engine/results/${attemptNoRev._id}`, null, studentToken);
  const restrictedQ = studentNoRevDetails.body.result.questionsReview[0];
  if (restrictedQ.correctAnswers !== undefined || restrictedQ.explanation !== undefined) {
    throw new Error('SECURITY VIOLATION: correctAnswers or explanation exposed when allowReviewAnswers is false');
  }
  console.log('✓ Answer review privacy gate verified: Answer keys and explanations omitted when allowReviewAnswers: false');

  // 10. TEST: Batch Publish & Notification Deduplication
  const batchExamRes = await request(
    'POST',
    '/api/exams',
    {
      title: `Batch Exam [${uid}]`,
      category: 'PMP',
      selectionMode: 'manual',
      durationMinutes: 20,
      passingScore: 60,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      questions: [{ question: q3._id, marks: 2 }],
      assignedStudents: [studentUser._id],
      allowReviewAnswers: true,
    },
    instructorToken
  );
  const batchExam = batchExamRes.body.exam;
  await request('PATCH', `/api/exams/${batchExam._id}/publish`, {}, instructorToken);

  const startBatch = await request('POST', `/api/engine/exams/${batchExam._id}/start`, {}, studentToken);
  await request('POST', `/api/engine/attempts/${startBatch.body.attempt._id}/submit`, {}, studentToken);

  const batchPublishRes = await request('PATCH', `/api/grading/exams/${batchExam._id}/publish-all`, {}, instructorToken);
  if (batchPublishRes.status !== 200 || batchPublishRes.body.publishedCount < 1) {
    throw new Error('Batch publish failed: ' + JSON.stringify(batchPublishRes.body));
  }
  console.log(`✓ Batch publishing verified (${batchPublishRes.body.publishedCount} attempt published, ${batchPublishRes.body.notifiedStudentsCount} notified)`);

  // 11. TEST: Exam Cancellation Notification
  const cancelExamRes = await request(
    'POST',
    '/api/exams',
    {
      title: `Cancelled Exam [${uid}]`,
      category: 'MPA',
      selectionMode: 'manual',
      durationMinutes: 15,
      passingScore: 70,
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      questions: [{ question: q3._id, marks: 2 }],
      assignedStudents: [studentUser._id],
    },
    instructorToken
  );
  const cancelExam = cancelExamRes.body.exam;
  const doCancelRes = await request('PATCH', `/api/exams/${cancelExam._id}/cancel`, {}, instructorToken);
  if (doCancelRes.status !== 200) throw new Error('Exam cancel failed');

  const afterCancelNotifs = await request('GET', '/api/notifications', null, studentToken);
  const cancelNotif = (afterCancelNotifs.body.notifications || []).find((n) => n.type === 'exam_cancelled');
  if (!cancelNotif) {
    throw new Error('Expected exam_cancelled notification for student');
  }
  console.log('✓ Exam cancellation notification verified');

  // 12. TEST: Exam Performance & Analytics Report
  const reportRes = await request('GET', `/api/grading/exams/${exam._id}/report`, null, instructorToken);
  if (reportRes.status !== 200) throw new Error('Exam report generation failed');
  const r = reportRes.body.report;
  if (typeof r.overview.passRate !== 'number' || !Array.isArray(r.questionAnalytics)) {
    throw new Error('Invalid report structure');
  }
  console.log(`✓ Exam analytics report verified: pass rate ${r.overview.passRate}%, ${r.questionAnalytics.length} question metrics computed`);

  // 13. TEST: Word (.docx) Import Test using Mammoth
  const docxParagraphs = [
    `Question 1: What document formally authorizes the project manager? [${uid}]`,
    'A. Project Charter',
    'B. Business Case',
    'C. Project Schedule',
    'Answer: A',
    'Explanation: The Project Charter establishes formal authority.',
  ];
  const docxBuffer = buildDocxBuffer(docxParagraphs);

  const docxImportRes = await uploadMultipartFile(
    '/api/import/preview',
    'file',
    `sample_test_${uid}.docx`,
    docxBuffer,
    instructorToken
  );

  if (docxImportRes.status !== 200) {
    throw new Error('Word DOCX import preview failed: ' + JSON.stringify(docxImportRes.body));
  }
  if (!docxImportRes.body.validCount || docxImportRes.body.validCount < 1) {
    throw new Error('Expected at least 1 valid parsed question from Word DOCX');
  }
  console.log(`✓ Word DOCX import verified: parsed ${docxImportRes.body.totalParsed} questions (${docxImportRes.body.validCount} valid) using Mammoth`);

  console.log('\n=== ALL PHASE 5 INTEGRATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runGradingTests().catch((err) => {
  console.error('\n❌ PHASE 5 TEST FAILED:', err);
  process.exit(1);
});
