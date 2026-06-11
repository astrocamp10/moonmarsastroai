"use strict";

const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get("key") || "";

const PLAN_KEY = "moonMarsAstroAI.plan.v1";
const ARCHIVE_DB_NAME = "moonMarsAstroAI.archiveDB.v1";
const SUPABASE_URL = "https://oqnaysdfslyhgponmuse.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xbmF5c2Rmc2x5aGdwb25tdXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjU4MjAsImV4cCI6MjA5Njc0MTgyMH0.YXsMFMdGuuqHBvm89bzm8XHkOol7nxHwnxBK5op7YpU";
const SUPABASE_ARCHIVE_TABLE = "archives";
const SUPABASE_ARCHIVE_BUCKET = "archive-images";
const DEFAULT_MODEL_ID = "gemini-3.1-flash-lite";
const DEFAULT_ANSWER_LEVEL_KEY = "easy";
const ALLOWED_LOCAL_CACHE_KEYS = new Set([PLAN_KEY]);

const MODEL_ID_ALIASES = {
  "gemini-2.5-flash-lite": "gemini-3.1-flash-lite",
  "gemini-3-flash-preview": "gemini-3.1-flash-lite",
  "gemini-3.1-flash": "gemini-3.1-flash-lite",
};

const MODEL_PRESETS = [
  {
    id: "gemma-4-31b-it",
    label: "Gemma 4 31B",
    badge: "깊게 분석",
    limitText: "추론 과정이 있어 복잡한 작업 잘하지만 답변이 느려요.",
    description: "하루에 최대 1500번 사용할 수 있어요.",
  },
  {
    id: "gemma-4-26b-it",
    label: "Gemma 4 26B",
    badge: "균형형",
    limitText: "추론 과정이 있어 복잡한 작업 잘하지만 답변이 느려요.",
    description: "하루에 최대 1500번 사용할 수 있어요.",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    badge: "빠른 응답",
    limitText: "빠르게 답변하며 간단한 질문에 최고에요.",
    description: "하루에 최대 500번 사용할 수 있어요.",
  },
];

const ANSWER_LEVELS = [
  {
    key: "easy",
    label: "쉬움",
    badge: "초3",
    summary: "초등학교 3학년 수준",
    description: "짧은 문장과 생활 속 비유로 설명해요.",
    instruction: "답변 난이도는 쉬움입니다. 초등학교 3학년 학생이 읽는다고 생각하고, 짧고 쉬운 문장으로 설명하세요. 어려운 말은 꼭 쉬운 풀이를 붙이고, 생활 속 비유를 많이 사용하세요.",
    responseDetail: "관찰 근거는 2가지 정도로 간단히 고르고, 핵심 과학 개념은 쉬운 말로 풀어 주세요.",
    followupDetail: "과학적 근거와 관찰 포인트를 1~2가지 더해 주세요.",
    audience: "초등학교 3학년 학생",
  },
  {
    key: "medium",
    label: "중간",
    badge: "초등 고학년",
    summary: "초등학교 고학년 수준",
    description: "기본 과학 용어와 지형 크기, 탐사 맥락을 함께 설명해요.",
    instruction: "답변 난이도는 중간입니다. 초등학교 고학년 학생이 읽는다고 생각하고, 기본 과학 용어를 사용하되 바로 쉬운 뜻을 덧붙이세요. 관찰 근거와 원인을 차근차근 연결하세요.",
    responseDetail: "관찰 근거는 2~3가지로 설명하고, 색, 밝기, 높낮이, 모양 같은 단서를 과학 개념과 연결해 주세요. 이름 있는 크레이터(충돌구), 달의 바다, 충돌분지, 협곡, 화산, 평원이라면 알려진 대략적인 크기(직경/폭/길이/높이 중 알맞은 것)를 km 단위로 1가지 포함하세요. 실제 착륙지, 과거 착륙 후보지, 탐사선의 주요 탐사 대상과 관련이 널리 알려진 경우만 짧게 언급하고, 확실하지 않으면 '확인되는 대표 착륙 후보 기록은 찾기 어려워요'처럼 말하세요.",
    followupDetail: "과학적 근거와 관찰 포인트를 1~2가지 더해 주세요. 이름 있는 지형이라면 대략적인 크기나 탐사선 관련 정보를 확실한 범위에서 1가지 덧붙이세요.",
    audience: "초등학교 고학년 학생",
  },
  {
    key: "hard",
    label: "어려움",
    badge: "중1·중2",
    summary: "중학교 1~2학년 수준",
    description: "지질학 개념, 지형 크기, 탐사 기록까지 더 풍부하게 설명해요.",
    instruction: "답변 난이도는 어려움입니다. 중학교 1~2학년 학생이 읽는다고 생각하고, 다른 단계보다 과학적 내용의 밀도를 높이세요. 충돌 에너지, 분출물, 알베도, 광물·암석 조성, 화산 활동, 침식, 퇴적, 고도 차이, 상대적으로 오래된 지형과 젊은 지형의 차이 같은 개념을 표시 영역에 맞게 골라 자세히 연결하세요. 단, 처음 나오는 전문 용어는 괄호 안에서 쉽게 풀어 주세요.",
    responseDetail: "관찰 근거는 3~4가지로 충분히 제시하고, 각 근거가 어떤 지질학적 해석으로 이어지는지 설명하세요. 가능한 경우 색·밝기·고도·테두리 모양·분화구 겹침·층리·용암 평원·퇴적 흔적 같은 과학 단서를 함께 다루세요. 이름 있는 크레이터(충돌구), 달의 바다, 충돌분지, 협곡, 화산, 평원이라면 알려진 대략적인 크기(직경/폭/길이/높이 중 알맞은 것)를 km 단위로 포함하고, 그 크기가 왜 과학적으로 중요한지도 연결하세요. 실제 착륙지, 과거 착륙 후보지, 착륙 후보권역, 탐사선의 주요 탐사 대상과 관련이 널리 알려진 경우에는 탐사선 이름까지 언급하세요. 확실하지 않은 부분은 왜 불확실한지도 짚고, 착륙 후보지 여부를 모르면 절대 지어내지 말고 '확인되는 대표 착륙 후보 기록은 찾기 어렵습니다'라고 말하세요.",
    followupDetail: "과학적 근거와 관찰 포인트를 2~3가지 더하고, 관련 지질학 개념을 한두 개 더 연결해 주세요. 이름 있는 지형이라면 대략적인 크기와 탐사선 착륙지·후보지·탐사 대상 여부를 확실한 범위에서 덧붙이세요.",
    audience: "중학교 1~2학년 학생",
  },
];

const LOADING_MESSAGES = [
  "화성에서 길 잃어버림... 지도를 다시 펼치는 중입니다.",
  "달 크레이터 앞에서 잠깐 멈춤... 이름표를 확인하는 중입니다.",
  "빨간 동그라미 좌표를 탐사 일지에 또박또박 적는 중입니다.",
  "협곡인지, 화산인지, 충돌구인지 탐사 돋보기로 보는 중입니다.",
  "어려운 과학 말을 학생 탐험가 말로 번역하는 중입니다.",
  "우주 헬멧을 고쳐 쓰고 마지막 문장을 다듬는 중입니다.",
];

const GEMMA_LOADING_MESSAGES = [
  "Gemma가 화성에서 길을 잃었습니다... 하지만 좌표는 기억하고 있어요.",
  "달 표면에서 반짝이는 단서를 주워 모으는 중입니다.",
  "지형 후보들을 줄 세워 놓고 하나씩 비교하는 중입니다.",
  "단정하면 안 되는 말은 우주 상자에 잠시 넣어 두는 중입니다.",
  "깊게 생각한 내용을 어린이 탐사 보고서로 바꾸는 중입니다.",
  "조금만 기다려 주세요. 전문가 AI가 착륙 준비 중입니다.",
];

const SYSTEM_PROMPT = [
  "당신은 30년 경력의 달·화성 지형 탐사 전문가 AI입니다.",
  "대상은 설정된 학생 수준입니다. 다정하고 쉽지만 과학적 근거를 충분히 담아 설명하세요.",
  "지도나 사진에서 확실하지 않은 지명은 단정하지 말고 '추정'이라고 말하세요.",
  "장난스럽거나 곤란하거나 과학 탐사와 무관한 질문은 짧게 방향을 바꾸고, 달과 화성 탐사 이야기로 부드럽게 돌려주세요.",
  "답변은 한국어로 작성하고, 설정된 학생 수준에 맞는 짧은 문단을 여러 개 사용하세요.",
  "너무 짧게 끝내지 말고 관찰 근거, 지형이 만들어진 과정, 과학적으로 흥미로운 점을 함께 설명하세요.",
  "전문 용어는 '충돌구(우주 암석이 부딪혀 생긴 둥근 구덩이)'처럼 괄호 안에서 쉽게 풀어 주세요.",
  "자기소개를 할 때 NASA 지질학자나 박사님이라고 말하지 말고, 달·화성 전문가 AI라고 말하세요.",
  "내부 추론, 체크리스트, 영어 메모, 후보 좌표 목록, 프롬프트 지시문은 절대 출력하지 마세요.",
].join("\n");

const FINAL_RESPONSE_RULES = [
  "중요한 최종 출력 규칙:",
  "아래의 후보 좌표와 참고 기준은 답변을 만들기 위한 내부 자료입니다. 그대로 복사하거나 요약해서 보여주지 마세요.",
  "답변에는 최종 설명만 한국어로 작성하세요.",
  "답변 앞뒤에 영어 계획표, 문단 설계, 자체 점검표, 내부 판단 메모를 절대 붙이지 마세요.",
  "답변은 5~7개의 짧은 문단으로 작성하고, 각 문단은 2~4문장 정도로 유지하세요.",
  "Paragraph, Scientific Importance, Easy Analogy, Follow-up Question 같은 영어 문단 제목이나 라벨을 절대 쓰지 마세요.",
  "각 문단은 제목 없이 바로 한국어 설명 문장으로 시작하세요.",
  "답변 구조는 1) 지형 추정, 2) 관찰 근거 2~4가지, 3) 지형이 만들어진 과정, 4) 왜 과학적으로 중요한지, 5) 쉬운 비유, 6) 다음 관찰 질문 하나를 포함하세요.",
  "표시 좌표가 이름 있는 달·화성 지형과 잘 맞으면 공식 지형명과 그 이름이 붙은 이유를 설정된 학생 수준에 맞춰 포함하세요.",
  "중간 또는 어려움 단계에서는 이름 있는 지형의 대략적인 크기와 착륙지·후보지·탐사선 관련 여부를 확실한 범위에서 포함하세요. 모르는 내용은 추측하지 말고 확실하지 않다고 말하세요.",
].join("\n");

const bodies = {
  moon: {
    key: "moon",
    name: "달",
    emoji: "🌕",
    map: "assets/moon-color.jpg",
    aiMap: "assets/moon-color-ai.jpg",
    elevation: "assets/moon-elevation.jpg",
    aiElevation: "assets/moon-elevation-ai.jpg",
    accent: "#ffd866",
  },
  mars: {
    key: "mars",
    name: "화성",
    emoji: "🔴",
    map: "assets/mars-map.jpg",
    aiMap: "assets/mars-map-ai.jpg",
    accent: "#ff6b5f",
  },
};

const roverImages = [
  "mars_robo/Mars_Perseverance_SIF_1555_0804985824_601EBY_N0770000SRLC00336_0000LMJ.png",
  "mars_robo/Mars_Perseverance_FLF_1513_0801260057_395ECM_N0740000FHAZ02008_03_095J.png",
  "mars_robo/Mars_Perseverance_FLF_1785_0825405052_757ECM_N0860510FHAZ00215_04_075J.png",
  "mars_robo/Mars_Perseverance_FLF_1792_0826023946_645ECM_N0870000FHAZ02008_03_095J.png",
  "mars_robo/Mars_Perseverance_NRF_1382_0789615482_909ECM_N0650000NCAM14381_01_195J.png",
  "mars_robo/Mars_Perseverance_NRF_1382_0789615650_909ECM_N0650000NCAM14381_01_195J.png",
  "mars_robo/Mars_Perseverance_ZL0_0961_0752254195_706EBY_N0470000ZCAM03815_0340LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1320_0784114966_193EBY_N0612534ZCAM04024_1100LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1412_0792297259_894EBY_N0680142ZCAM09468_0340LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1764_0823537822_159EBY_N0840000ZCAM09818_1100LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1875_0833395124_318EBY_N0881214ZCAM09926_1100LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1875_0833395150_318EBY_N0881214ZCAM09926_1100LMJ.png",
];

const MARS_REFERENCE_SOURCES = [
  "IAU/USGS Gazetteer of Planetary Nomenclature",
  "Mars Orbital Data Explorer planetary feature list",
  "USGS Mars Global Surveyor MOLA Topographic Map",
  "USGS Astrogeology MOLA Globe with IAU-approved feature names",
];

function marsFeature(name, kind, lat, lon, radiusDeg, origin, clue) {
  return {
    name,
    kind,
    lat,
    lon,
    radiusDeg,
    origin,
    clue: clue || "IAU/USGS 중심 좌표 기준 명명 지형. 전역 지도에서 색, 밝기, 고도, 윤곽을 함께 확인",
  };
}

const MARS_FEATURE_REFERENCES = [
  { name: "Valles Marineris", kind: "거대 협곡", lat: -13.9, lon: -59.2, radiusDeg: 24, clue: "동서로 길게 찢어진 매우 큰 협곡대" },
  { name: "Noctis Labyrinthus", kind: "균열 협곡 미로", lat: -7.0, lon: -102.0, radiusDeg: 13, clue: "Tharsis 동쪽의 복잡한 골짜기와 단층 지형" },
  { name: "Olympus Mons", kind: "거대 방패화산", lat: 18.7, lon: -133.8, radiusDeg: 12, clue: "둥근 화산체와 넓은 주변 사면" },
  { name: "Arsia Mons", kind: "방패화산", lat: -8.4, lon: -120.1, radiusDeg: 9, clue: "Tharsis Montes 남쪽 화산" },
  { name: "Pavonis Mons", kind: "방패화산", lat: 0.8, lon: -112.8, radiusDeg: 8, clue: "Tharsis Montes 가운데 화산" },
  { name: "Ascraeus Mons", kind: "방패화산", lat: 11.8, lon: -104.5, radiusDeg: 8, clue: "Tharsis Montes 북쪽 화산" },
  { name: "Alba Mons", kind: "넓은 화산", lat: 40.5, lon: -109.9, radiusDeg: 15, clue: "넓고 낮은 화산성 고지" },
  { name: "Elysium Mons", kind: "화산", lat: 24.8, lon: 146.9, radiusDeg: 10, clue: "Elysium 화산 지역의 중심 화산" },
  { name: "Hellas Planitia", kind: "거대 충돌분지", lat: -42.4, lon: 70.5, radiusDeg: 22, clue: "남반구의 매우 크고 낮은 원형 분지" },
  { name: "Argyre Planitia", kind: "충돌분지", lat: -49.7, lon: -43.9, radiusDeg: 16, clue: "남반구의 밝은 원형 저지대" },
  { name: "Isidis Planitia", kind: "충돌분지/평원", lat: 13.5, lon: 87.0, radiusDeg: 14, clue: "Syrtis Major 동쪽의 둥근 평원" },
  { name: "Utopia Planitia", kind: "북반구 저지대", lat: 46.7, lon: 117.5, radiusDeg: 22, clue: "북반구의 넓은 낮은 평원" },
  { name: "Syrtis Major Planum", kind: "어두운 화산성 평원", lat: 8.4, lon: 69.5, radiusDeg: 15, clue: "어둡게 보이는 삼각형에 가까운 고원/평원" },
  { name: "Gale Crater", kind: "충돌구", lat: -5.4, lon: 137.8, radiusDeg: 4, clue: "Curiosity 착륙지, 중앙산을 가진 충돌구" },
  { name: "Jezero Crater", kind: "충돌구/삼각주", lat: 18.4, lon: 77.6, radiusDeg: 4, clue: "Perseverance 착륙지, 고대 삼각주 후보" },
  { name: "Meridiani Planum", kind: "평원", lat: 0.2, lon: -2.5, radiusDeg: 9, clue: "적도 부근의 비교적 평탄한 지역" },
  { name: "Chryse Planitia", kind: "저지 평원", lat: 27.0, lon: -37.0, radiusDeg: 16, clue: "Viking 1 착륙지 인근의 북쪽 저지대" },
  { name: "Acidalia Planitia", kind: "북반구 평원", lat: 46.7, lon: -22.0, radiusDeg: 18, clue: "북반구의 어두운 저지 평원" },
  { name: "Amazonis Planitia", kind: "평원", lat: 24.8, lon: -164.4, radiusDeg: 18, clue: "Olympus Mons 서쪽의 매우 평탄한 평원" },
  { name: "Arabia Terra", kind: "고지대", lat: 21.0, lon: 6.0, radiusDeg: 20, clue: "북반구와 남반구 경계 부근의 오래된 고지" },
  { name: "Margaritifer Terra", kind: "고지대/계곡 지형", lat: -5.0, lon: -20.0, radiusDeg: 15, clue: "고대 물길 후보가 많은 적도 부근 고지" },
  { name: "Elysium Planitia", kind: "화산성 평원", lat: 3.0, lon: 154.0, radiusDeg: 18, clue: "Elysium 화산 지역 남쪽의 평원" },
  { name: "Hesperia Planum", kind: "화산성 평원", lat: -20.0, lon: 110.0, radiusDeg: 17, clue: "남반구 중위도의 비교적 완만한 평원" },
  { name: "Terra Cimmeria", kind: "남반구 고지대", lat: -34.0, lon: 145.0, radiusDeg: 20, clue: "오래되고 충돌구가 많은 남반구 고지" },
  { name: "Terra Sirenum", kind: "남반구 고지대", lat: -39.0, lon: -150.0, radiusDeg: 20, clue: "오래되고 충돌구가 많은 남반구 고지" },
  { name: "Planum Boreum", kind: "북극층/극관", lat: 85.0, lon: 0.0, radiusDeg: 12, clue: "북극의 얼음과 층상 퇴적 지형" },
  { name: "Planum Australe", kind: "남극층/극관", lat: -85.0, lon: 0.0, radiusDeg: 12, clue: "남극의 얼음과 층상 퇴적 지형" },
];

