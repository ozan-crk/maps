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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const map = await prisma.mapProject.create({
      data: {
        name: body.name,
        description: body.description,
      },
    });
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create map" }, { status: 500 });
  }
}
