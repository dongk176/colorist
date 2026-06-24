import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://mvcprswvfybudtopepuj.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ContactType = "instagram" | "phone";

type UploadedFileMetadata = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

type RegistrationPayload = {
  naverBookingLink: string;
  selectedServices: string[];
  contactType: ContactType;
  contactValue: string;
  uploadedFiles: UploadedFileMetadata[];
  instagramPortfolioId: string;
  desiredCustomerTypes: string[];
  mainNeed: string;
  consent: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function isContactType(value: unknown): value is ContactType {
  return value === "instagram" || value === "phone";
}

function normalizeUploadedFiles(value: unknown): UploadedFileMetadata[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((file) => ({
      name: typeof file.name === "string" ? file.name.slice(0, 255) : "",
      size: typeof file.size === "number" ? file.size : 0,
      type: typeof file.type === "string" ? file.type.slice(0, 120) : "",
      lastModified:
        typeof file.lastModified === "number" ? file.lastModified : 0,
    }))
    .filter((file) => file.name.length > 0);
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

function isValidInstagramHandle(value: string) {
  const rawHandle = value.trim();
  if (!rawHandle) return true;

  const handle = rawHandle.startsWith("@") ? rawHandle.slice(1) : rawHandle;
  const isBasicFormat = /^[A-Za-z0-9._]{1,30}$/.test(handle);
  const hasBadDot =
    handle.startsWith(".") || handle.endsWith(".") || handle.includes("..");

  return isBasicFormat && !hasBadDot && !rawHandle.slice(1).includes("@");
}

function getValidationError(payload: RegistrationPayload) {
  if (!payload.naverBookingLink) return "네이버예약 링크를 입력해주세요.";
  if (!isValidNaverBookingLink(payload.naverBookingLink)) {
    return "네이버 예약/플레이스 링크를 입력해주세요.";
  }
  if (payload.selectedServices.length < 1) {
    return "대표 컬러 시술을 1개 이상 선택해주세요.";
  }
  if (payload.selectedServices.length > 3) {
    return "대표 컬러 시술은 최대 3개까지 선택할 수 있어요.";
  }
  if (!payload.contactValue) return "전화번호를 입력해주세요.";
  if (!isValidPhoneNumber(payload.contactValue)) {
    return "전화번호 형식으로 입력해주세요.";
  }
  if (!isValidInstagramHandle(payload.instagramPortfolioId)) {
    return "인스타 아이디 형식으로 입력해주세요.";
  }
  if (!payload.consent) return "프로필 초안 제작 동의가 필요해요.";

  return null;
}

function parsePayload(body: unknown): RegistrationPayload | null {
  if (!isRecord(body)) return null;

  const selectedServices = isStringArray(body.selectedServices)
    ? body.selectedServices.map((item) => item.trim())
    : [];
  const desiredCustomerTypes = isStringArray(body.desiredCustomerTypes)
    ? body.desiredCustomerTypes.map((item) => item.trim())
    : [];

  return {
    naverBookingLink:
      typeof body.naverBookingLink === "string"
        ? body.naverBookingLink.trim()
        : "",
    selectedServices,
    contactType: isContactType(body.contactType) ? body.contactType : "phone",
    contactValue:
      typeof body.contactValue === "string" ? body.contactValue.trim() : "",
    uploadedFiles: normalizeUploadedFiles(body.uploadedFiles),
    instagramPortfolioId:
      typeof body.instagramPortfolioId === "string"
        ? body.instagramPortfolioId.trim()
        : "",
    desiredCustomerTypes,
    mainNeed: typeof body.mainNeed === "string" ? body.mainNeed.trim() : "",
    consent: body.consent === true,
  };
}

export async function POST(request: NextRequest) {
  if (!SUPABASE_KEY) {
    return NextResponse.json(
      {
        error:
          "Supabase 키가 설정되지 않았어요. SUPABASE_ANON_KEY 또는 SUPABASE_SERVICE_ROLE_KEY를 .env.local에 넣어주세요.",
      },
      { status: 500 },
    );
  }

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

  const insertPayload = {
    naver_booking_link: payload.naverBookingLink,
    selected_services: payload.selectedServices,
    contact_type: payload.contactType,
    contact_value: payload.contactValue,
    uploaded_files: payload.uploadedFiles,
    uploaded_file_count: payload.uploadedFiles.length,
    instagram_portfolio_id: payload.instagramPortfolioId || null,
    desired_customer_types: payload.desiredCustomerTypes,
    main_need: payload.mainNeed || null,
    consent: payload.consent,
    source: "hongdae_designer_pre_registration",
  };

  const supabaseResponse = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/colorist_pre_registrations`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(insertPayload),
    },
  );

  if (!supabaseResponse.ok) {
    const errorText = await supabaseResponse.text();

    return NextResponse.json(
      {
        error:
          "Supabase 저장에 실패했어요. 테이블/정책/키 설정을 확인해주세요.",
        detail: errorText,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
