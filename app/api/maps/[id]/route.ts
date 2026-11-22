import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const map = await prisma.mapProject.findUnique({
      where: { id },
      include: {
        layers: {
          include: {
            features: {
              orderBy: { createdAt: "desc" },
            },
          },
        }
      }
    });
    
    if (!map) return NextResponse.json({ error: "Map not found" }, { status: 404 });
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description } = body;
    
    const updated = await prisma.mapProject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update map" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.mapProject.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete map" }, { status: 500 });
  }
}
