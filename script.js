"use strict";

const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get("key") || "";

const HISTORY_KEY = "moonMarsAstroAI.history.v1";
const PLAN_KEY = "moonMarsAstroAI.plan.v1";
const MODEL_KEY = "moonMarsAstroAI.model.v1";
const DEFAULT_MODEL_ID = "gemma-4-31b-it";

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
    limitText: "Gemma 4 모델은 추론 시간이 있어 답변이 조금 늦지만, 한 달에 약 1,500번 사용할 수 있어요.",
    description: "복잡한 달·화성 지형을 더 차분하게 비교할 때 좋아요.",
  },
  {
    id: "gemma-4-26b-it",
    label: "Gemma 4 26B",
    badge: "균형형",
    limitText: "Gemma 4 모델은 추론 시간이 있어 답변이 조금 늦지만, 한 달에 약 1,500번 사용할 수 있어요.",
    description: "31B보다 가볍게 쓰면서도 지형 설명을 길게 이어가기 좋아요.",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    badge: "빠른 응답",
    limitText: "Gemini 3.1 Flash Lite는 답이 바로 나오는 빠른 모델이고, 한 달에 약 500번 사용할 수 있어요.",
    description: "Gemini 3.1 Flash는 한 달에 약 20번만 사용할 수 있어, 수업용 기본 빠른 모델은 Lite로 맞췄어요.",
  },
];

const LOADING_MESSAGES = [
  "화성에서 길 잃어버림... 지도를 다시 펼치는 중입니다.",
  "달 크레이터 앞에서 잠깐 멈춤... 이름표를 확인하는 중입니다.",
  "빨간 동그라미 좌표를 탐사 일지에 또박또박 적는 중입니다.",
  "협곡인지, 화산인지, 충돌구인지 탐사 돋보기로 보는 중입니다.",
  "어려운 과학 말을 10살 탐험가 말로 번역하는 중입니다.",
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
  "대상은 10살 초등학생입니다. 다정하고 쉽지만 과학적 근거를 충분히 담아 설명하세요.",
  "지도나 사진에서 확실하지 않은 지명은 단정하지 말고 '추정'이라고 말하세요.",
  "장난스럽거나 곤란하거나 과학 탐사와 무관한 질문은 짧게 방향을 바꾸고, 달과 화성 탐사 이야기로 부드럽게 돌려주세요.",
  "답변은 한국어로 작성하고, 어린이가 읽기 쉬운 짧은 문단을 여러 개 사용하세요.",
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
  "답변 구조는 1) 지형 추정, 2) 관찰 근거 2~3가지, 3) 지형이 만들어진 과정, 4) 왜 과학적으로 중요한지, 5) 쉬운 비유, 6) 다음 관찰 질문 하나를 포함하세요.",
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
  "mars_robo/Mars_Perseverance_FLF_1513_0801260057_395ECM_N0740000FHAZ02008_03_095J.png",
  "mars_robo/Mars_Perseverance_FLF_1785_0825405052_757ECM_N0860510FHAZ00215_04_075J.png",
  "mars_robo/Mars_Perseverance_FLF_1792_0826023946_645ECM_N0870000FHAZ02008_03_095J.png",
  "mars_robo/Mars_Perseverance_NRF_1382_0789615482_909ECM_N0650000NCAM14381_01_195J.png",
  "mars_robo/Mars_Perseverance_NRF_1382_0789615650_909ECM_N0650000NCAM14381_01_195J.png",
  "mars_robo/Mars_Perseverance_SIF_1555_0804985824_601EBY_N0770000SRLC00336_0000LMJ.png",
  "mars_robo/Mars_Perseverance_ZL0_0961_0752254195_706EBY_N0470000ZCAM03815_0340LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1320_0784114966_193EBY_N0612534ZCAM04024_1100LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1412_0792297259_894EBY_N0680142ZCAM09468_0340LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1764_0823537822_159EBY_N0840000ZCAM09818_1100LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1875_0833395124_318EBY_N0881214ZCAM09926_1100LMJ.png",
  "mars_robo/Mars_Perseverance_ZR0_1875_0833395150_318EBY_N0881214ZCAM09926_1100LMJ.png",
];

