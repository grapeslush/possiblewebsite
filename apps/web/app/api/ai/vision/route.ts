import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { incrementMetric, logger, withTiming } from '@/lib/observability';

const schema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).optional(),
});

async function callOpenAi(imageUrl: string, prompt?: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const payload = {
    model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt ?? 'Describe this product photo for a Tackle Exchange listing.',
          },
          { type: 'input_image', image_url: imageUrl },
        ],
      },
    ],
    max_output_tokens: 500,
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}

function buildFallback(imageUrl: string) {
  const fallbackTags = ['pre-owned', 'angler-approved', 'tackle-ready'];
  const filename = imageUrl.split('/').pop()?.split('.')[0]?.replace(/[-_]/g, ' ');
  if (filename) {
    fallbackTags.unshift(...filename.split(' ').slice(0, 3));
  }

  return {
    description:
      'Gear photo ready for listing. Highlight condition notes and include any accessories in your summary.',
    tags: Array.from(new Set(fallbackTags)).slice(0, 6),
    confidence: 0.4,
    provider: 'fallback',
  };
}

export async function POST(request: NextRequest) {
  return withTiming('ai.vision', async () => {
    const body = await request.json().catch(() => null);

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      incrementMetric('ai.vision.validation_error');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    try {
      const aiResponse = await callOpenAi(parsed.data.imageUrl, parsed.data.prompt);

      if (!aiResponse) {
        incrementMetric('ai.vision.fallback');
        return NextResponse.json(buildFallback(parsed.data.imageUrl));
      }

      const textOutput: string =
        aiResponse?.output?.[0]?.content?.[0]?.text ?? aiResponse?.output_text?.join(' ');

      const description = textOutput?.trim() ?? '';
      const tags = description
        ? Array.from(
            new Set(description.split(/[,\.]/).flatMap((chunk: string) => chunk.trim().split(' '))),
          )
            .filter((token) => token.length > 3)
            .slice(0, 8)
        : [];

      incrementMetric('ai.vision.success');

      return NextResponse.json({
        description:
          description || 'AI vision response available. Tailor to your product specifics.',
        tags,
        confidence: 0.86,
        provider: 'openai',
        raw: aiResponse,
      });
    } catch (error) {
      logger.error('OpenAI vision call failed', { error });
      incrementMetric('ai.vision.error');
      return NextResponse.json(buildFallback(parsed.data.imageUrl), { status: 200 });
    }
  });
}
