require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examflow';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB at', mongoUri);

    // Check if instructor exists
    const existingInstructor = await User.findOne({ role: 'instructor' });
    if (!existingInstructor) {
      const instructor = await User.create({
        name: 'Super Instructor',
        email: 'instructor@examflow.com',
        password: 'Password123!',
        role: 'instructor',
        status: 'active',
        category: 'Both',
        phone: '+1234567890',
      });
      console.log(`[Seed] Created Instructor: ${instructor.email} / Password123!`);
    } else {
      console.log(`[Seed] Instructor already exists: ${existingInstructor.email}`);
    }

    // Check if sample student exists
    const existingStudent = await User.findOne({ email: 'student@examflow.com' });
    if (!existingStudent) {
      const student = await User.create({
        name: 'Ahmad Al-Mansoor',
        email: 'student@examflow.com',
        password: 'Password123!',
        role: 'student',
        status: 'active',
        category: 'PMP',
        phone: '+1987654321',
      });
      console.log(`[Seed] Created Student: ${student.email} / Password123!`);
    } else {
      console.log(`[Seed] Student already exists: ${existingStudent.email}`);
    }

    console.log('[Seed] Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedUsers();
