import { detectProfanity } from './profanity';

interface ModerationResult {
  flagged: boolean;
  reason?: string;
  confidence?: number;
}

export async function evaluateReview(content: string): Promise<ModerationResult> {
  const profanity = detectProfanity(content);

  if (profanity.blocked) {
    return {
      flagged: true,
      reason: `Contains prohibited terms: ${profanity.matches.join(', ')}`,
      confidence: 0.95,
    };
  }

  if (content.length < 12) {
    return {
      flagged: true,
      reason: 'Review content too short for publication',
      confidence: 0.4,
    };
  }

  return { flagged: false, confidence: 0.2 };
}
