import { Donation, Project, ProjectSummary, VerificationStats } from '../types';

export const collectByProject = (donations: Donation[], projects: Project[]): ProjectSummary[] => {
  const projectMap = new Map(projects.map(p => [p.id, p]));
  const summaryMap = new Map<string, ProjectSummary>();

  donations.forEach(donation => {
    const project = projectMap.get(donation.projectId);
    if (!project) return;

    const existing = summaryMap.get(donation.projectId) || {
      projectId: project.id,
      projectName: project.name,
      projectCode: project.code,
      isTargeted: project.isTargeted,
      totalAmount: 0,
      donationCount: 0,
      physicalCount: 0,
      refundCount: 0,
    };

    existing.totalAmount += donation.amount;
    existing.donationCount += 1;
    if (donation.isPhysical) existing.physicalCount += 1;
    if (donation.hasRefund) existing.refundCount += 1;

    summaryMap.set(donation.projectId, existing);
  });

  return Array.from(summaryMap.values());
};

export const calculateVerificationStats = (
  donations: Donation[]
): VerificationStats => {
  let total = donations.length;
  let normal = 0;
  let exception = 0;
  let pending = 0;
  let reversed = 0;
  let totalAmount = 0;
  let refundAmount = 0;

  donations.forEach(d => {
    if (d.exceptions.length > 0) {
      exception += 1;
    } else {
      normal += 1;
    }

    if (d.invoiceStatus === 'pending') pending += 1;
    if (d.invoiceStatus === 'reversed') reversed += 1;

    totalAmount += d.amount;
    if (d.hasRefund) refundAmount += d.amount;
  });

  return { total, normal, exception, pending, reversed, totalAmount, refundAmount };
};

export const updateDonationProject = (
  donation: Donation,
  newProjectId: string,
  newProjectName: string
): Donation => {
  return {
    ...donation,
    projectId: newProjectId,
    projectName: newProjectName,
    exceptions: donation.exceptions.filter(e => e !== 'project_mismatch'),
    isVerified: donation.exceptions.filter(e => e !== 'project_mismatch').length === 0,
  };
};

export const updatePhysicalValue = (
  donation: Donation,
  newValue: number
): Donation => {
  return {
    ...donation,
    amount: newValue,
    exceptions: donation.exceptions.filter(e => e !== 'physical_value_missing'),
    isVerified: donation.exceptions.filter(e => e !== 'physical_value_missing').length === 0,
  };
};

export const reverseInvoice = (
  donation: Donation
): Donation => {
  return {
    ...donation,
    invoiceStatus: 'reversed',
    exceptions: donation.exceptions.filter(e => e !== 'refund_not_reversed'),
    isVerified: true,
  };
};
