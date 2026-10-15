/**
 * Builds public/models/city.glb from the Kenney CC0 kits (kenney.nl) — the
 * colourful miniature models the 3D world is made of.
 *
 * Each kit textures its models from a 512² palette image. Here the palette is
 * baked into vertex colours, every model's parts are merged into one mesh
 * (except parts that animate, like turbine blades), duplicate vertices are
 * welded, and the result is quantised + meshopt-compressed into one small GLB.
 * Every model then shares one untextured material, so the city can be drawn
 * with a handful of BatchedMesh calls. Also writes the model sizes to
 * src/components/three/models.generated.ts so layout code can place models
 * without loading them.
 *
 * The kits aren't committed. Download and unzip them (all CC0) into one folder:
 *   city-kit-commercial, city-kit-industrial, city-kit-suburban,
 *   city-kit-roads, car-kit, nature-kit
 * then:
 *   npx tsx scripts/build-models.mts /path/to/unzipped-kits
 */
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Document, NodeIO, type Node as GNode, type Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { quantize, reorder } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { PNG } from "pngjs";

const SRC = process.argv[2];
if (!SRC) throw new Error("usage: tsx scripts/build-models.mts <folder with the unzipped Kenney kits>");

/** Output name → [kit folder prefix, model file stem]. */
const PICK: Record<string, [string, string]> = {};
const add = (prefix: string, kit: string, stems: string[]) => stems.forEach((s) => (PICK[`${prefix}-${s}`] = [kit, s]));
const letters = (from: string, to: string) =>
  Array.from({ length: to.charCodeAt(0) - from.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(from.charCodeAt(0) + i));

add("com", "city-kit-commercial", [
  ...letters("a", "n").map((l) => `building-${l}`),
  ...letters("a", "e").map((l) => `building-skyscraper-${l}`),
  ...letters("a", "n").map((l) => `low-detail-building-${l}`),
  "low-detail-building-wide-a",
  "low-detail-building-wide-b",
  "detail-parasol-a",
  "detail-awning-wide",
]);
add("ind", "city-kit-industrial", [
  ...letters("a", "t").map((l) => `building-${l}`),
  "chimney-large",
  "chimney-medium",
  "chimney-small",
  "detail-tank",
  "detail-tank-large",
  "shipping-container-a",
  "shipping-container-b",
  "shipping-container-c",
  "solar-panel-landscape-group",
  "water-tower",
  "windmill",
]);
add("sub", "city-kit-suburban", [...letters("a", "u").map((l) => `building-type-${l}`), "tree-large", "tree-small", "fence-1x3", "planter"]);
add("road", "city-kit-roads", [
  "light-square",
  "light-curved",
  "traffic-light",
  "electricity-pole",
  "construction-barrier",
  "construction-cone",
  "construction-light",
  "dumpster",
  "road-sign-stop",
  "sign-highway",
  "bridge-pillar",
]);
add("car", "car-kit", [
  "sedan",
  "sedan-sports",
  "hatchback-sports",
  "suv",
  "suv-luxury",
  "taxi",
  "police",
  "van",
  "delivery",
  "delivery-flat",
  "truck",
  "truck-flat",
  "garbage-truck",
  "firetruck",
  "ambulance",
  "tractor",
  "tractor-shovel",
  "box",
  "cone",
]);
add("nat", "nature-kit", [
  "tree_oak",
  "tree_default",
  "tree_detailed",
  "tree_fat",
  "tree_cone",
  "tree_simple",
  "tree_small",
  "tree_tall",
  "tree_pineRoundA",
  "tree_pineRoundC",
  "tree_pineTallA",
  "tree_palm",
  "plant_bush",
  "plant_bushLarge",
  "plant_bushDetailed",
  "crops_cornStageD",
  "crops_cornStageB",
  "crops_wheatStageB",
  "crops_leafsStageB",
  "crops_dirtRow",
  "crop_pumpkin",
  "crop_melon",
  "flower_redA",
  "flower_yellowA",
  "flower_purpleA",
  "grass_large",
  "rock_largeA",
  "rock_largeC",
  "rock_smallA",
  "log_stack",
  "fence_simple",
  "lily_large",
  "canoe",
  "tent_detailedOpen",
]);

/** Parts kept as their own mesh (they animate), keyed by output name → node name. */
const SEPARATE: Record<string, string[]> = { "ind-windmill": ["blades"] };

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

function kitDir(prefix: string) {
  const dir = readdirSync(SRC).find((d) => d.startsWith(`kenney_${prefix}`) || d.startsWith(prefix));
  if (!dir) throw new Error(`kit ${prefix} not found in ${SRC}`);
  const models = join(SRC, dir, "Models");
  const fmt = readdirSync(models).find((d) => d.startsWith("GLB")) ?? readdirSync(models).find((d) => d.startsWith("GLTF"));
  return join(models, fmt!);
}

const s2l = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const pngCache = new Map<Uint8Array, PNG>();
function decode(img: Uint8Array) {
  let png = pngCache.get(img);
  if (!png) {
    png = PNG.sync.read(Buffer.from(img));
    pngCache.set(img, png);
  }
  return png;
}

type Geo = { pos: number[]; nrm: number[]; col: number[]; idx: number[] };
const newGeo = (): Geo => ({ pos: [], nrm: [], col: [], idx: [] });

function mul(m: number[], x: number, y: number, z: number, w: number): [number, number, number] {
  return [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w, m[2] * x + m[6] * y + m[10] * z + m[14] * w];
}

/** Append one primitive to a geometry, baking its palette/material colour into vertices. */
function appendPrim(geo: Geo, prim: Primitive, world: number[]) {
  const P = prim.getAttribute("POSITION")!;
  const N = prim.getAttribute("NORMAL");
  const UV = prim.getAttribute("TEXCOORD_0");
  const mat = prim.getMaterial();
  const factor = mat?.getBaseColorFactor() ?? [1, 1, 1, 1];
  const tex = mat?.getBaseColorTexture();
  const png = tex?.getImage() ? decode(tex.getImage()!) : null;
  const base = geo.pos.length / 3;
  const p: number[] = [], n: number[] = [], uv: number[] = [];
  for (let i = 0; i < P.getCount(); i++) {
    P.getElement(i, p);
    const wp = mul(world, p[0], p[1], p[2], 1);
    geo.pos.push(...wp);
    if (N) {
      N.getElement(i, n);
      const wn = mul(world, n[0], n[1], n[2], 0);
      const l = Math.hypot(...wn) || 1;
      geo.nrm.push(wn[0] / l, wn[1] / l, wn[2] / l);
    } else geo.nrm.push(0, 1, 0);
    let r = 1, g = 1, b = 1;
    if (png && UV) {
      UV.getElement(i, uv);
      const fx = uv[0] - Math.floor(uv[0]);
      const fy = uv[1] - Math.floor(uv[1]);
      const x = Math.min(png.width - 1, Math.floor(fx * png.width));
      const y = Math.min(png.height - 1, Math.floor(fy * png.height));
      const o = (y * png.width + x) * 4;
      r = s2l(png.data[o] / 255);
      g = s2l(png.data[o + 1] / 255);
      b = s2l(png.data[o + 2] / 255);
    }
    geo.col.push(r * factor[0], g * factor[1], b * factor[2]);
  }
  const I = prim.getIndices();
  if (I) for (let i = 0; i < I.getCount(); i++) geo.idx.push(base + I.getScalar(i));
  else for (let i = 0; i < P.getCount(); i++) geo.idx.push(base + i);
}

/** Merge vertices that share position, normal and colour. */
function weld(g: Geo): Geo {
  const out = newGeo();
  const map = new Map<string, number>();
  const remap: number[] = [];
  const q = (v: number, s: number) => Math.round(v * s);
  for (let i = 0; i < g.pos.length / 3; i++) {
    const key = [
      q(g.pos[i * 3], 1e4), q(g.pos[i * 3 + 1], 1e4), q(g.pos[i * 3 + 2], 1e4),
      q(g.nrm[i * 3], 100), q(g.nrm[i * 3 + 1], 100), q(g.nrm[i * 3 + 2], 100),
      q(g.col[i * 3], 255), q(g.col[i * 3 + 1], 255), q(g.col[i * 3 + 2], 255),
    ].join(",");
    let j = map.get(key);
    if (j === undefined) {
      j = out.pos.length / 3;
      map.set(key, j);
      out.pos.push(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]);
      out.nrm.push(g.nrm[i * 3], g.nrm[i * 3 + 1], g.nrm[i * 3 + 2]);
      out.col.push(g.col[i * 3], g.col[i * 3 + 1], g.col[i * 3 + 2]);
    }
    remap[i] = j;
  }
  // drop triangles that collapsed
  for (let t = 0; t < g.idx.length; t += 3) {
    const a = remap[g.idx[t]], b = remap[g.idx[t + 1]], c = remap[g.idx[t + 2]];
    if (a !== b && b !== c && a !== c) out.idx.push(a, b, c);
  }
  return out;
}

