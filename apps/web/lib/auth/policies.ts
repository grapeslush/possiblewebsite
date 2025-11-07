import type { PolicyAcceptance } from '@prisma/client';

export type RequiredPolicy = {
  policy: string;
  version: string;
  title?: string;
};

const DEFAULT_POLICIES: RequiredPolicy[] = [
  {
    policy: 'terms-of-service',
    version: process.env.NEXT_PUBLIC_TERMS_VERSION ?? '2024-01-01'
  },
  {
    policy: 'privacy-policy',
    version: process.env.NEXT_PUBLIC_PRIVACY_VERSION ?? '2024-01-01'
  }
];

export const getRequiredPolicies = () => DEFAULT_POLICIES;

export const missingPolicies = (acceptances: PolicyAcceptance[]) => {
  const requirements = getRequiredPolicies();

  return requirements.filter((requirement) => {
    return !acceptances.some(
      (acceptance) =>
        acceptance.policyId === requirement.policy &&
        acceptance.policyVersion === requirement.version
    );
  });
};

export const hasAcceptedAllPolicies = (acceptances: PolicyAcceptance[]) =>
  missingPolicies(acceptances).length === 0;
