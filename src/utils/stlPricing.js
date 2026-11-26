import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export const MATERIAL_PROFILES = {
  PLA: { density: 1.24, eurPerGram: 0.045, ratePerHour: 2.5, setupFee: 4.0 },
};

const LAYER_SPEED_FACTOR = {
  '0.12 mm': 1.45,
  '0.16 mm': 1.15,
  '0.20 mm': 0.9,
  '0.28 mm': 0.72,
};

export function parseStlArrayBuffer(buffer) {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const pos = geometry.attributes.position;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  let signedVolumeMm3 = 0;
  let surfaceAreaMm2 = 0;

  for (let i = 0; i < pos.count; i += 3) {
    v0.fromBufferAttribute(pos, i);
    v1.fromBufferAttribute(pos, i + 1);
    v2.fromBufferAttribute(pos, i + 2);

    cross.crossVectors(v1, v2);
    signedVolumeMm3 += v0.dot(cross) / 6.0;

    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    cross.crossVectors(edge1, edge2);
    surfaceAreaMm2 += cross.length() * 0.5;
  }

  const box = geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);

  const rawVolMm3 = Math.abs(signedVolumeMm3);
  const volumeCm3 = Math.max(0.5, rawVolMm3 / 1000);
  const surfaceCm2 = Math.max(1, surfaceAreaMm2 / 100);

  return {
    geometry,
    triangles: Math.floor(pos.count / 3),
    baseSizeMm: {
      x: Math.round(size.x * 10) / 10,
      y: Math.round(size.y * 10) / 10,
      z: Math.round(size.z * 10) / 10,
    },
    baseVolumeCm3: Math.round(volumeCm3 * 100) / 100,
    baseSurfaceCm2: Math.round(surfaceCm2 * 100) / 100,
  };
}

export function estimateStlPrint({
  parsed,
  material = 'PLA',
  infillPercent = 15,
  layerHeight = '0.16 mm',
  scalePercent = 100,
}) {
  if (!parsed) return null;

  const profile = MATERIAL_PROFILES[material] || MATERIAL_PROFILES.PLA;
  const s = Math.max(25, Math.min(250, Number(scalePercent) || 100)) / 100;

  const widthMm = Math.round(parsed.baseSizeMm.x * s * 10) / 10;
  const depthMm = Math.round(parsed.baseSizeMm.y * s * 10) / 10;
  const heightMm = Math.round(parsed.baseSizeMm.z * s * 10) / 10;

  const totalVolumeCm3 = parsed.baseVolumeCm3 * s * s * s;
  const surfaceCm2 = parsed.baseSurfaceCm2 * s * s;

  // Approximate shell (1.2mm wall) + interior infill ratio
  const shellVolCm3 = Math.min(totalVolumeCm3, surfaceCm2 * 0.12);
  const innerVolCm3 = Math.max(0, totalVolumeCm3 - shellVolCm3);
  const infillRatio = Math.max(0.1, Math.min(1, Number(infillPercent) / 100));
  const effectiveMaterialCm3 = shellVolCm3 + innerVolCm3 * infillRatio;

  const estimatedGrams = Math.max(4, Math.round(effectiveMaterialCm3 * profile.density * 10) / 10);

  // Typical modern high-speed printer (~11-14 cm³/h effective with travel & walls)
  const layerFactor = LAYER_SPEED_FACTOR[layerHeight] || 1.15;
  const rawMinutes = Math.max(
    22,
    Math.round((effectiveMaterialCm3 / 11.5) * 60 * layerFactor + 12)
  );
  const hours = Math.floor(rawMinutes / 60);
  const mins = rawMinutes % 60;
  const printTimeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const materialCost = estimatedGrams * profile.eurPerGram;
  const machineCost = (rawMinutes / 60) * profile.ratePerHour;
  const estimatedPrice = Math.max(
    9.9,
    Math.round((profile.setupFee + materialCost + machineCost) * 10) / 10
  );

  const fitsBuildPlate = widthMm <= 256 && depthMm <= 256 && heightMm <= 256;

  return {
    widthMm,
    depthMm,
    heightMm,
    dimensionsText: `${Math.round(widthMm)} × ${Math.round(depthMm)} × ${Math.round(heightMm)} mm`,
    volumeCm3: Math.round(totalVolumeCm3 * 10) / 10,
    estimatedGrams,
    rawMinutes,
    printTimeLabel,
    estimatedPrice,
    fitsBuildPlate,
    triangles: parsed.triangles,
  };
}

/**
 * Creates a real binary STL file in-memory (a parametric twisted hex vase/holder)
 * so visitors can test the live STL calculator & 3D preview with one click!
 */
export function createSampleStlFile() {
  const geo = new THREE.CylinderGeometry(32, 24, 95, 7, 16, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const twist = (y / 95) * 1.15;
    const ripple = 1 + 0.08 * Math.sin((y / 95) * Math.PI * 6);
    const nx = (x * Math.cos(twist) - z * Math.sin(twist)) * ripple;
    const nz = (x * Math.sin(twist) + z * Math.cos(twist)) * ripple;
    pos.setXYZ(i, nx, y + 47.5, nz);
  }
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  nonIndexed.computeVertexNormals();
  const p = nonIndexed.attributes.position;
  const triCount = Math.floor(p.count / 3);

  const bufferLength = 84 + triCount * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);
  view.setUint32(80, triCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    a.fromBufferAttribute(p, i * 3);
    b.fromBufferAttribute(p, i * 3 + 1);
    c.fromBufferAttribute(p, i * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac).normalize();

    view.setFloat32(offset, normal.x, true); offset += 4;
    view.setFloat32(offset, normal.y, true); offset += 4;
    view.setFloat32(offset, normal.z, true); offset += 4;

    view.setFloat32(offset, a.x, true); offset += 4;
    view.setFloat32(offset, a.y, true); offset += 4;
    view.setFloat32(offset, a.z, true); offset += 4;

    view.setFloat32(offset, b.x, true); offset += 4;
    view.setFloat32(offset, b.y, true); offset += 4;
    view.setFloat32(offset, b.z, true); offset += 4;

    view.setFloat32(offset, c.x, true); offset += 4;
    view.setFloat32(offset, c.y, true); offset += 4;
    view.setFloat32(offset, c.z, true); offset += 4;

    view.setUint16(offset, 0, true); offset += 2;
  }

  geo.dispose();
  nonIndexed.dispose();

  return new File([buffer], 'layerlab-twisted-hex-holder.stl', {
    type: 'model/stl',
  });
}