const MARS_OFFICIAL_FEATURE_REFERENCES = [
  marsFeature("Olympus Mons", "거대 방패화산", 18.6528, -133.803, 12.0, "고전 알베도 지형명에서 온 이름", "태양계 최대급 화산. 둥근 화산체와 매우 넓은 완만한 사면"),
  marsFeature("Arsia Mons", "방패화산", -8.2571, -120.093, 8.5, "Arsia Silva라는 고전 알베도 지형명에서 온 이름", "Tharsis Montes 남쪽 화산. 둥근 칼데라와 넓은 화산 사면"),
  marsFeature("Pavonis Mons", "방패화산", 1.4801, -112.962, 8.0, "고전 알베도 지형명에서 온 이름", "Tharsis Montes 가운데 화산"),
  marsFeature("Ascraeus Mons", "방패화산", 11.9216, -104.081, 8.5, "Ascraeus Lacus라는 고전 알베도 지형명에서 온 이름", "Tharsis Montes 북쪽 화산"),
  marsFeature("Tharsis Montes", "화산 산맥", 1.5703, -112.584, 14.0, "고전 알베도 지형명에서 온 이름", "Arsia, Pavonis, Ascraeus Mons가 줄지어 있는 화산대"),
  marsFeature("Alba Mons", "넓은 방패화산", 41.082, -110.709, 14.0, "고전 알베도 지형명에서 온 이름", "아주 넓고 낮게 퍼진 화산성 고지"),
  marsFeature("Tharsis Tholus", "작은 화산", 13.2541, -90.6927, 4.5, "고전 알베도 지형명에서 온 이름", "Tharsis 동쪽의 작은 화산체"),
  marsFeature("Ceraunius Tholus", "작은 화산", 24.0021, -97.2514, 4.2, "고전 알베도 지형명에서 온 이름", "Tharsis 북동쪽의 원뿔형 화산 후보"),
  marsFeature("Elysium Mons", "화산", 25.0232, 147.214, 9.0, "고전 알베도 지형명에서 온 이름", "Elysium 화산 지역 중심 화산"),
  marsFeature("Hecates Tholus", "작은 화산", 32.1195, 150.244, 4.8, "고전 알베도 지형명에서 온 이름", "Elysium 북쪽의 화산성 돔"),
  marsFeature("Apollinaris Mons", "화산", -9.1712, 174.793, 6.0, "고전 알베도 지형명에서 온 이름", "적도 남쪽의 고립된 화산체"),
  marsFeature("Valles Marineris", "거대 협곡계", -14.0059, -58.5877, 24.0, "Mariner 9 과학팀을 기리기 위한 협곡계 이름", "화성 적도 부근을 동서로 가르는 거대한 협곡"),
  marsFeature("Noctis Labyrinthus", "미로 협곡", -6.3625, -101.189, 12.0, "고전 알베도 지형명에서 온 이름", "Tharsis 동쪽의 사각형 균열과 협곡 미로"),
  marsFeature("Ius Chasma", "협곡", -7.2894, -84.3891, 8.0, "고전 알베도 지형명에서 온 이름", "Valles Marineris 서쪽의 길고 깊은 협곡"),
  marsFeature("Tithonium Chasma", "협곡", -4.6046, -84.2894, 7.0, "고전 알베도 지형명에서 온 이름", "Ius Chasma 북쪽의 평행한 협곡"),
  marsFeature("Melas Chasma", "협곡", -10.5178, -72.5387, 8.0, "고전 알베도 지형명에서 온 이름", "Valles Marineris 중앙의 매우 깊고 넓은 협곡"),
  marsFeature("Candor Chasma", "협곡", -6.5328, -70.7793, 7.0, "고전 알베도 지형명에서 온 이름", "Melas 북쪽의 밝고 복잡한 협곡 벽"),
  marsFeature("Ophir Chasma", "협곡", -4.0031, -72.3516, 6.5, "고전 알베도 지형명에서 온 이름", "Candor 동쪽의 협곡 구간"),
  marsFeature("Coprates Chasma", "협곡", -13.3654, -60.7385, 8.0, "고전 알베도 지형명에서 온 이름", "Valles Marineris 동쪽으로 이어지는 긴 협곡"),
  marsFeature("Ganges Chasma", "협곡", -7.9552, -47.8851, 6.5, "고전 알베도 지형명에서 온 이름", "Valles Marineris 동쪽 끝 주변의 협곡"),
  marsFeature("Eos Chasma", "협곡", -12.1472, -39.1737, 8.0, "고전 알베도 지형명에서 온 이름", "Valles Marineris 동쪽 출구 쪽 협곡"),
  marsFeature("Capri Chasma", "협곡", -8.2737, -42.0659, 5.5, "고전 알베도 지형명에서 온 이름", "Eos Chasma와 이어지는 동쪽 협곡"),
  marsFeature("Hebes Chasma", "고립 협곡", -1.0745, -76.059, 5.0, "고전 알베도 지형명에서 온 이름", "Valles Marineris 북쪽의 독립된 닫힌 협곡"),
  marsFeature("Kasei Valles", "홍수 계곡", 25.1357, -62.8784, 12.0, "일본어로 '화성'을 뜻하는 말에서 온 이름", "Chryse 쪽으로 이어지는 거대한 유출 수로"),
  marsFeature("Ares Vallis", "계곡", 10.2924, -25.6083, 8.0, "그리스어로 '화성'을 뜻하는 말에서 온 이름", "Mars Pathfinder 착륙지와 관련된 유출 수로"),
  marsFeature("Maja Valles", "계곡", 10.227, -58.3799, 7.0, "네팔어로 '화성'을 뜻하는 말에서 온 이름", "Chryse Planitia로 흘러든 유출 수로 후보"),
  marsFeature("Mawrth Vallis", "계곡", 22.4304, -16.9726, 6.0, "웨일스어로 '화성'을 뜻하는 말에서 온 이름", "점토 광물 탐사 후보로 유명한 고대 계곡"),
  marsFeature("Nirgal Vallis", "계곡", -28.1596, -41.6848, 7.0, "바빌로니아어로 '화성'을 뜻하는 말에서 온 이름", "남반구 고지대의 길고 굽은 계곡"),
  marsFeature("Athabasca Valles", "계곡", 8.5358, 155.013, 7.0, "캐나다의 Athabasca 강 이름에서 온 이름", "Elysium 근처의 젊은 용암/홍수 흐름 후보"),
  marsFeature("Mangala Valles", "계곡", -11.3247, -151.392, 8.0, "산스크리트어로 '화성'을 뜻하는 말에서 온 이름", "화산 활동과 물 흐름이 함께 논의되는 유출 수로"),
  marsFeature("Hellas Planitia", "거대 충돌분지", -42.4301, 70.5025, 22.0, "고전 알베도 지형명에서 온 이름", "남반구의 매우 크고 낮은 원형 분지"),
  marsFeature("Argyre Planitia", "충돌분지", -49.8406, -43.3098, 16.0, "고전 알베도 지형명에서 온 이름", "남반구의 밝은 원형 저지대"),
  marsFeature("Isidis Planitia", "충돌분지/평원", 13.9357, 88.3772, 14.0, "고전 알베도 지형명에서 온 이름", "Syrtis Major 동쪽의 둥근 평원, Jezero 인근"),
  marsFeature("Utopia Planitia", "북반구 저지 평원", 46.7363, 117.517, 22.0, "고전 알베도 지형명에서 온 이름", "북반구의 넓은 저지대 평원"),
  marsFeature("Amazonis Planitia", "평원", 25.7461, -162.913, 18.0, "고전 알베도 지형명, 아마존족의 집이라는 뜻과 관련", "Olympus Mons 서쪽의 매우 평탄한 평원"),
  marsFeature("Acidalia Planitia", "북반구 평원", 49.76, -20.74, 18.0, "44N, 21W의 고전 알베도 지형명에서 온 이름", "북반구의 넓고 비교적 어두운 저지 평원"),
  marsFeature("Chryse Planitia", "저지 평원", 28.4333, -40.3073, 16.0, "고전 알베도 지형명에서 온 이름", "Viking 1 착륙지와 여러 유출 수로 말단부 인근"),
  marsFeature("Elysium Planitia", "화산성 평원", 2.979, 154.737, 18.0, "고전 알베도 지형명에서 온 이름", "Elysium 화산 지역 남쪽의 넓은 평원"),
  marsFeature("Arcadia Planitia", "북반구 평원", 49.02, -171.85, 14.0, "45N, 120W의 고전 알베도 지형명에서 온 이름", "북서쪽의 비교적 평탄한 저지 평원"),
  marsFeature("Meridiani Planum", "평원", -0.04, -3.14, 9.0, "고전 알베도 지형명에서 온 이름", "Opportunity 탐사 지역과 관련된 적도 부근 평원"),
  marsFeature("Syrtis Major Planum", "어두운 화산성 평원", 9.2007, 67.103, 15.0, "알베도 지형명에서 온 이름, Planitia에서 Planum으로 변경", "화성 앞면에서 어둡게 보이는 큰 삼각형 모양 고원"),
  marsFeature("Hesperia Planum", "화산성 고원/평원", -21.4226, 109.894, 15.0, "고전 알베도 지형명에서 온 이름", "남반구 중위도의 넓은 화산성 평원"),
  marsFeature("Planum Boreum", "북극층/극관", 87.32, 54.96, 12.0, "고전 알베도 지형명에서 온 이름", "북극 얼음과 층상 퇴적 지형"),
  marsFeature("Planum Australe", "남극층/극관", -83.35, 157.7, 12.0, "고전 알베도 지형명에서 온 이름", "남극 얼음과 층상 퇴적 지형"),
  marsFeature("Vastitas Borealis", "북부 저지대", 87.7297, 32.5298, 24.0, "고전 알베도 지형명에서 온 이름", "화성 북반구의 매우 넓은 저지대"),
  marsFeature("Arabia Terra", "오래된 고지대", 21.249, 5.7185, 20.0, "고전 알베도 지형명에서 온 이름", "북반구와 남반구 경계 부근의 오래된 고지"),
  marsFeature("Margaritifer Terra", "고지대/계곡 지형", -1.8497, -24.9223, 16.0, "고전 알베도 지형명에서 온 이름", "고대 물길 후보가 많은 적도 부근 고지"),
  marsFeature("Terra Cimmeria", "남반구 고지대", -32.6795, 147.746, 20.0, "고전 알베도 지형명에서 온 이름", "오래되고 충돌구가 많은 남반구 고지"),
  marsFeature("Terra Sirenum", "남반구 고지대", -39.4946, -154.152, 20.0, "고전 알베도 지형명에서 온 이름", "오래되고 충돌구가 많은 남반구 고지"),
  marsFeature("Noachis Terra", "남반구 고지대", -50.4072, -5.1567, 18.0, "고전 알베도 지형명에서 온 이름", "Hellas와 Argyre 사이의 오래된 충돌구 많은 고지"),
  marsFeature("Xanthe Terra", "고지대", 1.5956, -48.0534, 14.0, "고전 알베도 지형명에서 온 이름", "Chryse 남쪽의 계곡과 혼돈 지형이 많은 고지"),
  marsFeature("Tempe Terra", "균열 고지대", 38.6877, -70.6143, 14.0, "40N, 70W의 고전 알베도 지형명에서 온 이름", "Tharsis 북동쪽의 단층과 균열이 많은 고지"),
  marsFeature("Promethei Terra", "남극권 고지대", -64.3701, 97.0044, 16.0, "고전 알베도 지형명에서 온 이름", "Hellas 남동쪽과 남극권 사이의 고지"),
  marsFeature("Gale", "충돌구", -5.3672, 137.811, 4.0, "호주 천문학자 Walter F. Gale(1865-1945)을 기린 이름", "Curiosity 착륙지, 중앙산 Aeolis Mons가 있는 크레이터"),
  marsFeature("Aeolis Mons", "중앙산", -5.0834, 137.845, 2.5, "고전 알베도 지형명에서 온 이름", "Gale 크레이터 안의 층상 산, Curiosity 탐사 대상"),
  marsFeature("Aeolis Palus", "평탄지", -4.4652, 137.422, 2.5, "고전 알베도 지형명에서 온 이름", "Gale 크레이터 북쪽 바닥의 Curiosity 착륙지 주변"),
  marsFeature("Jezero", "충돌구", 18.4082, 77.6873, 3.5, "보스니아-헤르체고비나의 마을 이름에서 온 이름", "Perseverance 착륙지, 고대 삼각주 후보"),
  marsFeature("Gusev", "충돌구", -14.5308, 175.524, 4.5, "러시아 천문학자 Matvei Gusev(1826-1866)를 기린 이름", "Spirit 로버 착륙지, Ma'adim Vallis 말단부와 관련"),
  marsFeature("Holden", "충돌구", -26.04, -34.019, 4.5, "미국 천문학자 Edward S. Holden(1846-1914)을 기린 이름", "퇴적층과 물 흐름 후보가 알려진 크레이터"),
  marsFeature("Eberswalde", "충돌구", -23.9753, -33.2971, 3.5, "독일의 도시 이름에서 온 이름", "삼각주 퇴적 지형 후보가 유명한 크레이터"),
  marsFeature("Endeavour", "충돌구", -2.2836, -5.1955, 3.5, "캐나다의 지명에서 온 이름", "Opportunity가 장기간 탐사한 Meridiani Planum의 크레이터"),
  marsFeature("Victoria", "충돌구", -2.0523, -5.498, 2.2, "세이셸 공화국의 도시 이름에서 온 이름", "Opportunity가 탐사한 작은 크레이터"),
  marsFeature("Zunil", "충돌구", 7.7002, 166.188, 2.2, "과테말라의 마야 마을 이름에서 온 이름", "젊은 충돌구와 광조 후보로 알려진 지형"),
  marsFeature("Lyot", "충돌구", 50.4671, 29.3413, 5.0, "프랑스 천문학자 Bernard Lyot(1897-1952)를 기린 이름", "북반구 저지대의 큰 충돌구"),
  marsFeature("Huygens", "충돌구", -13.8819, 55.5817, 4.5, "네덜란드 물리학자·천문학자 Christiaan Huygens(1629-1695)를 기린 이름", "남부 고지대의 큰 충돌구"),
  marsFeature("Schiaparelli", "충돌구", -2.7138, 16.7716, 5.0, "이탈리아 천문학자 Giovanni Schiaparelli(1835-1910)를 기린 이름", "화성 고전 관측사와 관련 깊은 적도 부근 큰 크레이터"),
  marsFeature("Herschel", "충돌구", -14.48, 129.893, 5.0, "영국 천문학자 John F. Herschel과 William Herschel을 기린 이름", "남반구 중위도 동쪽의 큰 충돌구"),
  marsFeature("Newton", "충돌구", -40.502, -158.029, 5.0, "영국 물리학자 Isaac Newton(1643-1727)을 기린 이름", "남반구의 큰 낡은 충돌구"),
  marsFeature("Antoniadi", "충돌구", 21.3819, 60.8311, 4.0, "터키 태생 프랑스 천문학자 Eugene Antoniadi(1870-1944)를 기린 이름", "Syrtis Major와 Nili Fossae 인근의 크레이터"),
  marsFeature("Lomonosov", "충돌구", 65.0406, -9.235, 4.2, "러시아 과학자 Mikhail Lomonosov(1711-1765)를 기린 이름", "북반구 고위도의 큰 충돌구"),
  marsFeature("Korolev", "충돌구", 72.7677, 164.584, 5.0, "러시아 로켓 공학자 Sergey Korolev(1906-1966)를 기린 이름", "북극 가까이의 얼음이 알려진 큰 크레이터"),
  marsFeature("Miyamoto", "충돌구", -2.868, -6.9499, 3.4, "일본 천문학자 Shotaro Miyamoto(1912-1992)를 기린 이름", "Meridiani 부근의 오래된 충돌구"),
  marsFeature("Nili Fossae", "균열/골짜기 지형", 22.0182, 76.6948, 8.0, "고전 알베도 지형명에서 온 이름", "Isidis 서쪽의 곡선형 균열대, 점토 광물 탐사 후보"),
  marsFeature("Cerberus Fossae", "균열 지형", 11.2766, 166.374, 7.0, "10N, 212W의 알베도 지형명에서 온 이름", "Elysium 남동쪽의 젊은 균열과 화산/지진 활동 후보"),
  marsFeature("Medusae Fossae", "침식성 퇴적 지형", -2.1663, -164.196, 12.0, "고전 알베도 지형명에서 온 이름", "적도 부근의 밝고 부드러운 퇴적 지형"),
  marsFeature("Aureum Chaos", "혼돈 지형", -3.8947, -26.9634, 5.5, "고전 알베도 지형명에서 온 이름", "Margaritifer 부근의 무너진 블록과 골짜기"),
  marsFeature("Aram Chaos", "혼돈 지형", 2.5233, -22.3916, 4.5, "고전 알베도 지형명에서 온 이름", "큰 크레이터 안쪽이 무너진 듯한 혼돈 지형"),
  marsFeature("Iani Chaos", "혼돈 지형", -2.1921, -17.042, 5.0, "고전 알베도 지형명에서 온 이름", "Ares Vallis 시작부 주변의 복잡한 붕괴 지형"),
  marsFeature("Hydraotes Chaos", "혼돈 지형", 1.1179, -35.2915, 5.0, "고전 알베도 지형명에서 온 이름", "Chryse 남쪽의 유출 수로와 연결되는 혼돈 지형"),
  marsFeature("Arsinoes Chaos", "혼돈 지형", -7.6574, -27.916, 4.5, "프톨레마이오스 왕가의 Arsinoe에서 온 이름", "Margaritifer 동쪽의 복잡한 붕괴 지형"),
  marsFeature("Gordii Dorsum", "능선", 4.1069, -144.142, 5.0, "고전 알베도 지형명에서 온 이름", "Tharsis 서쪽의 길게 이어지는 능선 지형"),
];

const MOON_REFERENCE_SOURCES = [
  "IAU/USGS Gazetteer of Planetary Nomenclature",
  "Lunar Orbital Data Explorer planetary feature list",
  "USGS Moon LOLA 2011 nomenclature center points",
  "NASA SVS CGI Moon Kit color and elevation maps",
];

function moonCrater(name, lat, lon, radiusDeg, origin, clue) {
  return {
    name,
    kind: "충돌구",
    lat,
    lon,
    radiusDeg,
    origin,
    clue: clue || "IAU/USGS 중심 좌표 기준 명명 크레이터. 주변의 원형 테두리, 밝기, 고도 차이를 함께 확인",
  };
}

