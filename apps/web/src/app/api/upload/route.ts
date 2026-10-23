import { NextRequest, NextResponse } from "next/server";
import { auth } from "@centraxis/auth";
import { db } from "@centraxis/db";
import { assertUserHasProjectAccess } from "@centraxis/api/auth-guards";
import { fileTypeFromBuffer } from "file-type";
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

const ALLOWED_TEXT_EXTENSIONS = new Set([
  ".txt",
  ".csv",
  ".md",
  ".json",
  ".log",
]);

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".bash",
  ".ps1",
  ".vbs",
  ".php",
  ".php3",
  ".php4",
  ".php5",
  ".phtml",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".jar",
  ".war",
  ".ear",
  ".py",
  ".rb",
  ".pl",
  ".cgi",
  ".html",
  ".htm",
  ".xhtml",
  ".asp",
  ".aspx",
  ".jsp",
  ".dll",
  ".so",
  ".dylib",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to upload attachments." },
        {
          status: 401,
          headers: { "X-Content-Type-Options": "nosniff" },
        },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const workItemId = formData.get("workItemId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        {
          status: 400,
          headers: { "X-Content-Type-Options": "nosniff" },
        },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the 25 MB limit (received ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        },
        {
          status: 400,
          headers: { "X-Content-Type-Options": "nosniff" },
        },
      );
    }

    // 1. Extension inspection
    const rawFilename = path.basename(file.name);
    const ext = path.extname(rawFilename).toLowerCase();

    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Executable or script extension "${ext}" is blocked for security reasons.`,
        },
        {
          status: 400,
          headers: { "X-Content-Type-Options": "nosniff" },
        },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Binary Magic-Number verification
    const detected = await fileTypeFromBuffer(buffer);

    if (detected) {
      if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
        return NextResponse.json(
          {
            error: `Detected file content type "${detected.mime}" is not permitted.`,
          },
          {
            status: 400,
            headers: { "X-Content-Type-Options": "nosniff" },
          },
        );
      }
    } else {
      // If magic number not detected, verify that it is one of the allowed plain-text types
      if (!ALLOWED_TEXT_EXTENSIONS.has(ext) && ext !== ".svg") {
        return NextResponse.json(
          {
            error: `Unrecognized file content or unpermitted plain text extension "${ext}".`,
          },
          {
            status: 400,
            headers: { "X-Content-Type-Options": "nosniff" },
          },
        );
      }

      // Check for null-byte binary masquerading as text
      if (ext !== ".svg" && buffer.includes(0x00)) {
        return NextResponse.json(
          {
            error: "Binary payload disguised as text file is not permitted.",
          },
          {
            status: 400,
            headers: { "X-Content-Type-Options": "nosniff" },
          },
        );
      }
    }

    // 3. SVG Security checks (disallow embedded scripts and event handlers)
    if (ext === ".svg" || file.type === "image/svg+xml") {
      const textContent = buffer.toString("utf-8").toLowerCase();
      const dangerousSvgPatterns = [
        "<script",
        "javascript:",
        "onload=",
        "onerror=",
        "onclick=",
        "onmouseover=",
        "<foreignobject",
      ];
      for (const pattern of dangerousSvgPatterns) {
        if (textContent.includes(pattern)) {
          return NextResponse.json(
            {
              error: `SVG file contains dangerous elements or scripts ("${pattern}").`,
            },
            {
              status: 400,
              headers: { "X-Content-Type-Options": "nosniff" },
            },
          );
        }
      }
    }

    const mimeType = detected?.mime || file.type || "application/octet-stream";

    // 4. BOLA Verification if linked to a Work Item
    let attachmentRecord = null;
    if (workItemId) {
      const workItem = await db.workItem.findUnique({
        where: { id: workItemId },
        select: { id: true, projectId: true },
      });

      if (!workItem) {
        return NextResponse.json(
          { error: "Specified work item does not exist." },
          {
            status: 404,
            headers: { "X-Content-Type-Options": "nosniff" },
          },
        );
      }

      try {
        await assertUserHasProjectAccess(db, session.user, workItem.projectId, {
          requireWrite: true,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            error:
              err?.message ||
              "Forbidden: You do not have permission to attach files to this work item.",
          },
          {
            status: 403,
            headers: { "X-Content-Type-Options": "nosniff" },
          },
        );
      }

      // 5. Safe Random Storage Filename (UUID to avoid collision and traversal)
      const fileId = crypto.randomUUID();
      const safeExt = ext.replace(/[^a-z0-9.]/gi, "");
      const storedFileName = `${fileId}${safeExt}`;

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });

      const filePath = path.join(uploadsDir, storedFileName);
      await writeFile(filePath, buffer);

      const fileUrl = `/uploads/${storedFileName}`;

      attachmentRecord = await db.attachment.create({
        data: {
          filename: rawFilename,
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

      return NextResponse.json(
        {
          id: attachmentRecord.id,
          filename: rawFilename,
          fileUrl,
          fileSize: buffer.length,
          mimeType,
          attachment: attachmentRecord,
        },
        {
          status: 201,
          headers: { "X-Content-Type-Options": "nosniff" },
        },
      );
    }

    // Upload without workItemId (for standalone editor copy-paste)
    const fileId = crypto.randomUUID();
    const safeExt = ext.replace(/[^a-z0-9.]/gi, "");
    const storedFileName = `${fileId}${safeExt}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${storedFileName}`;

    return NextResponse.json(
      {
        id: null,
        filename: rawFilename,
        fileUrl,
        fileSize: buffer.length,
        mimeType,
        attachment: null,
      },
      {
        status: 201,
        headers: { "X-Content-Type-Options": "nosniff" },
      },
    );
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process file upload." },
      {
        status: 500,
        headers: { "X-Content-Type-Options": "nosniff" },
      },
    );
  }
}
