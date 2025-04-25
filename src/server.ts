import express from 'express';
import multer from 'multer';
import { uploadToS3, getEmbeddingsFromS3, saveEmbeddingsToS3 } from './s3';
import { generateEmbeddings, askBedrock } from './bedrock';
import { chunkText, getTopKChunks } from './utils';
import { getMessagesByConversationId, getOrCreateConversation, saveMessage } from './dynamodb';

const app = express();
const upload = multer();
app.use(express.json());

app.post('/cargar-datos', upload.single('archivo'), async (req, res) => {
  const service = req.body?.servicio;
  const file = req.file;
  if (!file || !service) {
    res.status(400).send('Missing required fields.');
    return;
  }

  const text = file.buffer.toString('utf-8');
  const chunks = chunkText(text);
  const embeddings = await generateEmbeddings(chunks);

  await uploadToS3(`${service}/source.txt`, text);
  await saveEmbeddingsToS3(`${service}`, chunks.map((chunk, i) => ({ chunk, embedding: embeddings[i].embedding })));

  res.send('File and embeddings uploaded successfully.');
});

app.post('/conversar', async (req, res) => {
  const question = req.body?.pregunta;
  const username = req.body?.usuario;
  const service = req.body?.servicio;
  if (!question || !username || !service) {
    res.status(400).send('Missing question, username or service.');
    return;
  }

  const userMessage: { role: 'user', text: string } = { role: 'user', text: question }
  const chatId = await getOrCreateConversation(username, service);
  const messages = await getMessagesByConversationId(chatId);
  messages.push(userMessage);
  console.log('messages: ', messages)

  const questionEmbedding = await generateEmbeddings([question]);
  const stored = await getEmbeddingsFromS3(`${service}`);
  const topChunks = getTopKChunks(questionEmbedding[0].embedding, stored, 3);
  const context = topChunks.map(c => c.chunk).join('\n');
  console.log('context: ', context)

  const answer = await askBedrock({ messages, context });
  const assistantMessage: { role: 'assistant', text: string } = { role: 'assistant', text: answer }
  await saveMessage(chatId, userMessage);
  await saveMessage(chatId, assistantMessage);

  res.json({ answer });
});

app.listen(3000, (err) => {
  if (err) {
    console.log('err: ', err)
  }
  console.log('Server running on http://localhost:3000');
});

