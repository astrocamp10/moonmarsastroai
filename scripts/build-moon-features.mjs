#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { get } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync, inflateSync } from "node:zlib";

const SOURCE_URL =
  "https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.kmz";
const SOURCE_RETRIEVED_AT =
  process.env.MOON_FEATURES_RETRIEVED_AT ?? "2026-06-13T00:00:00.000Z";
const MOON_MEAN_RADIUS_KM = 1737.4;
const KM_PER_DEGREE = (2 * Math.PI * MOON_MEAN_RADIUS_KM) / 360;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "assets", "moon-features.json");

const TYPE_CATEGORY = new Map([
  ["AA", "crater"],
  ["AL", "albedo"],
  ["CA", "catena"],
  ["DO", "dorsum"],
  ["LC", "lacus"],
  ["LF", "astronaut_feature"],
  ["ME", "mare"],
  ["MO", "mons"],
  ["OC", "oceanus"],
  ["PA", "palus"],
  ["PL", "planitia"],
  ["PR", "promontorium"],
  ["RI", "rima"],
  ["RU", "rupes"],
  ["SF", "satellite_feature"],
  ["SI", "sinus"],
  ["ST", "statio"],
  ["VA", "vallis"],
]);

const IMPORTANT_FEATURES = new Map(
  [
    ["Oceanus Procellarum", 220],
    ["Mare Imbrium", 205],
    ["Mare Frigoris", 195],
    ["Mare Tranquillitatis", 190],
    ["Mare Serenitatis", 185],
    ["Mare Crisium", 180],
    ["Mare Fecunditatis", 180],
    ["Mare Nubium", 170],
    ["Mare Humorum", 165],
    ["Mare Nectaris", 165],
    ["Mare Australe", 155],
    ["Mare Orientale", 155],
    ["Mare Smythii", 150],
    ["Mare Marginis", 150],
    ["Mare Cognitum", 145],
    ["Mare Insularum", 145],
    ["Mare Moscoviense", 145],
    ["Mare Ingenii", 135],
    ["Mare Vaporum", 135],
    ["Mare Undarum", 130],
    ["Sinus Iridum", 145],
    ["Sinus Medii", 130],
    ["Sinus Aestuum", 125],
    ["Palus Epidemiarum", 125],
    ["Lacus Somniorum", 125],
    ["Montes Apenninus", 145],
    ["Montes Alpes", 130],
    ["Montes Caucasus", 130],
    ["Montes Cordillera", 140],
    ["Montes Rook", 135],
    ["Montes Jura", 125],
    ["Montes Carpatus", 120],
    ["Montes Haemus", 120],
    ["Vallis Snellius", 135],
    ["Vallis Rheita", 130],
    ["Vallis Schroter", 125],
    ["Vallis Planck", 120],
    ["Rupes Altai", 130],
    ["Rupes Recta", 120],
    ["Rima Ariadaeus", 115],
    ["Rima Hyginus", 115],
    ["Rima Marius", 110],
    ["Rimae Sirsalis", 110],
    ["Tycho", 180],
    ["Copernicus", 180],
    ["Kepler", 165],
    ["Aristarchus", 165],
    ["Plato", 160],
    ["Clavius", 155],
    ["Grimaldi", 150],
    ["Schickard", 145],
    ["Aitken", 140],
    ["Apollo", 150],
    ["Hertzsprung", 145],
    ["Korolev", 145],
    ["Tsiolkovskiy", 145],
    ["Von Karman", 140],
    ["Mendeleev", 135],
    ["Bailly", 135],
    ["Schrodinger", 135],
    ["Ptolemaeus", 130],
    ["Archimedes", 130],
    ["Gassendi", 125],
    ["Theophilus", 125],
    ["Langrenus", 120],
    ["Petavius", 120],
    ["Aristoteles", 115],
    ["Shackleton", 150],
    ["Cabeus", 125],
    ["Malapert", 110],
    ["Statio Tranquillitatis", 170],
    ["Statio Tianhe", 145],
    ["Statio Tianchuan", 140],
    ["Statio Tianjiang", 140],
    ["Statio Shiv Shakti", 140],
    ["Guang Han Gong", 130],
    ["Mount Marilyn", 120],
    ["Taurus Littrow Valley", 115],
    ["North Massif", 110],
    ["South Massif", 110],
    ["Apennine Front", 105],
  ].map(([name, boost]) => [normalizeName(name), boost]),
);

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const kmz = await downloadBuffer(SOURCE_URL);
  const kml = extractFirstKml(kmz).toString("utf8");
  const parsed = parseKml(kml);
  const ranked = assignPriority(ensureUniqueIds(parsed.features));

  const payload = {
    source: {
      name: "USGS/IAU Gazetteer of Planetary Nomenclature - Moon center points",
      url: SOURCE_URL,
      retrievedAt: SOURCE_RETRIEVED_AT,
      moonMeanRadiusKm: MOON_MEAN_RADIUS_KM,
    },
    schemaVersion: 1,
    count: ranked.length,
    priorityTiers: {
      1: "Top roughly 500 largest or observation/science/mission-important lunar features",
      2: "Secondary regional features and medium-to-large adopted features",
      3: "Small craters, satellite features, and all other adopted IAU features",
    },
    features: ranked,
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${ranked.length} features to ${path.relative(repoRoot, outputPath)}`);
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        downloadBuffer(new URL(response.headers.location, url).toString()).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    request.on("error", reject);
  });
}

function extractFirstKml(zipBuffer) {
  const eocdOffset = zipBuffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset < 0) throw new Error("ZIP end-of-central-directory record not found");

  const centralDirectorySize = zipBuffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    if (zipBuffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory entry");
    }

    const compression = zipBuffer.readUInt16LE(offset + 10);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
    const extraLength = zipBuffer.readUInt16LE(offset + 30);
    const commentLength = zipBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);
    const fileName = zipBuffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    if (fileName.toLowerCase().endsWith(".kml")) {
      const localNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const data = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);

      if (compression === 0) return data;
      if (compression === 8) return inflateRawSync(data);
      return inflateSync(data);
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error("No KML file found in KMZ");
}

function parseKml(kml) {
  const placemarkPattern = /<Placemark\b([^>]*)>([\s\S]*?)<\/Placemark>/g;
  const features = [];
  let match;

  while ((match = placemarkPattern.exec(kml))) {
    const id = attr(match[1], "id");
    const body = match[2];
    const name = text(body, "name");
    const data = {};

    for (const dataMatch of body.matchAll(
      /<SimpleData\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/SimpleData>/g,
    )) {
      data[dataMatch[1]] = unescapeXml(dataMatch[2].trim());
    }

    if (data.approval !== "Adopted by IAU") continue;

    const diameterKm = number(data.diameter) ?? 0;
    const lat = number(data.center_lat);
    const lon = normalizeLon(number(data.center_lon));
    if (lat == null || lon == null) continue;

    const typeCode = data.code || null;
    const category = TYPE_CATEGORY.get(typeCode) ?? categoryFromType(data.type);
    const cleanName = data.clean_name || name;

    features.push({
      id: linkId(data.link) ?? id ?? slugify(cleanName),
      name: cleanName,
      type: data.type || null,
      typeCode,
      kind: kindFromType(data.type),
      category,
      lat,
      lon,
      radiusDeg: round((diameterKm / KM_PER_DEGREE) / 2, 4),
      diameterKm,
      quad: quad(data.quad_name, data.quad_code),
      origin: data.origin || null,
      link: data.link || null,
    });
  }

  return { features };
}

function assignPriority(features) {
  const baseScores = features.map((feature) => {
    const diameterScore = Math.log10(Math.max(feature.diameterKm, 1)) * 100;
    const typeBoost = typeBoostFor(feature.typeCode);
    const importanceBoost = IMPORTANT_FEATURES.get(normalizeName(feature.name)) ?? 0;
    return {
      feature,
      score: round(diameterScore + typeBoost + importanceBoost, 2),
      boosted: importanceBoost > 0,
    };
  });

  const topByScore = new Set(
    [...baseScores]
      .sort((a, b) => b.score - a.score || b.feature.diameterKm - a.feature.diameterKm)
      .slice(0, 500)
      .map((entry) => entry.feature.id),
  );

  return baseScores
    .map(({ feature, score, boosted }) => {
      const isTop = topByScore.has(feature.id) || boosted;
      const isSecondary = isSecondaryRegionalFeature(feature);
      return {
        ...feature,
        priorityTier: isTop ? 1 : isSecondary ? 2 : 3,
        priorityScore: score,
        isMajor: isTop,
      };
    })
    .sort(
      (a, b) =>
        a.priorityTier - b.priorityTier ||
        b.priorityScore - a.priorityScore ||
        b.diameterKm - a.diameterKm ||
        a.name.localeCompare(b.name),
    );
}

function isSecondaryRegionalFeature(feature) {
  if (feature.diameterKm >= 50 && feature.category !== "satellite_feature") return true;
  if (feature.diameterKm >= 20 && typeBoostFor(feature.typeCode) >= 25) return true;
  return false;
}

function ensureUniqueIds(features) {
  const counts = new Map();
  return features.map((feature) => {
    const seen = counts.get(feature.id) ?? 0;
    counts.set(feature.id, seen + 1);
    if (seen === 0) return feature;
    return { ...feature, id: `${feature.id}-${seen + 1}` };
  });
}

function typeBoostFor(code) {
  const normalizedCode = String(code || "").toUpperCase();
  if (normalizedCode === "OC") return 85;
  if (normalizedCode === "ME") return 75;
  if (["MO", "VA"].includes(normalizedCode)) return 55;
  if (["RI", "RU", "DO", "CA"].includes(normalizedCode)) return 42;
  if (["LC", "SI", "PA", "PL"].includes(normalizedCode)) return 38;
  if (normalizedCode === "PR") return 32;
  if (["LF", "ST"].includes(normalizedCode)) return 20;
  if (normalizedCode === "AA") return 10;
  if (normalizedCode === "SF") return -35;
  return 0;
}

function kindFromType(type) {
  return (type ?? "").split(",")[0].trim() || null;
}

function categoryFromType(type) {
  const text = String(type ?? "").toLowerCase();
  if (text.includes("satellite")) return "satellite_feature";
  if (text.includes("astronaut")) return "astronaut_feature";
  if (text.includes("crater")) return "crater";
  if (text.includes("mare")) return "mare";
  if (text.includes("oceanus")) return "oceanus";
  if (text.includes("lacus")) return "lacus";
  if (text.includes("sinus")) return "sinus";
  if (text.includes("palus")) return "palus";
  if (text.includes("planitia")) return "planitia";
  if (text.includes("promontorium")) return "promontorium";
  if (text.includes("rima")) return "rima";
  if (text.includes("rupes")) return "rupes";
  if (text.includes("dors")) return "dorsum";
  if (text.includes("catena")) return "catena";
  if (text.includes("vall")) return "vallis";
  if (text.includes("mons") || text.includes("montes")) return "mons";
  if (text.includes("statio")) return "statio";
  if (text.includes("albedo")) return "albedo";
  return "other";
}

function quad(name, code) {
  if (!name && !code) return null;
  return {
    name: name || null,
    code: code ? code.toUpperCase() : null,
  };
}

function linkId(link) {
  const match = /\/Feature\/(\d+)/.exec(link ?? "");
  return match ? match[1] : null;
}

function text(body, tagName) {
  const match = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`).exec(body);
  return match ? unescapeXml(match[1].trim()) : "";
}

function attr(attrs, name) {
  const match = new RegExp(`\\b${name}="([^"]+)"`).exec(attrs);
  return match ? unescapeXml(match[1]) : null;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? round(parsed, 6) : null;
}

function normalizeLon(value) {
  if (value == null) return null;
  return round((((value + 180) % 360) + 360) % 360 - 180, 6);
}

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(name) {
  return normalizeName(name).replace(/\s+/g, "-") || "moon-feature";
}

function round(value, digits = 6) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function unescapeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
