import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { RotateCcw, Grid, Pause, Play, Box } from 'lucide-react';

function buildMaterial(colorHex, finish = 'Matte', wireframe = false, secondaryHex = null) {
  const f = (finish || '').toLowerCase();
  const isSilk = f.includes('silk');
  const isDual = f.includes('dual');
  const isGalaxy = f.includes('galaxy');
  const isClear = f.includes('translucent');
  const isCarbon = f.includes('carbon');

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex || '#FF5500'),
    roughness: isSilk || isDual ? 0.24 : isGalaxy ? 0.28 : isClear ? 0.14 : isCarbon ? 0.72 : 0.62,
    metalness: isSilk ? 0.62 : isDual ? 0.45 : isGalaxy ? 0.52 : isCarbon ? 0.18 : 0.05,
    clearcoat: isSilk || isDual ? 0.75 : isGalaxy ? 0.85 : isClear ? 0.9 : 0.06,
    clearcoatRoughness: isGalaxy ? 0.18 : 0.28,
    iridescence: isGalaxy ? 1.0 : isDual ? 0.65 : 0,
    iridescenceIOR: isGalaxy ? 1.55 : 1.3,
    sheen: isDual || isGalaxy ? 1.0 : 0,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color(secondaryHex || colorHex || '#FFFFFF'),
    transparent: isClear,
    opacity: isClear ? 0.76 : 1,
    wireframe,
  });
}

function buildDemoGroup(demoModel, material) {
  const group = new THREE.Group();

  if (demoModel === 'voronoi-lamp') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.25, 32), material);
    base.position.y = 0.125;
    group.add(base);

    const outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 1),
      new THREE.MeshPhysicalMaterial({
        color: material.color,
        roughness: 0.45,
        metalness: 0.15,
        wireframe: true,
      })
    );
    outer.scale.set(0.95, 1.38, 0.95);
    outer.position.y = 1.9;
    group.add(outer);

    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.15, 3.0, 12, 6, true), material);
    shell.position.y = 1.75;
    shell.material = material.clone();
    shell.material.wireframe = true;
    group.add(shell);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 2.35, 24),
      new THREE.MeshStandardMaterial({
        color: '#FF7A26',
        emissive: '#FF5500',
        emissiveIntensity: 1.35,
        roughness: 0.3,
      })
    );
    core.position.y = 1.65;
    group.add(core);
  } else if (demoModel === 'headphone-stand') {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.24, 36), material);
    foot.position.y = 0.12;
    group.add(foot);

    for (let i = 0; i < 9; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.62 - i * 0.02, 0.16, 0.34), material);
      rib.position.set(0, 0.42 + i * 0.28, -0.06 * Math.sin(i * 0.35));
      group.add(rib);
    }
    const cradle = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.18, 16, 36, Math.PI),
      material
    );
    cradle.position.set(0, 2.85, 0);
    group.add(cradle);
  } else if (demoModel === 'articulated-dragon') {
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const angle = t * Math.PI * 2.15;
      const radius = 1.45 - t * 0.65;
      const segSize = 0.38 - t * 0.18;
      const seg = new THREE.Mesh(new THREE.OctahedronGeometry(segSize, 0), material);
      seg.position.set(Math.cos(angle) * radius, 0.32 + Math.sin(t * Math.PI) * 0.45, Math.sin(angle) * radius);
      seg.rotation.set(t * 2, -angle, 0.4);
      group.add(seg);
    }
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 5), material);
    head.position.set(1.5, 0.72, 0.25);
    head.rotation.set(0.3, 0.2, -1.1);
    group.add(head);
  } else if (demoModel === 'desk-organizer') {
    const offsets = [
      [0, 0, 1.35],
      [1.22, 0, 0.92],
      [-1.22, 0, 1.1],
      [0.62, 1.08, 0.62],
      [-0.62, 1.08, 0.78],
    ];
    offsets.forEach(([x, z, h]) => {
      const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, h, 6), material);
      hex.position.set(x, h / 2, z);
      group.add(hex);
    });
  } else if (demoModel === 'spiral-planter') {
    const geo = new THREE.CylinderGeometry(1.35, 0.95, 2.4, 24, 24, false);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const twist = y * 0.55;
      const wave = 1 + 0.08 * Math.sin(y * 7.5 + Math.atan2(z, x) * 6);
      pos.setXYZ(
        i,
        (x * Math.cos(twist) - z * Math.sin(twist)) * wave,
        y + 1.2,
        (x * Math.sin(twist) + z * Math.cos(twist)) * wave
      );
    }
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo, material));
  } else {
    // controller-dock or generic faceted stand
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 1.8), material);
    base.position.y = 0.14;
    group.add(base);
    const leftArm = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 4), material);
    leftArm.position.set(-0.78, 1.0, -0.15);
    leftArm.rotation.z = -0.22;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 4), material);
    rightArm.position.set(0.78, 1.0, -0.15);
    rightArm.rotation.z = 0.22;
    group.add(rightArm);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 0.3), material);
    back.position.set(0, 0.92, -0.52);
    back.rotation.x = -0.25;
    group.add(back);
  }

  return group;
}