const MOON_CRATER_REFERENCES = [
  moonCrater("Abulfeda", -13.8651, 13.9103, 3.2, "시리아 지리학자 이스마일 이븐 아부 알피다(1273-1331)를 기린 이름", "중앙 남동쪽 고지대의 낡은 충돌구"),
  moonCrater("Agrippa", 4.0964, 10.4741, 2.4, "고대 그리스 천문학자 아그리파를 기린 이름", "달 앞면 중앙부의 각진 윤곽이 보이는 크레이터"),
  moonCrater("Albategnius", -11.24, 4.0092, 3.8, "아랍 천문학자·수학자 알바타니(c. 858-929)를 기린 이름", "Ptolemaeus 남동쪽의 오래된 큰 크레이터"),
  moonCrater("Alphonsus", -13.3879, -2.8463, 3.8, "스페인 천문학자 알폰소 10세(1221-1284)를 기린 이름", "Ptolemaeus와 Arzachel 사이의 중앙봉·어두운 반점 후보"),
  moonCrater("Archimedes", 29.7172, -3.9931, 3.5, "그리스 물리학자·수학자 아르키메데스(c. 287-212 B.C.)를 기린 이름", "Mare Imbrium 남동쪽의 비교적 매끈한 바닥 크레이터"),
  moonCrater("Aristarchus", 23.7299, -47.4901, 3.2, "그리스 천문학자 아리스타르코스(310-230 B.C.경)를 기린 이름", "달 앞면에서 매우 밝게 보이는 고반사 크레이터"),
  moonCrater("Aristillus", 33.8808, 1.2075, 2.8, "그리스 천문학자 아리스틸루스(fl. c. 280 B.C.)를 기린 이름", "Mare Imbrium 동쪽의 밝은 테두리와 광조 후보"),
  moonCrater("Aristoteles", 50.243, 17.32, 3.8, "그리스 철학자·천문학자 아리스토텔레스(383-322 B.C.)를 기린 이름", "Mare Frigoris 남쪽의 큰 원형 크레이터"),
  moonCrater("Arzachel", -18.2643, -1.9304, 3.5, "스페인-아랍 천문학자 알자르칼리(d. 1100)를 기린 이름", "중앙 남쪽의 선명한 벽과 중앙봉 후보"),
  moonCrater("Atlas", 46.7403, 44.3816, 3.4, "그리스 신화의 티탄 아틀라스에서 온 이름", "Hercules 근처 북동쪽 고지대의 큰 크레이터"),
  moonCrater("Autolycus", 30.6757, 1.4858, 2.5, "그리스 천문학자 피타네의 아우톨리코스(fl. c. 310 B.C.)를 기린 이름", "Aristillus 남쪽의 작은 밝은 크레이터"),
  moonCrater("Bailly", -66.8215, -68.8954, 7.0, "프랑스 천문학자 장 실뱅 바이이(1736-1793)를 기린 이름", "남서쪽 가장자리 부근의 매우 큰 낡은 충돌구"),
  moonCrater("Bessel", 21.7342, 17.9204, 2.2, "독일 천문학자 프리드리히 빌헬름 베셀(1784-1846)을 기린 이름", "Mare Serenitatis 안쪽의 작은 선명한 크레이터"),
  moonCrater("Bullialdus", -20.7477, -22.2632, 3.2, "프랑스 천문학자 이스마엘 불리오(1605-1694)를 기린 이름", "Mare Nubium 서쪽의 밝은 테두리와 중앙봉 후보"),
  moonCrater("Cabeus", -85.3303, -42.1327, 4.2, "이탈리아 천문학자 니콜로 카베오(1586-1650)를 기린 이름", "달 남극 가까이의 영구그늘 지역 후보가 있는 크레이터"),
  moonCrater("Catharina", -17.9802, 23.5521, 3.8, "알렉산드리아의 성 카타리나를 기린 이름", "Theophilus-Cyrillus-Catharina 삼중 크레이터 줄의 남쪽"),
  moonCrater("Cavalerius", 5.0973, -66.928, 3.0, "이탈리아 수학자 보나벤투라 카발리에리(1598-1647)를 기린 이름", "서쪽 가장자리 가까운 Oceanus Procellarum 부근 크레이터"),
  moonCrater("Clavius", -58.6228, -14.7275, 6.5, "독일 수학자 크리스토퍼 클라비우스(1537-1612)를 기린 이름", "남반구의 큰 크레이터와 내부 작은 크레이터 연쇄"),
  moonCrater("Cleomedes", 27.6005, 55.5005, 3.8, "고대 그리스 천문학자 클레오메데스를 기린 이름", "Mare Crisium 북쪽의 큰 고지대 크레이터"),
  moonCrater("Copernicus", 9.6209, -20.0786, 4.0, "폴란드 천문학자 니콜라우스 코페르니쿠스(1473-1543)를 기린 이름", "중앙 서쪽의 밝은 광조와 계단식 벽이 두드러지는 크레이터"),
  moonCrater("Cyrillus", -13.2913, 24.0655, 3.6, "이집트 신학자·연대학자 성 키릴(d. A.D. 444)을 기린 이름", "Theophilus 옆의 더 낡고 겹쳐 보이는 크레이터"),
  moonCrater("Endymion", 53.6067, 56.4832, 4.2, "그리스 신화 인물 엔디미온에서 온 이름", "북동쪽 가장자리 가까운 어두운 바닥의 큰 크레이터"),
  moonCrater("Eratosthenes", 14.4737, -11.3162, 3.2, "그리스 천문학자·지리학자 에라토스테네스(c. 276-196 B.C.)를 기린 이름", "Apenninus 산맥 끝 부근의 선명한 크레이터"),
  moonCrater("Eudoxus", 44.2656, 16.2257, 2.8, "그리스 천문학자 에우독소스(c. 408-355 B.C.)를 기린 이름", "Aristoteles 남쪽의 밝은 테두리 크레이터"),
  moonCrater("Fracastorius", -21.3587, 33.0703, 3.5, "이탈리아 의사·천문학자 지롤라모 프라카스토로(1483-1553)를 기린 이름", "Mare Nectaris 남쪽의 테두리가 일부 낮아진 크레이터"),
  moonCrater("Gassendi", -17.5546, -39.9637, 4.2, "프랑스 천문학자·수학자 피에르 가상디(1592-1655)를 기린 이름", "Mare Humorum 북쪽 가장자리의 균열 많은 큰 크레이터"),
  moonCrater("Grimaldi", -5.38, -68.36, 6.0, "이탈리아 천문학자·물리학자 프란체스코 마리아 그리말디(1618-1663)를 기린 이름", "서쪽 가장자리 가까운 어두운 바닥의 큰 원형 지형"),
  moonCrater("Harpalus", 52.7316, -43.4938, 2.7, "고대 그리스 천문학자 하르팔루스를 기린 이름", "북서쪽 Oceanus Procellarum 위쪽의 비교적 선명한 크레이터"),
  moonCrater("Hevelius", 2.1952, -67.4626, 4.0, "폴란드 천문학자 요하네스 헤벨리우스(1611-1687)를 기린 이름", "서쪽 가장자리 부근의 넓고 낡은 크레이터"),
  moonCrater("Hipparchus", -5.3565, 4.9133, 4.0, "그리스 천문학자 히파르코스(fl. 140 B.C.)를 기린 이름", "달 앞면 중앙부의 오래되고 마모된 큰 크레이터"),
  moonCrater("Julius Caesar", 9.1665, 15.2105, 3.2, "율리우스력을 도입한 로마의 율리우스 카이사르를 기린 이름", "Mare Tranquillitatis 서쪽의 낮고 오래된 크레이터"),
  moonCrater("Kepler", 8.121, -38.0087, 3.0, "독일 천문학자 요하네스 케플러(1571-1630)를 기린 이름", "Oceanus Procellarum 안의 밝은 광조 크레이터"),
  moonCrater("Lambert", 25.7717, -20.9864, 2.6, "독일 과학자 요한 하인리히 람베르트 등을 기린 이름", "Mare Imbrium 안쪽의 작고 선명한 크레이터"),
  moonCrater("Langrenus", -8.8604, 61.038, 4.2, "벨기에 달지도 제작자·공학자 미셸 플로랑 반 랑그렌(c. 1600-1675)을 기린 이름", "동쪽 가장자리 근처의 밝고 큰 크레이터"),
  moonCrater("Longomontanus", -49.5516, -21.8793, 4.8, "덴마크 천문학자·수학자 크리스티안 롱고몬타누스(1562-1647)를 기린 이름", "Tycho 남서쪽의 크고 낡은 남반구 크레이터"),
  moonCrater("Maginus", -50.0337, -5.9837, 4.8, "이탈리아 천문학자·수학자 조반니 안토니오 마지니(1555-1617)를 기린 이름", "남반구의 오래되고 충돌 흔적이 많은 큰 크레이터"),
  moonCrater("Manilius", 14.452, 9.0737, 2.5, "고대 로마 작가 마르쿠스 마닐리우스를 기린 이름", "Mare Vaporum 동쪽의 밝은 작은 크레이터"),
  moonCrater("Maurolycus", -41.7719, 13.9201, 4.5, "이탈리아 수학자 프란체스코 마우롤리코(1494-1575)를 기린 이름", "남중부 고지대의 큰 선명한 크레이터"),
  moonCrater("Menelaus", 16.2593, 15.9294, 2.4, "알렉산드리아의 그리스 기하학자·천문학자 메넬라오스를 기린 이름", "Mare Serenitatis 남서쪽 가장자리의 작은 밝은 크레이터"),
  moonCrater("Messier", -1.9038, 47.6533, 2.2, "프랑스 천문학자 샤를 메시에(1730-1817)를 기린 이름", "Mare Fecunditatis의 길쭉한 광조가 유명한 작은 크레이터"),
  moonCrater("Moretus", -70.6346, -5.947, 4.2, "벨기에 수학자 테오도르 모레(1602-1667)를 기린 이름", "남극권 가까이의 중앙봉이 뚜렷한 크레이터"),
  moonCrater("Petavius", -25.3914, 60.7776, 4.6, "프랑스 연대학자·천문학자 드니 페토(1583-1652)를 기린 이름", "동남쪽의 큰 크레이터와 내부 균열 후보"),
  moonCrater("Picard", 14.5663, 54.724, 2.4, "프랑스 천문학자 장 피카르(1620-1682)를 기린 이름", "Mare Crisium 안쪽의 작고 선명한 크레이터"),
  moonCrater("Piccolomini", -29.6998, 32.1986, 3.6, "이탈리아 천문학자 알레산드로 피콜로미니(1508-1578)를 기린 이름", "Altai 절벽 근처의 밝은 중앙봉 크레이터"),
  moonCrater("Plato", 51.6192, -9.3825, 4.2, "그리스 철학자 플라톤(c. 428-c. 347 B.C.)을 기린 이름", "Mare Imbrium 북쪽의 어두운 바닥을 가진 큰 크레이터"),
  moonCrater("Posidonius", 31.8783, 29.9913, 4.0, "아파메아의 그리스 지리학자 포시도니오스를 기린 이름", "Mare Serenitatis 동쪽 가장자리의 균열 많은 큰 크레이터"),
  moonCrater("Proclus", 16.0878, 46.8943, 2.6, "그리스 수학자·천문학자·철학자 프로클로스(410-485)를 기린 이름", "Mare Crisium 서쪽의 비대칭 밝은 광조 크레이터"),
  moonCrater("Ptolemaeus", -9.1605, -1.8373, 5.2, "그리스 천문학자·수학자·지리학자 클라우디오스 프톨레마이오스를 기린 이름", "달 중앙 남쪽의 넓고 평평한 바닥을 가진 큰 크레이터"),
  moonCrater("Pytheas", 20.567, -20.5943, 2.2, "마르세유의 그리스 항해자·지리학자 피테아스를 기린 이름", "Mare Imbrium 남쪽의 작은 밝은 크레이터"),
  moonCrater("Reinhold", 3.2815, -22.8625, 2.6, "독일 천문학자·수학자 에라스무스 라인홀트(1511-1553)를 기린 이름", "Copernicus 남서쪽의 선명한 원형 크레이터"),
  moonCrater("Schickard", -44.3793, -55.1052, 5.6, "독일 천문학자·수학자 빌헬름 시카르트(1592-1635)를 기린 이름", "남서쪽의 크고 납작한 바닥을 가진 충돌구"),
  moonCrater("Schiller", -51.7244, -39.784, 4.5, "독일 천문학자 율리우스 실러를 기린 이름", "남서쪽의 길쭉하게 찌그러져 보이는 독특한 크레이터"),
  moonCrater("Seleucus", 21.0908, -66.6608, 2.7, "고대 바빌로니아 천문학자 셀레우코스를 기린 이름", "서쪽 Oceanus Procellarum 가장자리의 작은 크레이터"),
  moonCrater("Snellius", -29.3332, 55.7048, 3.8, "네덜란드 수학자·천문학자 빌레브로드 스넬을 기린 이름", "달 동남쪽의 길게 이어지는 Vallis Snellius 부근 크레이터"),
  moonCrater("Stevinus", -32.4902, 54.1372, 3.4, "벨기에 수학자·물리학자 시몬 스테빈(1548-1620)을 기린 이름", "Snellius 근처의 비교적 선명한 남동쪽 크레이터"),
  moonCrater("Taruntius", 5.5022, 46.5426, 2.8, "고대 로마 철학자 루키우스 피르마누스를 기린 이름", "Mare Fecunditatis 북서쪽의 낮고 둥근 크레이터"),
  moonCrater("Theophilus", -11.4524, 26.2847, 4.0, "그리스 천문학자 테오필루스(d. A.D. 412)를 기린 이름", "Mare Nectaris 서쪽의 선명한 테두리와 중앙봉 크레이터"),
  moonCrater("Tycho", -43.2958, -11.2153, 4.0, "덴마크 천문학자 티코 브라헤(1546-1601)를 기린 이름", "남반구에서 밝은 광조가 사방으로 뻗는 젊은 크레이터"),
  moonCrater("Vendelinus", -16.4576, 61.5456, 3.8, "벨기에 천문학자 고드프루아 웬델린(1580-1667)을 기린 이름", "Langrenus 남쪽의 동쪽 가장자리 부근 크레이터"),
  moonCrater("Werner", -28.0263, 3.2927, 3.2, "독일 수학자 요한 베르너(1468-1528)를 기린 이름", "중앙 남쪽 고지대의 선명한 크레이터"),
  moonCrater("Zucchius", -61.3822, -50.6484, 4.2, "이탈리아 수학자·천문학자 니콜로 주키(1586-1670)를 기린 이름", "남서쪽 가장자리 근처의 큰 크레이터"),
  moonCrater("Aitken", -16.443, 172.958, 4.2, "미국 천문학자 로버트 그랜트 에이킨(1864-1951)을 기린 이름", "달 뒷면 남쪽의 큰 충돌구"),
  moonCrater("Apollo", -35.6874, -151.478, 12.0, "아폴로 달 탐사 임무를 기리기 위해 붙은 이름", "달 뒷면 남반구의 거대한 이중고리 충돌분지"),
  moonCrater("Compton", 55.8622, 104.055, 5.5, "미국 물리학자 아서 H. 컴프턴과 칼 T. 컴프턴을 기린 이름", "달 뒷면 북동쪽의 큰 크레이터"),
  moonCrater("Daedalus", -5.8329, 179.398, 4.0, "그리스 신화 인물 다이달로스에서 온 이름", "달 뒷면 중앙 부근의 비교적 선명한 크레이터"),
  moonCrater("Hertzsprung", 1.3651, -128.656, 9.5, "덴마크 천문학자 에이나르 헤르츠스프룽(1873-1967)을 기린 이름", "달 뒷면 서쪽의 거대한 낡은 충돌분지"),
  moonCrater("Hilbert", -17.8732, 108.321, 5.0, "독일 수학자 다비트 힐베르트(1862-1943)를 기린 이름", "달 뒷면 동쪽의 큰 크레이터"),
  moonCrater("Jules Verne", -34.8456, 147.275, 5.0, "프랑스 작가 쥘 베른(1828-1905)을 기린 이름", "달 뒷면 남동쪽의 어두운 바닥 후보가 있는 크레이터"),
  moonCrater("Korolev", -4.1913, -157.408, 9.0, "소련 로켓 과학자 세르게이 코롤료프(1906-1966)를 기린 이름", "달 뒷면의 큰 다중고리 충돌구"),
  moonCrater("Mendeleev", 5.3754, 141.168, 7.5, "러시아 화학자 드미트리 멘델레예프(1834-1907)를 기린 이름", "달 뒷면 적도 부근의 큰 낡은 충돌구"),
  moonCrater("Pasteur", -11.5769, 104.908, 6.0, "프랑스 화학자·미생물학자 루이 파스퇴르(1822-1895)를 기린 이름", "달 뒷면 동쪽의 큰 크레이터"),
  moonCrater("Tsiolkovskiy", -20.3789, 128.971, 5.0, "소련 물리학자 콘스탄틴 치올콥스키(1857-1935)를 기린 이름", "달 뒷면의 어두운 바닥과 밝은 중앙봉을 가진 크레이터"),
  moonCrater("Von Karman", -44.4505, 176.245, 5.0, "헝가리계 미국 항공과학자 시어도어 폰 카르만(1881-1963)을 기린 이름", "창어 4호 착륙지로 유명한 달 뒷면 남반구 크레이터"),
  moonCrater("Amundsen", -84.4398, 83.0691, 4.5, "노르웨이 탐험가 로알 아문센(1872-1928)을 기린 이름", "달 남극 가까이의 큰 극지 크레이터"),
  moonCrater("de Gerlache", -88.4849, -88.3447, 3.2, "벨기에 남극 탐험가 아드리앵 드 제를라슈(1866-1934)를 기린 이름", "달 남극권의 높은 위도 크레이터"),
  moonCrater("Drygalski", -79.5738, -87.177, 4.5, "독일 지리학자·지구물리학자 에리히 폰 드리갈스키(1865-1949)를 기린 이름", "달 남극 서쪽의 큰 크레이터"),
  moonCrater("Faustini", -87.1832, 84.3099, 3.0, "이탈리아 극지 지리학자 아르날도 파우스티니(1874-1944)를 기린 이름", "달 남극 영구그늘 후보 지역의 크레이터"),
  moonCrater("Haworth", -87.45, -5.17, 3.0, "영국 화학자 월터 노먼 하워스(1883-1950)를 기린 이름", "달 남극 가까이의 어두운 극지 크레이터"),
  moonCrater("Malapert", -84.9998, 11.4031, 3.5, "벨기에 천문학자·수학자 샤를 말라페르(1581-1630)를 기린 이름", "달 남극 근처의 높은 지형과 함께 언급되는 크레이터"),
  moonCrater("Nobile", -85.2752, 53.2725, 3.2, "이탈리아 북극 탐험가 움베르토 노빌레(1885-1978)를 기린 이름", "달 남극 부근의 극지 크레이터"),
  moonCrater("Shackleton", -89.67, 129.78, 2.8, "아일랜드계 영국 남극 탐험가 어니스트 섀클턴(1874-1922)을 기린 이름", "달 남극점에 매우 가까운 영구그늘 후보 크레이터"),
  moonCrater("Shoemaker", -88.137, 45.911, 3.2, "미국 행성과학자 유진 슈메이커(1928-1997)를 기린 이름", "달 남극권의 충돌구, 행성과학자 이름이 붙은 대표 사례"),
];

