import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

// 自动兼容匹配 KV 和 Upstash 的环境变量
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LOCAL_FILE = path.join(process.cwd(), 'data.json');

// 读取数据 API
export async function GET() {
  try {
    let data = await redis.get('game_data');

    if (!data) {
      const fileData = fs.readFileSync(LOCAL_FILE, 'utf-8');
      data = JSON.parse(fileData);
      await redis.set('game_data', data);
    } else if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    return Response.json(data);
  } catch (error) {
    console.error('Redis GET Error:', error);
    try {
      const fileData = fs.readFileSync(LOCAL_FILE, 'utf-8');
      return Response.json(JSON.parse(fileData));
    } catch (e) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}

// 保存数据 API
export async function POST(request) {
  try {
    const newData = await request.json();
    await redis.set('game_data', newData);

    if (process.env.NODE_ENV === 'development') {
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(newData, null, 2));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Redis POST Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}