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
      // 数据库为空时从本地 data.json 读取初始数据存入 Redis
      const fileData = fs.readFileSync(LOCAL_FILE, 'utf-8');
      data = JSON.parse(fileData);
      await redis.set('game_data', data);
    } else if (typeof data === 'string') {
      // 容错处理：确保返回给前端的是 JavaScript 对象而非未解析字符串
      data = JSON.parse(data);
    }

    // 确保学生列表中的头像和头像框字段完整存在
    if (data && Array.isArray(data.students)) {
      data.students = data.students.map((student) => ({
        ...student,
        avatar: student.avatar || '',
        avatarFrame: student.avatarFrame || '',
      }));
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

    if (!newData || typeof newData !== 'object') {
      return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // 从数据库获取旧数据以防属性遗漏
    let currentData = await redis.get('game_data');
    if (typeof currentData === 'string') {
      currentData = JSON.parse(currentData);
    }

    // 数据深合并：严格保留 avatar 与 avatarFrame
    const mergedData = {
      ...currentData,
      ...newData,
      students: newData.students
        ? newData.students.map((newStudent) => {
            const existingStudent = currentData?.students?.find((s) => s.id === newStudent.id);
            return {
              ...existingStudent,
              ...newStudent,
              avatar: newStudent.avatar !== undefined ? newStudent.avatar : (existingStudent?.avatar || ''),
              avatarFrame: newStudent.avatarFrame !== undefined ? newStudent.avatarFrame : (existingStudent?.avatarFrame || ''),
            };
          })
        : currentData?.students || [],
    };

    // 写入 Upstash Redis 云数据库
    await redis.set('game_data', mergedData);

    // 本地开发环境同步更新本地文件以便调试
    if (process.env.NODE_ENV === 'development') {
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(mergedData, null, 2));
    }

    return Response.json({ success: true, data: mergedData });
  } catch (error) {
    console.error('Redis POST Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}