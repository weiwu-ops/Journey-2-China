import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();
const REDIS_KEY = 'journey_2_china_data';

// 格式化每个学生的数据，确保头像和头像框永远不会丢失
function normalizeStudentData(student) {
  return {
    id: student.id,
    name: student.name || '未命名学生',
    score: typeof student.score === 'number' ? student.score : Number(student.score || 0),
    avatar: student.avatar || '/avatars/default.png',
    avatarFrame: student.avatarFrame || student.frame || '',
    achievements: Array.isArray(student.achievements) ? student.achievements : [],
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const rawData = await redis.get(REDIS_KEY);
    if (!rawData) {
      return NextResponse.json({ success: true, data: [] });
    }
    const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const sanitizedData = Array.isArray(parsedData) ? parsedData.map(normalizeStudentData) : [];
    return NextResponse.json({ success: true, data: sanitizedData });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const studentsInput = Array.isArray(body) ? body : body?.students;

    if (!Array.isArray(studentsInput)) {
      return NextResponse.json({ success: false, error: '数据格式错误' }, { status: 400 });
    }

    const sanitizedStudents = studentsInput.map(normalizeStudentData);
    await redis.set(REDIS_KEY, JSON.stringify(sanitizedStudents));

    return NextResponse.json({ success: true, data: sanitizedStudents });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}