function bounds(g: Geo) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < g.pos.length; i++) {
    min[i % 3] = Math.min(min[i % 3], g.pos[i]);
    max[i % 3] = Math.max(max[i % 3], g.pos[i]);
  }
  return { min, max };
}

const out = new Document();
const buf = out.createBuffer();
const scene = out.createScene();
const palette = out.createMaterial("palette").setRoughnessFactor(0.85).setMetallicFactor(0);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const manifest: Record<string, { min: number[]; size: number[]; verts: number; pivot?: number[] }> = {};
let totalVerts = 0;

function emit(name: string, g: Geo, pivot?: number[]) {
  g = weld(g);
  const { min, max } = bounds(g);
  const mesh = out.createMesh(name);
  const prim = out
    .createPrimitive()
    .setMaterial(palette)
    .setAttribute("POSITION", out.createAccessor().setType("VEC3").setArray(new Float32Array(g.pos)).setBuffer(buf))
    .setAttribute("NORMAL", out.createAccessor().setType("VEC3").setArray(new Float32Array(g.nrm)).setBuffer(buf))
    .setAttribute("COLOR_0", out.createAccessor().setType("VEC3").setArray(new Float32Array(g.col)).setBuffer(buf))
    .setIndices(out.createAccessor().setType("SCALAR").setArray(new Uint32Array(g.idx)).setBuffer(buf));
  mesh.addPrimitive(prim);
  scene.addChild(out.createNode(name).setMesh(mesh));
  manifest[name] = { min: min.map(r3), size: max.map((v, i) => r3(v - min[i])), verts: g.pos.length / 3, ...(pivot ? { pivot: pivot.map(r3) } : {}) };
  totalVerts += g.pos.length / 3;
}

