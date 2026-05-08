const HEADQUARTERS = 'Headquarters';

type AgencyRule = {
  keywords: string[];
  agencies: string[];
};

const AGENCY_RULES: AgencyRule[] = [
  {
    keywords: ['education', 'school', 'teaching'],
    agencies: [
      'State Universal Basic Education Board',
      'Teaching Service Commission',
      'Scholarship Board',
      'Examinations Board',
    ],
  },
  {
    keywords: ['works', 'housing', 'infrastructure', 'road'],
    agencies: [
      'Roads Maintenance Agency',
      'Public Works Department',
      'Civil Engineering Department',
      'Urban Renewal Board',
    ],
  },
  {
    keywords: ['health', 'hospital', 'medical'],
    agencies: [
      'Hospitals Management Board',
      'Primary Health Care Management Board',
      'Public Health Department',
      'Medical Stores Department',
    ],
  },
  {
    keywords: ['agriculture', 'livestock', 'fishery', 'fisheries'],
    agencies: [
      'Agricultural Development Programme',
      'Livestock Services Department',
      'Fisheries Department',
      'Food Security Department',
    ],
  },
  {
    keywords: ['transport', 'traffic', 'mobility'],
    agencies: [
      'Traffic Management Authority',
      'Transport Company',
      'Vehicle Inspection Service',
      'Motor Parks Administration',
    ],
  },
  {
    keywords: ['finance', 'budget', 'economic', 'planning'],
    agencies: [
      'Board of Internal Revenue',
      'Budget Office',
      'Debt Management Office',
      'Procurement Bureau',
    ],
  },
  {
    keywords: ['justice', 'attorney', 'legal'],
    agencies: [
      'Legal Aid Council',
      'Law Reform Commission',
      'Citizens Rights Department',
      'Public Prosecution Department',
    ],
  },
];

export const getAgencySuggestionsForMinistry = (ministryName?: string): string[] => {
  const normalized = (ministryName || '').toLowerCase();
  const matchedRule = AGENCY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );

  return [HEADQUARTERS, ...(matchedRule?.agencies || [
    'Administration Department',
    'Operations Department',
    'Planning, Research and Statistics',
  ])];
};
