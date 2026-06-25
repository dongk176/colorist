"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent, UIEvent } from "react";

type ContactType = "instagram" | "phone";

type ServiceOption = {
  label: string;
  image: string;
};

type SurveyAnswers = {
  designerPainPoint: string[];
  customerSource: string[];
  subscriptionIntent: string[];
};

const SERVICES = [
  { label: "원컬러 / 전체염색", image: "/service-images/one-color-full.png" },
  { label: "뿌리염색 / 리터치", image: "/service-images/root-retouch.png" },
  { label: "톤다운", image: "/service-images/tone-down-service.png" },
  { label: "새치커버 / 그레이커버", image: "/service-images/gray-cover-service.png" },
  { label: "애쉬 / 쿨톤 컬러", image: "/service-images/ash-cool.png" },
  { label: "베이지 / 밀크티 컬러", image: "/service-images/beige-milk-tea.png" },
  { label: "브라운 / 내추럴 컬러", image: "/service-images/brown-natural.png" },
  { label: "탈색 / 블론드", image: "/service-images/bleach-blonde.png" },
  { label: "발레아쥬 / 하이라이트", image: "/service-images/balayage-highlight.png" },
  { label: "이너컬러 / 투톤", image: "/service-images/inner-two-tone.png" },
  { label: "비비드 / 패션컬러", image: "/service-images/vivid-fashion.png" },
  { label: "컬러 보정 / 복구염색", image: "/service-images/color-correction-recovery.png" },
] satisfies ServiceOption[];

const PROFILE_PREVIEWS = [
  "/profile-preview/preview-01.png",
  "/profile-preview/preview-02.png",
];

const CUSTOMER_TYPES = [
  "첫 염색 고객",
  "탈색 컬러 고객",
  "발레아쥬/하이라이트",
  "블랙빼기/색보정",
  "톤다운 고객",
  "손상모 상담 고객",
  "새치커버 고객",
  "상관없음",
];

const MAIN_NEEDS = [
  "신규 고객 유입",
  "포트폴리오 노출",
  "특정 시술 고객 확보",
  "아직 잘 모르겠음",
];

const DESIGNER_PAIN_POINTS = [
  "신규 고객을 꾸준히 받기 어렵다",
  "내가 잘하는 시술이 고객에게 잘 안 보인다",
  "가격을 설명하거나 납득시키기 어렵다",
  "상담에 시간이 너무 많이 든다",
  "노쇼 / 예약 변경이 스트레스다",
  "리뷰나 포트폴리오 관리가 어렵다",
  "인스타그램 홍보가 부담스럽다",
  "고단가 시술 고객을 만나기 어렵다",
  "단골 고객으로 전환시키기 어렵다",
  "체력적으로 너무 힘들다",
];

const CUSTOMER_SOURCES = [
  "네이버 예약 / 네이버 지도",
  "인스타그램",
  "기존 단골 소개",
  "샵 자체 홍보",
  "지인 소개",
  "당근 / 지역 커뮤니티",
  "특별히 없다",
];

const SUBSCRIPTION_INTENTS = [
  "있다",
  "가격에 따라 있다",
  "아직 모르겠다",
  "없다",
];

export default function Home() {
  return (
    <Suspense fallback={<LightShell />}>
      <RegistrationFlow />
    </Suspense>
  );
}

const PAGE_KEYS = [
  "map",
  "designers",
  "start",
  "booking",
  "services",
  "contact",
  "customers",
  "confirm",
  "complete",
] as const;

type PageKey = (typeof PAGE_KEYS)[number];

const PAGE_TO_STEP: Record<PageKey, number> = {
  map: -1,
  designers: -1,
  start: 0,
  booking: 1,
  services: 2,
  contact: 3,
  customers: 4,
  confirm: 5,
  complete: 6,
};

const STEP_TO_PAGE = {
  0: "start",
  1: "booking",
  2: "services",
  3: "contact",
  4: "customers",
  5: "confirm",
  6: "complete",
} as const satisfies Record<number, PageKey>;

function isPageKey(value: string | null): value is PageKey {
  return typeof value === "string" && PAGE_KEYS.includes(value as PageKey);
}

function urlForPage(page: PageKey) {
  return `/?page=${page}`;
}