const MARS_REFERENCE_SOURCES = [
  "USGS Mars Global Surveyor MOLA Topographic Map",
  "USGS Astrogeology MOLA Globe with IAU-approved feature names",
  "IAU/USGS Gazetteer of Planetary Nomenclature",
];

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

const MOON_REFERENCE_SOURCES = [
  "IAU/USGS Gazetteer of Planetary Nomenclature",
  "USGS Moon LOLA 2011 nomenclature center points",
  "NASA SVS CGI Moon Kit color and elevation maps",
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
  modelOptions: $("#modelOptions"),
  customModelInput: $("#customModelInput"),
  modelSavedText: $("#modelSavedText"),
  toast: $("#toast"),
};

const imageCache = new Map();
const textureCache = new Map();

const SPHERE_TEXTURE_SIZES = {
  moon: { width: 2048, height: 1024 },
  mars: { width: 4096, height: 2048 },
};

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
  history: loadJson(HISTORY_KEY, []),
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
};

function getInitialModelId() {
  const urlModel = (urlParams.get("model") || "").split(",")[0]?.trim();
  if (urlModel) return normalizeModelId(urlModel);

  const savedModel = loadJson(MODEL_KEY, DEFAULT_MODEL_ID);
  return typeof savedModel === "string" && savedModel.trim() ? normalizeModelId(savedModel.trim()) : DEFAULT_MODEL_ID;
}

function normalizeModelId(modelId) {
  return MODEL_ID_ALIASES[modelId] || modelId;
}