const MOON_FEATURE_REFERENCES = [
  { name: "Mare Imbrium", kind: "달의 바다/충돌분지", lat: 34.7, lon: -14.9, radiusDeg: 20, clue: "북서쪽의 큰 어두운 원형 바다" },
  { name: "Mare Serenitatis", kind: "달의 바다", lat: 27.3, lon: 18.4, radiusDeg: 13, clue: "북동쪽의 둥근 어두운 바다" },
  { name: "Mare Tranquillitatis", kind: "달의 바다", lat: 8.3, lon: 30.8, radiusDeg: 16, clue: "아폴로 11호 착륙지 주변의 어두운 평원" },
  { name: "Mare Crisium", kind: "달의 바다", lat: 16.2, lon: 59.1, radiusDeg: 11, clue: "동쪽 가장자리 가까운 둥근 어두운 바다" },
  { name: "Oceanus Procellarum", kind: "폭풍의 대양/현무암 평원", lat: 20.7, lon: -56.7, radiusDeg: 35, clue: "서쪽의 매우 넓은 어두운 현무암 평원" },
  { name: "Mare Nubium", kind: "달의 바다", lat: -20.6, lon: -17.3, radiusDeg: 13, clue: "남서쪽의 어두운 평원" },
  { name: "Mare Humorum", kind: "달의 바다/분지", lat: -24.5, lon: -38.6, radiusDeg: 8, clue: "남서쪽의 둥근 어두운 바다" },
  { name: "Mare Nectaris", kind: "달의 바다/분지", lat: -15.2, lon: 34.6, radiusDeg: 7, clue: "남동쪽의 작은 둥근 바다" },
  { name: "Mare Fecunditatis", kind: "달의 바다", lat: -7.8, lon: 53.7, radiusDeg: 15, clue: "동쪽 적도 부근의 어두운 평원" },
  { name: "Mare Frigoris", kind: "달의 바다", lat: 57.6, lon: 0.0, radiusDeg: 25, clue: "북쪽의 길게 뻗은 어두운 바다" },
  { name: "Mare Vaporum", kind: "달의 바다", lat: 13.2, lon: 4.1, radiusDeg: 6, clue: "중앙 북쪽의 작은 어두운 바다" },
  { name: "Mare Insularum", kind: "달의 바다", lat: 7.8, lon: -30.6, radiusDeg: 10, clue: "Copernicus와 Kepler 사이의 어두운 평원" },
  { name: "Mare Cognitum", kind: "달의 바다", lat: -10.5, lon: -22.3, radiusDeg: 7, clue: "중앙 남서쪽의 어두운 평원" },
  { name: "Mare Australe", kind: "달의 바다", lat: -47.8, lon: 92.0, radiusDeg: 18, clue: "남동쪽 가장자리 부근의 넓은 어두운 지대" },
  { name: "Mare Smythii", kind: "달의 바다", lat: -1.7, lon: 87.1, radiusDeg: 8, clue: "동쪽 가장자리 부근의 어두운 원형 평원" },
  { name: "Mare Marginis", kind: "달의 바다", lat: 12.7, lon: 86.5, radiusDeg: 7, clue: "동쪽 가장자리 위쪽의 어두운 바다" },
  { name: "Mare Orientale", kind: "달의 바다/다중고리 분지", lat: -19.9, lon: -94.7, radiusDeg: 7, clue: "서쪽 가장자리의 고리 모양 분지" },
  { name: "Mare Moscoviense", kind: "달 뒷면의 바다", lat: 27.3, lon: 148.1, radiusDeg: 6, clue: "달 뒷면 북반구의 어두운 원형 바다" },
  { name: "Tycho", kind: "충돌구", lat: -43.3, lon: -11.2, radiusDeg: 4, clue: "남반구의 밝은 광조가 사방으로 뻗는 크레이터" },
  { name: "Copernicus", kind: "충돌구", lat: 9.6, lon: -20.1, radiusDeg: 4, clue: "중앙 서쪽의 밝은 광조와 계단식 벽을 가진 크레이터" },
  { name: "Kepler", kind: "충돌구", lat: 8.1, lon: -38.0, radiusDeg: 3, clue: "Oceanus Procellarum 안의 밝은 광조 크레이터" },
  { name: "Aristarchus", kind: "충돌구/고원", lat: 23.7, lon: -47.5, radiusDeg: 4, clue: "매우 밝은 크레이터와 고원 지역" },
  { name: "Plato", kind: "충돌구", lat: 51.6, lon: -9.4, radiusDeg: 4, clue: "Mare Imbrium 북쪽의 어두운 바닥 크레이터" },
  { name: "Clavius", kind: "충돌구", lat: -58.6, lon: -14.7, radiusDeg: 6, clue: "남반구의 큰 충돌구와 내부 작은 크레이터 연쇄" },
  { name: "Grimaldi", kind: "충돌구/분지", lat: -5.4, lon: -68.4, radiusDeg: 6, clue: "서쪽 가장자리 가까운 어두운 바닥의 큰 원형 지형" },
  { name: "Schickard", kind: "충돌구", lat: -44.4, lon: -55.1, radiusDeg: 6, clue: "남서쪽의 크고 납작한 바닥을 가진 충돌구" },
  { name: "Sinus Iridum", kind: "만/분지", lat: 45.0, lon: -31.7, radiusDeg: 6, clue: "Mare Imbrium 북서쪽의 반원형 만" },
  { name: "Aitken", kind: "충돌구", lat: -16.4, lon: 173.0, radiusDeg: 4, clue: "달 뒷면 남쪽의 큰 충돌구" },
  { name: "Von Karman", kind: "충돌구", lat: -44.5, lon: 176.3, radiusDeg: 5, clue: "달 뒷면 남반구의 큰 충돌구" },
  { name: "Tsiolkovskiy", kind: "충돌구", lat: -20.4, lon: 129.0, radiusDeg: 5, clue: "달 뒷면의 어두운 바닥과 밝은 중앙봉을 가진 충돌구" },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  app: $("#app"),
  keyGate: $("#keyGate"),
  selectionScreen: $("#selectionScreen"),
  exploreScreen: $("#exploreScreen"),
  viewer: $("#viewer"),
  sphereCanvas: $("#sphereCanvas"),
  drawCanvas: $("#drawCanvas"),
  flatLayer: $("#flatLayer"),
  roverLayer: $("#roverLayer"),
  mapImage: $("#mapImage"),
  elevationImage: $("#elevationImage"),
  roverImage: $("#roverImage"),
  roverTray: $("#roverTray"),
  bodyBadge: $("#bodyBadge"),
  coordChip: $("#coordChip"),
  backBtn: $("#backBtn"),
  sphereBtn: $("#sphereBtn"),
  flatBtn: $("#flatBtn"),
  roverBtn: $("#roverBtn"),
  zoomControls: $("#zoomControls"),
  zoomOutBtn: $("#zoomOutBtn"),
  zoomInBtn: $("#zoomInBtn"),
  zoomResetBtn: $("#zoomResetBtn"),
  zoomLevel: $("#zoomLevel"),
  drawToggleBtn: $("#drawToggleBtn"),
  clearBtn: $("#clearBtn"),
  analyzeBtn: $("#analyzeBtn"),
  settingsBtn: $("#settingsBtn"),
  homeSettingsBtn: $("#homeSettingsBtn"),
  historyBtn: $("#historyBtn"),
  homeHistoryBtn: $("#homeHistoryBtn"),
  planBtn: $("#planBtn"),
  homePlanBtn: $("#homePlanBtn"),
  elevationControl: $("#elevationControl"),
  elevationRange: $("#elevationRange"),
  loadingOverlay: $("#loadingOverlay"),
  loadingText: $("#loadingOverlay p"),
  answerModal: $("#answerModal"),
  answerBody: $("#answerBody"),
  followupForm: $("#followupForm"),
  followupInput: $("#followupInput"),
  historyModal: $("#historyModal"),
  historyList: $("#historyList"),
  clearHistoryBtn: $("#clearHistoryBtn"),
  planModal: $("#planModal"),
  planGoal: $("#planGoal"),
  planSteps: $("#planSteps"),
  planFindings: $("#planFindings"),
  planSavedText: $("#planSavedText"),
  clearPlanBtn: $("#clearPlanBtn"),
  settingsModal: $("#settingsModal"),
  answerLevelOptions: $("#answerLevelOptions"),
  answerLevelSavedText: $("#answerLevelSavedText"),
  modelOptions: $("#modelOptions"),
  customModelInput: $("#customModelInput"),
  modelSavedText: $("#modelSavedText"),
  userNameSavedText: $("#userNameSavedText"),
  settingsNameForm: $("#settingsNameForm"),
  settingsNameInput: $("#settingsNameInput"),
  nameModal: $("#nameModal"),
  nameForm: $("#nameForm"),
  nameInput: $("#nameInput"),
  archiveScreen: $("#archiveScreen"),
  homeArchiveBtn: $("#homeArchiveBtn"),
  archiveBackBtn: $("#archiveBackBtn"),
  archiveListPage: $("#archiveListPage"),
  archiveList: $("#archiveList"),
  archiveDetailPage: $("#archiveDetailPage"),
  archiveDetailBackBtn: $("#archiveDetailBackBtn"),
  archiveDetailMeta: $("#archiveDetailMeta"),
  archiveDetailTitle: $("#archiveDetailTitle"),
  archiveDetailBody: $("#archiveDetailBody"),
  archiveFollowupForm: $("#archiveFollowupForm"),
  archiveFollowupInput: $("#archiveFollowupInput"),
  archiveFollowupBtn: $("#archiveFollowupBtn"),
  toast: $("#toast"),
};

const imageCache = new Map();
const textureCache = new Map();

const SPHERE_TEXTURE_SIZES = {
  moon: { width: 2048, height: 1024 },
  mars: { width: 4096, height: 2048 },
};
const DRAW_STROKE_WIDTH = 5;

const state = {
  bodyKey: null,
  viewMode: "sphere",
  drawMode: false,
  isDrawing: false,
  isRotating: false,
  isPanning: false,
  activePointerId: null,
  activeStroke: null,
  lastPointer: null,
  strokes: [],
  rotation: {
    lon: 0,
    lat: 0,
  },
  sphereZoom: 1,
  viewport: {
    scale: 1,
    x: 0,
    y: 0,
  },
  roverIndex: 0,
  elevationOpacity: 0.42,
  selectedModelId: getInitialModelId(),
  selectedAnswerLevelKey: getInitialAnswerLevelKey(),
  userName: getStoredUserName(),
  history: [],
  plan: loadJson(PLAN_KEY, {
    goal: "",
    steps: "",
    findings: "",
    updatedAt: null,
  }),
  lastAnalysis: null,
  renderFrame: null,
  toastTimer: null,
  planTimer: null,
  loadingMessageTimer: null,
  loadingMessageIndex: 0,
  touchPointers: new Map(),
  pinch: null,
  currentArchiveRecord: null,
};

function getInitialModelId() {
  const urlModel = (urlParams.get("model") || "").split(",")[0]?.trim();
  if (urlModel) return normalizeModelId(urlModel);

  return DEFAULT_MODEL_ID;
}

function normalizeModelId(modelId) {
  return MODEL_ID_ALIASES[modelId] || modelId;
}

function getInitialAnswerLevelKey() {
  const urlLevel = (urlParams.get("level") || urlParams.get("answerLevel") || "").trim();
  if (urlLevel) return normalizeAnswerLevelKey(urlLevel);

  return DEFAULT_ANSWER_LEVEL_KEY;
}

function normalizeAnswerLevelKey(levelKey) {
  const key = typeof levelKey === "string" ? levelKey.trim().toLowerCase() : "";
  const aliases = {
    low: "easy",
    simple: "easy",
    쉬움: "easy",
    easy: "easy",
    middle: "medium",
    normal: "medium",
    중간: "medium",
    medium: "medium",
    high: "hard",
    difficult: "hard",
    어려움: "hard",
    hard: "hard",
  };
  const normalized = aliases[key] || key;
  return ANSWER_LEVELS.some((level) => level.key === normalized) ? normalized : DEFAULT_ANSWER_LEVEL_KEY;
}

function init() {
  cleanupNonPlanBrowserStorage();

  if (!apiKey) {
    els.keyGate.classList.remove("hidden");
    els.app.setAttribute("aria-hidden", "true");
  }

  $$(".planet-card").forEach((button) => {
    button.addEventListener("click", () => selectBody(button.dataset.body));
  });

  els.backBtn.addEventListener("click", showSelection);
  els.sphereBtn.addEventListener("click", () => setViewMode("sphere"));
  els.flatBtn.addEventListener("click", () => setViewMode("flat"));
  els.roverBtn?.addEventListener("click", () => setViewMode("rover"));
  els.zoomOutBtn?.addEventListener("click", () => stepZoom(-1));
  els.zoomInBtn?.addEventListener("click", () => stepZoom(1));
  els.zoomResetBtn?.addEventListener("click", () => resetZoom(true));
  els.drawToggleBtn.addEventListener("click", toggleDrawMode);
  els.clearBtn.addEventListener("click", () => clearDrawing(true));
  els.analyzeBtn.addEventListener("click", analyzeSelection);
  els.settingsBtn.addEventListener("click", openSettings);
  els.homeSettingsBtn.addEventListener("click", openSettings);
  els.historyBtn?.addEventListener("click", openHistory);
  els.homeArchiveBtn.addEventListener("click", openArchiveScreen);
  els.archiveBackBtn.addEventListener("click", showSelection);
  els.archiveDetailBackBtn.addEventListener("click", showArchiveListPage);
  els.planBtn?.addEventListener("click", openPlan);
  els.homePlanBtn.addEventListener("click", openPlan);
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  els.clearPlanBtn.addEventListener("click", clearPlan);

  els.elevationRange?.addEventListener("input", () => {
    state.elevationOpacity = Number(els.elevationRange.value) / 100;
    els.elevationImage.style.opacity = String(state.elevationOpacity);
    scheduleSphereRender();
  });

  els.drawCanvas.addEventListener("pointerdown", onPointerDown);
  els.drawCanvas.addEventListener("pointermove", onPointerMove);
  els.drawCanvas.addEventListener("pointerup", endPointerAction);
  els.drawCanvas.addEventListener("pointercancel", endPointerAction);
  els.drawCanvas.addEventListener("lostpointercapture", endPointerAction);
  els.drawCanvas.addEventListener("wheel", onWheelZoom, {
    passive: false,
  });

  els.followupForm.addEventListener("submit", submitFollowup);
  els.archiveFollowupForm.addEventListener("submit", submitArchiveFollowup);
  els.nameForm.addEventListener("submit", submitNameOnboarding);
  els.settingsNameForm.addEventListener("submit", submitSettingsName);
  els.customModelInput.addEventListener("change", () => {
    const modelId = els.customModelInput.value.trim();
    if (modelId) {
      setSelectedModel(modelId);
    }
  });

  $$(".close-modal").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  [els.answerModal, els.historyModal, els.planModal, els.settingsModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  [els.planGoal, els.planSteps, els.planFindings].forEach((field) => {
    field.addEventListener("input", schedulePlanSave);
  });

  window.addEventListener("resize", resizeCanvases);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });

  buildRoverTray();
  renderAnswerLevelOptions();
  renderModelOptions();
  hydratePlan();
  hydrateUserNameSettings();
  resizeCanvases();
  ensureUserName();
}