function pageForStep(step: number): PageKey {
  const normalizedStep = Math.min(Math.max(step, 0), 6) as keyof typeof STEP_TO_PAGE;
  return STEP_TO_PAGE[normalizedStep];
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

function getNaverBookingLinkError(value: string) {
  const url = parseUrlInput(value);
  if (!url) return "네이버예약 링크를 입력해주세요.";

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const isNaverDomain =
    hostname === "naver.me" ||
    hostname === "naver.com" ||
    hostname.endsWith(".naver.com");
  const isWebUrl = url.protocol === "https:" || url.protocol === "http:";

  if (!isWebUrl || !isNaverDomain) {
    return "네이버 예약/플레이스 링크를 입력해주세요.";
  }

  return null;
}

function getInstagramHandleError(value: string) {
  const rawHandle = value.trim();
  if (!rawHandle) return "인스타 아이디를 입력해주세요.";

  const handle = rawHandle.startsWith("@") ? rawHandle.slice(1) : rawHandle;
  const isBasicFormat = /^[A-Za-z0-9._]{1,30}$/.test(handle);
  const hasBadDot = handle.startsWith(".") || handle.endsWith(".") || handle.includes("..");

  if (!isBasicFormat || hasBadDot || rawHandle.slice(1).includes("@")) {
    return "인스타 아이디 형식으로 입력해주세요. 예: colorist_name";
  }

  return null;
}

function normalizeInstagramHandleInput(value: string) {
  return value.replace(/@/g, "");
}

function getOptionalInstagramHandleError(value: string) {
  return value.trim() ? getInstagramHandleError(value) : null;
}

function getPhoneNumberError(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "전화번호를 입력해주세요.";

  const isMobile = /^01[016789]\d{7,8}$/.test(digits);
  const isSeoulNumber = /^02\d{7,8}$/.test(digits);
  const isAreaNumber = /^0[3-6]\d\d{7,8}$/.test(digits);

  if (!isMobile && !isSeoulNumber && !isAreaNumber) {
    return "전화번호 형식으로 입력해주세요. 예: 010-0000-0000";
  }

  return null;
}

function LightShell() {
  return (
    <main className="min-h-[100svh] bg-[#f5f6f8] sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto min-h-[100svh] w-full max-w-[430px] bg-white sm:min-h-[860px] sm:rounded-[28px] sm:border sm:border-[#e6eaf0]" />
    </main>
  );
}

function RegistrationFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = searchParams.get("page");
  const page = isPageKey(requestedPage) ? requestedPage : "map";
  const step = PAGE_TO_STEP[page];
  const [naverBookingLink, setNaverBookingLink] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [contactType] = useState<ContactType>("phone");
  const [contactValue, setContactValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [instagramPortfolioId, setInstagramPortfolioId] = useState("");
  const [desiredCustomerTypes, setDesiredCustomerTypes] = useState<string[]>([]);
  const [mainNeed, setMainNeed] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    if (requestedPage !== page) {
      router.replace(urlForPage(page), { scroll: false });
    }
  }, [page, requestedPage, router]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);

  const goToPage = (nextPage: PageKey) => {
    router.push(urlForPage(nextPage), { scroll: true });
  };

  const naverBookingLinkError = useMemo(
    () => getNaverBookingLinkError(naverBookingLink),
    [naverBookingLink],
  );
  const contactValueError = useMemo(
    () => getPhoneNumberError(contactValue),
    [contactValue],
  );
  const instagramPortfolioIdError = useMemo(
    () => getOptionalInstagramHandleError(instagramPortfolioId),
    [instagramPortfolioId],
  );

  const canContinue = useMemo(() => {
    if (step === 1) return !naverBookingLinkError;
    if (step === 2) return selectedServices.length > 0;
    if (step === 3) return !contactValueError && !instagramPortfolioIdError;
    if (step === 5) return consent;
    return true;
  }, [
    consent,
    contactValueError,
    instagramPortfolioIdError,
    naverBookingLinkError,
    selectedServices.length,
    step,
  ]);

  const toggleService = (service: string) => {
    setSelectedServices((current) => {
      if (current.includes(service)) {
        return current.filter((item) => item !== service);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, service];
    });
  };

  const toggleCustomerType = (type: string) => {
    setDesiredCustomerTypes((current) => {
      if (type === "상관없음") {
        return current.includes(type) ? [] : [type];
      }

      const withoutAny = current.filter((item) => item !== "상관없음");
      if (withoutAny.includes(type)) {
        return withoutAny.filter((item) => item !== type);
      }

      return [...withoutAny, type];
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadedFiles(Array.from(event.target.files ?? []));
  };

  const next = () => {
    if (!canContinue) return;
    goToPage(pageForStep(step + 1));
  };

  const previous = () => {
    goToPage(pageForStep(Math.max(step - 1, 1)));
  };

  const completeRegistration = async () => {
    if (!canContinue || isSubmitting) return;

    setSubmissionError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/colorist-pre-registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          naverBookingLink,
          selectedServices,
          contactType,
          contactValue,
          uploadedFiles: uploadedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          })),
          instagramPortfolioId,
          desiredCustomerTypes,
          mainNeed,
          consent,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        id?: string | null;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "등록 저장에 실패했어요.");
      }

      setRegistrationId(result?.id ?? null);
      goToPage("complete");
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "등록 저장에 실패했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const screenKey = page === "map" || page === "designers" ? "intro" : page;

  return (
    <main className="min-h-[100svh] bg-[#f5f6f8] text-[#111827] sm:flex sm:items-center sm:justify-center sm:p-6">
      <section className="mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:min-h-[860px] sm:rounded-[28px] sm:border sm:border-[#e6eaf0]">
        {step > 0 && <Header />}
        {step > 0 && <StepIndicator currentStep={step} />}

        <div
          className={`flex flex-1 flex-col px-6 ${
            step > 0 && step < 6 ? "pb-28" : "pb-6"
          }`}
        >
          <div key={screenKey} className="flex flex-1 animate-fade-in flex-col">
            {(page === "map" || page === "designers") && (
              <PreStartScreen
                visualStep={page === "designers" ? 1 : 0}
                onNext={() => {
                  if (page === "map") {
                    goToPage("designers");
                    return;
                  }

                  goToPage("start");
                }}
              />
            )}
            {page === "start" && <StartScreen onStart={() => goToPage("booking")} />}
            {page === "booking" && (
              <BookingStep
                value={naverBookingLink}
                error={
                  naverBookingLink.trim().length > 0
                    ? naverBookingLinkError
                    : null
                }
                onChange={setNaverBookingLink}
              />
            )}
            {page === "services" && (
              <ServiceStep
                selectedServices={selectedServices}
                onToggle={toggleService}
              />
            )}
            {page === "contact" && (
              <ContactStep
                contactValue={contactValue}
                uploadedFiles={uploadedFiles}
                instagramPortfolioId={instagramPortfolioId}
                contactValueError={
                  contactValue.trim().length > 0 ? contactValueError : null
                }
                instagramPortfolioIdError={instagramPortfolioIdError}
                onContactValueChange={setContactValue}
                onFileChange={handleFileChange}
                onInstagramPortfolioIdChange={setInstagramPortfolioId}
              />
            )}
            {page === "customers" && (
              <CustomerStep
                desiredCustomerTypes={desiredCustomerTypes}
                mainNeed={mainNeed}
                onToggleCustomerType={toggleCustomerType}
                onMainNeedChange={setMainNeed}
              />
            )}
            {page === "confirm" && (
              <ConfirmStep
                naverBookingLink={naverBookingLink}
                selectedServices={selectedServices}
                contactType={contactType}
                contactValue={contactValue}
                desiredCustomerTypes={desiredCustomerTypes}
                consent={consent}
                submissionError={submissionError}
                onConsentChange={setConsent}
              />
            )}
            {page === "complete" && (
              <CompleteStep
                contactType={contactType}
                registrationId={registrationId}
                onConfirm={() => goToPage("start")}
              />
            )}
          </div>

          {step > 0 && step < 5 && (
            <BottomActions
              canContinue={canContinue}
              showPrevious={step >= 2}
              nextLabel="다음"
              onPrevious={previous}
              onNext={next}
            />
          )}

          {step === 5 && (
            <BottomActions
              canContinue={canContinue}
              showPrevious
              previousLabel="수정하기"
              nextLabel="완료하기"
              isLoading={isSubmitting}
              onPrevious={() => goToPage("booking")}
              onNext={completeRegistration}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function PreStartScreen({
  visualStep,
  onNext,
}: {
  visualStep: 0 | 1;
  onNext: () => void;
}) {
  const isDesignersStep = visualStep === 1;

  return (
    <div className="-mx-6 flex flex-1 flex-col overflow-hidden bg-white pb-24">
      <div className="relative z-10 px-8 pb-1 pt-8 text-center">
        <div className="relative mb-5 flex items-center justify-center">
          <BrandLogo priority />
        </div>

        <h1 className="text-[34px] font-medium leading-[1.12] text-[#111827]">
          지도에 <span className="text-[#ff4b6e]">점</span>으로
          <br />
          묻히지 마세요
        </h1>
        {isDesignersStep && (
          <p className="mt-3 text-[16px] font-bold leading-6 text-[#5f6675]">
            Colorist는 컬러 시술을 찾는 손님에게
            <br />
            매장이아닌 디자이너부터 보여줍니다.
          </p>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        {visualStep === 0 ? <SalonMapVisual /> : <DesignerMapVisual />}
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-white px-8 pb-4 pt-2 shadow-[0_-18px_40px_rgba(255,255,255,0.94)] sm:bottom-6 sm:rounded-b-[28px]">
        <button
          type="button"
          onClick={onNext}
          className="h-16 w-full rounded-[24px] bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] px-5 text-lg font-extrabold text-white shadow-[0_18px_40px_rgba(255,75,110,0.20)] transition hover:brightness-110"
        >
          다음&nbsp;&nbsp;›
        </button>
      </div>
    </div>
  );
}

function SalonMapVisual() {
  return (
    <>
      <div
        role="img"
        aria-label="마포구 미용실 지도"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/mapo-salon.png')" }}
      />
      <div className="absolute inset-0 bg-white/18" />
      <AnimatedSalonBadge />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-white/0" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white to-white/0" />
    </>
  );
}

function AnimatedSalonBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    let animationFrame = 0;
    const duration = 2800;
    const target = 1100;
    const startTime = performance.now() + 180;

    const tick = (now: number) => {
      const elapsed = Math.max(now - startTime, 0);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      frame = Math.round(target * eased);
      setCount(frame);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="absolute left-1/2 top-[45%] z-20 min-w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[#e7eaee] bg-white/90 px-6 py-4 text-center shadow-[0_22px_48px_rgba(15,23,42,0.16)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-center gap-2.5">
        <span className="h-3.5 w-3.5 animate-red-dot-blink rounded-full bg-[#ff4b6e] shadow-[0_0_0_4px_rgba(255,75,110,0.12)]" />
        <span className="text-[15px] font-extrabold text-[#111827]">
          마포구 미용실
        </span>
      </div>
      <span className="block text-[34px] font-black leading-none tabular-nums text-[#111827]">
        +{count.toLocaleString("ko-KR")}개
      </span>
    </div>
  );
}

function DesignerMapVisual() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-cover bg-center"
        style={{ backgroundImage: "url('/colorist-map-bg.png')" }}
      />
      <div className="absolute inset-0 bg-white/20" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white to-white/0" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-white/0" />

      <FloatingColoristCard
        className="left-[34%] top-[7%]"
        name="하린"
        score="4.9"
        image="/designer-profiles/harin.png"
        animationDelay={420}
        tags={["발레아쥬", "탈색"]}
      />
      <FloatingColoristCard
        className="left-[11%] top-[26%]"
        name="서윤"
        score="4.9"
        image="/designer-profiles/seoyun.png"
        animationDelay={500}
        tags={["애쉬", "옴브레"]}
      />
      <FloatingColoristCard
        className="right-[8%] top-[25%]"
        name="지우"
        score="4.9"
        image="/designer-profiles/jiu.png"
        animationDelay={580}
        tags={["선릿", "탈색"]}
      />
      <FloatingColoristCard
        className="left-[34%] top-[44%]"
        name="민주"
        score="4.9"
        image="/designer-profiles/chaea.png"
        animationDelay={660}
        tags={["탈색", "파스텔"]}
      />
      <FloatingColoristCard
        className="left-[11%] top-[60%]"
        name="도윤"
        score="4.9"
        image="/designer-profiles/doyun.png"
        animationDelay={740}
        tags={["레드브라운", "염색"]}
      />
      <FloatingColoristCard
        className="left-[35%] top-[72%]"
        name="민준"
        score="4.9"
        image="/designer-profiles/minjun.png"
        animationDelay={820}
        tags={["애쉬카키", "투톤"]}
      />
      <FloatingColoristCard
        className="right-[9%] top-[66%]"
        name="현우"
        score="4.9"
        image="/designer-profiles/hyunwoo.png"
        animationDelay={900}
        tags={["옴브레", "애쉬"]}
      />
    </>
  );
}

function FloatingColoristCard({
  className,
  name,
  score,
  image,
  animationDelay = 0,
  tags,
}: {
  className: string;
  name: string;
  score: string;
  image: string;
  animationDelay?: number;
  tags: string[];
}) {
  return (
    <div
      className={`designer-card-pin absolute w-[136px] ${className}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="rounded-[14px] border border-[#e6eaf0] bg-white/94 p-2 shadow-[0_14px_28px_rgba(15,23,42,0.13)] backdrop-blur">
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`${name} 프로필`}
            className="h-8 w-8 shrink-0 rounded-full bg-[#edf1f5] object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="whitespace-nowrap text-[14px] font-extrabold text-[#111827]">
                {name}
              </p>
              <p className="shrink-0 whitespace-nowrap text-[10px] font-bold text-[#697386]">
                <span className="text-[#ff9a1f]">★</span> {score}
              </p>
            </div>
            <div className="mt-1 flex flex-nowrap gap-0.5 overflow-hidden">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="whitespace-nowrap rounded-[5px] bg-[#fff1ea] px-1 py-0.5 text-[9px] font-bold leading-none text-[#b44724]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-5 w-px bg-[#14233d]" />
        <div className="h-2 w-2 rounded-full bg-[#14233d]" />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-6">
      <Link
        href="/?page=map"
        aria-label="홈으로 이동"
        className="inline-flex items-center"
      >
        <BrandLogo />
      </Link>
    </header>
  );
}

function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/colorist-logo.png"
      alt="Colorist"
      width={173}
      height={60}
      priority={priority}
      className="h-8 w-auto object-contain"
    />
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const progress = `${(currentStep / 6) * 100}%`;

  return (
    <div className="px-6 pb-6">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#edf0f3]"
        aria-label={`등록 진행률 ${currentStep}/6`}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff3f7f_0%,#ff8a00_100%)] transition-all duration-300 ease-out"
          style={{ width: progress }}
        />
      </div>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="relative -mx-6 -mb-6 flex flex-1 flex-col overflow-hidden bg-[#fbfcfd] px-8 pb-7 pt-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fb_100%)]" />
      </div>

      <div className="relative z-10 mb-9 flex justify-center">
        <Link
          href="/?page=map"
          aria-label="홈으로 이동"
          className="inline-flex items-center"
        >
          <BrandLogo priority />
        </Link>
      </div>

      <div className="relative z-10">
        <h1 className="font-title text-[44px] font-black leading-[1.02] tracking-normal text-[#111827]">
          <span className="block whitespace-nowrap">홍대 디자이너</span>
          <span className="block text-[#ff4b6e]">사전 등록</span>
        </h1>

        <div className="mt-12">
          <p className="text-[20px] font-medium leading-[1.32] text-[#4b5563]">
            <span className="text-[#03c75a]">네이버예약</span>{" "}
            링크만 남기면
            <br />
            플랫폼에 올라갈
            <br />
            <span className="text-[#ff4b6e]">
              프로필 초안
            </span>
            을 만들어드려요.
          </p>
        </div>
        <Image
          src="/start-sticker.png"
          alt="Hongdae Colorist"
          width={1024}
          height={1024}
          className="mt-7 h-40 w-40 object-contain"
        />
      </div>

      <div className="relative z-10 mt-auto grid gap-3">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="h-16 w-full rounded-[24px] border border-[#ffb29a] bg-white px-5 text-[15px] font-black text-[#ff4b6e] shadow-[0_14px_32px_rgba(255,75,110,0.12)] transition hover:bg-[#fff6f2]"
        >
          프로필 초안 미리보기
        </button>
        <button
          type="button"
          onClick={onStart}
          className="h-16 w-full rounded-[24px] bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] px-5 text-[15px] font-black text-white shadow-[0_18px_42px_rgba(255,75,110,0.30)] transition hover:brightness-110"
        >
          30초 간편 사전 등록하기
        </button>
        <p className="pt-1 text-center text-[11px] font-bold text-[#8b929d]">
          입력한 정보는 안전하게 보호돼요.
        </p>
      </div>

      {isPreviewOpen && (
        <ProfilePreviewModal onClose={() => setIsPreviewOpen(false)} />
      )}
    </div>
  );
}

function ProfilePreviewModal({ onClose }: { onClose: () => void }) {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const previewScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  const handlePreviewScroll = (event: UIEvent<HTMLDivElement>) => {
    const { clientWidth, scrollLeft } = event.currentTarget;
    if (clientWidth <= 0) return;

    const nextIndex = Math.round(scrollLeft / clientWidth);
    setActivePreviewIndex(Math.min(PROFILE_PREVIEWS.length - 1, nextIndex));
  };

  const showPreview = (index: number) => {
    setActivePreviewIndex(index);
    previewScrollerRef.current?.scrollTo({
      left: previewScrollerRef.current.clientWidth * index,
      behavior: "smooth",
    });
  };

  return createPortal(
    <div className="fixed inset-y-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 bg-black/45 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="미리보기 배경 닫기"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-[88svh] min-h-0 w-full flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.24)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="미리보기 닫기"
          className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-2xl font-light leading-none text-[#111827] shadow-[0_10px_26px_rgba(15,23,42,0.18)] backdrop-blur-md transition hover:bg-white"
        >
          ×
        </button>

        <div
          ref={previewScrollerRef}
          onScroll={handlePreviewScroll}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PROFILE_PREVIEWS.map((src, index) => (
            <div
              key={src}
              className="h-full w-full shrink-0 snap-center overflow-y-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Image
                src={src}
                alt={`프로필 초안 미리보기 ${index + 1}`}
                width={863}
                height={1822}
                draggable={false}
                unoptimized
                className="h-auto w-full select-none object-contain"
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center gap-2 bg-gradient-to-t from-white/88 via-white/45 to-transparent px-5 pb-5 pt-10">
          {PROFILE_PREVIEWS.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => showPreview(index)}
              aria-label={`프로필 초안 미리보기 ${index + 1}번으로 이동`}
              aria-current={activePreviewIndex === index ? "page" : undefined}
              className={`pointer-events-auto h-1.5 w-8 rounded-full transition ${
                activePreviewIndex === index
                  ? "bg-[linear-gradient(90deg,#ff3f7f_0%,#ff8a00_100%)] shadow-[0_4px_12px_rgba(255,75,110,0.30)]"
                  : "bg-white/80 shadow-[0_2px_8px_rgba(15,23,42,0.16)] ring-1 ring-black/10"
              }`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BookingStep({
  value,
  error,
  onChange,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <StepFrame
      title={
        <>
          <span className="text-[#03c75a]">네이버예약</span> 링크
        </>
      }
      description="디자이너 개인 예약 링크를 넣어주세요."
    >
      <label className="mt-7 block">
        <span className="sr-only">네이버예약 링크</span>
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://booking.naver.com/..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "naver-booking-link-error" : undefined}
          className={`h-14 w-full rounded-2xl border bg-white px-4 text-base font-medium text-[#111827] outline-none transition placeholder:text-[#a2a9b3] focus:bg-white ${
            error
              ? "border-[#ff4b6e] focus:border-[#ff4b6e]"
              : "border-[#dfe3e8] focus:border-[#ff6a3d]"
          }`}
        />
      </label>
      {error ? (
        <p
          id="naver-booking-link-error"
          className="mt-3 text-sm font-bold text-[#ff4b6e]"
        >
          {error}
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-[#838b96]">
          매장 전체 링크도 가능해요.
        </p>
      )}
    </StepFrame>
  );
}

function ServiceStep({
  selectedServices,
  onToggle,
}: {
  selectedServices: string[];
  onToggle: (service: string) => void;
}) {
  return (
    <StepFrame
      title="대표 컬러 시술"
      description="최대 3개 선택해 주세요"
    >
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {SERVICES.map((service) => {
          const isSelected = selectedServices.includes(service.label);
          const isMaxed = selectedServices.length >= 3 && !isSelected;

          return (
            <button
              key={service.label}
              type="button"
              onClick={() => onToggle(service.label)}
              disabled={isMaxed}
              style={{ backgroundImage: `url("${service.image}")` }}
              className={`group relative aspect-[0.86] overflow-hidden rounded-[22px] border bg-cover bg-center text-left transition ${
                isSelected
                  ? "border-[#ff6a3d] shadow-[0_14px_30px_rgba(255,75,110,0.20)] ring-2 ring-[#ff4b6e]"
                  : "border-[#dfe3e8] shadow-[0_10px_26px_rgba(15,23,42,0.10)] hover:border-[#ff8a00] hover:shadow-[0_14px_30px_rgba(255,106,61,0.14)]"
              } ${isMaxed ? "cursor-not-allowed opacity-45" : ""}`}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/30" />
                <span className="absolute inset-x-2 bottom-2 rounded-2xl border border-white/30 bg-white/86 px-2 py-2 text-center text-[11px] font-extrabold leading-[1.18] text-[#111827] shadow-[0_10px_26px_rgba(15,23,42,0.16)] backdrop-blur-md [word-break:keep-all]">
                {service.label}
              </span>
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(255,75,110,0.28)]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm leading-6 text-[#838b96]">
        선택한 시술을 기준으로 고객에게 추천될 수 있어요.
      </p>
    </StepFrame>
  );
}

function ContactStep({
  contactValue,
  uploadedFiles,
  instagramPortfolioId,
  contactValueError,
  instagramPortfolioIdError,
  onContactValueChange,
  onFileChange,
  onInstagramPortfolioIdChange,
}: {
  contactValue: string;
  uploadedFiles: File[];
  instagramPortfolioId: string;
  contactValueError: string | null;
  instagramPortfolioIdError: string | null;
  onContactValueChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInstagramPortfolioIdChange: (value: string) => void;
}) {
  const [uploadedFilePreviews, setUploadedFilePreviews] = useState<
    Array<{ file: File; url: string }>
  >([]);

  useEffect(() => {
    const nextPreviews = uploadedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setUploadedFilePreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [uploadedFiles]);

  return (
    <StepFrame title="연락처">
      <label className="mt-6 block">
        <span className="text-sm font-bold text-[#252c36]">전화번호</span>
        <input
          type="tel"
          value={contactValue}
          onChange={(event) => onContactValueChange(event.target.value)}
          placeholder="010-0000-0000"
          aria-invalid={Boolean(contactValueError)}
          aria-describedby={contactValueError ? "contact-value-error" : undefined}
          className={`mt-2 h-14 w-full rounded-2xl border bg-white px-4 text-base font-medium text-[#111827] outline-none transition placeholder:text-[#a2a9b3] focus:bg-white ${
            contactValueError
              ? "border-[#ff4b6e] focus:border-[#ff4b6e]"
              : "border-[#dfe3e8] focus:border-[#ff6a3d]"
          }`}
        />
      </label>
      {contactValueError ? (
        <p
          id="contact-value-error"
          className="mt-3 text-sm font-bold text-[#ff4b6e]"
        >
          {contactValueError}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#838b96]">
          완성된 프로필 초안을 문자로 보내드릴게요.
        </p>
      )}

      <div className="mt-7">
        <h2 className="text-base font-bold text-[#252c36]">
          프로필에 넣을 시술 사진/영상{" "}
          <span className="font-semibold text-[#838b96]">(선택)</span>
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6f7783]">
          대표 시술 사진이나 영상을 첨부해주세요.
          <br />
          인스타그램에 시술 사진이 있다면 인스타 아이디만 남겨주셔도 돼요.
        </p>

        <div className="mt-4 rounded-2xl border border-dashed border-[#cfd5dc] bg-[#f5f6f8] p-4">
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-[#dfe3e8] bg-white px-4 py-5 text-center transition hover:bg-[#f5f6f8]">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={onFileChange}
              className="sr-only"
            />
            <span className="text-sm font-bold text-[#111827]">
              사진/영상 첨부하기
            </span>
            <span className="mt-2 text-xs font-medium text-[#838b96]">
              {uploadedFiles.length > 0
                ? `${uploadedFiles.length}개 파일 선택됨`
                : "아직 첨부된 파일이 없어요."}
            </span>
          </label>
          {uploadedFilePreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {uploadedFilePreviews.map(({ file, url }) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-[#dfe3e8] bg-white"
                >
                  {file.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : file.type.startsWith("video/") ? (
                    <video
                      src={url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-bold leading-4 text-[#6f7783]">
                      {file.name}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1">
                    <p className="truncate text-[10px] font-bold text-white">
                      {file.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="my-5 flex items-center gap-3 text-xs font-bold text-[#778397]">
          <span className="h-px flex-1 bg-[#e5e8ec]" />
          또는
          <span className="h-px flex-1 bg-[#e5e8ec]" />
        </div>

        <label className="block">
          <span className="text-sm font-bold text-[#252c36]">
            인스타 아이디 입력하기
          </span>
          <input
            type="text"
            value={instagramPortfolioId}
            onChange={(event) =>
              onInstagramPortfolioIdChange(
                normalizeInstagramHandleInput(event.target.value),
              )
            }
            placeholder="colorist_name"
            aria-invalid={Boolean(instagramPortfolioIdError)}
            aria-describedby={
              instagramPortfolioIdError
                ? "instagram-portfolio-id-error"
                : undefined
            }
            className={`mt-2 h-14 w-full rounded-2xl border bg-white px-4 text-base font-medium text-[#111827] outline-none transition placeholder:text-[#a2a9b3] focus:bg-white ${
              instagramPortfolioIdError
                ? "border-[#ff4b6e] focus:border-[#ff4b6e]"
                : "border-[#dfe3e8] focus:border-[#ff6a3d]"
            }`}
          />
        </label>
        {instagramPortfolioIdError && (
          <p
            id="instagram-portfolio-id-error"
            className="mt-3 text-sm font-bold text-[#ff4b6e]"
          >
            {instagramPortfolioIdError}
          </p>
        )}
      </div>
    </StepFrame>
  );
}

function CustomerStep({
  desiredCustomerTypes,
  mainNeed,
  onToggleCustomerType,
  onMainNeedChange,
}: {
  desiredCustomerTypes: string[];
  mainNeed: string;
  onToggleCustomerType: (type: string) => void;
  onMainNeedChange: (need: string) => void;
}) {
  return (
    <StepFrame
      title={
        <>
          어떤 고객을
          <br />
          더 받고 싶으세요?
        </>
      }
      description="원하는 고객 유형을 골라주세요."
    >
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {CUSTOMER_TYPES.map((type) => {
          const isSelected = desiredCustomerTypes.includes(type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleCustomerType(type)}
              className={`min-h-12 rounded-2xl border px-3.5 py-3 text-left text-sm font-semibold transition ${
                isSelected
                  ? "border-[#ff6a3d] bg-[#fff1ea] text-[#111827] shadow-[0_8px_22px_rgba(255,75,110,0.16)]"
                  : "border-[#dfe3e8] bg-white text-[#4e5662] hover:border-[#5f6d82]"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      <div className="mt-7">
        <h2 className="text-base font-bold text-[#252c36]">
          지금 가장 필요한 건 무엇인가요?
        </h2>
        <div className="mt-3 grid gap-2">
          {MAIN_NEEDS.map((need) => {
            const isSelected = mainNeed === need;

            return (
              <button
                key={need}
                type="button"
                onClick={() => onMainNeedChange(need)}
                className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  isSelected
                    ? "border-[#ff6a3d] bg-[#fff1ea] text-[#111827] shadow-[0_8px_22px_rgba(255,75,110,0.16)]"
                    : "border-[#dfe3e8] bg-white text-[#4e5662] hover:border-[#5f6d82]"
                }`}
              >
                <span>{need}</span>
                {isSelected && (
                  <span className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] text-[11px] text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#838b96]">
        자세히 답할수록 더 잘 맞는 고객에게 추천될 수 있어요.
      </p>
    </StepFrame>
  );
}

function ConfirmStep({
  naverBookingLink,
  selectedServices,
  contactType,
  contactValue,
  desiredCustomerTypes,
  consent,
  submissionError,
  onConsentChange,
}: {
  naverBookingLink: string;
  selectedServices: string[];
  contactType: ContactType;
  contactValue: string;
  desiredCustomerTypes: string[];
  consent: boolean;
  submissionError: string;
  onConsentChange: (value: boolean) => void;
}) {
  const summary = [
    ["네이버예약 링크", naverBookingLink],
    [
      "대표 컬러 시술",
      selectedServices.length > 0 ? selectedServices.join(", ") : "미입력",
    ],
    [
      "연락 방법",
      `${contactType === "instagram" ? "인스타 DM" : "전화번호"} · ${contactValue}`,
    ],
    [
      "원하는 고객 유형",
      desiredCustomerTypes.length > 0
        ? desiredCustomerTypes.join(", ")
        : "미선택",
    ],
  ];

  return (
    <StepFrame title="입력한 정보" description="입력하신 정보를 확인해 주세요.">
      <div className="mt-6 overflow-hidden rounded-3xl border border-[#e5e8ec] bg-white p-4">
        <div className="grid gap-4">
          {summary.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <p className="text-xs font-bold text-[#838b96]">
                {label === "네이버예약 링크" ? (
                  <>
                    <span className="text-[#03c75a]">네이버예약</span> 링크
                  </>
                ) : (
                  label
                )}
              </p>
              <p className="mt-1 min-w-0 whitespace-normal break-words text-sm font-semibold leading-6 text-[#252c36] [overflow-wrap:anywhere]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <label className="mt-5 flex gap-3 rounded-2xl border border-[#e5e8ec] bg-white p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          className="mt-1 h-5 w-5 rounded border-[#cfd5dc] accent-[#ff4b6e]"
        />
        <span className="text-sm font-semibold leading-6 text-[#505966]">
          제출한 <span className="font-black text-[#03c75a]">네이버예약</span>
          /포트폴리오 정보를 바탕으로
          <br />
          플랫폼에 올라갈 프로필 초안을 제작하는 것에 동의합니다.
        </span>
      </label>

      <p className="mt-3 text-sm font-medium leading-6 text-[#838b96]">
        프로필은 공개 전에 먼저 보여드릴게요.
      </p>

      <div className="mt-5 rounded-2xl border border-[#ffd8bf] bg-[#fff8f0] px-4 py-4">
        <p className="text-sm font-semibold leading-6 text-[#9a3b10]">
          프로필 완성도가 높은 컬러리스트부터
          <br />
          오픈 초기 우선 노출 대상으로 검토됩니다.
        </p>
      </div>
      {submissionError && (
        <p className="mt-4 rounded-2xl border border-[#ffd2dc] bg-[#fff4f6] px-4 py-3 text-sm font-bold leading-6 text-[#e11d48]">
          {submissionError}
        </p>
      )}
    </StepFrame>
  );
}

function CompleteStep({
  contactType,
  registrationId,
  onConfirm,
}: {
  contactType: ContactType;
  registrationId: string | null;
  onConfirm: () => void;
}) {
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswers>({
    designerPainPoint: [],
    customerSource: [],
    subscriptionIntent: [],
  });
  const [isSurveySubmitting, setIsSurveySubmitting] = useState(false);
  const [surveyError, setSurveyError] = useState("");
  const [isSurveySubmitted, setIsSurveySubmitted] = useState(false);

  const canSubmitSurvey =
    surveyAnswers.designerPainPoint.length > 0 &&
    surveyAnswers.customerSource.length > 0 &&
    surveyAnswers.subscriptionIntent.length > 0 &&
    !isSurveySubmitting;

  const submitSurvey = async () => {
    if (!canSubmitSurvey) return;

    if (!registrationId) {
      setSurveyError("등록 정보를 찾을 수 없어요. 다시 등록 후 참여해주세요.");
      return;
    }

    setSurveyError("");
    setIsSurveySubmitting(true);

    try {
      const response = await fetch("/api/colorist-pre-registrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: registrationId,
          ...surveyAnswers,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "설문 저장에 실패했어요.");
      }

      setIsSurveySubmitted(true);
      setIsSurveyOpen(false);
    } catch (error) {
      setSurveyError(
        error instanceof Error ? error.message : "설문 저장에 실패했어요.",
      );
    } finally {
      setIsSurveySubmitting(false);
    }
  };

  const toggleSurveyAnswer = (key: keyof SurveyAnswers, value: string) => {
    setSurveyAnswers((current) => {
      const selectedValues = current[key];
      const nextValues = selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value];

      return { ...current, [key]: nextValues };
    });
  };

  return (
    <div className="flex flex-1 flex-col justify-center pb-44 text-center">
      <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] text-2xl font-bold text-white">
        ✓
      </div>
      <h1 className="font-title text-[38px] leading-tight tracking-normal text-[#111827]">
        등록이 완료됐어요.
      </h1>
      <p className="mt-5 text-base font-medium leading-7 text-[#6a7280]">
        보내주신 정보를 바탕으로
        <br />
        프로필 초안을 준비해드릴게요.
      </p>
      <div className="mt-8 rounded-3xl border border-[#e5e8ec] bg-white px-5 py-5 text-left">
        <p className="text-sm font-semibold leading-6 text-[#4e5662]">
          완성된 프로필은 선택하신 연락 방법으로
          <br />
          먼저 보내드려요.
        </p>
        <p className="mt-2 text-xs font-bold text-[#838b96]">
          {contactType === "instagram" ? "인스타 DM" : "문자"} 안내 예정
        </p>
      </div>
      <SurveyPromptOverlay
        isSubmitted={isSurveySubmitted}
        onOpen={() => setIsSurveyOpen(true)}
        onConfirm={onConfirm}
      />
      {isSurveySubmitted && <SurveySavedToast />}
      {isSurveyOpen && (
        <SurveySheet
          answers={surveyAnswers}
          canSubmit={canSubmitSurvey}
          error={surveyError}
          isSubmitting={isSurveySubmitting}
          onAnswerToggle={toggleSurveyAnswer}
          onClose={() => setIsSurveyOpen(false)}
          onSubmit={submitSurvey}
        />
      )}
    </div>
  );
}

function SurveyPromptOverlay({
  isSubmitted,
  onConfirm,
  onOpen,
}: {
  isSubmitted: boolean;
  onConfirm: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 gap-3 bg-white px-6 pb-6 pt-3 shadow-[0_-18px_40px_rgba(255,255,255,0.94)] sm:bottom-6 sm:rounded-b-[28px]">
      {!isSubmitted && (
        <button
          type="button"
          onClick={onOpen}
          className="h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] px-5 text-base font-black text-white shadow-[0_18px_42px_rgba(255,75,110,0.24)] transition hover:brightness-110"
        >
          10초 설문 참여하기
        </button>
      )}
      <button
        type="button"
        onClick={onConfirm}
        className="h-14 w-full rounded-2xl border border-[#dfe3e8] bg-white px-5 text-base font-bold text-[#505966] transition hover:bg-[#f5f6f8]"
      >
        확인
      </button>
    </div>
  );
}

function SurveySavedToast() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-1/2 z-40 w-[calc(100%-48px)] max-w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[#ffd8bf] bg-white/96 px-6 py-5 text-center shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur-md"
    >
      <p className="text-base font-black text-[#111827]">설문이 저장됐어요.</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-[#838b96]">
        답변은 프로필 준비에 함께 참고할게요.
      </p>
    </div>
  );
}

function SurveySheet({
  answers,
  canSubmit,
  error,
  isSubmitting,
  onAnswerToggle,
  onClose,
  onSubmit,
}: {
  answers: SurveyAnswers;
  canSubmit: boolean;
  error: string;
  isSubmitting: boolean;
  onAnswerToggle: (key: keyof SurveyAnswers, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-y-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 bg-black/45 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="설문 배경 닫기"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[88svh] min-h-0 w-full flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.24)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#eceff3] px-5 py-4">
          <div>
            <p className="text-lg font-black text-[#111827]">10초 설문</p>
            <p className="mt-1 text-xs font-bold text-[#838b96]">
              답변은 현재 등록 정보에 함께 저장돼요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="설문 닫기"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3f6] text-2xl font-light leading-none text-[#111827] transition hover:bg-[#e7ebf0]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <SurveyQuestion
            title="디자이너 생활 중 가장 힘든 점은 무엇인가요?"
            options={DESIGNER_PAIN_POINTS}
            value={answers.designerPainPoint}
            onToggle={(value) => onAnswerToggle("designerPainPoint", value)}
          />
          <SurveyQuestion
            title="현재 고객은 주로 어디서 오나요?"
            options={CUSTOMER_SOURCES}
            value={answers.customerSource}
            onToggle={(value) => onAnswerToggle("customerSource", value)}
          />
          <SurveyQuestion
            title="원하는 고객에게 더 잘 노출된다면, 월 구독을 이용할 의향이 있나요?"
            options={SUBSCRIPTION_INTENTS}
            value={answers.subscriptionIntent}
            onToggle={(value) => onAnswerToggle("subscriptionIntent", value)}
          />

          {error && (
            <p className="mt-4 rounded-2xl border border-[#ffd2dc] bg-[#fff4f6] px-4 py-3 text-sm font-bold leading-6 text-[#e11d48]">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-[#eceff3] bg-white px-5 pb-5 pt-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] px-5 text-base font-black text-white transition ${
              canSubmit
                ? "hover:brightness-110"
                : "cursor-not-allowed opacity-35"
            }`}
          >
            {isSubmitting ? "저장 중..." : "설문 제출하기"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SurveyQuestion({
  title,
  options,
  value,
  onToggle,
}: {
  title: string;
  options: string[];
  value: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="mb-7">
      <h2 className="text-[15px] font-black leading-6 text-[#111827]">
        {title}
      </h2>
      <div className="mt-3 grid gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold leading-5 transition ${
                isSelected
                  ? "border-[#ff6a3d] bg-[#fff1ea] text-[#111827] shadow-[0_8px_22px_rgba(255,75,110,0.12)]"
                  : "border-[#e1e5ea] bg-white text-[#505966] hover:border-[#ffb29a]"
              }`}
            >
              <span>{option}</span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  isSelected
                    ? "border-[#ff6a3d] bg-[#ff6a3d] text-white"
                    : "border-[#d8dde4] text-transparent"
                }`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StepFrame({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="pt-1">
        <h1 className="font-title text-[34px] leading-[1.12] tracking-normal text-[#111827]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base font-medium leading-7 text-[#6a7280]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function BottomActions({
  canContinue,
  showPrevious,
  previousLabel = "이전",
  nextLabel,
  isLoading = false,
  onPrevious,
  onNext,
}: {
  canContinue: boolean;
  showPrevious: boolean;
  previousLabel?: string;
  nextLabel: string;
  isLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const isDisabled = !canContinue || isLoading;

  return (
    <div className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 items-center gap-3 bg-white px-6 pb-6 pt-3 shadow-[0_-18px_40px_rgba(255,255,255,0.94)] sm:bottom-6 sm:rounded-b-[28px]">
      {showPrevious && (
        <button
          type="button"
          onClick={onPrevious}
          disabled={isLoading}
          className="h-14 shrink-0 rounded-2xl border border-[#dfe3e8] bg-white px-4 text-sm font-bold text-[#505966] transition hover:bg-[#f5f6f8]"
        >
          {previousLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={isDisabled}
        className={`h-14 flex-1 rounded-2xl bg-[linear-gradient(135deg,#ff3f7f_0%,#ff8a00_100%)] px-5 text-base font-semibold text-white transition hover:brightness-110 ${
          isDisabled ? "cursor-not-allowed opacity-35 hover:brightness-100" : ""
        }`}
      >
        {isLoading ? "저장 중..." : nextLabel}
      </button>
    </div>
  );
}
