import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

type UploadKind = "profile" | "case";

type UploadRequest = {
  kind: UploadKind;
  contentType: string;
  fileSize: number;
  fileExtension: string;
};

let s3Client: S3Client | null = null;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getEnv("AWS_REGION"),
      credentials: {
        accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }

  return s3Client;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseUploadRequest(body: unknown): UploadRequest | null {
  if (!isRecord(body)) return null;

  const kind = body.kind;
  if (kind !== "profile" && kind !== "case") return null;

  return {
    kind,
    contentType:
      typeof body.contentType === "string" ? body.contentType.trim() : "",
    fileSize: typeof body.fileSize === "number" ? body.fileSize : 0,
    fileExtension:
      typeof body.fileExtension === "string" ? body.fileExtension.trim() : "",
  };
}

function validateUpload(input: UploadRequest) {
  if (!input.contentType || !input.fileExtension) {
    return "파일 정보가 올바르지 않아요.";
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(input.contentType)) {
    return "JPG, PNG, WEBP 이미지만 업로드할 수 있어요.";
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return "파일 크기가 올바르지 않아요.";
  }

  if (input.fileSize > 10 * 1024 * 1024) {
    return "이미지는 10MB 이하만 업로드할 수 있어요.";
  }

  return null;
}

function normalizedExtension(input: UploadRequest) {
  if (input.contentType === "image/jpeg") return "jpg";
  if (input.contentType === "image/png") return "png";
  if (input.contentType === "image/webp") return "webp";

  return input.fileExtension.toLowerCase().replace(/^\./, "");
}

function publicUrl(bucket: string, region: string, key: string) {
  const cloudFrontUrl = process.env.CLOUDFRONT_URL?.trim().replace(/\/+$/g, "");
  if (cloudFrontUrl) return `${cloudFrontUrl}/${key}`;

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const input = parseUploadRequest(body);

  if (!input) {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  const validationError = validateUpload(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const region = getEnv("AWS_REGION");
    const bucket = getEnv("S3_BUCKET");
    const appPrefix = (process.env.S3_APP_PREFIX ?? "colorist/dev").replace(
      /^\/+|\/+$/g,
      "",
    );
    const extension = normalizedExtension(input);
    const s3Key = `${appPrefix}/manual-profiles/${input.kind}/${crypto.randomUUID()}.${extension}`;

    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: 600 },
    );

    return NextResponse.json({
      uploadUrl,
      s3Key,
      mediaUrl: publicUrl(bucket, region, s3Key),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 업로드 URL 생성에 실패했어요.",
      },
      { status: 500 },
    );
  }
}