async function selectBody(bodyKey) {
  const body = bodies[bodyKey];
  if (!body) return;

  state.bodyKey = bodyKey;
  state.rotation.lon = 0;
  state.rotation.lat = 0;
  state.sphereZoom = 1;
  resetZoom(false);
  state.roverIndex = 0;
  state.strokes = [];
  state.lastAnalysis = null;

  els.selectionScreen.classList.add("hidden");
  els.archiveScreen.classList.add("hidden");
  els.exploreScreen.classList.remove("hidden");
  if (els.bodyBadge) {
    els.bodyBadge.textContent = `${body.emoji} ${body.name}`;
  }
  els.mapImage.src = body.map;
  els.mapImage.alt = `${body.name} 전체 지도`;
  els.roverBtn?.classList.toggle("hidden", bodyKey !== "mars");
  els.elevationControl?.classList.toggle("hidden", bodyKey !== "moon");

  if (body.elevation) {
    els.elevationImage.src = body.elevation;
    els.elevationImage.alt = "달 고도 지도";
    els.elevationImage.style.opacity = String(state.elevationOpacity);
    els.elevationImage.classList.remove("hidden");
  } else {
    els.elevationImage.removeAttribute("src");
    els.elevationImage.classList.add("hidden");
  }

  setLoading(true, `${body.name} 지도를 준비하고 있어요...`);
  try {
    await prepareBodyTextures(bodyKey);
    setViewMode("sphere", { keepDrawing: true });
    resizeCanvases();
  } catch (error) {
    showToast(`지도 준비 중 문제가 생겼어요: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function showSelection() {
  state.bodyKey = null;
  state.strokes = [];
  state.lastAnalysis = null;
  els.exploreScreen.classList.add("hidden");
  els.archiveScreen.classList.add("hidden");
  els.selectionScreen.classList.remove("hidden");
  renderDrawing();
}

function setViewMode(mode, options = {}) {
  if (!state.bodyKey) return;
  const previousMode = state.viewMode;
  state.viewMode = mode;

  els.sphereCanvas.classList.toggle("hidden", mode !== "sphere");
  els.flatLayer.classList.toggle("hidden", mode !== "flat");
  els.roverLayer.classList.toggle("hidden", mode !== "rover");
  els.roverTray.classList.toggle("hidden", mode !== "rover");
  els.sphereBtn.classList.toggle("active", mode === "sphere");
  els.flatBtn.classList.toggle("active", mode === "flat");
  els.roverBtn?.classList.toggle("active", mode === "rover");

  if (mode === "rover") {
    setRoverImage(state.roverIndex);
  }

  if (!options.keepDrawing && previousMode !== mode) {
    clearDrawing(false);
    resetZoom(false);
  }

  if (mode === "sphere") {
    state.drawMode = false;
  } else if (mode === "flat") {
    state.drawMode = false;
  } else {
    state.drawMode = false;
  }

  updateDrawButton();
  updateZoomControls();
  resizeCanvases();
  scheduleSphereRender();
}

function toggleDrawMode() {
  state.drawMode = !state.drawMode;
  updateDrawButton();
  showToast(state.drawMode ? "동그라미 그리기 모드예요." : "지도를 돌려 보는 모드예요.");
}

function updateDrawButton() {
  els.drawToggleBtn.classList.toggle("active", state.drawMode);
  if (state.drawMode) {
    els.drawCanvas.style.cursor = "crosshair";
  } else if (state.viewMode === "sphere" || state.viewMode === "flat" || state.viewMode === "rover") {
    els.drawCanvas.style.cursor = "grab";
  } else {
    els.drawCanvas.style.cursor = "default";
  }
}

function stepZoom(direction) {
  const current = getActiveZoom();
  const next = current * (direction > 0 ? 1.25 : 0.8);
  zoomTo(next, getCanvasCenter());
}

function onWheelZoom(event) {
  if (!state.bodyKey || !["sphere", "flat", "rover"].includes(state.viewMode)) return;
  event.preventDefault();
  const point = pointerPoint(event);
  const factor = event.deltaY < 0 ? 1.16 : 0.86;
  zoomTo(getActiveZoom() * factor, point);
}

function zoomTo(nextScale, focalPoint = getCanvasCenter()) {
  if (!state.bodyKey) return;

  if (state.viewMode === "sphere") {
    state.sphereZoom = clamp(nextScale, 0.75, 2.4);
    updateZoomControls();
    renderDrawing();
    scheduleSphereRender();
    return;
  }

  const previous = state.viewport.scale;
  const scale = clamp(nextScale, 1, 6);
  const center = getCanvasCenter();
  const ratio = scale / previous;
  state.viewport.x = (focalPoint.x - center.x) * (1 - ratio) + state.viewport.x * ratio;
  state.viewport.y = (focalPoint.y - center.y) * (1 - ratio) + state.viewport.y * ratio;
  state.viewport.scale = scale;
  clampViewportPan();
  applyViewportTransform();
  updateZoomControls();
  renderDrawing();

  if (scale > 1.02 && state.drawMode) {
    showToast("연필 버튼을 끄면 확대된 지도를 드래그해서 이동할 수 있어요.");
  }
}

function resetZoom(showMessage) {
  state.viewport = {
    scale: 1,
    x: 0,
    y: 0,
  };

  if (state.viewMode === "sphere") {
    state.sphereZoom = 1;
    scheduleSphereRender();
  }

  applyViewportTransform();
  updateZoomControls();
  renderDrawing();

  if (showMessage) {
    showToast("확대를 초기화했어요.");
  }
}

function getActiveZoom() {
  return state.viewMode === "sphere" ? state.sphereZoom : state.viewport.scale;
}

function getCanvasCenter() {
  return {
    x: els.drawCanvas.width / 2,
    y: els.drawCanvas.height / 2,
  };
}

function clampViewportPan() {
  const scale = state.viewport.scale;
  if (scale <= 1) {
    state.viewport.x = 0;
    state.viewport.y = 0;
    return;
  }

  const maxX = els.drawCanvas.width * (scale - 1) * 0.58 + 120;
  const maxY = els.drawCanvas.height * (scale - 1) * 0.58 + 120;
  state.viewport.x = clamp(state.viewport.x, -maxX, maxX);
  state.viewport.y = clamp(state.viewport.y, -maxY, maxY);
}

function applyViewportTransform() {
  const transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.scale})`;
  els.mapImage.style.transform = transform;
  els.elevationImage.style.transform = transform;
  els.roverImage.style.transform = transform;
}

function updateZoomControls() {
  if (!els.zoomLevel || !els.zoomOutBtn || !els.zoomInBtn) return;
  const zoom = getActiveZoom();
  const zoomText = zoom.toFixed(zoom >= 2 ? 1 : 2).replace(/\.?0+$/, "");
  els.zoomLevel.textContent = `${zoomText}×`;
  els.zoomOutBtn.disabled = zoom <= (state.viewMode === "sphere" ? 0.76 : 1.01);
  els.zoomInBtn.disabled = zoom >= (state.viewMode === "sphere" ? 2.39 : 5.99);
}

function buildRoverTray() {
  els.roverTray.innerHTML = "";
  roverImages.forEach((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rover-thumb";
    button.title = `로버 사진 ${index + 1}`;
    button.innerHTML = `<img src="${src}" alt="">`;
    button.addEventListener("click", () => {
      setRoverImage(index);
      clearDrawing(false);
    });
    els.roverTray.append(button);
  });
}

function setRoverImage(index) {
  state.roverIndex = index;
  resetZoom(false);
  els.roverImage.src = roverImages[index];
  els.roverImage.alt = `퍼서비어런스 로버 사진 ${index + 1}`;
  $$(".rover-thumb").forEach((button, itemIndex) => {
    button.classList.toggle("active", itemIndex === index);
  });
}

function resizeCanvases() {
  const rect = els.viewer.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const spherePixelRatio = getTargetSpherePixelRatio();
  const sphereWidth = Math.max(1, Math.round(width * spherePixelRatio));
  const sphereHeight = Math.max(1, Math.round(height * spherePixelRatio));

  if (els.sphereCanvas.width !== sphereWidth || els.sphereCanvas.height !== sphereHeight) {
    els.sphereCanvas.width = sphereWidth;
    els.sphereCanvas.height = sphereHeight;
  }

  if (els.drawCanvas.width !== width || els.drawCanvas.height !== height) {
    els.drawCanvas.width = width;
    els.drawCanvas.height = height;
  }

  clampViewportPan();
  applyViewportTransform();
  updateZoomControls();
  renderDrawing();
  scheduleSphereRender();
}

function onPointerDown(event) {
  if (!state.bodyKey) return;
  event.preventDefault();
  els.drawCanvas.setPointerCapture(event.pointerId);

  if (event.pointerType === "touch") {
    trackTouchPointer(event);
    if (state.touchPointers.size >= 2) {
      startPinchGesture();
      return;
    }
  }

  state.activePointerId = event.pointerId;

  if (state.drawMode) {
    const point = pointerPoint(event);
    const strokePoint = createStrokePoint(point, state.viewMode);
    if (!strokePoint) {
      updateCoordChip(point);
      return;
    }
    state.isDrawing = true;
    state.activeStroke = {
      mode: state.viewMode,
      points: [strokePoint],
    };
    state.strokes.push(state.activeStroke);
    updateCoordChip(point);
    renderDrawing();
    return;
  }

  if (state.viewMode === "sphere") {
    state.isRotating = true;
    state.lastPointer = {
      x: event.clientX,
      y: event.clientY,
    };
    els.drawCanvas.style.cursor = "grabbing";
    return;
  }

  if (state.viewMode === "flat" || state.viewMode === "rover") {
    state.isPanning = true;
    state.lastPointer = {
      x: event.clientX,
      y: event.clientY,
    };
    els.drawCanvas.style.cursor = "grabbing";
  }
}

function onPointerMove(event) {
  if (event.pointerType === "touch" && state.touchPointers.has(event.pointerId)) {
    trackTouchPointer(event);
    if (state.pinch) {
      event.preventDefault();
      updatePinchGesture();
      return;
    }
  }

  if (event.pointerId !== state.activePointerId) return;
  event.preventDefault();

  if (state.isDrawing && state.activeStroke) {
    const point = pointerPoint(event);
    const strokePoint = createStrokePoint(point, state.activeStroke.mode);
    if (!strokePoint) {
      updateCoordChip(point);
      return;
    }
    const lastPoint = state.activeStroke.points[state.activeStroke.points.length - 1];
    const lastScreenPoint = strokePointToScreen(lastPoint, state.activeStroke.mode);
    if (!lastScreenPoint || distance(lastScreenPoint, point) > 1.8) {
      state.activeStroke.points.push(strokePoint);
      updateCoordChip(point);
      renderDrawing();
    }
    return;
  }

  if (state.isRotating && state.viewMode === "sphere") {
    const dx = event.clientX - state.lastPointer.x;
    const dy = event.clientY - state.lastPointer.y;
    state.rotation.lon = wrapRadians(state.rotation.lon + dx * 0.008);
    state.rotation.lat = clamp(state.rotation.lat + dy * 0.006, -1.15, 1.15);
    state.lastPointer = {
      x: event.clientX,
      y: event.clientY,
    };
    updateCoordChip({
      x: els.drawCanvas.width / 2,
      y: els.drawCanvas.height / 2,
    });
    renderDrawing();
    scheduleSphereRender();
    return;
  }

  if (state.isPanning && (state.viewMode === "flat" || state.viewMode === "rover")) {
    const dx = event.clientX - state.lastPointer.x;
    const dy = event.clientY - state.lastPointer.y;
    state.viewport.x += dx;
    state.viewport.y += dy;
    state.lastPointer = {
      x: event.clientX,
      y: event.clientY,
    };
    clampViewportPan();
    applyViewportTransform();
    renderDrawing();
  }
}

function endPointerAction(event) {
  if (event?.pointerType === "touch" && state.touchPointers.has(event.pointerId)) {
    state.touchPointers.delete(event.pointerId);
    if (state.pinch) {
      endPinchGesture();
      return;
    }
  }

  if (event && event.pointerId !== state.activePointerId) return;

  const completedDrawing = state.isDrawing && state.activeStroke && state.activeStroke.points.length >= 2;

  if (state.isDrawing && state.activeStroke && state.activeStroke.points.length < 2) {
    state.strokes.pop();
  }

  state.isDrawing = false;
  state.isRotating = false;
  state.isPanning = false;
  state.activePointerId = null;
  state.activeStroke = null;
  state.lastPointer = null;

  if (completedDrawing) {
    state.drawMode = false;
  }

  updateDrawButton();
  renderDrawing();
}

function trackTouchPointer(event) {
  state.touchPointers.set(event.pointerId, pointerPoint(event));
}

function getTouchPoints() {
  return Array.from(state.touchPointers.values());
}

function getPinchCenter(points) {
  return {
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2,
  };
}

function startPinchGesture() {
  const points = getTouchPoints();
  if (points.length < 2) return;

  cancelActivePointerAction(true);
  state.drawMode = false;
  state.pinch = {
    startDistance: Math.max(8, distance(points[0], points[1])),
    startZoom: getActiveZoom(),
  };
  updatePinchGesture();
}

function updatePinchGesture() {
  const points = getTouchPoints();
  if (!state.pinch || points.length < 2) return;

  const pinchDistance = Math.max(8, distance(points[0], points[1]));
  const center = getPinchCenter(points);
  const nextZoom = state.pinch.startZoom * (pinchDistance / state.pinch.startDistance);
  zoomTo(nextZoom, center);
}

function endPinchGesture() {
  state.pinch = null;
  state.activePointerId = null;
  state.lastPointer = null;
  updateDrawButton();
  renderDrawing();
}

function cancelActivePointerAction(dropActiveStroke) {
  if (dropActiveStroke && state.activeStroke) {
    const index = state.strokes.indexOf(state.activeStroke);
    if (index >= 0) {
      state.strokes.splice(index, 1);
    }
  }

  state.isDrawing = false;
  state.isRotating = false;
  state.isPanning = false;
  state.activePointerId = null;
  state.activeStroke = null;
  state.lastPointer = null;
  updateDrawButton();
  renderDrawing();
}

function pointerPoint(event) {
  const rect = els.drawCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function createStrokePoint(point, mode = state.viewMode) {
  if (mode === "flat" || mode === "rover") {
    const rect = getDisplayedImageRect(mode === "rover" ? "rover" : "flat");
    if (rect.width && rect.height) {
      return {
        space: "image",
        x: (point.x - rect.x) / rect.width,
        y: (point.y - rect.y) / rect.height,
      };
    }
  }

  if (mode === "sphere") {
    const geo = spherePointToGeo(point.x, point.y);
    if (geo) {
      return {
        space: "geo",
        lat: geo.lat,
        lon: geo.lon,
      };
    }
    return null;
  }

  return {
    space: "screen",
    x: point.x,
    y: point.y,
  };
}

function strokePointToScreen(point, mode = state.viewMode) {
  if (!point) return null;

  if (point.space === "image") {
    const rect = getDisplayedImageRect(mode === "rover" ? "rover" : "flat");
    return {
      x: rect.x + point.x * rect.width,
      y: rect.y + point.y * rect.height,
    };
  }

  if (point.space === "sphere") {
    const metrics = getSphereMetrics();
    return {
      x: (metrics.cx + point.x * metrics.radius) / metrics.pixelRatio,
      y: (metrics.cy + point.y * metrics.radius) / metrics.pixelRatio,
    };
  }

  if (point.space === "geo") {
    return geoToSpherePoint(point.lon, point.lat);
  }

  return {
    x: point.x,
    y: point.y,
  };
}

function strokePointToGeo(point) {
  if (!point) return null;
  if (point.space === "geo") {
    return {
      lon: point.lon,
      lat: point.lat,
    };
  }

  if (point.space === "sphere") {
    const screenPoint = strokePointToScreen(point, "sphere");
    return screenPoint ? spherePointToGeo(screenPoint.x, screenPoint.y) : null;
  }

  return null;
}

function getStrokeLineWidth(stroke) {
  if (stroke.mode === "sphere") return clamp(DRAW_STROKE_WIDTH / Math.max(state.sphereZoom, 1), 1.6, DRAW_STROKE_WIDTH);
  if (stroke.mode === "flat" || stroke.mode === "rover") return clamp(DRAW_STROKE_WIDTH / Math.max(state.viewport.scale, 1), 1.4, DRAW_STROKE_WIDTH);
  return DRAW_STROKE_WIDTH;
}

function renderDrawing() {
  const canvas = els.drawCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 229, 90, 0.96)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  state.strokes.forEach((stroke) => {
    if (stroke.mode !== state.viewMode || stroke.points.length < 2) return;
    ctx.lineWidth = getStrokeLineWidth(stroke);
    ctx.beginPath();
    let started = false;
    stroke.points.forEach((point, index) => {
      const screenPoint = strokePointToScreen(point, stroke.mode);
      if (!screenPoint) {
        started = false;
        return;
      }

      if (index === 0 || !started) {
        ctx.moveTo(screenPoint.x, screenPoint.y);
        started = true;
      } else {
        ctx.lineTo(screenPoint.x, screenPoint.y);
      }
    });
    ctx.stroke();
  });

  ctx.restore();
}

function clearDrawing(showMessage) {
  state.strokes = [];
  state.activeStroke = null;
  renderDrawing();
  if (showMessage) {
    showToast("그린 동그라미를 지웠어요.");
  }
}

async function prepareBodyTextures(bodyKey) {
  const body = bodies[bodyKey];
  const textureSize = SPHERE_TEXTURE_SIZES[body.key] || SPHERE_TEXTURE_SIZES.moon;
  await loadImage(body.map);
  await loadImage(body.aiMap);

  textureCache.set(body.map, await imageToTexture(body.map, textureSize.width, textureSize.height));

  if (body.elevation) {
    await loadImage(body.elevation);
    await loadImage(body.aiElevation);
    textureCache.set(body.elevation, await imageToTexture(body.elevation, 2048, 1024));
  }
}

function scheduleSphereRender() {
  if (state.renderFrame) return;
  state.renderFrame = requestAnimationFrame(() => {
    state.renderFrame = null;
    renderSphere();
  });
}

function renderSphere() {
  if (!state.bodyKey || state.viewMode !== "sphere") return;
  const body = bodies[state.bodyKey];
  const colorTexture = textureCache.get(body.map);
  if (!colorTexture) return;

  const canvas = els.sphereCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const metrics = getSphereMetrics(width, height);
  const diameter = Math.max(1, Math.floor(metrics.radius * 2));
  const left = Math.floor(metrics.cx - metrics.radius);
  const top = Math.floor(metrics.cy - metrics.radius);
  const image = ctx.createImageData(diameter, diameter);
  const data = image.data;
  const elevationTexture = body.elevation ? textureCache.get(body.elevation) : null;
  const cosLat = Math.cos(state.rotation.lat);
  const sinLat = Math.sin(state.rotation.lat);
  const cosLon = Math.cos(state.rotation.lon);
  const sinLon = Math.sin(state.rotation.lon);

  ctx.clearRect(0, 0, width, height);

  for (let y = 0; y < diameter; y += 1) {
    const sy = (y - metrics.radius) / metrics.radius;
    for (let x = 0; x < diameter; x += 1) {
      const sx = (x - metrics.radius) / metrics.radius;
      const dist2 = sx * sx + sy * sy;
      const index = (y * diameter + x) * 4;

      if (dist2 > 1) {
        data[index + 3] = 0;
        continue;
      }

      const sz = Math.sqrt(1 - dist2);
      const vy = -sy;

      const y1 = vy * cosLat - sz * sinLat;
      const z1 = vy * sinLat + sz * cosLat;
      const x2 = sx * cosLon + z1 * sinLon;
      const z2 = -sx * sinLon + z1 * cosLon;

      const lon = Math.atan2(x2, z2);
      const lat = Math.asin(clamp(y1, -1, 1));
      const u = wrap01(lon / (Math.PI * 2) + 0.5);
      const v = clamp(0.5 - lat / Math.PI, 0, 0.9999);
      const color = sampleTexture(colorTexture, u, v);

      let red = color[0];
      let green = color[1];
      let blue = color[2];

      if (elevationTexture && state.elevationOpacity > 0.01) {
        const elevation = sampleTexture(elevationTexture, u, v);
        const elevValue = (elevation[0] + elevation[1] + elevation[2]) / 3;
        const alpha = state.elevationOpacity * 0.56;
        red = mix(red, elevValue * 0.88, alpha);
        green = mix(green, Math.min(255, elevValue * 1.06), alpha);
        blue = mix(blue, Math.min(255, elevValue * 1.22), alpha);
      }

      const lightVector = sx * -0.32 + vy * 0.22 + sz * 0.92;
      const light = clamp(0.38 + lightVector * 0.56, 0.18, 1.08);
      const limb = clamp(0.28 + Math.pow(sz, 0.45) * 0.86, 0, 1);
      const shade = light * limb;

      data[index] = clampByte(red * shade);
      data[index + 1] = clampByte(green * shade);
      data[index + 2] = clampByte(blue * shade);
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, left, top);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.beginPath();
  ctx.arc(metrics.cx, metrics.cy, metrics.radius + 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(238, 249, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(metrics.cx, metrics.cy, metrics.radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = body.key === "mars" ? "rgba(255, 107, 95, 0.24)" : "rgba(25, 211, 223, 0.22)";
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.restore();
}

function getSphereMetrics(width = els.sphereCanvas.width, height = els.sphereCanvas.height) {
  const pixelRatio = getSphereCanvasPixelRatio();
  const cssWidth = width / pixelRatio;
  const cssHeight = height / pixelRatio;
  const topPad = cssWidth < 700 ? 148 : 104;
  const bottomPad = cssWidth < 700 ? 86 : 54;
  const usableHeight = Math.max(220, cssHeight - topPad - bottomPad);
  const baseRadius = Math.max(118, Math.min(cssWidth * 0.41, usableHeight * 0.48, 440));
  const radius = baseRadius * state.sphereZoom * pixelRatio;
  return {
    radius,
    cx: width / 2,
    cy: (topPad + usableHeight / 2) * pixelRatio,
    pixelRatio,
  };
}

function getTargetSpherePixelRatio() {
  const deviceRatio = window.devicePixelRatio || 1;
  const mobileLimit = window.innerWidth < 760 ? 1.4 : 1.75;
  return Math.max(1, Math.min(deviceRatio, mobileLimit));
}

function getSphereCanvasPixelRatio() {
  const rect = els.sphereCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return 1;
  return Math.max(1, els.sphereCanvas.width / rect.width);
}

function imageToTexture(src, width, height) {
  if (textureCache.has(`${src}:${width}x${height}`)) {
    return textureCache.get(`${src}:${width}x${height}`);
  }

  return loadImage(src).then((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    ctx.drawImage(img, 0, 0, width, height);
    const texture = {
      width,
      height,
      data: ctx.getImageData(0, 0, width, height).data,
    };
    textureCache.set(`${src}:${width}x${height}`, texture);
    return texture;
  });
}

function sampleTexture(texture, u, v) {
  const x = Math.floor(wrap01(u) * (texture.width - 1));
  const y = Math.floor(clamp(v, 0, 0.9999) * (texture.height - 1));
  const index = (y * texture.width + x) * 4;
  return [
    texture.data[index],
    texture.data[index + 1],
    texture.data[index + 2],
    texture.data[index + 3],
  ];
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`${src} 이미지를 불러오지 못했어요.`));
    img.src = encodeURI(src);
  });

  imageCache.set(src, promise);
  return promise;
}

async function analyzeSelection() {
  if (!apiKey) {
    els.keyGate.classList.remove("hidden");
    return;
  }

  if (!state.bodyKey) return;

  if (!state.strokes.length) {
    showToast("먼저 궁금한 곳에 동그라미를 그려 주세요.");
    return;
  }

  const selection = getSelectionSummary();
  if (!selection) return;

  setLoading(true, "AI 전문가가 지도를 읽고 있어요...");
  let analysisImage = null;
  try {
    analysisImage = await buildAnalysisImage(selection);
    const prompt = buildAnalysisPrompt(selection);
    const answer = await askGemini(prompt, analysisImage.base64);

    const createdAt = Date.now();
    const archiveRecord = createArchiveRecord({
      bodyKey: state.bodyKey,
      mode: state.viewMode,
      selection,
      answer,
      imageBase64: analysisImage.base64,
      answerLevelKey: state.selectedAnswerLevelKey,
      createdAt,
    });

    state.currentArchiveRecord = archiveRecord;
    state.lastAnalysis = {
      bodyKey: state.bodyKey,
      viewMode: state.viewMode,
      selection,
      prompt,
      answer,
      imageBase64: analysisImage.base64,
      answerLevelKey: state.selectedAnswerLevelKey,
      archiveId: archiveRecord.id,
    };

    showAnswer(selection, answer, analysisImage.base64);
    saveHistory({
      bodyKey: state.bodyKey,
      mode: state.viewMode,
      question: selection.title,
      answer,
      details: selection.description,
      answerLevelKey: state.selectedAnswerLevelKey,
      createdAt,
    });
    try {
      await saveArchiveRecord(archiveRecord);
    } catch (archiveError) {
      showToast(`아카이브 저장 중 문제가 생겼어요: ${archiveError.message}`);
    }
    clearDrawing(false);
  } catch (error) {
    showAnswer(selection, `분석 중 문제가 생겼어요.\n\n${error.message}`, analysisImage?.base64);
  } finally {
    setLoading(false);
  }
}

function getSelectionSummary() {
  const body = bodies[state.bodyKey];
  let geo;
  let areaDescription;

  if (state.viewMode === "sphere") {
    const sphereSummary = getSphereStrokeSummary();
    if (!sphereSummary) {
      showToast("구형 행성의 표면 안쪽에 동그라미를 그려 주세요.");
      return null;
    }
    geo = sphereSummary.geo;
    areaDescription = `구형 보기에서 표시한 표면 영역, 중심 기준 반지름 약 ${sphereSummary.radiusDeg.toFixed(1)}도`;
  } else {
    const bounds = getStrokeBounds();
    if (!bounds) return null;

    const center = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };

    if (state.viewMode === "rover") {
      const imageRect = getDisplayedImageRect("rover");
      if (!pointInRect(center, imageRect)) {
        showToast("로버 사진 안쪽에 동그라미를 그려 주세요.");
        return null;
      }

      const xPercent = ((center.x - imageRect.x) / imageRect.width) * 100;
      const yPercent = ((center.y - imageRect.y) / imageRect.height) * 100;
      const areaPercent = Math.max(
        ((bounds.maxX - bounds.minX) / imageRect.width) * 100,
        ((bounds.maxY - bounds.minY) / imageRect.height) * 100,
      );

      return {
        type: "rover",
        title: `퍼서비어런스 로버 사진 ${state.roverIndex + 1} 분석`,
        description: `사진 기준 중심: 가로 ${xPercent.toFixed(1)}%, 세로 ${yPercent.toFixed(1)}%, 표시 크기 약 ${areaPercent.toFixed(1)}%`,
        xPercent,
        yPercent,
        areaPercent,
      };
    }

    const imageRect = getDisplayedImageRect("flat");
    if (!pointInRect(center, imageRect)) {
      showToast("지도 안쪽에 동그라미를 그려 주세요.");
      return null;
    }
    const u = (center.x - imageRect.x) / imageRect.width;
    const v = (center.y - imageRect.y) / imageRect.height;
    geo = uvToGeo(u, v);
    const widthDeg = ((bounds.maxX - bounds.minX) / imageRect.width) * 360;
    const heightDeg = ((bounds.maxY - bounds.minY) / imageRect.height) * 180;
    areaDescription = `대략 경도 폭 ${widthDeg.toFixed(1)}도, 위도 폭 ${heightDeg.toFixed(1)}도`;
  }

  const marsReference = body.key === "mars" ? getMarsReferenceContext(geo) : null;
  const moonReference = body.key === "moon" ? getMoonReferenceContext(geo) : null;
  const referenceText = marsReference?.displayText || moonReference?.displayText || "";
  const referenceDescription = referenceText ? ` ${referenceText}` : "";

  return {
    type: "map",
    title: `${body.name} ${formatLat(geo.lat)}, ${formatLon(geo.lon)} 부근`,
    description: `${body.name} 좌표: 위도 ${formatLat(geo.lat)}, 경도 ${formatLon(geo.lon)}. ${areaDescription}.${referenceDescription}`,
    lat: geo.lat,
    lon: geo.lon,
    marsReference,
    moonReference,
  };
}

function getSphereStrokeSummary() {
  const geoPoints = state.strokes.flatMap((stroke) => {
    if (stroke.mode !== "sphere") return [];
    return stroke.points.map(strokePointToGeo).filter(Boolean);
  });
  if (!geoPoints.length) return null;

  const vector = geoPoints.reduce(
    (sum, geoPoint) => {
      const lon = degreesToRadians(geoPoint.lon);
      const lat = degreesToRadians(geoPoint.lat);
      const cosLat = Math.cos(lat);
      return {
        x: sum.x + Math.sin(lon) * cosLat,
        y: sum.y + Math.sin(lat),
        z: sum.z + Math.cos(lon) * cosLat,
      };
    },
    { x: 0, y: 0, z: 0 },
  );
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!length) return null;

  const geo = normalizeGeo(
    radiansToDegrees(Math.atan2(vector.x / length, vector.z / length)),
    radiansToDegrees(Math.asin(clamp(vector.y / length, -1, 1))),
  );
  const radiusDeg = geoPoints.reduce(
    (maxDistance, point) => Math.max(maxDistance, angularDistanceDeg(geo.lat, geo.lon, point.lat, point.lon)),
    0,
  );

  return {
    geo,
    radiusDeg,
  };
}

