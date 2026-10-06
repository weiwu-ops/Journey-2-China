import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 定位本地的 data.json
const dataFilePath = path.join(process.cwd(), 'data.json');

export async function GET() {
  try {
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(fileData));
  } catch (error) {
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newData = await request.json();
    fs.writeFileSync(dataFilePath, JSON.stringify(newData, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}