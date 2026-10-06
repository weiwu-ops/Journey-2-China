import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "没有接收到文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // 确保文件名唯一，防止覆盖
    const filename = Date.now() + "_" + file.name.replaceAll(" ", "_");
    
    // 保存到 public/uploads 文件夹下
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    // 返回可以直接在网页中引用的图片路径
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("上传错误:", error);
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
  }
}