function getMarsReferenceContext(geo) {
  const ranked = getMarsReferenceFeatures().map((feature) => ({
    ...feature,
    distanceDeg: angularDistanceDeg(geo.lat, geo.lon, feature.lat, feature.lon),
  })).sort((a, b) => a.distanceDeg - b.distanceDeg);

  const likely = ranked.filter((feature) => feature.distanceDeg <= feature.radiusDeg).slice(0, 5);
  const nearby = ranked.slice(0, 8);
  const displayList = (likely.length ? likely : nearby.slice(0, 3))
    .map((feature) => `${feature.name}(${feature.kind}) ${feature.distanceDeg.toFixed(1)}도 거리`)
    .join(", ");

  return {
    likely,
    nearby,
    displayText: `MOLA/IAU 기준 가까운 지형 후보: ${displayList}.`,
    promptText: buildMarsReferencePrompt(likely, nearby),
  };
}

function getMarsReferenceFeatures() {
  const merged = new Map();
  MARS_FEATURE_REFERENCES.forEach((feature) => merged.set(normalizeMarsFeatureKey(feature.name), feature));
  MARS_OFFICIAL_FEATURE_REFERENCES.forEach((feature) => merged.set(normalizeMarsFeatureKey(feature.name), feature));
  return Array.from(merged.values());
}

function normalizeMarsFeatureKey(name) {
  return name.replace(/\s+Crater$/i, "").trim();
}

function buildMarsReferencePrompt(likely, nearby) {
  const likelyLines = likely.length
    ? likely.map(formatMarsFeatureLine)
    : ["표시 좌표가 주요 기준 지형의 중심/대표 범위 안에 명확히 들어오지 않습니다."];
  const nearbyLines = nearby.map(formatMarsFeatureLine);

  return [
    "화성 지형명 검증용 기준:",
    `참고 기준: ${MARS_REFERENCE_SOURCES.join("; ")}.`,
    "아래 좌표 후보와 첨부 이미지의 실제 모양, 색, 밝기, 고도, 원형 분지, 협곡 방향, 화산 윤곽을 함께 비교하세요.",
    "가까운 후보에 없는 유명 지형명은 말하지 마세요.",
    "표시점과 후보 중심의 거리, 후보별 매칭 반경, 실제 모양이 모두 맞을 때만 '~ 부근으로 추정'이라고 말하세요.",
    "맞지 않으면 지형명 대신 '정확한 지명은 단정하기 어렵다'고 말하고, 보이는 지형 유형만 설명하세요.",
    "공식 지형명 후보가 맞으면 공식 영문명, 쉬운 한글 표기, 이름이 붙은 이유(고전 알베도 지형명인지, 인물/지명/탐사 임무를 기린 이름인지)를 짧게 풀어 설명하세요.",
    "중간 또는 어려움 단계라면 공식 지형명 후보의 대략적 크기(직경/폭/길이/높이 중 알맞은 것)와 실제 착륙지·과거 착륙 후보지·탐사선 주요 탐사 대상 여부를 확실한 범위에서 함께 설명하세요.",
    "착륙 후보지나 탐사선 관련 여부가 확실하지 않으면 추측하지 말고, 확인되는 대표 기록은 찾기 어렵다고 말하세요.",
    "가까운 후보가 여러 개라면 가장 가까운 1개를 중심으로 말하고, 모양이 애매하면 '후보'라고 분명히 표현하세요.",
    `가까운 후보: ${likelyLines.join(" / ")}`,
    `주변 참고 지형: ${nearbyLines.join(" / ")}`,
  ].join("\n");
}

function formatMarsFeatureLine(feature) {
  const origin = feature.origin ? `, 이름 유래: ${feature.origin}` : "";
  const radius = feature.radiusDeg ? `, 매칭 반경 약 ${feature.radiusDeg.toFixed(1)}도` : "";
  return `${feature.name} (${feature.kind}, 대표좌표 ${formatLat(feature.lat)} ${formatLon(feature.lon)}, 표시점과 ${feature.distanceDeg.toFixed(1)}도${radius}${origin}, 시각 단서: ${feature.clue})`;
}

function getMoonReferenceContext(geo) {
  const ranked = getMoonReferenceFeatures().map((feature) => ({
    ...feature,
    distanceDeg: angularDistanceDeg(geo.lat, geo.lon, feature.lat, feature.lon),
  })).sort((a, b) => a.distanceDeg - b.distanceDeg);

  const likely = ranked.filter((feature) => feature.distanceDeg <= feature.radiusDeg).slice(0, 5);
  const nearby = ranked.slice(0, 8);
  const displayList = (likely.length ? likely : nearby.slice(0, 3))
    .map((feature) => `${feature.name}(${feature.kind}) ${feature.distanceDeg.toFixed(1)}도 거리`)
    .join(", ");

  return {
    likely,
    nearby,
    displayText: `IAU/USGS 기준 가까운 달 지형 후보: ${displayList}.`,
    promptText: buildMoonReferencePrompt(likely, nearby),
  };
}

function getMoonReferenceFeatures() {
  const merged = new Map();
  MOON_FEATURE_REFERENCES.forEach((feature) => merged.set(feature.name, feature));
  MOON_CRATER_REFERENCES.forEach((feature) => merged.set(feature.name, feature));
  return Array.from(merged.values());
}

function buildMoonReferencePrompt(likely, nearby) {
  const likelyLines = likely.length
    ? likely.map(formatMoonFeatureLine)
    : ["표시 좌표가 대표 달 지형의 중심/대표 범위 안에 명확히 들어오지 않습니다."];
  const nearbyLines = nearby.map(formatMoonFeatureLine);

  return [
    "달 지형명 검증용 기준:",
    `참고 기준: ${MOON_REFERENCE_SOURCES.join("; ")}.`,
    "아래 좌표 후보와 첨부 이미지의 실제 색상, 밝기, 고도 무늬, 원형 테두리, 광조, 바닥 밝기를 함께 비교하세요.",
    "가까운 후보에 없는 유명 지형명은 말하지 마세요.",
    "표시점과 후보 중심의 거리, 후보별 매칭 반경, 실제 모양이 모두 맞을 때만 '~ 부근으로 추정'이라고 말하세요.",
    "맞지 않으면 지형명 대신 '정확한 지명은 단정하기 어렵다'고 말하고, 보이는 지형 유형만 설명하세요.",
    "명명 크레이터가 맞는 후보라면 공식 영문명, 쉬운 한글 표기, 이름이 붙은 이유(누구/무엇을 기린 이름인지)를 어린이에게 짧게 풀어 설명하세요.",
    "중간 또는 어려움 단계라면 공식 지형명 후보의 대략적 크기(직경/폭/길이/높이 중 알맞은 것)와 실제 착륙지·과거 착륙 후보지·탐사선 주요 탐사 대상 여부를 확실한 범위에서 함께 설명하세요.",
    "착륙 후보지나 탐사선 관련 여부가 확실하지 않으면 추측하지 말고, 확인되는 대표 기록은 찾기 어렵다고 말하세요.",
    "가까운 후보가 여러 개라면 가장 가까운 1개를 중심으로 말하고, 모양이 애매하면 '후보'라고 분명히 표현하세요.",
    "달의 '바다'는 액체 물의 바다가 아니라 오래전에 용암이 굳어 만들어진 어두운 현무암 평원이라고 어린이에게 쉽게 설명하세요.",
    `가까운 후보: ${likelyLines.join(" / ")}`,
    `주변 참고 지형: ${nearbyLines.join(" / ")}`,
  ].join("\n");
}

function formatMoonFeatureLine(feature) {
  const origin = feature.origin ? `, 이름 유래: ${feature.origin}` : "";
  const radius = feature.radiusDeg ? `, 매칭 반경 약 ${feature.radiusDeg.toFixed(1)}도` : "";
  return `${feature.name} (${feature.kind}, 대표좌표 ${formatLat(feature.lat)} ${formatLon(feature.lon)}, 표시점과 ${feature.distanceDeg.toFixed(1)}도${radius}${origin}, 시각 단서: ${feature.clue})`;
}

function getStrokeBounds() {
  const points = state.strokes.flatMap((stroke) => {
    if (stroke.mode !== state.viewMode) return [];
    return stroke.points.map((point) => strokePointToScreen(point, stroke.mode)).filter(Boolean);
  });
  if (!points.length) return null;

  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    },
  );
}

async function buildAnalysisImage(selection) {
  if (selection.type === "rover") {
    return buildRoverAnalysisImage();
  }

  const body = bodies[state.bodyKey];
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const base = await loadImage(body.aiMap);
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

  if (body.aiElevation && state.elevationOpacity > 0.01) {
    const elevation = await loadImage(body.aiElevation);
    ctx.save();
    ctx.globalAlpha = Math.min(0.48, state.elevationOpacity * 0.7);
    ctx.globalCompositeOperation = "screen";
    ctx.filter = "contrast(1.35) brightness(1.1)";
    ctx.drawImage(elevation, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawAnalysisMarks(ctx, canvas.width, canvas.height, selection);
  return {
    base64: canvas.toDataURL("image/jpeg", 0.78).split(",")[1],
  };
}

async function buildRoverAnalysisImage() {
  const img = await loadImage(roverImages[state.roverIndex]);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round(1024 * (img.height / img.width));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  drawAnalysisMarks(ctx, canvas.width, canvas.height, {
    type: "rover",
  });
  return {
    base64: canvas.toDataURL("image/jpeg", 0.8).split(",")[1],
  };
}

function drawAnalysisMarks(ctx, width, height, selection) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 40, 32, 0.98)";
  ctx.lineWidth = Math.max(6, width * 0.008);
  ctx.shadowColor = "rgba(255, 255, 255, 0.82)";
  ctx.shadowBlur = 4;

  state.strokes.forEach((stroke) => {
    if (stroke.mode !== state.viewMode) return;
    let started = false;
    let previous = null;
    ctx.beginPath();

    stroke.points.forEach((point) => {
      const mapped = mapStrokePointToAnalysis(point, width, height, selection.type, stroke.mode);
      if (!mapped) {
        started = false;
        previous = null;
        return;
      }

      if (!started || (previous && Math.abs(mapped.x - previous.x) > width * 0.5)) {
        ctx.moveTo(mapped.x, mapped.y);
        started = true;
      } else {
        ctx.lineTo(mapped.x, mapped.y);
      }
      previous = mapped;
    });

    ctx.stroke();
  });

  ctx.restore();
}

function mapStrokePointToAnalysis(point, width, height, type, mode = state.viewMode) {
  if (mode === "sphere") {
    const geo = strokePointToGeo(point);
    if (!geo) return null;
    const uv = geoToUv(geo.lon, geo.lat);
    return {
      x: uv.u * width,
      y: uv.v * height,
    };
  }

  const screenPoint = strokePointToScreen(point, mode);
  return screenPoint ? mapPointToAnalysis(screenPoint, width, height, type) : null;
}

function mapPointToAnalysis(point, width, height, type) {
  if (type === "rover") {
    const rect = getDisplayedImageRect("rover");
    if (!pointInRect(point, rect)) return null;
    return {
      x: ((point.x - rect.x) / rect.width) * width,
      y: ((point.y - rect.y) / rect.height) * height,
    };
  }

  if (state.viewMode === "sphere") {
    const geo = spherePointToGeo(point.x, point.y);
    if (!geo) return null;
    const uv = geoToUv(geo.lon, geo.lat);
    return {
      x: uv.u * width,
      y: uv.v * height,
    };
  }

  const rect = getDisplayedImageRect("flat");
  if (!pointInRect(point, rect)) return null;
  return {
    x: ((point.x - rect.x) / rect.width) * width,
    y: ((point.y - rect.y) / rect.height) * height,
  };
}

function buildAnalysisPrompt(selection) {
  const body = bodies[state.bodyKey];
  const answerLevel = getActiveAnswerLevel();

  if (selection.type === "rover") {
    return [
      `학생이 화성 퍼서비어런스 로버 사진에서 빨간 표시를 한 영역을 분석해 주세요.`,
      selection.description,
      answerLevel.instruction,
      answerLevel.responseDetail,
      "사진 속 암석, 모래, 층리, 자갈, 균열처럼 보이는 특징을 중심으로 설명해 주세요.",
      `답변에는 1) 무엇처럼 보이는지, 2) 답변 단계에 맞는 관찰 근거, 3) 그 지형이나 암석이 생겼을 가능성, 4) 화성 지질학에서 왜 흥미로운지, 5) ${answerLevel.audience}이 기억할 쉬운 비유, 6) 다음 관찰 질문 하나를 포함해 주세요.`,
      FINAL_RESPONSE_RULES,
    ].join("\n");
  }

  return [
    `학생이 ${body.name} 전체 지도에서 빨간 표시를 한 영역을 분석해 주세요.`,
    selection.description,
    answerLevel.instruction,
    answerLevel.responseDetail,
    "첨부 이미지는 고해상도 원본을 1024px 폭으로 줄인 전체 지도이며, 학생이 그린 표시가 빨간색으로 들어 있습니다.",
    body.key === "moon"
      ? "달 지도는 색상 지도와 고도 지도를 같은 좌표계로 겹친 것입니다. 밝기와 고도 차이를 함께 참고하고, 공식 지형명 후보가 맞으면 이름의 유래까지 설명해 주세요."
      : "화성 지도에서는 화산, 협곡, 충돌구, 극지방 얼음, 어두운 평원 같은 큰 지형 단서를 참고하고, 공식 지형명 후보가 맞으면 이름의 유래까지 설명해 주세요.",
    body.key === "mars" && selection.marsReference
      ? selection.marsReference.promptText
      : "",
    body.key === "moon" && selection.moonReference
      ? selection.moonReference.promptText
      : "",
    body.key === "mars"
      ? "물, 강, 바다, 생명 흔적에 대한 설명은 특히 조심하세요. 전역 지도에서 어둡거나 길쭉한 무늬만 보인다고 물이 흘렀다고 단정하지 마세요. 다만 계곡망, 삼각주, 하천형 수로, 퇴적층처럼 물과 관련된 지형 근거가 보이면 '몇몇 과학자들은 이곳에 과거 물이 흘렀을 것으로 추정합니다'라고 표현하세요. 현재 물이 흐른다는 뜻으로 말하지 말고, 반드시 '과거'와 '추정'을 함께 사용하세요."
      : "",
    "답변에는 1) 표시한 곳의 지형 추정, 2) 답변 단계에 맞는 관찰 근거, 3) 지형이 만들어진 과정, 4) 과학적으로 중요한 점, 5) 쉬운 비유, 6) 더 살펴볼 질문 하나를 포함해 주세요.",
    FINAL_RESPONSE_RULES,
  ].join("\n");
}

async function askGemini(prompt, imageBase64) {
  const payload = {
    system_instruction: {
      parts: [
        {
          text: getSystemPrompt(),
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.56,
      topP: 0.9,
      maxOutputTokens: 3400,
    },
  };

  const errors = [];

  const activeModelIds = getActiveModelIds();

  for (const model of activeModelIds) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const rawMessage = data.error?.message || "Gemini API 응답을 받지 못했어요.";
      errors.push(`${model}: ${rawMessage}`);

      if (/api key/i.test(rawMessage)) {
        throw new Error("API 키가 맞지 않아요. 선생님께 받은 특별 링크를 다시 확인해 주세요.");
      }

      if (/not found|not supported|not available|permission/i.test(rawMessage) && model !== activeModelIds[activeModelIds.length - 1]) {
        continue;
      }

      throw new Error(formatGeminiError(errors));
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      errors.push(`${model}: AI가 빈 답변을 보냈어요.`);
      continue;
    }

    return cleanAiAnswer(answer);
  }

  throw new Error(formatGeminiError(errors));
}

function cleanAiAnswer(answer) {
  let cleaned = answer.trim();
  const leakedPlanningPatterns = [
    /30-year veteran/i,
    /30-year expert/i,
    /10-year-old elementary/i,
    /Tone Check/i,
    /Constraint Check/i,
    /Target Point/i,
    /Candidate:/i,
    /Candidates:/i,
    /Visual Inspection/i,
    /Conclusion:/i,
    /Paragraph\s*\d/i,
    /Terrain Guess/i,
    /Observation Evidence/i,
    /Formation Process/i,
    /Scientific Importance/i,
    /Easy Analogy/i,
    /Follow-up Question/i,
    /Name Origin/i,
    /\bIntro:/i,
    /\bPara\s*\d/i,
    /Technical terms explained/i,
    /Structure followed/i,
    /Friendly\/easy\/scientific/i,
    /No internal notes/i,
    /Image:\s*A global/i,
    /Coordinates of the red circle/i,
    /Section\s+\d/i,
    /Formatting:/i,
  ];

  if (leakedPlanningPatterns.some((pattern) => pattern.test(cleaned))) {
    cleaned = stripLeakedPlanningLines(cleaned);
    const finalAnswerStart = findFinalKoreanAnswerStart(cleaned);
    if (finalAnswerStart > 0) {
      cleaned = cleaned.slice(finalAnswerStart).trim();
    }
  }
  cleaned = stripLeakedPlanningLines(cleaned);

  const trailingNotesStart = cleaned.search(
    /\n\s*\*\s*(?:30-year|10-year|Friendly|Estimated|No NASA|No internal|Short paragraphs|Technical terms|Structure followed|Paragraph\s*\d|Scientific Importance|Easy Analogy|Follow-up Question)/i,
  );
  if (trailingNotesStart > 0) {
    cleaned = cleaned.slice(0, trailingNotesStart).trim();
  }

  return cleaned
    .replace(/30년 동안 달과 화성을 연구한 박사님/g, "달·화성 전문가 AI")
    .replace(/NASA 지질학자 AI/g, "달·화성 전문가 AI")
    .replace(/NASA 행성 지질학자/g, "달·화성 전문가 AI")
    .trim();
}

