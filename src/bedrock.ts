import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: '',
    secretAccessKey: ''
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

export async function askBedrock(question: string, context: string): Promise<string> {
  const command = new ConverseCommand({
    modelId: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    system: [
      {
        text: `Eres un agente de soporte de la empresa CPA Vision,
        diseñado para orientarle en el proceso de carga de documentos del servicio Repse.
        Ante preguntas no determinadas dirigirlos a los medios de contacto definidos en el documento.
        Utiliza el contexto de abajo.\n\nContexto:\n${context}`
      }
    ],
    messages: [
      {
        role: 'user',
        content: [{ text: `${question}` }],
      },
    ],
  });
  const response = await bedrock.send(command);
  const content = response.output?.message?.content;

  if (!content) throw new Error('No se pudo conversar');

  const text = content[0].text;
  if (!text) throw new Error('No devolvio ningun texto')
  return text;
}
