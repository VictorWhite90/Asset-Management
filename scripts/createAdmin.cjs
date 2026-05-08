'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const admin = require('firebase-admin');

function getArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function ask(question, hidden = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!hidden) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const onData = (char) => {
      char = `${char}`;
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        default:
          readline.cursorTo(process.stdout, question.length);
          process.stdout.write('*'.repeat(rl.line.length));
          break;
      }
    };

    stdin.on('data', onData);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

const projectId = getArg('project') || process.env.FIREBASE_PROJECT_ID;
const serviceAccountPath =
  getArg('service-account') ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'serviceAccountKey.json');

if (!projectId) {
  console.error('Missing --project=<project-id>');
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (serviceAccount.project_id !== projectId) {
  console.error('Refusing to create admin: service account project does not match target project.');
  console.error(`  Expected: ${projectId}`);
  console.error(`  Key file: ${serviceAccount.project_id}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const auth = admin.auth();
const db = admin.firestore();

async function createOrUpdateAdmin() {
  const deploymentName = getArg('deployment-name') || process.env.DEPLOYMENT_NAME || projectId;
  const email = getArg('email') || process.env.SEED_ADMIN_EMAIL || await ask('Admin email: ');
  const password = getArg('password') || process.env.SEED_ADMIN_PASSWORD || await ask('Admin password (min 8 chars): ', true);
  const name = getArg('name') || process.env.SEED_ADMIN_NAME || await ask('Admin name: ');
  const location = getArg('location') || process.env.SEED_ADMIN_LOCATION || 'Rivers State';
  const ministryType = getArg('ministry-type') || process.env.SEED_ADMIN_MINISTRY_TYPE || 'State Government';
  const agencyName = getArg('agency-name') || process.env.SEED_ADMIN_AGENCY_NAME || `${deploymentName} Admin Office`;

  if (!email || !email.includes('@')) {
    throw new Error('Invalid admin email');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!name) {
    throw new Error('Admin name is required');
  }

  console.log(`Creating/updating admin for project: ${projectId}`);
  console.log(`Email: ${email}`);
  console.log(`Name: ${name}`);
  console.log(`Office: ${agencyName}`);

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: name,
    });
    console.log(`Created Auth user: ${userRecord.uid}`);
  } catch (error) {
    if (error.code !== 'auth/email-already-exists') {
      throw error;
    }

    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, {
      displayName: name,
      emailVerified: true,
      password,
    });
    console.log(`Auth user already exists, updating profile and password: ${userRecord.uid}`);
  }

  const userData = {
    userId: userRecord.uid,
    email,
    name,
    ministryId: '',
    ministryType,
    agencyName,
    location,
    role: 'admin',
    accountStatus: 'verified',
    createdAt: admin.firestore.Timestamp.now(),
    emailVerified: true,
  };

  await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
  console.log('Created/updated Firestore admin profile');

  await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
  console.log('Set custom claims: { role: "admin" }');

  console.log('Done.');
}

createOrUpdateAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Admin creation failed:', error.message || error);
    process.exit(1);
  });
