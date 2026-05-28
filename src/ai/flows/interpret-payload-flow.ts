'use server';
/**
 * @fileOverview A Genkit flow for interpreting webhook payloads using AI.
 *
 * - interpretPayload - A function that handles the AI interpretation of a webhook payload.
 * - InterpretPayloadInput - The input type for the interpretPayload function.
 * - InterpretPayloadOutput - The return type for the interpretPayload function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretPayloadInputSchema = z.object({
  payloadJson: z
    .string()
    .describe('The raw JSON string of the incoming webhook payload.'),
});
export type InterpretPayloadInput = z.infer<typeof InterpretPayloadInputSchema>;

const InterpretPayloadOutputSchema = z.object({
  interpretation: z
    .string()
    .describe(
      'A concise summary of the webhook payload, highlighting its purpose, important events, and overall context.'
    ),
  extractedDetails: z
    .array(z.string())
    .describe('An array of specific codes, identifiers, or patterns extracted from the payload that appear significant.'),
});
export type InterpretPayloadOutput = z.infer<typeof InterpretPayloadOutputSchema>;

export async function interpretPayload(
  input: InterpretPayloadInput
): Promise<InterpretPayloadOutput> {
  return interpretPayloadFlow(input);
}

const interpretPayloadPrompt = ai.definePrompt({
  name: 'interpretPayloadPrompt',
  input: {schema: InterpretPayloadInputSchema},
  output: {schema: InterpretPayloadOutputSchema},
  prompt: `You are an expert at analyzing webhook payloads and extracting critical information. Your goal is to help a developer quickly understand the essence of an incoming JSON payload without manually sifting through it.

First, provide a high-level, concise summary of what the webhook payload represents, its likely purpose, and any major events or states it communicates.

Second, identify and list any specific codes, transaction IDs, status indicators, or other patterns that are particularly relevant or important for a developer to notice. Provide these as a list of distinct strings.

Focus on brevity and clarity. Do not include verbose explanations or redundant information. Present the output strictly as a JSON object matching the provided schema.

JSON Payload:

---
{{{payloadJson}}}
---
`,
});

const interpretPayloadFlow = ai.defineFlow(
  {
    name: 'interpretPayloadFlow',
    inputSchema: InterpretPayloadInputSchema,
    outputSchema: InterpretPayloadOutputSchema,
  },
  async (input) => {
    const {output} = await interpretPayloadPrompt(input);
    return output!;
  }
);
