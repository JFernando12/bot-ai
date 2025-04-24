import express from 'express';
import multer from 'multer';
import { uploadToS3, getEmbeddingsFromS3, saveEmbeddingsToS3 } from './s3';
import { generateEmbeddings, askBedrock } from './bedrock';
import { chunkText, getTopKChunks } from './utils';

const app = express();
const upload = multer();
app.use(express.json());

app.post('/upload-data/:service', upload.single('file'), async (req, res) => {
  const { service } = req.params;
  const file = req.file;
  if (!file) {
    res.status(400).send('No file uploaded.');
    return;
  }

  const text = file.buffer.toString('utf-8');
  const chunks = chunkText(text);
  const embeddings = await generateEmbeddings(chunks);

  await uploadToS3(`${service}/source.txt`, text);
  await saveEmbeddingsToS3(service, chunks.map((chunk, i) => ({ chunk, embedding: embeddings[i].embedding })));

  res.send('File and embeddings uploaded successfully.');
});

app.post('/ask/:service', async (req, res) => {
  const { service } = req.params;
  const question = req.body?.question;
  if (!question) {
    res.status(400).send('Missing question.');
    return;
  };

  const questionEmbedding = await generateEmbeddings([question]);
  const stored = await getEmbeddingsFromS3(service);

  const topChunks = getTopKChunks(questionEmbedding[0].embedding, stored, 3);
  const context = topChunks.map(c => c.chunk).join('\n');

  const answer = await askBedrock(question, context);
  res.json({ answer });
});

app.listen(3000, (err) => {
  if (err) {
    console.log('err: ', err)
  }
  console.log('Server running on http://localhost:3000');
});

