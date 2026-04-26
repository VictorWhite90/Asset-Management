/**
 * One-off CLI: backfill displayId for verified staff (same logic as Cloud Function).
 *
 * Run from the `functions` directory:
 *   yarn backfill:display-ids
 *   npx ts-node --project tsconfig.backfill.json --transpile-only src/scripts/runBackfill.ts
 *
 * Requires `<project-root>/serviceAccountKey.json` (download from Firebase Console).
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { backfillDisplayIds } from '../displayId';

// Resolve key relative to cwd — run this with cwd = functions/ (parent = repo root)
const keyPath = path.resolve(process.cwd(), '..', 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error('serviceAccountKey.json not found at:', keyPath);
  console.error('Place the key at the project root and run: cd functions && yarn backfill:display-ids');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(keyPath, 'utf8')
) as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function run(): Promise<void> {
  console.log('Starting backfill...');
  const result = await backfillDisplayIds();
  console.log('Done:', result);
  process.exit(0);
}

run().catch((err: unknown) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
