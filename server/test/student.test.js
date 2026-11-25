const http = require('http');

function request(method, path, data = null, token = null) {
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
        path,
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

async function runStudentTests() {
  console.log('=== Starting Student Management API Tests ===');

  // Step 1: Login as Instructor & Student to obtain tokens
  const instructorLogin = await request('POST', '/api/auth/login', {
    email: 'instructor@examflow.com',
    password: 'Password123!',
  });
  if (instructorLogin.status !== 200) {
    throw new Error('Failed to login as instructor for tests');
  }
  const instructorToken = instructorLogin.body.token;

  const studentLogin = await request('POST', '/api/auth/login', {
    email: 'student@examflow.com',
    password: 'Password123!',
  });
  if (studentLogin.status !== 200) {
    throw new Error('Failed to login as student for tests');
  }
  const studentToken = studentLogin.body.token;

  // Test 1: Student cannot access student management (RBAC 403 Forbidden)
  const forbiddenRes = await request('GET', '/api/students', null, studentToken);
  console.log('1. Student RBAC block check status:', forbiddenRes.status);
  if (forbiddenRes.status !== 403) {
    throw new Error(`Expected 403 for student access, got ${forbiddenRes.status}`);
  }

  // Test 2: Unauthenticated access blocked (401)
  const unauthRes = await request('GET', '/api/students', null, null);
  console.log('2. Unauthenticated check status:', unauthRes.status);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated access, got ${unauthRes.status}`);
  }

  // Test 3: Instructor gets student list (200)
  const listRes = await request('GET', '/api/students', null, instructorToken);
  console.log('3. Instructor list students status:', listRes.status, '| total:', listRes.body.total);
  if (listRes.status !== 200 || !Array.isArray(listRes.body.students)) {
    throw new Error('Failed to get students list');
  }

  // Test 4: Validation on student creation (missing fields -> 400)
  const missingFieldRes = await request('POST', '/api/students', { name: 'Only Name' }, instructorToken);
  console.log('4. Missing field validation status:', missingFieldRes.status);
  if (missingFieldRes.status !== 400) {
    throw new Error(`Expected 400 for missing email, got ${missingFieldRes.status}`);
  }

  // Test 5: Create a new student
  const testEmail = `student_${Date.now()}@testexamflow.com`;
  const createRes = await request(
    'POST',
    '/api/students',
    {
      name: 'Tariq Al-Hamad',
      email: testEmail,
      phone: '+966500123456',
      category: 'PMP',
      password: 'InitialPassword123!',
      notes: 'Enrolled in November batch',
    },
    instructorToken
  );
  console.log('5. Create student status:', createRes.status, '| id:', createRes.body.student?._id);
  if (createRes.status !== 201 || !createRes.body.student?._id) {
    throw new Error('Failed to create new student');
  }
  const createdStudentId = createRes.body.student._id;

  // Verify password hash is NOT exposed
  if (createRes.body.student.password) {
    throw new Error('SECURITY VIOLATION: Password hash exposed in response!');
  }

  // Test 6: Duplicate email rejection (400)
  const dupRes = await request(
    'POST',
    '/api/students',
    {
      name: 'Duplicate Student',
      email: testEmail,
      category: 'MPA',
    },
    instructorToken
  );
  console.log('6. Duplicate email rejection status:', dupRes.status);
  if (dupRes.status !== 400) {
    throw new Error(`Expected 400 for duplicate email, got ${dupRes.status}`);
  }

  // Test 7: Search and filter students
  const searchRes = await request(
    'GET',
    `/api/students?search=Tariq&category=PMP`,
    null,
    instructorToken
  );
  console.log('7. Search & filter status:', searchRes.status, '| found count:', searchRes.body.count);
  if (searchRes.status !== 200 || searchRes.body.count === 0) {
    throw new Error('Search failed to locate the newly created student');
  }

  // Test 8: Get student details by ID
  const detailRes = await request('GET', `/api/students/${createdStudentId}`, null, instructorToken);
  console.log('8. Get student details status:', detailRes.status, '| name:', detailRes.body.student?.name);
  if (detailRes.status !== 200 || detailRes.body.student?.email !== testEmail) {
    throw new Error('Failed to retrieve student details by ID');
  }
  if (detailRes.body.student.password) {
    throw new Error('SECURITY VIOLATION: Password hash exposed in details response!');
  }

  // Test 9: Update student details
  const updateRes = await request(
    'PUT',
    `/api/students/${createdStudentId}`,
    {
      name: 'Tariq Al-Hamad (Updated)',
      category: 'Both',
      phone: '+966500987654',
    },
    instructorToken
  );
  console.log('9. Update student status:', updateRes.status, '| new category:', updateRes.body.student?.category);
  if (updateRes.status !== 200 || updateRes.body.student?.category !== 'Both') {
    throw new Error('Failed to update student details');
  }

  // Test 10: Suspend student account
  const suspendRes = await request(
    'PATCH',
    `/api/students/${createdStudentId}/status`,
    { status: 'suspended' },
    instructorToken
  );
  console.log('10. Suspend student status:', suspendRes.status, '| status:', suspendRes.body.status);
  if (suspendRes.status !== 200 || suspendRes.body.status !== 'suspended') {
    throw new Error('Failed to suspend student');
  }

  // Verify suspended student cannot login
  const suspendedLogin = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: 'InitialPassword123!',
  });
  console.log('10b. Suspended user login check status:', suspendedLogin.status);
  if (suspendedLogin.status !== 403) {
    throw new Error(`Expected 403 for suspended user login, got ${suspendedLogin.status}`);
  }

  // Test 11: Activate student account again
  const activateRes = await request(
    'PATCH',
    `/api/students/${createdStudentId}/status`,
    { status: 'active' },
    instructorToken
  );
  console.log('11. Activate student status:', activateRes.status, '| status:', activateRes.body.status);
  if (activateRes.status !== 200 || activateRes.body.status !== 'active') {
    throw new Error('Failed to reactivate student');
  }

  // Test 12: Reset student password
  const resetPassRes = await request(
    'PUT',
    `/api/students/${createdStudentId}/reset-password`,
    { newPassword: 'NewSecurePassword456!' },
    instructorToken
  );
  console.log('12. Reset student password status:', resetPassRes.status);
  if (resetPassRes.status !== 200) {
    throw new Error('Failed to reset student password');
  }

  // Verify login with new password succeeds
  const newPassLogin = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: 'NewSecurePassword456!',
  });
  console.log('12b. Login with reset password status:', newPassLogin.status);
  if (newPassLogin.status !== 200) {
    throw new Error('Failed to login with reset password');
  }

  // Test 13: Soft delete / Deactivation preserves historical integrity
  const deleteRes = await request('DELETE', `/api/students/${createdStudentId}`, null, instructorToken);
  console.log('13. Soft delete student status:', deleteRes.status);
  if (deleteRes.status !== 200) {
    throw new Error('Failed to soft delete student');
  }

  // Verify student is excluded from regular active list
  const listAfterDelete = await request('GET', '/api/students', null, instructorToken);
  const foundInActive = listAfterDelete.body.students.some((s) => s._id === createdStudentId);
  console.log('13b. Excluded from active student list:', !foundInActive);
  if (foundInActive) {
    throw new Error('Soft-deleted student still appeared in default active list');
  }

  // Verify student is still queryable with includeDeleted=true
  const listWithDeleted = await request('GET', '/api/students?includeDeleted=true', null, instructorToken);
  const foundInDeleted = listWithDeleted.body.students.some((s) => s._id === createdStudentId);
  console.log('13c. Retrievable with includeDeleted=true:', foundInDeleted);
  if (!foundInDeleted) {
    throw new Error('Soft-deleted student was not preserved in database');
  }

  console.log('=== ALL STUDENT MANAGEMENT TESTS PASSED (13/13) ===');
  process.exit(0);
}

runStudentTests().catch((err) => {
  console.error('Student test failure:', err);
  process.exit(1);
});
