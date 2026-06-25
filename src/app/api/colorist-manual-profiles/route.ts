import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

type UploadedMediaAsset = {
  name: string;
  size: number;
  type: string;
  s3Key: string;
  url: string;
};

type ManualPriceItem = {
  service: string;
  price: string;
};

type ManualProfilePayload = {
  designerName: string;
  salonName: string;
  area: string;
  naverBookingLink: string;
  contactValue: string;
  intro: string;
  selectedServices: string[];
  profileImage: UploadedMediaAsset;
  serviceImages: UploadedMediaAsset[];
  priceItems: ManualPriceItem[];
};

let postgresClient: ReturnType<typeof postgres> | null = null;

function getPostgresClient() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!databaseUrl) return null;

  if (!postgresClient) {
    postgresClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl: "require",
    });
  }

  return postgresClient;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function parseUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function isValidNaverBookingLink(value: string) {
  const url = parseUrlInput(value);
  if (!url) return false;

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const isNaverDomain =
    hostname === "naver.me" ||
    hostname === "naver.com" ||
    hostname.endsWith(".naver.com");

  return (url.protocol === "https:" || url.protocol === "http:") && isNaverDomain;
}

function isValidPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const isMobile = /^01[016789]\d{7,8}$/.test(digits);
  const isSeoulNumber = /^02\d{7,8}$/.test(digits);
  const isAreaNumber = /^0[3-6]\d\d{7,8}$/.test(digits);

  return isMobile || isSeoulNumber || isAreaNumber;
}

function parseMediaAsset(value: unknown): UploadedMediaAsset | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const type = typeof value.type === "string" ? value.type.trim() : "";
  const s3Key = typeof value.s3Key === "string" ? value.s3Key.trim() : "";
  const url = typeof value.url === "string" ? value.url.trim() : "";
  const size = typeof value.size === "number" ? value.size : 0;

  if (!name || !type || !s3Key || !url || size <= 0) return null;

  return { name, size, type, s3Key, url };
}

function parsePriceItems(value: unknown): ManualPriceItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => ({
      service: typeof item.service === "string" ? item.service.trim() : "",
      price: typeof item.price === "string" ? item.price.trim() : "",
    }))
    .filter((item) => item.service && item.price)
    .slice(0, 4);
}

function parsePayload(body: unknown): ManualProfilePayload | null {
  if (!isRecord(body)) return null;

  const profileImage = parseMediaAsset(body.profileImage);
  const serviceImages = Array.isArray(body.serviceImages)
    ? body.serviceImages
        .map(parseMediaAsset)
        .filter((item): item is UploadedMediaAsset => Boolean(item))
        .slice(0, 4)
    : [];

  if (!profileImage) return null;

  return {
    designerName:
      typeof body.designerName === "string" ? body.designerName.trim() : "",
    salonName: typeof body.salonName === "string" ? body.salonName.trim() : "",
    area: typeof body.area === "string" ? body.area.trim() : "",
    naverBookingLink:
      typeof body.naverBookingLink === "string"
        ? body.naverBookingLink.trim()
        : "",
    contactValue:
      typeof body.contactValue === "string" ? body.contactValue.trim() : "",
    intro: typeof body.intro === "string" ? body.intro.trim() : "",
    selectedServices: isStringArray(body.selectedServices)
      ? body.selectedServices.map((item) => item.trim()).slice(0, 3)
      : [],
    profileImage,
    serviceImages,
    priceItems: parsePriceItems(body.priceItems),
  };
}

function getValidationError(payload: ManualProfilePayload) {
  if (!payload.designerName) return "디자이너명을 입력해주세요.";
  if (!payload.salonName) return "매장명을 입력해주세요.";
  if (!payload.area) return "지역을 입력해주세요.";
  if (!isValidNaverBookingLink(payload.naverBookingLink)) {
    return "네이버 예약/플레이스 링크를 입력해주세요.";
  }
  if (!isValidPhoneNumber(payload.contactValue)) {
    return "전화번호 형식으로 입력해주세요.";
  }
  if (!payload.intro) return "한 줄 소개를 입력해주세요.";
  if (payload.selectedServices.length < 1) {
    return "대표 시술을 1개 이상 선택해주세요.";
  }
  if (payload.serviceImages.length < 1) {
    return "시술 사례 사진을 1장 이상 첨부해주세요.";
  }
  if (payload.priceItems.length < 1) {
    return "대표 가격을 1개 이상 입력해주세요.";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const payload = parsePayload(body);

  if (!payload) {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  const validationError = getValidationError(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const sql = getPostgresClient();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL 또는 POSTGRES_URL이 설정되지 않았어요." },
      { status: 500 },
    );
  }

  const rows = await sql<{ id: string }[]>`
    insert into colorist_pre_registration.manual_profiles (
      designer_name,
      salon_name,
      area,
      naver_booking_link,
      contact_value,
      intro,
      selected_services,
      profile_image,
      service_images,
      price_items,
      source
    )
    values (
      ${payload.designerName},
      ${payload.salonName},
      ${payload.area},
      ${payload.naverBookingLink},
      ${payload.contactValue},
      ${payload.intro},
      ${payload.selectedServices}::text[],
      ${sql.json(payload.profileImage)}::jsonb,
      ${sql.json(payload.serviceImages)}::jsonb,
      ${sql.json(payload.priceItems)}::jsonb,
      ${"manual_profile_creator"}
    )
    returning id
  `;

  return NextResponse.json({ ok: true, id: rows[0]?.id ?? null });
}
