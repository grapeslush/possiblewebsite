const bannedTerms = ['spamword', 'fakeitem', 'scam', 'fraud'];

export interface ProfanityResult {
  blocked: boolean;
  matches: string[];
}

export function detectProfanity(content: string): ProfanityResult {
  const normalized = content.toLowerCase();
  const matches = bannedTerms.filter((term) => normalized.includes(term));

  return {
    blocked: matches.length > 0,
    matches,
  };
}
