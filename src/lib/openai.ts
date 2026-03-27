const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface InsightResult {
  explanation: string;
  keyTerms: { term: string; definition: string }[];
}

export async function fetchSentenceInsight(
  sentence: string,
  surroundingContext: string
): Promise<InsightResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const model = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file."
    );
  }

  const systemPrompt = `You are a reading assistant that helps users understand sentences within their context. You will be given a specific sentence and the surrounding text from a markdown document.

Your job:
1. Explain what the sentence means in the context of the surrounding text. Be clear and concise.
2. Identify key terms or concepts in the sentence that might need clarification and define them.

Respond in valid JSON with this exact structure:
{
  "explanation": "A clear, concise explanation of the sentence in context.",
  "keyTerms": [
    { "term": "term1", "definition": "definition1" },
    { "term": "term2", "definition": "definition2" }
  ]
}

If there are no key terms worth defining, return an empty array for keyTerms.
Only return JSON, no other text.`;

  const userPrompt = `**Surrounding context:**
${surroundingContext}

**Sentence to explain:**
"${sentence}"`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI API");
  }

  try {
    return JSON.parse(content) as InsightResult;
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
