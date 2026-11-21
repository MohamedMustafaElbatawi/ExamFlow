const http = require('http');

function postRequest(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(body || '{}') });
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getRequest(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(body || '{}') });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Auth API Integration Tests ---');

  // Test 1: Health Check
  const health = await getRequest('/api/health');
  console.log('1. Health check status:', health.status, '| status:', health.body.status);
  if (health.status !== 200) throw new Error('Health check failed');

  // Test 2: Instructor Login
  const instructorLogin = await postRequest('/api/auth/login', {
    email: 'instructor@examflow.com',
    password: 'Password123!',
  });
  console.log('2. Instructor login status:', instructorLogin.status, '| role:', instructorLogin.body.user?.role);
  if (instructorLogin.status !== 200 || instructorLogin.body.user?.role !== 'instructor') {
    throw new Error('Instructor login failed');
  }

  // Test 3: Authenticated /me
  const meRes = await getRequest('/api/auth/me', instructorLogin.body.token);
  console.log('3. /auth/me status:', meRes.status, '| email:', meRes.body.user?.email);
  if (meRes.status !== 200 || meRes.body.user?.email !== 'instructor@examflow.com') {
    throw new Error('/auth/me verification failed');
  }

  // Test 4: Student Login
  const studentLogin = await postRequest('/api/auth/login', {
    email: 'student@examflow.com',
    password: 'Password123!',
  });
  console.log('4. Student login status:', studentLogin.status, '| role:', studentLogin.body.user?.role);
  if (studentLogin.status !== 200 || studentLogin.body.user?.role !== 'student') {
    throw new Error('Student login failed');
  }

  // Test 5: Invalid Password
  const badLogin = await postRequest('/api/auth/login', {
    email: 'instructor@examflow.com',
    password: 'WrongPassword',
  });
  console.log('5. Bad password status:', badLogin.status, '| message:', badLogin.body.message);
  if (badLogin.status !== 401) throw new Error('Bad password check failed');

  // Test 6: Unauthorized access to /me
  const unauthMe = await getRequest('/api/auth/me');
  console.log('6. Unauthorized /me status:', unauthMe.status);
  if (unauthMe.status !== 401) throw new Error('Unauthorized check failed');

  console.log('--- ALL AUTH INTEGRATION TESTS PASSED (6/6) ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
