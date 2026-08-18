import { NextResponse } from "next/server";
import { writeFile, readdir, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function GET() {
  try {
    const iconsDir = path.join(process.cwd(), "public/uploads/icons");
    // Ensure dir exists
    await mkdir(iconsDir, { recursive: true });
    
    const files = await readdir(iconsDir);
    const urls = files.filter(f => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".svg")).map(f => `/uploads/icons/${f}`);
    
    return NextResponse.json(urls);
  } catch (error) {
    console.error("GET /icons error:", error);
    return NextResponse.json({ error: "Failed to read icons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".png";
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const filename = `${uniqueId}${ext}`;
    
    const iconsDir = path.join(process.cwd(), "public/uploads/icons");
    await mkdir(iconsDir, { recursive: true });
    
    const filepath = path.join(iconsDir, filename);
    await writeFile(filepath, buffer);
    
    return NextResponse.json({ url: `/uploads/icons/${filename}` });
  } catch (error) {
    console.error("POST /icons error:", error);
    return NextResponse.json({ error: "Failed to upload icon" }, { status: 500 });
  }
}
