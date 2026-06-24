import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://mvcprswvfybudtopepuj.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const COLORIST_SCHEMA = "colorist_pre_registration";
const COLORIST_REST_TABLE = "registrations";

let postgresClient: ReturnType<typeof postgres> | null = null;

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

type SurveyPayload = {
  id: string;
  designerPainPoint: string[];
  customerSource: string[];
  subscriptionIntent: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

function parseSurveyPayload(body: unknown): SurveyPayload | null {
  if (!isRecord(body)) return null;

  return {
    id: typeof body.id === "string" ? body.id.trim() : "",
    designerPainPoint: isStringArray(body.designerPainPoint)
      ? body.designerPainPoint.map((item) => item.trim())
      : [],
    customerSource: isStringArray(body.customerSource)
      ? body.customerSource.map((item) => item.trim())
      : [],
    subscriptionIntent: isStringArray(body.subscriptionIntent)
      ? body.subscriptionIntent.map((item) => item.trim())
      : [],
  };
}

function getSurveyValidationError(payload: SurveyPayload) {
  if (!payload.id) return "등록 정보를 찾을 수 없어요.";
  if (payload.designerPainPoint.length < 1) {
    return "가장 힘든 점을 선택해주세요.";
  }
  if (payload.customerSource.length < 1) {
    return "현재 고객 유입 경로를 선택해주세요.";
  }
  if (payload.subscriptionIntent.length < 1) {
    return "월 구독 의향을 선택해주세요.";
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

  if (sql) {
    const rows = await sql<{ id: string }[]>`
      insert into colorist_pre_registration.registrations (
        naver_booking_link,
        selected_services,
        contact_type,
        contact_value,
        uploaded_files,
        uploaded_file_count,
        instagram_portfolio_id,
        desired_customer_types,
        main_need,
        consent,
        source
      )
      values (
        ${insertPayload.naver_booking_link},
        ${insertPayload.selected_services}::text[],
        ${insertPayload.contact_type},
        ${insertPayload.contact_value},
        ${sql.json(insertPayload.uploaded_files)}::jsonb,
        ${insertPayload.uploaded_file_count},
        ${insertPayload.instagram_portfolio_id},
        ${insertPayload.desired_customer_types}::text[],
        ${insertPayload.main_need},
        ${insertPayload.consent},
        ${insertPayload.source}
      )
      returning id
    `;

    return NextResponse.json({ ok: true, id: rows[0]?.id ?? null });
  }

  if (!SUPABASE_KEY) {
    return NextResponse.json(
      {
        error:
          "Supabase 키 또는 DATABASE_URL이 설정되지 않았어요. DATABASE_URL 또는 SUPABASE_ANON_KEY를 설정해주세요.",
      },
      { status: 500 },
    );
  }

  const supabaseResponse = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${COLORIST_REST_TABLE}?select=id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Accept-Profile": COLORIST_SCHEMA,
        "Content-Type": "application/json",
        "Content-Profile": COLORIST_SCHEMA,
        Prefer: "return=representation",
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

  const savedRows = (await supabaseResponse.json().catch(() => [])) as Array<{
    id?: string;
  }>;

  return NextResponse.json({ ok: true, id: savedRows[0]?.id ?? null });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  const payload = parseSurveyPayload(body);

  if (!payload) {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  const validationError = getSurveyValidationError(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const sql = getPostgresClient();
  const surveyPayload = {
    designer_pain_point: payload.designerPainPoint,
    customer_source: payload.customerSource,
    subscription_intent: payload.subscriptionIntent,
    survey_submitted_at: new Date().toISOString(),
  };

  if (sql) {
    await sql`
      update colorist_pre_registration.registrations
      set
        designer_pain_point = ${surveyPayload.designer_pain_point}::text[],
        customer_source = ${surveyPayload.customer_source}::text[],
        subscription_intent = ${surveyPayload.subscription_intent}::text[],
        survey_submitted_at = ${surveyPayload.survey_submitted_at}
      where id = ${payload.id}::uuid
    `;

    return NextResponse.json({ ok: true });
  }

  if (!SUPABASE_KEY) {
    return NextResponse.json(
      {
        error:
          "Supabase 키 또는 DATABASE_URL이 설정되지 않았어요. DATABASE_URL 또는 SUPABASE_ANON_KEY를 설정해주세요.",
      },
      { status: 500 },
    );
  }

  const supabaseResponse = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${COLORIST_REST_TABLE}?id=eq.${encodeURIComponent(payload.id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Accept-Profile": COLORIST_SCHEMA,
        "Content-Type": "application/json",
        "Content-Profile": COLORIST_SCHEMA,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(surveyPayload),
    },
  );

  if (!supabaseResponse.ok) {
    const errorText = await supabaseResponse.text();

    return NextResponse.json(
      {
        error:
          "설문 저장에 실패했어요. 테이블/정책/키 설정을 확인해주세요.",
        detail: errorText,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
