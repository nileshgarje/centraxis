import { NextRequest, NextResponse } from "next/server";
import { auth } from "@centraxis/auth";
import { db } from "@centraxis/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Documents & archives
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "text/x-log",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to upload attachments." },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const workItemId = formData.get("workItemId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the 25 MB limit (received ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: `File type "${mimeType}" is not permitted. Allowed types: images, PDFs, text, zip, logs.`,
        },
        { status: 400 },
      );
    }

    // Sanitize filename and create unique storage path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniquePrefix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const storedFileName = `${uniquePrefix}-${sanitizedName}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${storedFileName}`;

    let attachmentRecord = null;
    if (workItemId) {
      // Validate that work item exists and user has access
      const workItem = await db.workItem.findUnique({
        where: { id: workItemId },
        select: { id: true },
      });

      if (workItem) {
        attachmentRecord = await db.attachment.create({
          data: {
            filename: file.name,
            fileUrl,
            fileSize: buffer.length,
            mimeType,
            workItemId: workItem.id,
            uploaderId: session.user.id,
          },
          include: {
            uploader: {
              select: { id: true, name: true, image: true, email: true },
            },
          },
        });
      }
    }

    return NextResponse.json(
      {
        id: attachmentRecord?.id ?? null,
        filename: file.name,
        fileUrl,
        fileSize: buffer.length,
        mimeType,
        attachment: attachmentRecord,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process file upload." },
      { status: 500 },
    );
  }
}
