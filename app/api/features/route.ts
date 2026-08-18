import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const layerId = searchParams.get("layerId");

  try {
    const features = await prisma.feature.findMany({
      where: layerId ? { layerId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(features);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const feature = await prisma.feature.create({
      data: {
        layerId: data.layerId,
        title: data.title,
        description: data.description,
        iconUrl: data.iconUrl || null,
        type: data.type,
        coordinates: data.coordinates,
      },
    });
    return NextResponse.json(feature);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create feature" }, { status: 500 });
  }
}
