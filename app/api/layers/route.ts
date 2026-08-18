import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mapId = url.searchParams.get("mapId");
    
    console.log("DATABASE_URL in API route:", process.env.DATABASE_URL);
    const layers = await prisma.layer.findMany({
      where: mapId ? { mapId } : undefined,
      orderBy: { createdAt: "asc" },
      include: {
        features: true,
      },
    });
    return NextResponse.json(layers);
  } catch (error) {
    console.error("API Error in GET /layers:", error);
    return NextResponse.json({ error: "Failed to fetch layers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const layer = await prisma.layer.create({
      data: {
        mapId: data.mapId,
        name: data.name,
        iconUrl: data.iconUrl,
        color: data.color,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json(layer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create layer" }, { status: 500 });
  }
}
