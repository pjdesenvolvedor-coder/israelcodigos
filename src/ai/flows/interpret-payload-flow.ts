'use server';
/**
 * @fileOverview Um fluxo Genkit para interpretar payloads de webhooks usando IA em português.
 *
 * - interpretPayload - Uma função que lida com a interpretação por IA de um payload de webhook.
 * - InterpretPayloadInput - O tipo de entrada para a função interpretPayload.
 * - InterpretPayloadOutput - O tipo de retorno para a função interpretPayload.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretPayloadInputSchema = z.object({
  payloadJson: z
    .string()
    .describe('A string JSON bruta do payload de webhook recebido.'),
});
export type InterpretPayloadInput = z.infer<typeof InterpretPayloadInputSchema>;

const InterpretPayloadOutputSchema = z.object({
  interpretation: z
    .string()
    .describe(
      'Um resumo conciso do payload do webhook, destacando seu propósito, eventos importantes e contexto geral. DEVE SER EM PORTUGUÊS.'
    ),
  extractedDetails: z
    .array(z.string())
    .describe('Um array de códigos específicos, identificadores ou padrões extraídos do payload que parecem significativos.'),
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
  prompt: `Você é um especialista em analisar payloads de webhooks e extrair informações críticas. Seu objetivo é ajudar um desenvolvedor a entender rapidamente a essência de um payload JSON recebido sem precisar analisá-lo manualmente.

Primeiro, forneça um resumo de alto nível e conciso sobre o que o payload do webhook representa, seu provável propósito e quaisquer eventos ou estados importantes que ele comunica. RESPONDA SEMPRE EM PORTUGUÊS.

Segundo, identifique e liste quaisquer códigos específicos, IDs de transação, indicadores de status ou outros padrões que sejam particularmente relevantes para um desenvolvedor notar. Forneça-os como uma lista de strings distintas.

Foque em brevidade e clareza. Não inclua explicações verbosas ou informações redundantes. Apresente a saída estritamente como um objeto JSON correspondente ao esquema fornecido.

Payload JSON:

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