function stripLeakedPlanningLines(text) {
  const structuralLabelPattern =
    /(?:paragraph|para|section)\s*\d|terrain guess|observation evidence|formation process|scientific importance|easy analogy|follow-up question|name origin|final answer|constraint check|tone check|visual inspection|target point|candidate/i;
  const leadingLabelPattern =
    /^\s*(?:[-*+]\s*)?(?:[*_`#>\s]*)*(?:(?:Paragraph|Para|Section)\s*\d+\s*[:.)-]\s*)?(?:Terrain Guess|Observation Evidence|Formation Process|Scientific Importance|Easy Analogy|Follow-up Question|Name Origin|Final Answer|Conclusion|Intro|Answer|Response)\.?\s*(?:[*_`#>\s]*)*[:.)-]?\s*/i;

  return text
    .split("\n")
    .map((line) => {
      const compactLine = line.trim();
      if (!/[가-힣]/.test(compactLine) && structuralLabelPattern.test(compactLine)) {
        return "";
      }
      const withoutLabel = line.replace(leadingLabelPattern, "");
      return withoutLabel.trim();
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findFinalKoreanAnswerStart(text) {
  const explicitStart = text.search(
    /(?:^|\n)\s*(안녕|안녕하세요|좋아요|좋아|멋진|탐험가|친구가|네가|표시한 곳|이곳은|우리 친구|이번에|와[!！]?|\*\*1\.|1\.\s*[가-힣])/m,
  );
  if (explicitStart > 0) return explicitStart;

  let offset = 0;
  const lines = text.split("\n");
  for (const line of lines) {
    const compactLine = line.trim();
    if (/^(?:[#*\-\d.()\s]*)[가-힣]/.test(compactLine)) {
      return offset + line.indexOf(compactLine);
    }
    offset += line.length + 1;
  }

  return -1;
}

function formatGeminiError(errors) {
  const detail = errors.length ? `\n\n시도한 모델: ${errors.join(" / ")}` : "";
  return `현재 Gemini 모델을 사용할 수 없어요. API 키가 Google AI Studio의 Gemini API 키인지, 그리고 사용 가능한 지역/프로젝트인지 확인해 주세요.${detail}`;
}

async function submitFollowup(event) {
  event.preventDefault();
  const question = els.followupInput.value.trim();
  if (!question) return;

  if (!state.lastAnalysis) {
    showToast("먼저 지도에서 전문가 분석을 받아 주세요.");
    return;
  }

  els.followupInput.value = "";
  const questionCard = appendAnswerCard(`학생 질문`, question);
  scrollAnswerCardToTop(questionCard);
  setLoading(true, "AI 전문가가 추가 질문을 생각하고 있어요...");

  try {
    const answerLevel = getActiveAnswerLevel();
    const prompt = [
      "아래는 같은 지도 또는 사진 표시 영역에 대한 학생의 추가 질문입니다.",
      `이전 분석: ${state.lastAnalysis.answer}`,
      `학생 질문: ${question}`,
      answerLevel.instruction,
      `이전 맥락을 이어서 ${answerLevel.audience}에게 쉽고 친절하게 답하세요. ${answerLevel.followupDetail}`,
      FINAL_RESPONSE_RULES,
    ].join("\n");
    const answer = await askGemini(prompt, state.lastAnalysis.imageBase64);
    const answerCard = appendAnswerCard("전문가 답변", answer);
    scrollAnswerCardToTop(answerCard);
    state.lastAnalysis.answer = `${state.lastAnalysis.answer}\n\n학생 질문: ${question}\n${answer}`;
    saveHistory({
      bodyKey: state.lastAnalysis.bodyKey,
      mode: state.lastAnalysis.viewMode,
      question,
      answer,
      details: state.lastAnalysis.selection.description,
      answerLevelKey: state.selectedAnswerLevelKey,
      createdAt: Date.now(),
    });
    try {
      await appendFollowupToArchive(question, answer);
    } catch (archiveError) {
      showToast(`이어지는 질문 저장 중 문제가 생겼어요: ${archiveError.message}`);
    }
  } catch (error) {
    const errorCard = appendAnswerCard("전문가 답변", `추가 답변 중 문제가 생겼어요.\n\n${error.message}`);
    scrollAnswerCardToTop(errorCard);
  } finally {
    setLoading(false);
  }
}

async function submitArchiveFollowup(event) {
  event.preventDefault();
  const question = els.archiveFollowupInput.value.trim();
  if (!question) return;

  if (!apiKey) {
    els.keyGate.classList.remove("hidden");
    return;
  }

  const record = state.currentArchiveRecord;
  if (!record?.id) {
    showToast("먼저 아카이브 항목을 열어 주세요.");
    return;
  }

  els.archiveFollowupInput.value = "";
  els.archiveFollowupBtn.disabled = true;
  appendArchiveSection("이어지는 질문", question);
  setLoading(true, "AI 전문가가 아카이브 대화를 이어 읽고 있어요...");

  try {
    const imageBase64 = await getArchiveImageBase64(record);
    const answerLevel = getActiveAnswerLevel();
    const prompt = [
      "아래는 저장된 달·화성 탐사 아카이브의 기존 대화입니다.",
      archiveMessagesToPromptText(record),
      `학생의 이어지는 질문: ${question}`,
      answerLevel.instruction,
      `기존 아카이브의 사진과 대화 맥락을 이어서 ${answerLevel.audience}에게 쉽고 친절하게 답하세요. ${answerLevel.followupDetail}`,
      FINAL_RESPONSE_RULES,
    ].join("\n\n");
    const answer = await askGemini(prompt, imageBase64);
    const updatedRecord = addFollowupMessagesToRecord(record, question, answer);
    updatedRecord.imageBase64 = imageBase64;
    await saveArchiveRecord(updatedRecord);
    renderArchiveDetail(updatedRecord);
    requestAnimationFrame(() => {
      els.archiveDetailPage.scrollTop = els.archiveDetailPage.scrollHeight;
    });
  } catch (error) {
    appendArchiveSection("답변", `추가 답변 중 문제가 생겼어요.\n\n${error.message}`);
  } finally {
    els.archiveFollowupBtn.disabled = false;
    setLoading(false);
  }
}

function showAnswer(selection, answer, imageBase64) {
  const cleanedAnswer = cleanAiAnswer(answer);
  els.answerBody.innerHTML = "";
  resetAnswerScroll();
  if (imageBase64) {
    appendAnswerPreview(imageBase64, selection.title);
  }
  appendAnswerCard(selection.title, selection.description);
  appendAnswerCard("전문가 답변", cleanedAnswer);
  openModal("answerModal");
  resetAnswerScroll();
}

function appendAnswerPreview(imageBase64, title) {
  const card = document.createElement("div");
  card.className = "answer-preview";

  const label = document.createElement("strong");
  label.textContent = "표시한 위치 이미지";

  const note = document.createElement("span");
  note.textContent = title;

  const image = document.createElement("img");
  image.src = `data:image/jpeg;base64,${imageBase64}`;
  image.alt = "학생이 표시한 지도 또는 로버 사진";

  card.append(label, note, image);
  els.answerBody.append(card);
}

function appendAnswerCard(title, text) {
  const card = document.createElement("div");
  card.className = "answer-card";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const body = document.createElement("div");
  body.textContent = /답변/.test(title) ? cleanAiAnswer(text) : text;
  card.append(strong, body);
  els.answerBody.append(card);
  return card;
}

function scrollAnswerCardToTop(card) {
  if (!card) return;
  const alignToCard = () => {
    const containerRect = els.answerBody.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    els.answerBody.scrollTop = Math.max(0, els.answerBody.scrollTop + cardRect.top - containerRect.top);
  };
  alignToCard();
  requestAnimationFrame(alignToCard);
}

function resetAnswerScroll() {
  els.answerBody.scrollTop = 0;
  requestAnimationFrame(() => {
    els.answerBody.scrollTop = 0;
  });
}

function openHistory() {
  renderHistory();
  openModal("historyModal");
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (!state.history.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "아직 저장된 탐사 대화가 없어요. 지도에서 동그라미를 그리고 분석을 요청해 보세요.";
    els.historyList.append(empty);
    return;
  }

  state.history.forEach((item) => {
    const body = bodies[item.bodyKey] || bodies.moon;
    const article = document.createElement("article");
    article.className = "history-item";
    article.innerHTML = `
      <div class="history-meta">${body.emoji} ${body.name} · ${formatDate(item.createdAt)}</div>
      <p class="history-question"></p>
      <p class="history-preview"></p>
    `;
    article.querySelector(".history-question").textContent = item.question;
    const cleanedAnswer = cleanAiAnswer(item.answer || "");
    article.querySelector(".history-preview").textContent = cleanedAnswer.slice(0, 170) + (cleanedAnswer.length > 170 ? "..." : "");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "soft-button";
    button.textContent = "다시 보기";
    button.addEventListener("click", () => {
      els.answerBody.innerHTML = "";
      resetAnswerScroll();
      appendAnswerCard(item.question, item.details || "");
      appendAnswerCard("저장된 답변", cleanedAnswer);
      closeModal("historyModal");
      openModal("answerModal");
      resetAnswerScroll();
    });

    article.append(button);
    els.historyList.append(article);
  });
}

function saveHistory(item) {
  const cleanedItem = {
    ...item,
    answer: cleanAiAnswer(item.answer || ""),
  };
  state.history = [cleanedItem, ...state.history].slice(0, 30);
}

function clearHistory() {
  state.history = [];
  renderHistory();
  showToast("탐사 기록을 비웠어요.");
}

function createArchiveRecord({ bodyKey, mode, selection, answer, imageBase64, answerLevelKey, createdAt }) {
  const body = bodies[bodyKey] || bodies.moon;
  const userName = state.userName || "인천대원";
  const archiveId = createArchiveId(createdAt);
  const fileBaseName = createArchiveBaseName(userName, createdAt);
  const cleanedAnswer = cleanAiAnswer(answer || "");

  return {
    id: archiveId,
    userName,
    createdAt,
    updatedAt: createdAt,
    bodyKey,
    bodyName: body.name,
    mode,
    modeLabel: getViewModeLabel(mode),
    title: selection.title,
    details: selection.description,
    answerLevelKey,
    fileBaseName,
    markdownName: `${fileBaseName}.md`,
    imageName: `${fileBaseName}.jpg`,
    imagePath: getSupabaseArchiveImagePath({ id: archiveId, imageName: `${fileBaseName}.jpg` }),
    imageBase64,
    messages: [
      {
        role: "question",
        label: "질문",
        text: `${selection.title}\n\n${selection.description}`,
        createdAt,
      },
      {
        role: "answer",
        label: "답변",
        text: cleanedAnswer,
        createdAt,
      },
    ],
  };
}

async function appendFollowupToArchive(question, answer) {
  const archiveId = state.lastAnalysis?.archiveId;
  if (!archiveId) return;

  const record = state.currentArchiveRecord?.id === archiveId
    ? state.currentArchiveRecord
    : await getArchiveRecord(archiveId);

  if (!record) return;

  addFollowupMessagesToRecord(record, question, answer);
  state.currentArchiveRecord = record;
  await saveArchiveRecord(record);
}

function addFollowupMessagesToRecord(record, question, answer) {
  const createdAt = Date.now();
  record.messages = getArchiveMessages(record);
  record.messages.push(
    {
      role: "followupQuestion",
      label: "이어지는 질문",
      text: question,
      createdAt,
    },
    {
      role: "answer",
      label: "답변",
      text: cleanAiAnswer(answer || ""),
      createdAt,
    },
  );
  record.updatedAt = createdAt;
  return record;
}

async function saveArchiveRecord(record) {
  let archiveRecord = {
    ...record,
    markdown: buildArchiveMarkdown(record),
  };

  let supabaseSaved = false;
  let supabaseWarning = null;
  let supabaseError = null;

  try {
    const supabaseRecord = await saveSupabaseArchiveRecord(archiveRecord);
    archiveRecord = {
      ...archiveRecord,
      ...supabaseRecord,
      imageBase64: archiveRecord.imageBase64,
      markdown: archiveRecord.markdown,
    };
    if (supabaseRecord.supabaseImageError) {
      supabaseWarning = `사진 저장 실패: ${supabaseRecord.supabaseImageError}`;
    }
    supabaseSaved = true;
  } catch (error) {
    supabaseError = error;
    console.warn("Supabase archive save failed:", error);
  }

  if (!supabaseSaved) {
    throw supabaseError || new Error("저장소를 사용할 수 없어요.");
  }

  if (!supabaseSaved && supabaseError) {
    showToast(`Supabase 저장 실패: ${supabaseError.message}`);
  } else if (supabaseWarning) {
    showToast(`Supabase ${supabaseWarning}`);
  }

  state.currentArchiveRecord = archiveRecord;
  return archiveRecord;
}

async function openArchiveScreen() {
  closeAllModals();
  els.selectionScreen.classList.add("hidden");
  els.exploreScreen.classList.add("hidden");
  els.archiveScreen.classList.remove("hidden");
  showArchiveListPage();

  els.archiveList.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "archive-empty";
  loading.textContent = "아카이브를 불러오고 있어요...";
  els.archiveList.append(loading);

  try {
    const records = await loadArchiveRecords();
    renderArchiveList(records);
  } catch (error) {
    els.archiveList.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "archive-empty";
    empty.textContent = `아카이브를 불러오지 못했어요. ${error.message}`;
    els.archiveList.append(empty);
  }
}

function showArchiveListPage() {
  els.archiveListPage.classList.remove("hidden");
  els.archiveDetailPage.classList.add("hidden");
  els.archiveFollowupInput.value = "";
  state.currentArchiveRecord = null;
}

function renderArchiveList(records) {
  els.archiveList.innerHTML = "";

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "archive-empty";
    empty.textContent = "아직 저장된 질문이 없어요. 지도를 표시하고 전문가 분석을 요청해 보세요.";
    els.archiveList.append(empty);
    return;
  }

  records.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "archive-list-item";
    button.addEventListener("click", () => openArchiveDetail(record.id));

    const name = document.createElement("strong");
    name.textContent = `${record.userName || "인천대원"} 대원`;

    const date = document.createElement("span");
    date.className = "archive-list-date";
    date.textContent = formatFullDate(record.createdAt);

    const title = document.createElement("span");
    title.className = "archive-list-title";
    title.textContent = record.title || record.question || "저장된 질문";

    button.append(name, date, title);
    els.archiveList.append(button);
  });
}

async function openArchiveDetail(id) {
  els.archiveDetailBody.innerHTML = "";
  els.archiveDetailMeta.textContent = "불러오는 중...";
  els.archiveDetailTitle.textContent = "";
  els.archiveListPage.classList.add("hidden");
  els.archiveDetailPage.classList.remove("hidden");

  try {
    const record = await getArchiveRecord(id);
    renderArchiveDetail(record);
  } catch (error) {
    els.archiveDetailMeta.textContent = "";
    els.archiveDetailTitle.textContent = "아카이브를 열 수 없어요";
    appendArchiveSection("오류", error.message);
  }
}

function renderArchiveDetail(record) {
  state.currentArchiveRecord = record;
  const userName = record.userName || "인천대원";
  els.archiveDetailMeta.textContent = `${userName} 대원 · ${formatFullDate(record.createdAt)}`;
  els.archiveDetailTitle.textContent = record.title || "저장된 질문";
  els.archiveDetailBody.innerHTML = "";

  appendArchiveSection("이름", `${userName} 대원`);
  appendArchiveSection("날짜", formatFullDate(record.createdAt));

  const imageSrc = getArchiveImageSrc(record);
  if (imageSrc) {
    const section = document.createElement("section");
    section.className = "archive-detail-section archive-photo-section";
    const title = document.createElement("h3");
    title.textContent = "사진";
    const image = document.createElement("img");
    image.src = imageSrc;
    image.alt = "질문 시 저장된 저화질 사진";
    section.append(title, image);
    els.archiveDetailBody.append(section);
  }

  getArchiveMessages(record).forEach((message) => {
    appendArchiveSection(message.label || getMessageLabel(message.role), message.text || "");
  });
}

function appendArchiveSection(title, text) {
  const section = document.createElement("section");
  section.className = "archive-detail-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const body = document.createElement("div");
  body.textContent = text;
  section.append(heading, body);
  els.archiveDetailBody.append(section);
}

async function loadArchiveRecords() {
  let supabaseError = null;
  const supabaseResult = await fetchSupabaseArchiveList().catch((error) => {
    supabaseError = error;
    console.warn("Supabase archive list load failed:", error);
    return null;
  });
  const merged = new Map();

  [supabaseResult].forEach((records) => {
    if (!Array.isArray(records)) return;
    normalizeArchiveRecords(records).forEach((record) => {
      if (record.id) merged.set(record.id, record);
    });
  });

  if (supabaseError) {
    showToast(`Supabase 불러오기 실패: ${supabaseError.message}`);
  }

  return Array.from(merged.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function getArchiveRecord(id) {
  const supabaseRecord = await fetchSupabaseArchiveDetail(id).catch(() => null);
  if (supabaseRecord) return normalizeArchiveRecord(supabaseRecord);

  throw new Error("저장된 항목을 찾지 못했어요.");
}

function getArchiveMessages(record) {
  if (Array.isArray(record.messages) && record.messages.length) {
    return record.messages;
  }

  return [
    {
      role: "question",
      label: "질문",
      text: [record.question || record.title, record.details].filter(Boolean).join("\n\n"),
      createdAt: record.createdAt,
    },
    {
      role: "answer",
      label: "답변",
      text: record.answer || "",
      createdAt: record.createdAt,
    },
  ];
}

function getMessageLabel(role) {
  if (role === "followupQuestion") return "이어지는 질문";
  if (role === "answer") return "답변";
  return "질문";
}

function getArchiveImageSrc(record) {
  if (record.imageBase64) return `data:image/jpeg;base64,${record.imageBase64}`;
  if (record.imageUrl) return resolveArchiveAssetUrl(record.imageUrl);
  if (record.imageName) return resolveArchiveAssetUrl(`archives/${record.imageName}`);
  return "";
}

async function getArchiveImageBase64(record) {
  if (record.imageBase64) return record.imageBase64;
  const imageUrl = getArchiveImageSrc(record);
  if (!imageUrl) {
    throw new Error("아카이브에 저장된 사진을 찾을 수 없어요.");
  }

  const response = await fetch(imageUrl, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("아카이브 사진을 다시 불러오지 못했어요.");
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  const base64 = dataUrl.split(",")[1] || "";
  if (!base64) {
    throw new Error("아카이브 사진을 AI가 읽을 수 있는 형식으로 바꾸지 못했어요.");
  }
  record.imageBase64 = base64;
  return base64;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("이미지 변환에 실패했어요."));
    reader.readAsDataURL(blob);
  });
}

function archiveMessagesToPromptText(record) {
  return getArchiveMessages(record)
    .map((message) => `${message.label || getMessageLabel(message.role)}: ${message.text || ""}`)
    .join("\n\n");
}

function buildArchiveMarkdown(record) {
  const messages = getArchiveMessages(record);
  const imageLine = record.imageName ? `![첨부 사진](./${record.imageName})` : "";
  const lines = [
    `# ${record.userName || "인천대원"} 질문 아카이브`,
    "",
    `- 이름: ${record.userName || "인천대원"} 대원`,
    `- 날짜/시간: ${formatFullDate(record.createdAt)}`,
    `- 천체: ${record.bodyName || ""}`,
    `- 보기: ${record.modeLabel || getViewModeLabel(record.mode)}`,
    record.imageName ? `- 사진 파일: ${record.imageName}` : "",
    "",
    imageLine,
    "",
  ].filter((line) => line !== "");

  messages.forEach((message, index) => {
    const heading = message.role === "followupQuestion"
      ? `## 이어지는 질문 ${countPreviousMessages(messages, index, "followupQuestion") + 1}`
      : message.role === "answer" && hasPreviousFollowup(messages, index)
        ? `## 답변 ${countPreviousMessages(messages, index, "answer")}`
        : `## ${message.label || getMessageLabel(message.role)}`;
    lines.push(heading, "", message.text || "", "");
  });

  return lines.join("\n").trim() + "\n";
}

function countPreviousMessages(messages, index, role) {
  return messages.slice(0, index).filter((message) => message.role === role).length;
}

function hasPreviousFollowup(messages, index) {
  return messages.slice(0, index).some((message) => message.role === "followupQuestion");
}

function createArchiveBaseName(userName, createdAt) {
  return `${sanitizeFilePart(userName || "인천대원")}_${formatArchiveTimestamp(createdAt)}`;
}

function createArchiveId(createdAt) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function sanitizeFilePart(value) {
  const cleaned = sanitizeUserName(value).replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  return cleaned || "인천대원";
}

function formatArchiveTimestamp(value) {
  const date = new Date(value || Date.now());
  const pad = (number) => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("") + "_" + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");
}

function getViewModeLabel(mode) {
  if (mode === "sphere") return "구형";
  if (mode === "flat") return "평면지도";
  if (mode === "rover") return "로버 사진";
  return "지도";
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

function getSupabaseRestUrl(pathAndQuery = "") {
  return `${SUPABASE_URL}/rest/v1/${pathAndQuery}`;
}

function getSupabaseStorageObjectUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/${SUPABASE_ARCHIVE_BUCKET}/${encodeStoragePath(path)}`;
}

function getSupabasePublicImageUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_ARCHIVE_BUCKET}/${encodeStoragePath(path)}`;
}

function encodeStoragePath(path) {
  return String(path || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getSupabaseArchiveImagePath(record) {
  if (isSafeSupabaseStoragePath(record?.imagePath)) return record.imagePath;

  const extension = getSafeImageExtension(record?.imageName);
  const id = sanitizeStoragePathPart(record?.id || createArchiveId(Date.now()));
  return `images/${id}.${extension}`;
}

function isSafeSupabaseStoragePath(path) {
  const value = String(path || "");
  if (!value || value.includes("//")) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return false;
  return value.split("/").every((part) => part && part !== "." && part !== "..");
}

function sanitizeStoragePathPart(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || createArchiveId(Date.now());
}

function getSafeImageExtension(fileName) {
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  const extension = match ? match[1] : "jpg";
  return ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
}

async function saveSupabaseArchiveRecord(record) {
  if (!hasSupabaseConfig()) throw new Error("Supabase 설정이 없어요.");

  const intendedImagePath = getSupabaseArchiveImagePath(record);
  let imagePath = isSafeSupabaseStoragePath(record.imagePath) ? record.imagePath : "";
  let imageUploadError = null;

  if (record.imageBase64) {
    try {
      await uploadSupabaseArchiveImage(intendedImagePath, record.imageBase64);
      imagePath = intendedImagePath;
    } catch (error) {
      imageUploadError = error;
      console.warn("Supabase archive image upload failed:", error);
    }
  } else if (isSafeSupabaseStoragePath(record.imagePath)) {
    imagePath = record.imagePath;
  }

  const row = archiveRecordToSupabaseRow({
    ...record,
    imagePath,
  });

  const response = await fetch(`${getSupabaseRestUrl(SUPABASE_ARCHIVE_TABLE)}?on_conflict=id`, {
    method: "POST",
    headers: getSupabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error(await getReadableHttpError(response, "Supabase 아카이브 저장에 실패했어요."));
  }

  const data = await response.json().catch(() => []);
  const savedRecord = normalizeArchiveRecord(supabaseRowToArchiveRecord(Array.isArray(data) ? data[0] || row : data || row));
  if (imageUploadError) {
    savedRecord.supabaseImageError = imageUploadError.message || "이미지 업로드 정책을 확인해 주세요.";
  }
  return savedRecord;
}

async function uploadSupabaseArchiveImage(path, imageBase64) {
  const response = await fetch(getSupabaseStorageObjectUrl(path), {
    method: "POST",
    headers: getSupabaseHeaders({
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    }),
    body: base64ToBlob(imageBase64, "image/jpeg"),
  });

  if (!response.ok) {
    throw new Error(await getReadableHttpError(response, "Supabase 이미지 저장에 실패했어요."));
  }
}

async function fetchSupabaseArchiveList() {
  if (!hasSupabaseConfig()) return null;
  const response = await fetch(
    getSupabaseRestUrl(`${SUPABASE_ARCHIVE_TABLE}?select=*&order=created_at.desc`),
    {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await getReadableHttpError(response, "Supabase 아카이브 목록을 불러오지 못했어요."));
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(supabaseRowToArchiveRecord) : [];
}

async function fetchSupabaseArchiveDetail(id) {
  if (!hasSupabaseConfig()) return null;
  const response = await fetch(
    getSupabaseRestUrl(`${SUPABASE_ARCHIVE_TABLE}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`),
    {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const rows = await response.json();
  return Array.isArray(rows) && rows[0] ? supabaseRowToArchiveRecord(rows[0]) : null;
}

function archiveRecordToSupabaseRow(record) {
  return {
    id: record.id,
    user_name: record.userName || "인천대원",
    title: record.title || "저장된 질문",
    body_key: record.bodyKey || "",
    body_name: record.bodyName || "",
    mode: record.mode || "",
    mode_label: record.modeLabel || getViewModeLabel(record.mode),
    details: record.details || "",
    answer_level_key: record.answerLevelKey || "",
    image_path: isSafeSupabaseStoragePath(record.imagePath) ? record.imagePath : "",
    messages: getArchiveMessages(record),
    created_at: new Date(record.createdAt || Date.now()).toISOString(),
    updated_at: new Date(record.updatedAt || Date.now()).toISOString(),
  };
}

function supabaseRowToArchiveRecord(row) {
  const imagePath = isSafeSupabaseStoragePath(row.image_path) ? row.image_path : "";
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : createdAt;
  return {
    id: row.id,
    userName: row.user_name || "인천대원",
    createdAt,
    updatedAt,
    bodyKey: row.body_key || "",
    bodyName: row.body_name || "",
    mode: row.mode || "",
    modeLabel: row.mode_label || getViewModeLabel(row.mode),
    title: row.title || "저장된 질문",
    details: row.details || "",
    answerLevelKey: row.answer_level_key || "",
    imagePath,
    imageName: imagePath.split("/").pop() || "",
    imageUrl: imagePath ? getSupabasePublicImageUrl(imagePath) : "",
    messages: Array.isArray(row.messages) ? row.messages : [],
  };
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(String(base64 || "").replace(/^data:[^,]+,/, ""));
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    const byteNumbers = new Array(slice.length);
    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

async function getReadableHttpError(response, fallback) {
  const text = await response.text().catch(() => "");
  if (!text) return fallback;
  try {
    const data = JSON.parse(text);
    return data.message || data.error || fallback;
  } catch {
    return text.slice(0, 240) || fallback;
  }
}

function normalizeArchiveRecords(records) {
  return records.map(normalizeArchiveRecord);
}

function normalizeArchiveRecord(record) {
  const normalized = { ...record };
  if (normalized.imageUrl) {
    normalized.imageUrl = resolveArchiveAssetUrl(normalized.imageUrl);
  } else if (normalized.imageName) {
    normalized.imageUrl = resolveArchiveAssetUrl(`archives/${normalized.imageName}`);
  }

  if (normalized.markdownUrl) {
    normalized.markdownUrl = resolveArchiveAssetUrl(normalized.markdownUrl);
  } else if (normalized.markdownName) {
    normalized.markdownUrl = resolveArchiveAssetUrl(`archives/${normalized.markdownName}`);
  }

  return normalized;
}

function resolveArchiveAssetUrl(url) {
  if (!url) return "";
  if (/^(?:https?:|data:|blob:)/i.test(url)) return url;
  return new URL(url.replace(/^\/+/, ""), document.baseURI).toString();
}

function openPlan() {
  hydratePlan();
  openModal("planModal");
}

function ensureUserName() {
  if (state.userName) return;
  els.nameModal.classList.remove("hidden");
  requestAnimationFrame(() => els.nameInput.focus());
}

function submitNameOnboarding(event) {
  event.preventDefault();
  const name = sanitizeUserName(els.nameInput.value);
  if (!name) {
    showToast("대원 이름을 입력해 주세요.");
    return;
  }

  saveUserName(name);
  closeModal("nameModal");
  showToast(`${state.userName} 대원, 환영해요.`);
}

function submitSettingsName(event) {
  event.preventDefault();
  const name = sanitizeUserName(els.settingsNameInput.value);
  if (!name) {
    showToast("새 이름을 입력해 주세요.");
    return;
  }

  saveUserName(name);
  showToast(`이름을 ${state.userName} 대원으로 저장했어요.`);
}

function saveUserName(name) {
  state.userName = sanitizeUserName(name);
  hydrateUserNameSettings();
}

function hydrateUserNameSettings() {
  const name = state.userName || "";
  els.settingsNameInput.value = name;
  els.userNameSavedText.textContent = name
    ? `현재 이름: ${name} 대원`
    : "아카이브 파일 이름에 사용됩니다.";
}

function getStoredUserName() {
  return "";
}

function sanitizeUserName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

function hydratePlan() {
  els.planGoal.value = state.plan.goal || "";
  els.planSteps.value = state.plan.steps || "";
  els.planFindings.value = state.plan.findings || "";
  els.planSavedText.textContent = state.plan.updatedAt
    ? `마지막 저장: ${formatDate(state.plan.updatedAt)}`
    : "자동 저장 준비됨";
}

function schedulePlanSave() {
  window.clearTimeout(state.planTimer);
  els.planSavedText.textContent = "저장 중...";
  state.planTimer = window.setTimeout(savePlan, 240);
}

function savePlan() {
  state.plan = {
    goal: els.planGoal.value,
    steps: els.planSteps.value,
    findings: els.planFindings.value,
    updatedAt: Date.now(),
  };
  saveJson(PLAN_KEY, state.plan);
  els.planSavedText.textContent = `저장됨: ${formatDate(state.plan.updatedAt)}`;
}

function clearPlan() {
  state.plan = {
    goal: "",
    steps: "",
    findings: "",
    updatedAt: null,
  };
  saveJson(PLAN_KEY, state.plan);
  hydratePlan();
  showToast("계획표를 비웠어요.");
}

function openSettings() {
  hydrateUserNameSettings();
  renderAnswerLevelOptions();
  renderModelOptions();
  openModal("settingsModal");
}

function renderAnswerLevelOptions() {
  els.answerLevelOptions.innerHTML = "";

  ANSWER_LEVELS.forEach((level) => {
    const button = document.createElement("button");
    button.className = "answer-level-card";
    button.type = "button";
    button.classList.toggle("active", level.key === state.selectedAnswerLevelKey);
    button.setAttribute("aria-pressed", String(level.key === state.selectedAnswerLevelKey));
    button.addEventListener("click", () => setSelectedAnswerLevel(level.key));

    const head = document.createElement("span");
    head.className = "answer-level-card-head";

    const label = document.createElement("strong");
    label.textContent = level.label;

    const badge = document.createElement("span");
    badge.className = "answer-level-badge";
    badge.textContent = level.badge;

    const summary = document.createElement("span");
    summary.className = "answer-level-summary";
    summary.textContent = level.summary;

    const description = document.createElement("span");
    description.className = "answer-level-description";
    description.textContent = level.description;

    head.append(label, badge);
    button.append(head, summary, description);
    els.answerLevelOptions.append(button);
  });

  const activeLevel = getActiveAnswerLevel();
  els.answerLevelSavedText.textContent = `현재 답변 단계: ${activeLevel.label} (${activeLevel.summary})`;
}

function setSelectedAnswerLevel(levelKey) {
  state.selectedAnswerLevelKey = normalizeAnswerLevelKey(levelKey);
  renderAnswerLevelOptions();
  const activeLevel = getActiveAnswerLevel();
  showToast(`답변 단계를 ${activeLevel.label}으로 바꿨어요.`);
}

function getActiveAnswerLevel() {
  return ANSWER_LEVELS.find((level) => level.key === state.selectedAnswerLevelKey) || ANSWER_LEVELS[0];
}

function getSystemPrompt() {
  const userName = state.userName || "인천대원";
  return [
    SYSTEM_PROMPT,
    `학생의 이름은 ${userName}입니다. 답변 중 자연스럽게 부를 때는 '${userName} 대원'이라고 불러 주세요.`,
    getActiveAnswerLevel().instruction,
  ].join("\n");
}

function renderModelOptions() {
  els.modelOptions.innerHTML = "";

  MODEL_PRESETS.forEach((model) => {
    const button = document.createElement("button");
    button.className = "model-card";
    button.type = "button";
    button.classList.toggle("active", model.id === state.selectedModelId);
    button.addEventListener("click", () => setSelectedModel(model.id));

    const head = document.createElement("span");
    head.className = "model-card-head";

    const name = document.createElement("strong");
    name.textContent = model.label;

    const badge = document.createElement("span");
    badge.className = "model-badge";
    badge.textContent = model.badge;

    const id = document.createElement("code");
    id.textContent = model.id;

    const limit = document.createElement("span");
    limit.className = "model-limit";
    limit.textContent = model.limitText;

    const description = document.createElement("span");
    description.className = "model-description";
    description.textContent = model.description;

    head.append(name, badge);
    button.append(head, id, limit, description);
    els.modelOptions.append(button);
  });

  const activeModel = getActiveModel();
  const isPreset = MODEL_PRESETS.some((model) => model.id === state.selectedModelId);
  els.customModelInput.value = isPreset ? "" : state.selectedModelId;
  els.modelSavedText.textContent = `현재 사용 모델: ${activeModel.label} (${activeModel.id})`;
}

function setSelectedModel(modelId) {
  state.selectedModelId = normalizeModelId(modelId.trim() || DEFAULT_MODEL_ID);
  renderModelOptions();
  showToast(`${getActiveModel().label}로 바꿨어요.`);
}

function getActiveModel() {
  const preset = MODEL_PRESETS.find((model) => model.id === state.selectedModelId);
  if (preset) return preset;
  return {
    id: state.selectedModelId || DEFAULT_MODEL_ID,
    label: "직접 입력 모델",
    badge: "사용자 지정",
    limitText: "직접 입력한 모델은 Google AI Studio 프로젝트에서 사용 가능해야 해요.",
    description: "모델 ID가 정확하지 않으면 API 오류가 날 수 있어요.",
  };
}

function getActiveModelIds() {
  return [getActiveModel().id];
}

function updateCoordChip(point) {
  void point;
}

function spherePointToGeo(x, y) {
  const metrics = getSphereMetrics();
  const renderX = x * metrics.pixelRatio;
  const renderY = y * metrics.pixelRatio;
  const sx = (renderX - metrics.cx) / metrics.radius;
  const sy = (renderY - metrics.cy) / metrics.radius;
  const dist2 = sx * sx + sy * sy;
  if (dist2 > 1) return null;

  const sz = Math.sqrt(1 - dist2);
  const vy = -sy;
  const cosLat = Math.cos(state.rotation.lat);
  const sinLat = Math.sin(state.rotation.lat);
  const cosLon = Math.cos(state.rotation.lon);
  const sinLon = Math.sin(state.rotation.lon);

  const y1 = vy * cosLat - sz * sinLat;
  const z1 = vy * sinLat + sz * cosLat;
  const x2 = sx * cosLon + z1 * sinLon;
  const z2 = -sx * sinLon + z1 * cosLon;
  const lon = radiansToDegrees(Math.atan2(x2, z2));
  const lat = radiansToDegrees(Math.asin(clamp(y1, -1, 1)));

  return normalizeGeo(lon, lat);
}

function geoToSpherePoint(lon, lat) {
  const metrics = getSphereMetrics();
  const lonRad = degreesToRadians(lon);
  const latRad = degreesToRadians(lat);
  const worldX = Math.sin(lonRad) * Math.cos(latRad);
  const worldY = Math.sin(latRad);
  const worldZ = Math.cos(lonRad) * Math.cos(latRad);
  const cosLat = Math.cos(state.rotation.lat);
  const sinLat = Math.sin(state.rotation.lat);
  const cosLon = Math.cos(state.rotation.lon);
  const sinLon = Math.sin(state.rotation.lon);

  const screenX = worldX * cosLon - worldZ * sinLon;
  const rotatedZ = worldX * sinLon + worldZ * cosLon;
  const screenY = worldY * cosLat + rotatedZ * sinLat;
  const screenZ = -worldY * sinLat + rotatedZ * cosLat;

  if (screenZ <= 0.02) return null;

  return {
    x: (metrics.cx + screenX * metrics.radius) / metrics.pixelRatio,
    y: (metrics.cy - screenY * metrics.radius) / metrics.pixelRatio,
  };
}

function uvToGeo(u, v) {
  return normalizeGeo(u * 360 - 180, 90 - v * 180);
}

function geoToUv(lon, lat) {
  return {
    u: wrap01((lon + 180) / 360),
    v: clamp((90 - lat) / 180, 0, 1),
  };
}

function angularDistanceDeg(latA, lonA, latB, lonB) {
  const phiA = degreesToRadians(latA);
  const phiB = degreesToRadians(latB);
  const deltaPhi = degreesToRadians(latB - latA);
  const deltaLambda = degreesToRadians(shortestLongitudeDelta(lonA, lonB));
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phiA) * Math.cos(phiB) * Math.sin(deltaLambda / 2) ** 2;
  return radiansToDegrees(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function shortestLongitudeDelta(fromLon, toLon) {
  return ((toLon - fromLon + 540) % 360) - 180;
}

function normalizeGeo(lon, lat) {
  let normalizedLon = ((lon + 180) % 360 + 360) % 360 - 180;
  if (normalizedLon === -180) normalizedLon = 180;
  return {
    lon: normalizedLon,
    lat: clamp(lat, -90, 90),
  };
}

function getDisplayedImageRect(kind) {
  const viewerRect = els.viewer.getBoundingClientRect();
  const img = kind === "rover" ? els.roverImage : els.mapImage;
  const imgRect = img.getBoundingClientRect();
  const naturalWidth = img.naturalWidth || 2;
  const naturalHeight = img.naturalHeight || 1;
  const naturalAspect = naturalWidth / naturalHeight;
  const boxAspect = imgRect.width / imgRect.height;

  let width;
  let height;
  let x;
  let y;

  if (boxAspect > naturalAspect) {
    height = imgRect.height;
    width = height * naturalAspect;
    x = imgRect.left - viewerRect.left + (imgRect.width - width) / 2;
    y = imgRect.top - viewerRect.top;
  } else {
    width = imgRect.width;
    height = width / naturalAspect;
    x = imgRect.left - viewerRect.left;
    y = imgRect.top - viewerRect.top + (imgRect.height - height) / 2;
  }

  return {
    x,
    y,
    width,
    height,
  };
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function setLoading(isLoading, message) {
  window.clearInterval(state.loadingMessageTimer);
  state.loadingMessageTimer = null;

  if (isLoading) {
    const messages = getLoadingMessages(message);
    state.loadingMessageIndex = 0;
    els.loadingText.textContent = messages[0];
    state.loadingMessageTimer = window.setInterval(() => {
      state.loadingMessageIndex = (state.loadingMessageIndex + 1) % messages.length;
      els.loadingText.textContent = messages[state.loadingMessageIndex];
    }, 2000);
  } else if (message) {
    els.loadingText.textContent = message;
  }

  els.loadingOverlay.classList.toggle("hidden", !isLoading);
}

function getLoadingMessages(firstMessage) {
  const activeModel = getActiveModel();
  const modelMessages = activeModel.id.startsWith("gemma-4") ? GEMMA_LOADING_MESSAGES : LOADING_MESSAGES;
  return [
    firstMessage || `${activeModel.label}가 답변을 생성하고 있습니다.`,
    `${activeModel.label}가 답변을 생성하고 있습니다.`,
    ...modelMessages,
  ];
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  state.toastTimer = window.setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2600);
}

function openModal(id) {
  closeAllModals();
  $(`#${id}`).classList.remove("hidden");
}

function closeModal(id) {
  $(`#${id}`)?.classList.add("hidden");
}

function closeAllModals() {
  [els.answerModal, els.historyModal, els.planModal, els.settingsModal].forEach((modal) => modal.classList.add("hidden"));
}

function loadJson(key, fallback) {
  if (!ALLOWED_LOCAL_CACHE_KEYS.has(key)) {
    removeLocalCacheKey(key);
    return fallback;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  if (!ALLOWED_LOCAL_CACHE_KEYS.has(key)) {
    removeLocalCacheKey(key);
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("브라우저 저장 공간을 사용할 수 없어요.");
  }
}

function removeLocalCacheKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors; the goal is to avoid persisting data.
  }
}

function cleanupNonPlanBrowserStorage() {
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("moonMarsAstroAI.") && !ALLOWED_LOCAL_CACHE_KEYS.has(key)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage access errors; the app can still run without local cache.
  }

  if ("indexedDB" in window) {
    try {
      indexedDB.deleteDatabase(ARCHIVE_DB_NAME);
    } catch {
      // Ignore cleanup errors; future code no longer reads or writes this DB.
    }
  }
}

function formatLat(lat) {
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
}

function formatLon(lon) {
  return `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFullDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value) {
  return Math.round(clamp(value, 0, 255));
}

function mix(a, b, t) {
  return a * (1 - t) + b * t;
}

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function wrapRadians(value) {
  const tau = Math.PI * 2;
  return ((value + Math.PI) % tau + tau) % tau - Math.PI;
}

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

init();
