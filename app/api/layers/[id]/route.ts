import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const layer = await prisma.layer.update({
      where: { id: id },
      data: {
        name: data.name,
        iconUrl: data.iconUrl,
        color: data.color,
        isActive: data.isActive,
      },
    });
    return NextResponse.json(layer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update layer" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.layer.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete layer" }, { status: 500 });
  }
}
