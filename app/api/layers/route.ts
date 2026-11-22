import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mapId = url.searchParams.get("mapId");
    
    const layers = await prisma.layer.findMany({
      where: mapId ? { maps: { some: { id: mapId } } } : undefined,
      orderBy: { createdAt: "asc" },
      include: {
        features: {
          orderBy: { createdAt: "desc" },
        },
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
        name: data.name,
        iconUrl: data.iconUrl,
        color: data.color,
        isActive: data.isActive ?? true,
        maps: data.mapId ? { connect: { id: data.mapId } } : undefined,
      },
    });
    return NextResponse.json(layer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create layer" }, { status: 500 });
  }
}
