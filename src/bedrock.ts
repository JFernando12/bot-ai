import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { ACCESS_KEY_ID, SECRET_ACCESS_KEY } from './config/environment';

const bedrock = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

export async function generateEmbeddings(texts: string[]): Promise<{ embedding: number[] }[]> {
  const responses = await Promise.all(
    texts.map(async (text) => {
      const input = JSON.stringify({ inputText: text });
      const command = new InvokeModelCommand({
        modelId: 'amazon.titan-embed-text-v1',
        body: input,
        contentType: 'application/json',
        accept: 'application/json'
      });
      const response = await bedrock.send(command);
      const body = JSON.parse(Buffer.from(response.body).toString());
      return { embedding: body.embedding };
    })
  );
  return responses;
}

export async function askBedrock({ context, messages }: { context: string, messages: { role: 'user' | 'assistant', text: string }[] }): Promise<string> {
  const messagesFormatted = messages.map(message => ({ role: message.role, content: [{ text: message.text }] }))
  const command = new ConverseCommand({
    modelId: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    system: [
      {
        text: `Eres un agente virtual de soporte de CPA Vision, especializado en asistir a los usuarios.
              Tu función principal es guiar al usuario de manera clara y precisa utilizando únicamente la información proporcionada en el contexto.
              \n\nContexto:\n${context}`
      }
    ],
    messages: messagesFormatted,
  });
  const response = await bedrock.send(command);
  const content = response.output?.message?.content;

  if (!content) throw new Error('No se pudo conversar');

  const text = content[0].text;
  if (!text) throw new Error('No devolvio ningun texto')
  return text;
}
