import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const maps = await prisma.mapProject.findMany({
      include: {
        layers: true
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(maps);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch maps" }, { status: 500 });
  }
}

function generateSlug(text: string) {
  return text.toString().toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let slug = generateSlug(body.name);
    
    if (!slug) {
      slug = "harita-" + Math.random().toString(36).substring(2, 8);
    } else {
      const existing = await prisma.mapProject.findUnique({ where: { id: slug } });
      if (existing) {
        slug += "-" + Math.random().toString(36).substring(2, 8);
      }
    }

    const map = await prisma.mapProject.create({
      data: {
        id: slug,
        name: body.name,
        description: body.description,
      },
    });
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create map" }, { status: 500 });
  }
}
