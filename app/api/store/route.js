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

    // 补全默认防空容错
    if (!data.achievements) data.achievements = [];
    if (!data.settings) data.settings = { title: "中国之旅", subtitle: "Journey to China" };

    if (data && Array.isArray(data.students)) {
      data.students = data.students.map((student) => {
        const frameImages = Array.isArray(student.frameImages) ? student.frameImages : [];
        const currentFrame = student.frameImage || student.avatarFrame || "";
        if (currentFrame && !frameImages.includes(currentFrame)) {
          frameImages.push(currentFrame);
        }

        return {
          ...student,
          avatar: student.avatar || "🤖",
          avatarImage: student.avatarImage || student.avatar || "",
          frameImage: currentFrame,
          avatarFrame: currentFrame,
          frameImages: frameImages,
          unlockedAchievements: Array.isArray(student.unlockedAchievements) ? student.unlockedAchievements : [],
        };
      });
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

    let currentData = await redis.get('game_data');
    if (typeof currentData === 'string') {
      currentData = JSON.parse(currentData);
    }

    const mergedData = {
      ...currentData,
      ...newData,
      settings: newData.settings || currentData?.settings || { title: "中国之旅", subtitle: "Journey to China" },
      achievements: newData.achievements || currentData?.achievements || [],
      students: newData.students
        ? newData.students.map((newStudent) => {
            const existingStudent = currentData?.students?.find((s) => s.id === newStudent.id);
            const frameImages = Array.isArray(newStudent.frameImages)
              ? newStudent.frameImages
              : (existingStudent?.frameImages || []);
            
            const frameImage = newStudent.frameImage ?? newStudent.avatarFrame ?? existingStudent?.frameImage ?? "";
            
            if (frameImage && !frameImages.includes(frameImage)) {
              frameImages.push(frameImage);
            }

            return {
              ...existingStudent,
              ...newStudent,
              avatarImage: newStudent.avatarImage ?? existingStudent?.avatarImage ?? "",
              avatar: newStudent.avatar ?? existingStudent?.avatar ?? "🤖",
              frameImage: frameImage,
              avatarFrame: frameImage,
              frameImages: frameImages,
              unlockedAchievements: Array.isArray(newStudent.unlockedAchievements)
                ? newStudent.unlockedAchievements
                : (existingStudent?.unlockedAchievements || []),
            };
          })
        : currentData?.students || [],
    };

    await redis.set('game_data', mergedData);

    if (process.env.NODE_ENV === 'development') {
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(mergedData, null, 2));
    }

    return Response.json({ success: true, data: mergedData });
  } catch (error) {
    console.error('Redis POST Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}