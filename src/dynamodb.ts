import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ACCESS_KEY_ID, SECRET_ACCESS_KEY } from './config/environment';

const dynamo = new DynamoDBClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

const CONVERSATION_TABLE = 'ia-chat';
const MESSAGE_TABLE = 'ia-mensaje';

export async function getOrCreateConversation(username: string, service: string): Promise<string> {
  const command = new ScanCommand({
    TableName: CONVERSATION_TABLE,
    FilterExpression: '#u = :u AND #s = :s',
    ExpressionAttributeNames: {
      '#u': 'username',
      '#s': 'service'
    },
    ExpressionAttributeValues: {
      ':u': { S: username },
      ':s': { S: service }
    }
  });
  const result = await dynamo.send(command);
  const existing = result.Items?.[0];
  if (existing) return unmarshall(existing).id;

  const id = uuidv4();
  const putItemCommand = new PutItemCommand({
    TableName: CONVERSATION_TABLE,
    Item: {
      id: { S: id },
      username: { S: username },
      service: { S: service }
    }
  });
  await dynamo.send(putItemCommand);
  return id;
}

export async function saveMessage(chatId: string, message: { role: 'user' | 'assistant'; text: string }) {
  const putItemCommand = new PutItemCommand({
    TableName: MESSAGE_TABLE,
    Item: {
      id: { S: uuidv4() },
      chat_id: { S: chatId },
      text: { S: message.text },
      role: { S: message.role },
      timestamp: { N: Date.now().toString() }
    }
  });
  await dynamo.send(putItemCommand);
}

export async function getMessagesByConversationId(chatId: string): Promise<{ text: string; role: 'user' | 'assistant' }[]> {
  const command = new QueryCommand({
    TableName: MESSAGE_TABLE,
    IndexName: 'chat_id-index',
    KeyConditionExpression: 'chat_id = :cid',
    ExpressionAttributeValues: {
      ':cid': { S: chatId }
    },
    ScanIndexForward: true
  });
  const res = await dynamo.send(command);
  return (res.Items || []).map(i => {
    const item = unmarshall(i);
    return { text: item.text, role: item.role };
  });
}