function init() {
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
  els.roverBtn.addEventListener("click", () => setViewMode("rover"));
  els.zoomOutBtn.addEventListener("click", () => stepZoom(-1));
  els.zoomInBtn.addEventListener("click", () => stepZoom(1));
  els.zoomResetBtn.addEventListener("click", () => resetZoom(true));
  els.drawToggleBtn.addEventListener("click", toggleDrawMode);
  els.clearBtn.addEventListener("click", () => clearDrawing(true));
  els.analyzeBtn.addEventListener("click", analyzeSelection);
  els.settingsBtn.addEventListener("click", openSettings);
  els.homeSettingsBtn.addEventListener("click", openSettings);
  els.historyBtn.addEventListener("click", openHistory);
  els.homeHistoryBtn.addEventListener("click", openHistory);
  els.planBtn.addEventListener("click", openPlan);
  els.homePlanBtn.addEventListener("click", openPlan);
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  els.clearPlanBtn.addEventListener("click", clearPlan);

  els.elevationRange.addEventListener("input", () => {
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
  renderModelOptions();
  hydratePlan();
  resizeCanvases();
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
  els.exploreScreen.classList.remove("hidden");
  els.bodyBadge.textContent = `${body.emoji} ${body.name}`;
  els.mapImage.src = body.map;
  els.mapImage.alt = `${body.name} 전체 지도`;
  els.roverBtn.classList.toggle("hidden", bodyKey !== "mars");
  els.elevationControl.classList.toggle("hidden", bodyKey !== "moon");

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
  els.roverBtn.classList.toggle("active", mode === "rover");

  if (mode === "rover") {
    setRoverImage(state.roverIndex);
  }

  if (!options.keepDrawing && previousMode !== mode) {
    clearDrawing(false);
    resetZoom(false);
  }

  if (mode === "sphere") {
    state.drawMode = false;
    els.coordChip.textContent = "좌우로 돌려 보세요";
  } else if (mode === "flat") {
    state.drawMode = true;
    els.coordChip.textContent = "궁금한 곳에 동그라미를 그려요";
  } else {
    state.drawMode = true;
    els.coordChip.textContent = "로버 사진에서 암석을 표시해요";
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
    state.sphereZoom = clamp(nextScale, 0.75, 1.75);
    updateZoomControls();
    scheduleSphereRender();
    return;
  }

  const previous = state.viewport.scale;
  const scale = clamp(nextScale, 1, 4);
  const center = getCanvasCenter();
  const ratio = scale / previous;
  state.viewport.x = (focalPoint.x - center.x) * (1 - ratio) + state.viewport.x * ratio;
  state.viewport.y = (focalPoint.y - center.y) * (1 - ratio) + state.viewport.y * ratio;
  state.viewport.scale = scale;
  clampViewportPan();
  applyViewportTransform();
  updateZoomControls();

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
  const zoom = getActiveZoom();
  const zoomText = zoom.toFixed(zoom >= 2 ? 1 : 2).replace(/\.?0+$/, "");
  els.zoomLevel.textContent = `${zoomText}×`;
  els.zoomOutBtn.disabled = zoom <= (state.viewMode === "sphere" ? 0.76 : 1.01);
  els.zoomInBtn.disabled = zoom >= (state.viewMode === "sphere" ? 1.74 : 3.99);
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
  state.activePointerId = event.pointerId;

  if (state.drawMode) {
    const point = pointerPoint(event);
    state.isDrawing = true;
    state.activeStroke = {
      mode: state.viewMode,
      points: [point],
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
  if (event.pointerId !== state.activePointerId) return;
  event.preventDefault();

  if (state.isDrawing && state.activeStroke) {
    const point = pointerPoint(event);
    const lastPoint = state.activeStroke.points[state.activeStroke.points.length - 1];
    if (!lastPoint || distance(lastPoint, point) > 1.8) {
      state.activeStroke.points.push(point);
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
  }
}

function endPointerAction(event) {
  if (event && event.pointerId !== state.activePointerId) return;

  if (state.isDrawing && state.activeStroke && state.activeStroke.points.length < 2) {
    state.strokes.pop();
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

function renderDrawing() {
  const canvas = els.drawCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255, 229, 90, 0.96)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  state.strokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
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

    state.lastAnalysis = {
      bodyKey: state.bodyKey,
      viewMode: state.viewMode,
      selection,
      prompt,
      answer,
      imageBase64: analysisImage.base64,
    };

    showAnswer(selection, answer, analysisImage.base64);
    saveHistory({
      bodyKey: state.bodyKey,
      mode: state.viewMode,
      question: selection.title,
      answer,
      details: selection.description,
      createdAt: Date.now(),
    });
  } catch (error) {
    showAnswer(selection, `분석 중 문제가 생겼어요.\n\n${error.message}`, analysisImage?.base64);
  } finally {
    setLoading(false);
  }
}

function getSelectionSummary() {
  const bounds = getStrokeBounds();
  if (!bounds) return null;

  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const body = bodies[state.bodyKey];

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

  let geo;
  let areaDescription;

  if (state.viewMode === "sphere") {
    geo = spherePointToGeo(center.x, center.y);
    if (!geo) {
      showToast("구형 행성의 표면 안쪽에 동그라미를 그려 주세요.");
      return null;
    }
    areaDescription = "구형 보기에서 보이는 반구의 표시 영역";
  } else {
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

function getMarsReferenceContext(geo) {
  const ranked = MARS_FEATURE_REFERENCES.map((feature) => ({
    ...feature,
    distanceDeg: angularDistanceDeg(geo.lat, geo.lon, feature.lat, feature.lon),
  })).sort((a, b) => a.distanceDeg - b.distanceDeg);

  const likely = ranked.filter((feature) => feature.distanceDeg <= feature.radiusDeg).slice(0, 4);
  const nearby = ranked.slice(0, 5);
  const displayList = (likely.length ? likely : nearby.slice(0, 3))
    .map((feature) => `${feature.name} ${feature.distanceDeg.toFixed(1)}도 거리`)
    .join(", ");

  return {
    likely,
    nearby,
    displayText: `MOLA/IAU 기준 가까운 지형 후보: ${displayList}.`,
    promptText: buildMarsReferencePrompt(likely, nearby),
  };
}

function buildMarsReferencePrompt(likely, nearby) {
  const likelyLines = likely.length
    ? likely.map(formatMarsFeatureLine)
    : ["표시 좌표가 주요 기준 지형의 중심/대표 범위 안에 명확히 들어오지 않습니다."];
  const nearbyLines = nearby.map(formatMarsFeatureLine);

  return [
    "화성 지형명 검증용 기준:",
    `참고 기준: ${MARS_REFERENCE_SOURCES.join("; ")}.`,
    "아래 좌표 후보와 첨부 이미지의 실제 모양을 함께 비교하세요.",
    "가까운 후보에 없는 유명 지형명은 말하지 마세요.",
    "거리와 모양이 모두 맞을 때만 '~ 부근으로 추정'이라고 말하세요.",
    "맞지 않으면 지형명 대신 '정확한 지명은 단정하기 어렵다'고 말하고, 보이는 지형 유형만 설명하세요.",
    `가까운 후보: ${likelyLines.join(" / ")}`,
    `주변 참고 지형: ${nearbyLines.join(" / ")}`,
  ].join("\n");
}

function formatMarsFeatureLine(feature) {
  return `${feature.name} (${feature.kind}, 대표좌표 ${formatLat(feature.lat)} ${formatLon(feature.lon)}, 표시점과 ${feature.distanceDeg.toFixed(1)}도, 시각 단서: ${feature.clue})`;
}

function getMoonReferenceContext(geo) {
  const ranked = MOON_FEATURE_REFERENCES.map((feature) => ({
    ...feature,
    distanceDeg: angularDistanceDeg(geo.lat, geo.lon, feature.lat, feature.lon),
  })).sort((a, b) => a.distanceDeg - b.distanceDeg);

  const likely = ranked.filter((feature) => feature.distanceDeg <= feature.radiusDeg).slice(0, 4);
  const nearby = ranked.slice(0, 5);
  const displayList = (likely.length ? likely : nearby.slice(0, 3))
    .map((feature) => `${feature.name} ${feature.distanceDeg.toFixed(1)}도 거리`)
    .join(", ");

  return {
    likely,
    nearby,
    displayText: `IAU/USGS 기준 가까운 달 지형 후보: ${displayList}.`,
    promptText: buildMoonReferencePrompt(likely, nearby),
  };
}

function buildMoonReferencePrompt(likely, nearby) {
  const likelyLines = likely.length
    ? likely.map(formatMoonFeatureLine)
    : ["표시 좌표가 대표 달 지형의 중심/대표 범위 안에 명확히 들어오지 않습니다."];
  const nearbyLines = nearby.map(formatMoonFeatureLine);

  return [
    "달 지형명 검증용 기준:",
    `참고 기준: ${MOON_REFERENCE_SOURCES.join("; ")}.`,
    "아래 좌표 후보와 첨부 이미지의 실제 색상, 밝기, 고도 무늬를 함께 비교하세요.",
    "가까운 후보에 없는 유명 지형명은 말하지 마세요.",
    "거리와 모양이 모두 맞을 때만 '~ 부근으로 추정'이라고 말하세요.",
    "맞지 않으면 지형명 대신 '정확한 지명은 단정하기 어렵다'고 말하고, 보이는 지형 유형만 설명하세요.",
    "달의 '바다'는 액체 물의 바다가 아니라 오래전에 용암이 굳어 만들어진 어두운 현무암 평원이라고 어린이에게 쉽게 설명하세요.",
    `가까운 후보: ${likelyLines.join(" / ")}`,
    `주변 참고 지형: ${nearbyLines.join(" / ")}`,
  ].join("\n");
}

function formatMoonFeatureLine(feature) {
  return `${feature.name} (${feature.kind}, 대표좌표 ${formatLat(feature.lat)} ${formatLon(feature.lon)}, 표시점과 ${feature.distanceDeg.toFixed(1)}도, 시각 단서: ${feature.clue})`;
}

function getStrokeBounds() {
  const points = state.strokes.flatMap((stroke) => stroke.points);
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
    let started = false;
    let previous = null;
    ctx.beginPath();

    stroke.points.forEach((point) => {
      const mapped = mapPointToAnalysis(point, width, height, selection.type);
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

  if (selection.type === "rover") {
    return [
      `학생이 화성 퍼서비어런스 로버 사진에서 빨간 표시를 한 영역을 분석해 주세요.`,
      selection.description,
      "사진 속 암석, 모래, 층리, 자갈, 균열처럼 보이는 특징을 중심으로 설명해 주세요.",
      "답변에는 1) 무엇처럼 보이는지, 2) 관찰 근거 2~3가지, 3) 그 지형이나 암석이 생겼을 가능성, 4) 화성 지질학에서 왜 흥미로운지, 5) 10살 학생이 기억할 쉬운 비유, 6) 다음 관찰 질문 하나를 포함해 주세요.",
      FINAL_RESPONSE_RULES,
    ].join("\n");
  }

  return [
    `학생이 ${body.name} 전체 지도에서 빨간 표시를 한 영역을 분석해 주세요.`,
    selection.description,
    "첨부 이미지는 고해상도 원본을 1024px 폭으로 줄인 전체 지도이며, 학생이 그린 표시가 빨간색으로 들어 있습니다.",
    body.key === "moon"
      ? "달 지도는 색상 지도와 고도 지도를 같은 좌표계로 겹친 것입니다. 밝기와 고도 차이를 함께 참고해 주세요."
      : "화성 지도에서는 화산, 협곡, 충돌구, 극지방 얼음, 어두운 평원 같은 큰 지형 단서를 참고해 주세요.",
    body.key === "mars" && selection.marsReference
      ? selection.marsReference.promptText
      : "",
    body.key === "moon" && selection.moonReference
      ? selection.moonReference.promptText
      : "",
    body.key === "mars"
      ? "물, 강, 바다, 생명 흔적에 대한 설명은 특히 조심하세요. 전역 지도에서 어둡거나 길쭉한 무늬만 보인다고 물이 흘렀다고 단정하지 마세요. 다만 계곡망, 삼각주, 하천형 수로, 퇴적층처럼 물과 관련된 지형 근거가 보이면 '몇몇 과학자들은 이곳에 과거 물이 흘렀을 것으로 추정합니다'라고 표현하세요. 현재 물이 흐른다는 뜻으로 말하지 말고, 반드시 '과거'와 '추정'을 함께 사용하세요."
      : "",
    "답변에는 1) 표시한 곳의 지형 추정, 2) 그렇게 판단한 관찰 근거 2~3가지, 3) 지형이 만들어진 과정, 4) 과학적으로 중요한 점, 5) 쉬운 비유, 6) 더 살펴볼 질문 하나를 포함해 주세요.",
    FINAL_RESPONSE_RULES,
  ].join("\n");
}

async function askGemini(prompt, imageBase64) {
  const payload = {
    system_instruction: {
      parts: [
        {
          text: SYSTEM_PROMPT,
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
    /Formation Process/i,
    /Scientific Importance/i,
    /Follow-up Question/i,
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
    const finalAnswerStart = findFinalKoreanAnswerStart(cleaned);
    if (finalAnswerStart > 0) {
      cleaned = cleaned.slice(finalAnswerStart).trim();
    }
  }

  const trailingNotesStart = cleaned.search(
    /\n\s*\*\s*(?:30-year|10-year|Friendly|Estimated|No NASA|No internal|Short paragraphs|Technical terms|Structure followed)/i,
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
  appendAnswerCard(`학생 질문`, question);
  scrollAnswerToBottom();
  setLoading(true, "AI 전문가가 추가 질문을 생각하고 있어요...");

  try {
    const prompt = [
      "아래는 같은 지도 또는 사진 표시 영역에 대한 학생의 추가 질문입니다.",
      `이전 분석: ${state.lastAnalysis.answer}`,
      `학생 질문: ${question}`,
      "이전 맥락을 이어서 10살 학생에게 쉽고 친절하게 답하되, 과학적 근거와 관찰 포인트를 1~2가지 더해 주세요.",
      FINAL_RESPONSE_RULES,
    ].join("\n");
    const answer = await askGemini(prompt, state.lastAnalysis.imageBase64);
    appendAnswerCard("전문가 답변", answer);
    scrollAnswerToBottom();
    state.lastAnalysis.answer = `${state.lastAnalysis.answer}\n\n학생 질문: ${question}\n${answer}`;
    saveHistory({
      bodyKey: state.lastAnalysis.bodyKey,
      mode: state.lastAnalysis.viewMode,
      question,
      answer,
      details: state.lastAnalysis.selection.description,
      createdAt: Date.now(),
    });
  } catch (error) {
    appendAnswerCard("전문가 답변", `추가 답변 중 문제가 생겼어요.\n\n${error.message}`);
    scrollAnswerToBottom();
  } finally {
    setLoading(false);
  }
}

function showAnswer(selection, answer, imageBase64) {
  const cleanedAnswer = cleanAiAnswer(answer);
  els.answerBody.innerHTML = "";
  if (imageBase64) {
    appendAnswerPreview(imageBase64, selection.title);
  }
  appendAnswerCard(selection.title, selection.description);
  appendAnswerCard("전문가 답변", cleanedAnswer);
  openModal("answerModal");
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
}

function scrollAnswerToBottom() {
  requestAnimationFrame(() => {
    els.answerBody.scrollTop = els.answerBody.scrollHeight;
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
      appendAnswerCard(item.question, item.details || "");
      appendAnswerCard("저장된 답변", cleanedAnswer);
      closeModal("historyModal");
      openModal("answerModal");
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
  saveJson(HISTORY_KEY, state.history);
}

function clearHistory() {
  state.history = [];
  saveJson(HISTORY_KEY, state.history);
  renderHistory();
  showToast("탐사 기록을 비웠어요.");
}

function openPlan() {
  hydratePlan();
  openModal("planModal");
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
  renderModelOptions();
  openModal("settingsModal");
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
  saveJson(MODEL_KEY, state.selectedModelId);
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
  if (!state.bodyKey) return;

  if (state.viewMode === "rover") {
    const rect = getDisplayedImageRect("rover");
    if (!pointInRect(point, rect)) {
      els.coordChip.textContent = "사진 안쪽에 표시해 주세요";
      return;
    }
    const x = ((point.x - rect.x) / rect.width) * 100;
    const y = ((point.y - rect.y) / rect.height) * 100;
    els.coordChip.textContent = `사진 x ${x.toFixed(1)}%, y ${y.toFixed(1)}%`;
    return;
  }

  let geo = null;
  if (state.viewMode === "sphere") {
    geo = spherePointToGeo(point.x, point.y);
  } else {
    const rect = getDisplayedImageRect("flat");
    if (pointInRect(point, rect)) {
      geo = uvToGeo((point.x - rect.x) / rect.width, (point.y - rect.y) / rect.height);
    }
  }

  els.coordChip.textContent = geo ? `${formatLat(geo.lat)} · ${formatLon(geo.lon)}` : "지도 안쪽에 표시해 주세요";
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
  [els.answerModal, els.historyModal, els.planModal].forEach((modal) => modal.classList.add("hidden"));
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("브라우저 저장 공간을 사용할 수 없어요.");
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