for (const [name, [kit, stem]] of Object.entries(PICK)) {
  const dir = kitDir(kit);
  const file = readdirSync(dir).find((f) => f === `${stem}.glb` || f === `${stem}.gltf`);
  if (!file) throw new Error(`${kit}/${stem} not found`);
  const doc = await io.read(join(dir, file));
  const main = newGeo();
  const parts: Record<string, { geo: Geo; pivot: number[] }> = {};
  const walk = (node: GNode, separate: string | null) => {
    const sep = separate ?? (SEPARATE[name]?.includes(node.getName()) ? node.getName() : null);
    const mesh = node.getMesh();
    if (mesh) {
      const world = node.getWorldMatrix() as unknown as number[];
      if (sep) {
        // separate parts are stored around their own pivot
        const piv = mul(world, 0, 0, 0, 1);
        parts[sep] ??= { geo: newGeo(), pivot: piv };
        const local = world.slice();
        local[12] -= parts[sep].pivot[0];
        local[13] -= parts[sep].pivot[1];
        local[14] -= parts[sep].pivot[2];
        for (const prim of mesh.listPrimitives()) appendPrim(parts[sep].geo, prim, local);
      } else for (const prim of mesh.listPrimitives()) appendPrim(main, prim, world);
    }
    for (const c of node.listChildren()) walk(c, sep);
  };
  for (const n of doc.getRoot().listScenes()[0].listChildren()) walk(n, null);
  emit(name, main);
  for (const [part, { geo, pivot }] of Object.entries(parts)) emit(`${name}-${part}`, geo, pivot);
}

out.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await out.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeColor: 8 }));

const root = join(import.meta.dirname, "..");
mkdirSync(join(root, "public", "models"), { recursive: true });
const glb = await io.writeBinary(out);
writeFileSync(join(root, "public", "models", "city.glb"), glb);

const ts = `// Generated by scripts/build-models.mts — model bounds in model units (do not edit).
export const MODELS = ${JSON.stringify(manifest, null, 0).replace(/\},"/g, '},\n  "').replace(/^\{/, "{\n  ").replace(/\}\}$/, "},\n}")} as const;

export type ModelName = keyof typeof MODELS;
`;
writeFileSync(join(root, "src", "components", "three", "models.generated.ts"), ts);
console.log(`${Object.keys(manifest).length} meshes · ${totalVerts.toLocaleString()} verts · ${(glb.byteLength / 1024).toFixed(0)} KB`);
