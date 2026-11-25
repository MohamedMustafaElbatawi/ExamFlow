const http = require('http');

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

async function runExamTests() {
  console.log('=== Starting Exam Builder & Examination Engine Tests ===');

  const uid = Date.now();

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
  const studentUser = studentLogin.body.user;

  // Step 2: Create a seed question in Question Bank to use in exam
  const qRes = await request(
    'POST',
    '/api/questions',
    {
      category: 'PMP',
      topic: 'Schedule Management',
      difficulty: 'medium',
      type: 'single_choice',
      text: {
        en: `Which technique calculates early and late start/finish dates? [${uid}]`,
        ar: `ما هي التقنية المستخدمة لحساب تواريخ البداية والنهاية المبكرة والمتأخرة؟ [${uid}]`,
      },
      options: [
        { id: 'opt_1', text: { en: 'Critical Path Method (CPM)', ar: 'طريقة المسار الحرج' } },
        { id: 'opt_2', text: { en: 'Monte Carlo Analysis', ar: 'تحليل مونت كارلو' } },
        { id: 'opt_3', text: { en: 'Resource Leveling', ar: 'تسوية الموارد' } },
        { id: 'opt_4', text: { en: 'Fast Tracking', ar: 'ضغط الجدول الزمني' } },
      ],
      correctAnswers: ['opt_1'],
      explanation: {
        en: 'Critical Path Method calculates early and late dates without considering resource limitations.',
      },
      marks: 2,
    },
    instructorToken
  );
  if (qRes.status !== 201) throw new Error('Failed to create test question for exam');
  const testQuestion = qRes.body.question;

  // Test 1: Student blocked from Exam Builder (RBAC 403)
  const studentBlockRes = await request('GET', '/api/exams', null, studentToken);
  console.log('1. Student blocked from exam builder status:', studentBlockRes.status);
  if (studentBlockRes.status !== 403) throw new Error('Student access to exam builder was not blocked');

  // Test 2: Create Manual Selection Exam (Draft)
  const now = new Date();
  const startDate = new Date(now.getTime() - 1000 * 60 * 5); // 5 mins ago (open)
  const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours from now

  const createExamRes = await request(
    'POST',
    '/api/exams',
    {
      title: `PMP Mini Simulation Exam [${uid}]`,
      description: 'Practice exam session testing scheduling concepts',
      category: 'PMP',
      selectionMode: 'manual',
      durationMinutes: 30,
      passingScore: 70,
      maxAttempts: 1,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      shuffleQuestions: true,
      shuffleOptions: true,
      allowBackwardNavigation: true,
      autoSubmitOnExpiry: true,
      showResultsImmediately: true,
      assignedStudents: [studentUser._id],
      questions: [{ question: testQuestion._id, marks: 2 }],
    },
    instructorToken
  );
  console.log('2. Create draft exam status:', createExamRes.status, '| id:', createExamRes.body.exam?._id);
  if (createExamRes.status !== 201 || !createExamRes.body.exam?._id) {
    throw new Error('Failed to create exam: ' + JSON.stringify(createExamRes.body));
  }
  const examId = createExamRes.body.exam._id;

  // Test 3: Publish Exam and verify Question Snapshot compilation
  const publishRes = await request('PATCH', `/api/exams/${examId}/publish`, null, instructorToken);
  console.log('3. Publish exam status:', publishRes.status, '| snapshots count:', publishRes.body.exam?.questionSnapshots?.length);
  if (publishRes.status !== 200 || publishRes.body.exam?.questionSnapshots?.length !== 1) {
    throw new Error('Failed to publish exam or compile question snapshots');
  }
  const snapshot = publishRes.body.exam.questionSnapshots[0];
  if (!snapshot.text.en.includes(testQuestion.code) && !snapshot.correctAnswers.includes('opt_1')) {
    throw new Error('Snapshot content does not match question');
  }

  // Test 4: Snapshot Immutability (edit original question in bank -> exam snapshot is unchanged)
  await request(
    'PUT',
    `/api/questions/${testQuestion._id}`,
    {
      text: { en: 'MODIFIED TEXT IN QUESTION BANK THAT SHOULD NOT AFFECT PUBLISHED EXAM' },
      marks: 99,
    },
    instructorToken
  );

  const verifyExamRes = await request('GET', `/api/exams/${examId}`, null, instructorToken);
  const examSnapshotAfterEdit = verifyExamRes.body.exam?.questionSnapshots[0];
  console.log('4. Snapshot immutability check - marks preserved:', examSnapshotAfterEdit?.marks === 2);
  if (examSnapshotAfterEdit?.marks !== 2) {
    throw new Error('Snapshot was mutated! Immutability violated.');
  }

  // Test 5: Student fetches available exams list
  const availableExamsRes = await request('GET', '/api/engine/exams', null, studentToken);
  console.log('5. Student available exams status:', availableExamsRes.status, '| count:', availableExamsRes.body.count);
  if (availableExamsRes.status !== 200 || availableExamsRes.body.count === 0) {
    throw new Error('Student could not see published assigned exam');
  }

  // Test 6: Student views exam instructions
  const instructionsRes = await request('GET', `/api/engine/exams/${examId}/instructions`, null, studentToken);
  console.log('6. Student exam instructions status:', instructionsRes.status, '| canAttempt:', instructionsRes.body.timing?.canAttempt);
  if (instructionsRes.status !== 200 || !instructionsRes.body.timing?.canAttempt) {
    throw new Error('Failed to get exam instructions');
  }

  // Test 7: Student starts exam attempt
  const startAttemptRes = await request('POST', `/api/engine/exams/${examId}/start`, null, studentToken);
  console.log('7. Start exam attempt status:', startAttemptRes.status, '| attemptId:', startAttemptRes.body.attempt?._id);
  if (startAttemptRes.status !== 200 || !startAttemptRes.body.attempt?._id) {
    throw new Error('Failed to start exam attempt: ' + JSON.stringify(startAttemptRes.body));
  }
  const attemptId = startAttemptRes.body.attempt._id;
  const deliveredQuestion = startAttemptRes.body.questions[0];

  // SECURITY CHECK: Verify correct answers and explanation are NOT leaked to student
  if (deliveredQuestion.correctAnswers || deliveredQuestion.explanation) {
    throw new Error('CRITICAL SECURITY LEAK: correctAnswers or explanation leaked in student start API!');
  }
  console.log('7b. Security audit passed: correctAnswers and explanation securely omitted from student API');

  // Test 8: Autosave Answer (Heartbeat)
  const saveAnswerRes = await request(
    'PATCH',
    `/api/engine/attempts/${attemptId}/answer`,
    {
      snapshotId: deliveredQuestion.snapshotId,
      selectedOptions: ['opt_1'],
      textAnswer: '',
      currentQuestionIndex: 0,
    },
    studentToken
  );
  console.log('8. Autosave answer status:', saveAnswerRes.status, '| remainingSeconds:', saveAnswerRes.body.remainingSeconds);
  if (saveAnswerRes.status !== 200 || saveAnswerRes.body.remainingSeconds <= 0) {
    throw new Error('Failed to autosave answer');
  }

  // Test 9: Reload / Resume attempt without loss of saved answers
  const resumeRes = await request('POST', `/api/engine/exams/${examId}/start`, null, studentToken);
  console.log('9. Resume attempt status:', resumeRes.status, '| resumed same attempt:', resumeRes.body.attempt?._id === attemptId);
  const restoredAnswer = resumeRes.body.attempt?.savedAnswers?.[deliveredQuestion.snapshotId];
  if (resumeRes.body.attempt?._id !== attemptId || !restoredAnswer?.selectedOptions?.includes('opt_1')) {
    throw new Error('Failed to restore saved answer upon attempt resume');
  }

  // Test 10: Submit Attempt & Verify Automatic Grading
  const submitRes = await request('POST', `/api/engine/attempts/${attemptId}/submit`, null, studentToken);
  console.log('10. Submit exam attempt status:', submitRes.status, '| score percentage:', submitRes.body.receipt?.percentage);
  if (submitRes.status !== 200 || submitRes.body.receipt?.percentage !== 100) {
    throw new Error('Failed to submit exam attempt or auto-grading calculation error');
  }

  // Test 11: Idempotent Submission (submitting again returns receipt cleanly without error)
  const duplicateSubmitRes = await request('POST', `/api/engine/attempts/${attemptId}/submit`, null, studentToken);
  console.log('11. Idempotent submission check status:', duplicateSubmitRes.status, '| alreadySubmitted:', duplicateSubmitRes.body.alreadySubmitted);
  if (duplicateSubmitRes.status !== 200 || duplicateSubmitRes.body.alreadySubmitted !== true) {
    throw new Error('Submission idempotency failed');
  }

  // Test 12: Attempt Limit Enforcement (maxAttempts = 1 -> starting another attempt fails)
  const secondAttemptRes = await request('POST', `/api/engine/exams/${examId}/start`, null, studentToken);
  console.log('12. Attempt limit enforcement check status:', secondAttemptRes.status);
  if (secondAttemptRes.status !== 400) {
    throw new Error(`Expected 400 for exceeded attempt limit, got ${secondAttemptRes.status}`);
  }

  // Test 13: Duplicate Exam (Instructor)
  const duplicateExamRes = await request('POST', `/api/exams/${examId}/duplicate`, null, instructorToken);
  console.log('13. Duplicate exam status:', duplicateExamRes.status, '| new title:', duplicateExamRes.body.exam?.title);
  if (duplicateExamRes.status !== 201 || !duplicateExamRes.body.exam?.title.startsWith('Copy of')) {
    throw new Error('Failed to duplicate exam');
  }

  console.log('=== ALL EXAM BUILDER & ENGINE TESTS PASSED (13/13) ===');
  process.exit(0);
}

runExamTests().catch((err) => {
  console.error('Exam Builder & Engine test failed:', err);
  process.exit(1);
});
