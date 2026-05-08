import { deploymentConfig } from '@/services/firebase';

const stateGovernmentName = deploymentConfig.name.replace(/\s+Asset Management System$/i, '');
const knownDeploymentStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const isStateDeployment = deploymentConfig.governmentLevel === 'state';
export const deploymentState = isStateDeployment
  ? knownDeploymentStates.find((state) => stateGovernmentName.toLowerCase().includes(state.toLowerCase())) || ''
  : '';

export const deploymentLabels = {
  systemName: deploymentConfig.name,
  jurisdiction: isStateDeployment ? stateGovernmentName : 'Federal Republic of Nigeria',
  securePortalOwner: isStateDeployment ? stateGovernmentName.toUpperCase() : 'FEDERAL GOVERNMENT OF NIGERIA',
  topAdminTitle: isStateDeployment ? 'State Administrator' : 'Federal Administrator',
  topAdminShort: isStateDeployment ? 'State Admin' : 'Federal Admin',
  topAdminPanel: isStateDeployment ? 'State Admin Panel' : 'Federal Admin Panel',
  topAdminOffice: isStateDeployment ? `${stateGovernmentName} Asset Management Office` : 'Federal Asset Management Office',
  ministryAdminTitle: isStateDeployment ? 'State Ministry HQ Administrator' : 'Ministry Administrator',
  ministryAdminShort: isStateDeployment ? 'State Ministry HQ Admin' : 'Ministry Admin',
  ministryAdminManagement: isStateDeployment ? 'State Ministry HQ Management' : 'Ministry Admin Management',
  ministryAdminPlural: isStateDeployment ? 'State Ministry HQ Administrators' : 'Ministry Administrators',
  ministryAdminVerifications: isStateDeployment ? 'State Ministry HQ Verifications' : 'Ministry Admin Verifications',
  ministryInformationTitle: isStateDeployment ? 'State Ministry Information' : 'Ministry Information',
  ministryEntityLabel: isStateDeployment ? 'State Ministry/Agency' : 'Ministry/Agency',
  ministryEntityNameLabel: isStateDeployment ? 'State Ministry/Agency Name' : 'Ministry/Agency Name',
  ministryEntityTypeLabel: isStateDeployment ? 'State Ministry/Agency Type' : 'Ministry/Agency Type',
  officialMinistryEmailLabel: isStateDeployment ? 'Official State Ministry Email' : 'Official Ministry Email',
  stateAssignmentLabel: isStateDeployment && deploymentState ? `${deploymentState} State` : 'State Assignment',
  sentToTopAdmin: isStateDeployment ? 'Sent to State Admin' : 'Sent to Federal',
  submittedToTopAdmin: isStateDeployment ? 'Submitted State' : 'Submitted Federal',
  pendingTopAdmin: isStateDeployment ? 'Pending State Admin' : 'Pending Federal',
  topAdminReview: isStateDeployment ? 'State Admin review' : 'Federal Admin review',
  topAdminApprovalLower: isStateDeployment ? 'state administrator' : 'federal administrator',
  registryName: isStateDeployment ? 'state asset registry' : 'federal asset registry',
  administrationFallback: isStateDeployment ? 'State Administration' : 'Federal Administration',
};
