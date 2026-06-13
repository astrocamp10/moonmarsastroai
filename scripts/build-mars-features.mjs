#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { get } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync, inflateSync } from "node:zlib";

const SOURCE_URL =
  "https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.kmz";
const SOURCE_RETRIEVED_AT =
  process.env.MARS_FEATURES_RETRIEVED_AT ?? "2026-06-12T00:00:00.000Z";
const MARS_MEAN_RADIUS_KM = 3389.5;
const KM_PER_DEGREE = (2 * Math.PI * MARS_MEAN_RADIUS_KM) / 360;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cacheDir = path.join(repoRoot, ".cache");
const kmzPath = path.join(cacheDir, "MARS_nomenclature_center_pts.kmz");
const outputPath = path.join(repoRoot, "assets", "mars-features.json");

const TYPE_CATEGORY = new Map([
  ["AA", "crater"],
  ["AL", "albedo"],
  ["CA", "catena"],
  ["CB", "cavus"],
  ["CH", "chaos"],
  ["CM", "chasma"],
  ["CO", "collis"],
  ["DO", "dorsum"],
  ["FL", "fluctus"],
  ["FO", "fossa"],
  ["LA", "labes"],
  ["LB", "labyrinthus"],
  ["LN", "lingula"],
  ["MA", "macula"],
  ["MN", "mensa"],
  ["MO", "mons"],
  ["PA", "palus"],
  ["PE", "patera"],
  ["PL", "planitia"],
  ["PM", "planum"],
  ["RU", "rupes"],
  ["SC", "scopulus"],
  ["SE", "serpens"],
  ["SU", "sulcus"],
  ["TA", "terra"],
  ["TH", "tholus"],
  ["UN", "unda"],
  ["VA", "vallis"],
  ["VS", "vastitas"],
]);

const IMPORTANT_FEATURES = new Map(
  [
    ["Valles Marineris", 160],
    ["Olympus Mons", 155],
    ["Tharsis Montes", 145],
    ["Hellas Planitia", 140],
    ["Gale", 135],
    ["Jezero", 135],
    ["Gusev", 130],
    ["Eberswalde", 125],
    ["Holden", 125],
    ["Mawrth Vallis", 125],
    ["Nili Fossae", 125],
    ["Oxia Planum", 125],
    ["Isidis Planitia", 120],
    ["Utopia Planitia", 120],
    ["Elysium Mons", 115],
    ["Elysium Planitia", 115],
    ["Amazonis Planitia", 110],
    ["Acidalia Planitia", 110],
    ["Arcadia Planitia", 110],
    ["Syrtis Major Planum", 110],
    ["Meridiani Planum", 110],
    ["Chryse Planitia", 105],
    ["Ares Vallis", 105],
    ["Maja Valles", 105],
    ["Kasei Valles", 105],
    ["Mangala Valles", 105],
    ["Dao Vallis", 100],
    ["Ma'adim Vallis", 100],
    ["Noctis Labyrinthus", 100],
    ["Arsia Mons", 100],
    ["Ascraeus Mons", 100],
    ["Pavonis Mons", 100],
    ["Alba Mons", 100],
    ["Apollinaris Mons", 95],
    ["Aeolis Mons", 95],
    ["Cerberus Fossae", 95],
    ["Medusae Fossae", 95],
    ["Korolev", 90],
    ["Schiaparelli", 90],
    ["Victoria", 90],
    ["Endeavour", 90],
    ["Bonneville", 85],
    ["Santa Maria", 85],
    ["Huygens", 85],
    ["Antoniadi", 85],
    ["Becquerel", 85],
    ["Miyamoto", 85],
    ["Aram Chaos", 85],
    ["Iani Chaos", 85],
    ["Hydraotes Chaos", 85],
    ["Vastitas Borealis", 85],
    ["Terra Sabaea", 80],
    ["Arabia Terra", 80],
    ["Noachis Terra", 80],
    ["Terra Sirenum", 80],
    ["Terra Cimmeria", 80],
  ].map(([name, boost]) => [normalizeName(name), boost]),
);

