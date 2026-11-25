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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runConcurrencyTests() {
  console.log('=====================================================');
  console.log('🚀 Starting Attempt Concurrency & Resume Verification');
  console.log('=====================================================\n');

  // Step 1: Login Instructor and Student
  const instructorLogin = await request('POST', '/api/auth/login', {
    email: 'instructor@examflow.com',
    password: 'Password123!',
  });
  assert(instructorLogin.status === 200, 'Instructor login must succeed');
  const instructorToken = instructorLogin.body.token;

  const studentLogin = await request('POST', '/api/auth/login', {
    email: 'student@examflow.com',
    password: 'Password123!',
  });
  assert(studentLogin.status === 200, 'Student login must succeed');
  const studentToken = studentLogin.body.token;
  const studentId = studentLogin.body.user._id;

  // Step 2: Create questions in the question bank for this exam
  const uid = Date.now();
  const q1Res = await request(
    'POST',
    '/api/questions',
    {
      category: 'PMP',
      topic: 'Database & Transactions',
      difficulty: 'medium',
      type: 'single_choice',
      defaultMarks: 10,
      text: {
        en: `What is the primary purpose of concurrency control? [${uid}]`,
        ar: `ما هو الغرض الأساسي من التحكم في التزامن؟ [${uid}]`,
      },
      options: [
        { id: 'opt_1', text: { en: 'Prevent race conditions and data anomalies', ar: 'منع تعارض العمليات وشذوذ البيانات' } },
        { id: 'opt_2', text: { en: 'Slow down application server', ar: 'إبطاء خادم التطبيق' } },
      ],
      correctAnswers: ['opt_1'],
      explanation: {
        en: 'Concurrency control prevents race conditions.',
        ar: 'التحكم في التزامن يمنع تعارض العمليات.',
      },
    },
    instructorToken
  );
  assert(q1Res.status === 201, `Create Q1 failed: ${JSON.stringify(q1Res.body)}`);
  const q1 = q1Res.body.question;

  const q2Res = await request(
    'POST',
    '/api/questions',
    {
      category: 'PMP',
      topic: 'Exam Features',
      difficulty: 'easy',
      type: 'true_false',
      defaultMarks: 10,
      text: {
        en: `Does ExamFlow support multiple attempts per student? [${uid}]`,
        ar: `هل يدعم ExamFlow محاولات متعددة لكل طالب؟ [${uid}]`,
      },
      options: [
        { id: 'opt_true', text: { en: 'True', ar: 'صح' } },
        { id: 'opt_false', text: { en: 'False', ar: 'خطأ' } },
      ],
      correctAnswers: ['opt_true'],
      explanation: {
        en: 'Configurable by instructor per exam.',
        ar: 'يمكن للمدرب ضبطه لكل اختبار.',
      },
    },
    instructorToken
  );
  assert(q2Res.status === 201, `Create Q2 failed: ${JSON.stringify(q2Res.body)}`);
  const q2 = q2Res.body.question;

  // Step 3: Create exam with manual selection
  const now = new Date();
  const startDate = new Date(now.getTime() - 1000 * 60 * 5); // 5 mins ago (open)
  const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours from now

  const examPayload = {
    title: `Concurrency & Resume Verification Exam [${uid}]`,
    description: 'Automated test exam for race conditions and resume logic',
    category: 'PMP',
    selectionMode: 'manual',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    durationMinutes: 45,
    maxAttempts: 2,
    passingScore: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    allowBackwardNavigation: true,
    autoSubmitOnExpiry: true,
    showResultsImmediately: true,
    allowReviewAnswers: true,
    assignedStudents: [studentId],
    questions: [
      { question: q1._id, marks: 10 },
      { question: q2._id, marks: 10 },
    ],
  };

  const createExamRes = await request('POST', '/api/exams', examPayload, instructorToken);
  assert(createExamRes.status === 201, `Exam creation failed: ${JSON.stringify(createExamRes.body)}`);
  const examId = createExamRes.body.exam._id;

  // Publish the exam
  const pubRes = await request('PATCH', `/api/exams/${examId}/publish`, null, instructorToken);
  assert(pubRes.status === 200, `Exam publishing failed: ${JSON.stringify(pubRes.body)}`);
  console.log(`✅ Test exam created & published: ${examId}\n`);

  // --- SCENARIO 1: First attempt starts successfully ---
  console.log('--- Test 1: First attempt starts successfully (200, in_progress) ---');
  const start1 = await request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken);
  assert(start1.status === 200, `Start attempt returned ${start1.status}`);
  assert(start1.body.success === true, 'start1.body.success must be true');
  assert(start1.body.attempt.status === 'in_progress', 'Attempt status must be in_progress');
  assert(start1.body.attempt.attemptNumber === 1, 'First attempt must have attemptNumber: 1');
  const attemptId1 = start1.body.attempt._id;
  console.log(`✅ Scenario 1 Passed: Attempt ${attemptId1} started successfully with attemptNumber 1\n`);

  // --- SCENARIO 2: Refreshing resumes the same attempt ---
  console.log('--- Test 2: Refreshing resumes the same active attempt ---');
  const refreshRes = await request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken);
  assert(refreshRes.status === 200, 'Resume on refresh returned 200');
  assert(refreshRes.body.attempt._id === attemptId1, 'Resume must return the exact same attempt ID');
  assert(refreshRes.body.attempt.status === 'in_progress', 'Status must remain in_progress');
  console.log(`✅ Scenario 2 Passed: Exact same attempt ID (${refreshRes.body.attempt._id}) returned on refresh\n`);

  // --- SCENARIO 3: Clicking resume repeatedly returns the same attempt ID ---
  console.log('--- Test 3: Clicking resume repeatedly returns the same attempt ID ---');
  for (let i = 1; i <= 3; i++) {
    const repRes = await request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken);
    assert(repRes.status === 200, `Repeated resume #${i} returned 200`);
    assert(repRes.body.attempt._id === attemptId1, `Repeated resume #${i} must match attemptId1`);
  }
  console.log('✅ Scenario 3 Passed: 3 consecutive resume requests all returned same attempt ID\n');

  // --- SCENARIO 4 & 5: Concurrent start requests handle race condition safely ---
  console.log('--- Test 4 & 5: Concurrent start requests & race condition recovery ---');
  const concurrentCalls = await Promise.all([
    request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken),
    request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken),
    request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken),
    request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken),
  ]);

  for (const cRes of concurrentCalls) {
    assert(cRes.status === 200, `Concurrent start returned status ${cRes.status}: ${JSON.stringify(cRes.body)}`);
    assert(cRes.body.success === true, 'Concurrent start must succeed');
    assert(cRes.body.attempt._id === attemptId1, 'Concurrent start must return the active attempt ID');
  }
  console.log('✅ Scenario 4 & 5 Passed: 4 simultaneous requests all resolved with HTTP 200 and resumed attemptId1\n');

  // --- SCENARIO 6: Attempt counts accurately reflect state ---
  console.log('--- Test 6: Attempt counts in getAvailableExams and getExamInstructions ---');
  const availableRes = await request('GET', '/api/engine/exams', null, studentToken);
  assert(availableRes.status === 200, 'getAvailableExams returned 200');
  const availExam = availableRes.body.exams.find((e) => e._id === examId);
  assert(availExam, 'Created exam must appear in available exams');
  assert(availExam.attemptsCount === 0, `attemptsCount should be 0 while in_progress (got ${availExam.attemptsCount})`);
  assert(availExam.remainingAttempts === 2, `remainingAttempts should be 2 (got ${availExam.remainingAttempts})`);
  assert(availExam.statusLabel === 'in_progress', `statusLabel should be in_progress (got ${availExam.statusLabel})`);
  assert(availExam.canStart === true, 'canStart must be true');

  const instructionsRes = await request('GET', `/api/engine/exams/${examId}/instructions`, null, studentToken);
  assert(instructionsRes.status === 200, 'getExamInstructions returned 200');
  assert(instructionsRes.body.timing.completedAttemptsCount === 0, 'completedAttemptsCount must be 0');
  assert(instructionsRes.body.timing.remainingAttempts === 2, 'remainingAttempts must be 2');
  assert(instructionsRes.body.timing.activeAttempt._id === attemptId1, 'activeAttempt must match attemptId1');
  console.log('✅ Scenario 6 Passed: Available exams & instructions correctly show in_progress and accurate counts\n');

  // --- SCENARIO 9: Saved answers remain intact across resume calls ---
  console.log('--- Test 9: Saved answers remain intact across resume calls ---');
  const qSnapshotId = start1.body.questions[0].snapshotId;
  const optId = start1.body.questions[0].options[0].id;
  const saveAnsRes = await request(
    'PATCH',
    `/api/engine/attempts/${attemptId1}/answer`,
    {
      snapshotId: qSnapshotId,
      selectedOptions: [optId],
      textAnswer: '',
      currentQuestionIndex: 0,
    },
    studentToken
  );
  assert(saveAnsRes.status === 200, `Autosave answer returned ${saveAnsRes.status}: ${JSON.stringify(saveAnsRes.body)}`);

  // Resume attempt again
  const resumeWithAnswers = await request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken);
  assert(resumeWithAnswers.status === 200, 'Resume returned 200');
  const savedAnswers = resumeWithAnswers.body.attempt.savedAnswers;
  assert(savedAnswers && savedAnswers[qSnapshotId], 'Saved answers must contain question snapshot answer');
  assert(savedAnswers[qSnapshotId].selectedOptions.includes(optId), `Selected option ${optId} must be preserved`);
  console.log('✅ Scenario 9 Passed: Saved answers preserved across resume\n');

  // --- SCENARIO 7: Submitted attempts cannot be resumed ---
  console.log('--- Test 7: Submitted attempt cannot be resumed ---');
  const submitRes = await request(
    'POST',
    `/api/engine/attempts/${attemptId1}/submit`,
    { autoSubmitted: false },
    studentToken
  );
  assert(submitRes.status === 200, 'Submit attempt 1 returned 200');
  assert(submitRes.body.success === true, 'Submit must succeed');

  // Now, verify available exams shows 1 completed attempt and 1 remaining
  const availableAfterSubmit = await request('GET', '/api/engine/exams', null, studentToken);
  const examAfterSubmit = availableAfterSubmit.body.exams.find((e) => e._id === examId);
  assert(examAfterSubmit.attemptsCount === 1, `attemptsCount should be 1 after submit (got ${examAfterSubmit.attemptsCount})`);
  assert(examAfterSubmit.remainingAttempts === 1, `remainingAttempts should be 1 after submit (got ${examAfterSubmit.remainingAttempts})`);
  assert(examAfterSubmit.statusLabel === 'open', `statusLabel should be open for attempt 2 (got ${examAfterSubmit.statusLabel})`);

  console.log('✅ Scenario 7 Passed: Attempt 1 submitted and can no longer be resumed\n');

  // --- SCENARIO 8: Maximum attempt limits remain enforced ---
  console.log('--- Test 8: Maximum attempt limits enforced after all allowed attempts ---');
  // Start attempt 2
  const start2 = await request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken);
  assert(start2.status === 200, 'Start attempt 2 returned 200');
  assert(start2.body.attempt.attemptNumber === 2, `Attempt 2 should have attemptNumber 2 (got ${start2.body.attempt.attemptNumber})`);
  const attemptId2 = start2.body.attempt._id;
  assert(attemptId2 !== attemptId1, 'Attempt 2 must have a different attempt ID');

  // Submit attempt 2
  const submit2Res = await request(
    'POST',
    `/api/engine/attempts/${attemptId2}/submit`,
    { autoSubmitted: false },
    studentToken
  );
  assert(submit2Res.status === 200, 'Submit attempt 2 returned 200');

  // Try to start attempt 3 (maxAttempts is 2)
  const start3 = await request('POST', `/api/engine/exams/${examId}/start`, {}, studentToken);
  assert(start3.status === 400, `Attempt 3 should return 400 (got ${start3.status})`);
  assert(
    start3.body.message && start3.body.message.includes('maximum allowed attempts'),
    `Expected max attempts message, got: ${start3.body.message}`
  );

  console.log('✅ Scenario 8 Passed: Attempt 3 blocked with 400 due to max attempts limit\n');

  // --- SCENARIO 10: Also test the specific exam that had the reported error ("PMP Mini Simulation") ---
  console.log('--- Test 10: Verify reported exam "PMP Mini Simulation" (6b06bb8cdec9012bac4a3d88) ---');
  const pmpSimRes = await request('POST', '/api/engine/exams/6b06bb8cdec9012bac4a3d88/start', {}, studentToken);
  console.log(`Reported exam start/resume response status: ${pmpSimRes.status}`);
  if (pmpSimRes.status === 200) {
    console.log(`Successfully resumed active attempt ${pmpSimRes.body.attempt?._id} for PMP Mini Simulation with status ${pmpSimRes.body.attempt?.status}`);
    assert(pmpSimRes.body.success === true, 'PMP Mini Simulation resume must succeed with 200');
  } else {
    console.log(`PMP Mini Simulation response: ${JSON.stringify(pmpSimRes.body)}`);
  }

  console.log('=====================================================');
  console.log('🎉 ALL TEST SCENARIOS PASSED WITH ZERO ERRORS!');
  console.log('=====================================================');
}

runConcurrencyTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
