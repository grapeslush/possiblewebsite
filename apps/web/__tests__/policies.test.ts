import type { PolicyAcceptance } from '@prisma/client';
import { hasAcceptedAllPolicies, missingPolicies, getRequiredPolicies } from '@/lib/auth/policies';

describe('policy helpers', () => {
  const required = getRequiredPolicies();

  const acceptances: PolicyAcceptance[] = required.map((policy, index) => ({
    id: `policy-${index}`,
    userId: 'user-1',
    policy: policy.policy,
    version: policy.version,
    acceptedAt: new Date(),
    ipAddress: null
  }));

  it('detects when all policies are accepted', () => {
    expect(hasAcceptedAllPolicies(acceptances)).toBe(true);
  });

  it('reports missing policies', () => {
    const partial = acceptances.slice(0, 1);
    const missing = missingPolicies(partial);
    expect(missing).toHaveLength(required.length - 1);
  });
});
