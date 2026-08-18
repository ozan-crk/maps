import { NextResponse } from "next/server";
import { writeFile, readdir, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const iconsDir = path.join(process.cwd(), "public/uploads/icons");
    await mkdir(iconsDir, { recursive: true });
    
    const files = await readdir(iconsDir);
    const icons = files
      .filter(f => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".svg"))
      .map(f => ({
        name: f.substring(0, f.lastIndexOf(".")),
        url: `/api/uploads/icons/${f}`
      }));
    
    return NextResponse.json(icons);
  } catch (error) {
    console.error("GET /icons error:", error);
    return NextResponse.json({ error: "Failed to read icons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    
    if (!file || !name) {
      return NextResponse.json({ error: "No file or name provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || ".png";
    // Sanitize name: keep only letters, numbers, replace spaces with underscores
    const sanitizedName = name.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, "").trim().replace(/\s+/g, "_");
    const filename = `${sanitizedName}${ext}`;
    
    const iconsDir = path.join(process.cwd(), "public/uploads/icons");
    await mkdir(iconsDir, { recursive: true });
    
    const filepath = path.join(iconsDir, filename);
    await writeFile(filepath, buffer);
    
    return NextResponse.json({ url: `/api/uploads/icons/${filename}`, name: sanitizedName });
  } catch (error) {
    console.error("POST /icons error:", error);
    return NextResponse.json({ error: "Failed to upload icon" }, { status: 500 });
  }
}