export default function ModelViewer3D({
  geometry = null,
  modelUrl = null,
  demoModel = null,
  colorHex = '#FF5500',
  secondaryHex = null,
  finish = 'Matte',
  scaleFactor = 1,
  heightClass = 'h-72 sm:h-80',
  label = 'Interaktive 3D-Vorschau',
}) {
  const containerRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const objectRef = useRef(null);
  const materialRef = useRef(null);
  const autoRotateRef = useRef(true);

  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(Boolean(modelUrl && !geometry));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090B10');

    const width = container.clientWidth || 420;
    const height = container.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    camera.position.set(4.2, 3.3, 4.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio 3-point lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x111318, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(6, 9, 6);
    scene.add(keyLight);

    const rimOrange = new THREE.DirectionalLight(0xff6b2b, 0.9);
    rimOrange.position.set(-6, 4, -5);
    scene.add(rimOrange);

    const fillCyan = new THREE.DirectionalLight(0x38bdf8, 0.65);
    fillCyan.position.set(-4, 2, 6);
    scene.add(fillCyan);

    // 3D Printer Build Plate Grid
    const grid = new THREE.GridHelper(7, 14, 0xff5500, 0x222635);
    grid.position.y = 0;
    scene.add(grid);

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0e1118,
      roughness: 0.9,
      metalness: 0.1,
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), plateMat);
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = -0.01;
    scene.add(plate);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 1.8;
    controls.target.set(0, 1.15, 0);
    controls.minDistance = 2.0;
    controls.maxDistance = 12;
    controls.update();
    controlsRef.current = controls;

    const mat = buildMaterial(colorHex, finish, wireframe, secondaryHex);
    materialRef.current = mat;

    const mountGeometry = (rawGeo) => {
      const cloned = rawGeo.clone();
      cloned.computeBoundingBox();
      cloned.computeVertexNormals();
      const box = cloned.boundingBox;
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Center X/Z and rest bottom flush on Z=0 build plate
      cloned.translate(-center.x, -box.min.y, -center.z);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const normScale = (2.8 / maxDim) * (scaleFactor || 1);

      const mesh = new THREE.Mesh(cloned, mat);
      mesh.scale.setScalar(normScale);

      // Rotate common Z-up STLs if height is mostly on Z? Keep Y-up friendly auto-fit
      const meshBox = new THREE.Box3().setFromObject(mesh);
      const meshCenter = new THREE.Vector3();
      meshBox.getCenter(meshCenter);
      controls.target.set(0, Math.max(0.6, meshCenter.y), 0);
      controls.update();

      scene.add(mesh);
      objectRef.current = mesh;
    };

    let cancelled = false;
    setLoadError('');

    if (geometry) {
      setLoading(false);
      mountGeometry(geometry);
    } else if (modelUrl) {
      setLoading(true);
      const loader = new STLLoader();
      loader.load(
        modelUrl,
        (loadedGeo) => {
          if (cancelled) return;
          setLoading(false);
          mountGeometry(loadedGeo);
        },
        undefined,
        () => {
          if (cancelled) return;
          setLoading(false);
          setLoadError('3D-Datei konnte nicht geladen werden.');
        }
      );
    } else if (demoModel) {
      setLoading(false);
      const demoGroup = buildDemoGroup(demoModel, mat);
      demoGroup.scale.setScalar(scaleFactor || 1);
      scene.add(demoGroup);
      objectRef.current = demoGroup;
    }

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 420;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      mat.dispose();
      plate.geometry.dispose();
      plateMat.dispose();
    };
  }, [geometry, modelUrl, demoModel, scaleFactor]);

  // Live color, finish & wireframe updates without re-mounting WebGL scene
  useEffect(() => {
    const obj = objectRef.current;
    if (!obj) return;
    const nextMat = buildMaterial(colorHex, finish, wireframe, secondaryHex);
    obj.traverse((child) => {
      if (child.isMesh && !child.material?.emissiveIntensity) {
        if (child.material && child.material !== materialRef.current) {
          child.material.dispose?.();
        }
        child.material = nextMat;
      }
    });
    if (materialRef.current) {
      materialRef.current.dispose();
    }
    materialRef.current = nextMat;
  }, [colorHex, secondaryHex, finish, wireframe]);

  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(4.2, 3.3, 4.6);
    controlsRef.current.update();
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#090B10] border border-white/[0.1] select-none">
      <div ref={containerRef} className={`w-full ${heightClass} cursor-grab active:cursor-grabbing`} />

      {/* Top Left Badge */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/[0.12] font-mono text-[10px] text-[#D7DCE6]">
        <Box className="w-3 h-3 text-[#FF5500]" />
        <span>{label}</span>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setWireframe((w) => !w)}
          title="Mesh / Wireframe Ansicht"
          className={`p-1.5 rounded-lg border text-xs backdrop-blur-md transition-colors cursor-pointer ${
            wireframe
              ? 'bg-[#FF5500] border-[#FF5500] text-white'
              : 'bg-black/65 border-white/[0.12] text-[#C4CAD6] hover:text-white'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((r) => !r)}
          title={autoRotate ? 'Rotation pausieren' : 'Auto-Rotation starten'}
          className="p-1.5 rounded-lg bg-black/65 border border-white/[0.12] text-[#C4CAD6] hover:text-white backdrop-blur-md cursor-pointer"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={resetCamera}
          title="Kamera zurücksetzen"
          className="p-1.5 rounded-lg bg-black/65 border border-white/[0.12] text-[#C4CAD6] hover:text-white backdrop-blur-md cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between font-mono text-[10px] text-[#7D8596]">
        <span>Ziehen zum Drehen • Scrollen zum Zoomen</span>
        <span>256 × 256 mm Druckbett</span>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono text-xs text-[#38BDF8]">
          3D-Modell wird geladen...
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center font-mono text-xs text-red-400 p-4 text-center">
          {loadError}
        </div>
      )}
    </div>
  );
}