async function main() {
  await mkdir(cacheDir, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await download(SOURCE_URL, kmzPath);

  const kmz = await readFile(kmzPath);
  const kml = extractFirstKml(kmz).toString("utf8");
  const parsed = parseKml(kml);
  const ranked = assignPriority(ensureUniqueIds(parsed.features));

  const payload = {
    source: {
      name: "USGS/IAU Gazetteer of Planetary Nomenclature - Mars center points",
      url: SOURCE_URL,
      retrievedAt: SOURCE_RETRIEVED_AT,
      marsMeanRadiusKm: MARS_MEAN_RADIUS_KM,
    },
    schemaVersion: 1,
    count: ranked.length,
    priorityTiers: {
      1: "Top roughly 500 largest or mission/science-important features",
      2: "Secondary named regional features",
      3: "All other adopted IAU features",
    },
    features: ranked,
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rm(cacheDir, { recursive: true, force: true });
  console.log(`Wrote ${ranked.length} features to ${path.relative(repoRoot, outputPath)}`);
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        download(new URL(response.headers.location, url).toString(), destination)
          .then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(destination);
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
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

    const diameterKm = number(data.diameter);
    const lat = number(data.center_lat);
    const lon = normalizeLon(number(data.center_lon));

    const typeCode = data.code || null;
    const category = TYPE_CATEGORY.get(typeCode) ?? categoryFromType(data.type);

    features.push({
      id: linkId(data.link) ?? id,
      name: data.clean_name || name,
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
      const isTop = topByScore.has(feature.id);
      return {
        ...feature,
        priorityTier: isTop ? 1 : feature.diameterKm >= 50 ? 2 : 3,
        priorityScore: score,
        isMajor: isTop || boosted,
      };
    })
    .sort(
      (a, b) =>
        a.priorityTier - b.priorityTier ||
        b.priorityScore - a.priorityScore ||
        a.name.localeCompare(b.name),
    );
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
  if (["TA", "PL", "VS", "VA", "MO", "PM"].includes(code)) return 35;
  if (["CM", "CH", "FO", "DO", "MN", "PE"].includes(code)) return 20;
  if (code === "AA") return 5;
  return 0;
}

function kindFromType(type) {
  return (type ?? "").split(",")[0].trim() || null;
}

function categoryFromType(type) {
  const text = String(type ?? "").toLowerCase();
  if (text.includes("crater")) return "crater";
  if (text.includes("planitia")) return "planitia";
  if (text.includes("planum") || text.includes("plana")) return "planum";
  if (text.includes("terra")) return "terra";
  if (text.includes("vastitas")) return "vastitas";
  if (text.includes("vall")) return "vallis";
  if (text.includes("chasma")) return "chasma";
  if (text.includes("fossa")) return "fossa";
  if (text.includes("chaos")) return "chaos";
  if (text.includes("labyrinthus")) return "labyrinthus";
  if (text.includes("mensa")) return "mensa";
  if (text.includes("mons") || text.includes("montes")) return "mons";
  if (text.includes("patera")) return "patera";
  if (text.includes("tholus") || text.includes("tholi")) return "tholus";
  if (text.includes("dors")) return "dorsum";
  if (text.includes("rupes")) return "rupes";
  if (text.includes("scopul")) return "scopulus";
  if (text.includes("cav")) return "cavus";
  if (text.includes("coll")) return "collis";
  if (text.includes("catena")) return "catena";
  if (text.includes("sulc")) return "sulcus";
  if (text.includes("unda")) return "unda";
  if (text.includes("palus")) return "palus";
  if (text.includes("lingula")) return "lingula";
  if (text.includes("fluctus")) return "fluctus";
  if (text.includes("serpens")) return "serpens";
  if (text.includes("labes")) return "labes";
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
    .toLowerCase();
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
