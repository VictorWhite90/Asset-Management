/**
 * Staff Display ID Generator
 *
 * Generates short, human-readable display IDs for staff members.
 * Format: EDU-STF-0001 (MinistryCode-RoleCode-SequenceNumber)
 *
 * Counter document lives in: _counters/{ministryCode}-{roleCode}-{year}
 * User document gets:        displayId: "EDU-STF-0001"
 */

import * as admin from 'firebase-admin';

/** Lazy — safe to import before `admin.initializeApp()` (CLI scripts, tests). */
function getDb() {
  return admin.firestore();
}

// ============================================
// MINISTRY NAME → 3-LETTER CODE MAP
// Handles all Federal Ministries of Nigeria
// ============================================
const MINISTRY_CODE_MAP: Record<string, string> = {
  'federal admin authority':                'FED',
  'federal ministry of education':           'EDU',
  'federal ministry of health':              'HEA',
  'federal ministry of finance':             'FIN',
  'federal ministry of works':               'WOR',
  'federal ministry of defence':             'DEF',
  'federal ministry of justice':             'JUS',
  'federal ministry of agriculture':         'AGR',
  'federal ministry of transport':           'TRN',
  'federal ministry of power':               'PWR',
  'federal ministry of communication':       'COM',
  'federal ministry of interior':            'INT',
  'federal ministry of foreign affairs':     'FOR',
  'federal ministry of labour':              'LAB',
  'federal ministry of trade':               'TRD',
  'federal ministry of environment':         'ENV',
  'federal ministry of petroleum':           'PET',
  'federal ministry of science':             'SCI',
  'federal ministry of housing':             'HOU',
  'federal ministry of youth':               'YTH',
  'federal ministry of women affairs':       'WOM',
  'federal ministry of sports':              'SPT',
  'federal ministry of water resources':     'WAT',
  'federal ministry of mines':               'MIN',
  'federal ministry of aviation':            'AVI',
  'federal ministry of information':         'INF',
  'federal ministry of police affairs':      'POL',
  'federal ministry of humanitarian':        'HUM',
};

// ============================================
// ROLE → CODE MAP
// Maps existing UserRole values used in codebase
// ============================================
const ROLE_CODE_MAP: Record<string, string> = {
  'agency':           'STF',   // uploader role in codebase is 'agency'
  'agency-approver':  'APV',
  'ministry-admin':   'ADM',
  'admin':            'SUP',
};

// ============================================
// HELPER: Get ministry code from name
// ============================================
export function getMinistryCode(ministryName: string): string {
  const normalized = ministryName.toLowerCase().trim();

  // Check map first (exact match)
  if (MINISTRY_CODE_MAP[normalized]) {
    return MINISTRY_CODE_MAP[normalized];
  }

  // Partial match — check if any map key is contained in the name
  for (const [key, code] of Object.entries(MINISTRY_CODE_MAP)) {
    const keyword = key.replace('federal ministry of ', '');
    if (normalized.includes(keyword)) {
      return code;
    }
  }

  // Fallback: strip common prefixes and take first 3 letters
  const cleaned = normalized
    .replace(/^federal ministry of /i, '')
    .replace(/^ministry of /i, '')
    .replace(/^federal /i, '')
    .trim();

  return cleaned.substring(0, 3).toUpperCase() || 'UNK';
}

// ============================================
// HELPER: Get role code
// ============================================
export function getRoleCode(role: string): string {
  return ROLE_CODE_MAP[role] ?? 'STF'; // default to STF
}

// ============================================
// MAIN: Generate Display ID
// Format: EDU-STF-0001 (4-digit zero-padded)
// ============================================
export async function generateStaffDisplayId(
  ministryName: string,
  role: string
): Promise<string> {

  if (!ministryName || !role) {
    throw new Error('ministryName and role are required to generate display ID');
  }

  const ministryCode = getMinistryCode(ministryName);
  const roleCode = getRoleCode(role);
  const year = new Date().getFullYear();

  // Counter key is internal only — never shown on FE
  // Resets each year: "EDU-STF-2024", "EDU-STF-2025"
  const counterKey = `${ministryCode}-${roleCode}-${year}`;
  const counterRef = getDb().collection('_counters').doc(counterKey);

  // Atomic transaction — prevents duplicate IDs under concurrent approvals
  const sequence = await getDb().runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const current = doc.exists ? (doc.data()!.count as number) : 0;
    const next = current + 1;

    if (next > 9999) {
      throw new Error(
        `Display ID limit reached for ${ministryCode}-${roleCode} in ${year}. ` +
        `Maximum 9999 IDs per ministry per role per year.`
      );
    }

    tx.set(counterRef, {
      count: next,
      ministryCode,
      roleCode,
      year,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return next;
  });

  // Format: EDU-STF-0001
  return `${ministryCode}-${roleCode}-${String(sequence).padStart(4, '0')}`;
}

// ============================================
// SEARCH: Find user by display ID
// ============================================
export async function findUserByDisplayId(displayId: string): Promise<(admin.firestore.DocumentData & { internalId: string }) | null> {
  if (!displayId) {
    throw new Error('displayId is required');
  }

  // Normalize — handle lowercase or spaces from admin input
  const cleaned = displayId.trim().toUpperCase();

  // Validate format: ABC-DEF-0001
  const pattern = /^[A-Z]{3}-[A-Z]{3}-\d{4}$/;
  if (!pattern.test(cleaned)) {
    throw new Error(
      `Invalid display ID format: "${cleaned}". Expected format: EDU-STF-0001`
    );
  }

  const snapshot = await getDb()
    .collection('users')
    .where('displayId', '==', cleaned)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    internalId: snapshot.docs[0].id,  // Firebase UID — internal use only
    ...snapshot.docs[0].data(),
  };
}

/**
 * Backfill display IDs for existing verified staff (uploaders / approvers)
 * who were approved before display IDs existed.
 * Idempotent: skips users who already have displayId.
 * Invoked from Cloud Function `runBackfillDisplayIds` (federal admin only).
 */
export async function backfillDisplayIds(): Promise<{
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  const snapshot = await getDb()
    .collection('users')
    .where('accountStatus', '==', 'verified')
    .get();

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.displayId) {
      skipped++;
      continue;
    }

    // Process only uploaders and approvers
    if (data.role !== 'agency' && data.role !== 'agency-approver') {
      skipped++;
      continue;
    }

    if (!data.ministryId) {
      errors.push(`Skipped ${doc.id} (${data.email}) — no ministryId`);
      skipped++;
      continue;
    }

    try {
      const ministryDoc = await getDb().collection('ministries').doc(data.ministryId).get();
      if (!ministryDoc.exists) {
        errors.push(`Skipped ${doc.id} (${data.email}) — ministry not found`);
        skipped++;
        continue;
      }

      const ministryName = ministryDoc.data()!.name as string;
      const displayId = await generateStaffDisplayId(ministryName, data.role);

      await doc.ref.update({ displayId, uuid: displayId });
      migrated++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed ${doc.id} (${data.email}) — ${msg}`);
    }
  }

  return { migrated, skipped, errors };
}
