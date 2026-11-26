import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  Link2,
  Send,
  Layers,
  X,
  Box,
  Calculator,
  Clock,
  Scale,
  Ruler,
  AlertTriangle,
  Wand2,
} from 'lucide-react';
import { FILAMENTS, MATERIALS, formatEUR } from '../data/filaments';
import { createInquiry } from '../api';
import {
  parseStlArrayBuffer,
  estimateStlPrint,
  createSampleStlFile,
} from '../utils/stlPricing';
import ModelViewer3D from './ModelViewer3D';

export default function CustomPrintSection({ onInquiryCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    projectTitle: '',
    description: '',
    stlLink: '',
    material: 'PLA Matte',
    colorId: 'galaxy-blau-lila',
    dimensions: '',
    budget: '',
  });
  const [refImageFile, setRefImageFile] = useState(null);
  const [refPreview, setRefPreview] = useState(null);

  // Live STL Calculator State
  const [stlFile, setStlFile] = useState(null);
  const [parsedStl, setParsedStl] = useState(null);
  const [stlError, setStlError] = useState('');
  const [infillPercent, setInfillPercent] = useState(20);
  const [layerHeight, setLayerHeight] = useState('0.16 mm');
  const [scalePercent, setScalePercent] = useState(100);
  const [dragActive, setDragActive] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedId, setSubmittedId] = useState(null);

  const selectedFilament =
    FILAMENTS.find((f) => f.id === form.colorId) || FILAMENTS[0];

  const estimate = useMemo(
    () =>
      estimateStlPrint({
        parsed: parsedStl,
        material: form.material,
        infillPercent,
        layerHeight,
        scalePercent,
      }),
    [parsedStl, form.material, infillPercent, layerHeight, scalePercent]
  );

  const processStlFile = async (pickedFile) => {
    if (!pickedFile) return;
    setStlError('');
    if (!pickedFile.name.toLowerCase().endsWith('.stl')) {
      setStlError('Für die Live-3D-Berechnung bitte eine .STL-Datei auswählen.');
      return;
    }
    try {
      const buf = await pickedFile.arrayBuffer();
      const parsed = parseStlArrayBuffer(buf);
      setStlFile(pickedFile);
      setParsedStl(parsed);
      setScalePercent(100);
      setForm((prev) => ({
        ...prev,
        projectTitle:
          prev.projectTitle || pickedFile.name.replace(/\.stl$/i, ''),
      }));
    } catch {
      setStlError('Die .STL-Datei konnte nicht eingelesen werden.');
    }
  };

  const handleLoadSampleStl = () => {
    const sample = createSampleStlFile();
    processStlFile(sample);
  };

  const clearStl = () => {
    setStlFile(null);
    setParsedStl(null);
    setStlError('');
  };

  const handleRefFileChange = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setRefImageFile(picked);
    setRefPreview(URL.createObjectURL(picked));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('projectTitle', form.projectTitle);
      fd.append('description', form.description);
      fd.append('stlLink', form.stlLink);
      fd.append('material', form.material);
      fd.append('colorName', selectedFilament.name);
      fd.append(
        'dimensions',
        estimate ? estimate.dimensionsText : form.dimensions
      );
      fd.append(
        'budget',
        estimate ? `ca. ${formatEUR(estimate.estimatedPrice)} (STL-Rechner)` : form.budget
      );
      if (estimate) {
        fd.append(
          'stlMetrics',
          JSON.stringify({
            ...estimate,
            infillPercent,
            layerHeight,
            scalePercent,
          })
        );
      }
      if (refImageFile) fd.append('referenceImage', refImageFile);
      if (stlFile) fd.append('stlFile', stlFile);

      const created = await createInquiry(fd);
      onInquiryCreated(created);
      setSubmittedId(created.id);
      setForm({
        name: '',
        email: '',
        projectTitle: '',
        description: '',
        stlLink: '',
        material: 'PLA Matte',
        colorId: 'galaxy-blau-lila',
        dimensions: '',
        budget: '',
      });
      setRefImageFile(null);
      setRefPreview(null);
      clearStl();
    } catch (err) {
      setError(err.message || 'Anfrage konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="custom-print" className="py-20 buildplate-grid relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151822] border border-[#38BDF8]/30 font-mono text-xs text-[#38BDF8] mb-3">
              <Calculator className="w-3.5 h-3.5" />
              <span>LIVE .STL 3D-PREISRECHNER & WUNSCHDRUCK</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
              Eigenes 3D-Modell? Preis sofort berechnen.
            </h2>
            <p className="text-[#9DA4B4] mt-2 max-w-2xl">
              Zieh einfach deine <code className="font-mono text-[#FF7326]">.STL</code>-Datei
              hinein — wir zeigen dir sofort die drehbare 3D-Vorschau in deiner Wunschfarbe,
              berechnen Volumen, Gramm, Druckzeit & Preisvorschlag und drucken sie für dich.
            </p>
          </div>
          {!parsedStl && (
            <button
              type="button"
              onClick={handleLoadSampleStl}
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161B26] hover:bg-[#1F2636] border border-[#38BDF8]/40 text-xs font-mono text-[#38BDF8] transition-colors cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>Beispiel-.STL laden & Rechner testen</span>
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: INTERACTIVE STL DROPZONE, LIVE 3D VIEWER & PRICE CALCULATOR */}
          <div className="lg:col-span-6 space-y-4">
            <div className="cad-card rounded-2xl bg-[#111318] border border-white/[0.1] p-5 sm:p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[#FF5500]" />
                  <h3 className="font-display text-lg font-bold text-white">
                    Live .STL Analyzer & 3D-Vorschau
                  </h3>
                </div>
                {parsedStl && (
                  <button
                    type="button"
                    onClick={clearStl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-xs font-mono text-[#9DA4B4] hover:text-red-300 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>STL entfernen</span>
                  </button>
                )}
              </div>

              {stlError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300">
                  {stlError}
                </div>
              )}

              {!parsedStl ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    processStlFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center space-y-3 transition-all ${
                    dragActive
                      ? 'border-[#FF5500] bg-[#FF5500]/10'
                      : 'border-white/[0.14] bg-[#0B0D12]'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#FF5500]/15 border border-[#FF5500]/35 flex items-center justify-center mx-auto">
                    <Box className="w-7 h-7 text-[#FF5500]" />
                  </div>
                  <div className="font-display text-base font-semibold text-white">
                    .STL-Datei hierher ziehen oder auswählen
                  </div>
                  <p className="text-xs text-[#8E95A5] max-w-sm mx-auto">
                    100% live im Browser berechnet: Exaktes Mesh-Volumen, Filamentgewicht in Gramm,
                    Druckzeit und sofortiger Richtpreis.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>.STL Datei wählen</span>
                      <input
                        type="file"
                        accept=".stl"
                        onChange={(e) => processStlFile(e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSampleStl}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#181D29] hover:bg-[#22293A] border border-white/[0.1] text-xs font-mono text-[#38BDF8] cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Demo-.STL testen</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Live 3D WebGL Preview of the uploaded STL */}
                  <ModelViewer3D
                    geometry={parsedStl.geometry}
                    colorHex={selectedFilament.hex}
                    secondaryHex={selectedFilament.secondaryHex}
                    finish={selectedFilament.finish}
                    scaleFactor={scalePercent / 100}
                    heightClass="h-64 sm:h-72"
                    label={`${stlFile?.name || 'STL'} • ${selectedFilament.name}`}
                  />

                  {/* Live Print Parameter Controls */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-mono text-[#7D8596] uppercase mb-1">
                        Schichthöhe
                      </label>
                      <select
                        value={layerHeight}
                        onChange={(e) => setLayerHeight(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-xs text-white"
                      >
                        <option value="0.12 mm">0.12 mm (Ultra)</option>
                        <option value="0.16 mm">0.16 mm (Fein)</option>
                        <option value="0.20 mm">0.20 mm (Standard)</option>
                        <option value="0.28 mm">0.28 mm (Schnell)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#7D8596] uppercase mb-1">
                        Infill (Stabilität)
                      </label>
                      <select
                        value={infillPercent}
                        onChange={(e) => setInfillPercent(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-xs text-white"
                      >
                        <option value={15}>15% (Deko)</option>
                        <option value={20}>20% (Standard)</option>
                        <option value={40}>40% (Stabil)</option>
                        <option value={80}>80% (Massiv)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#7D8596] uppercase mb-1">
                        Skalierung: {scalePercent}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="160"
                        step="5"
                        value={scalePercent}
                        onChange={(e) => setScalePercent(Number(e.target.value))}
                        className="w-full mt-2 accent-[#FF5500]"
                      />
                    </div>
                  </div>

                  {/* Live Color Quick-Picker for the STL */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FILAMENTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        title={`${f.name} (${f.finish})`}
                        onClick={() => setForm({ ...form, colorId: f.id })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          form.colorId === f.id
                            ? 'border-[#FF5500] scale-115 shadow-[0_0_12px_rgba(255,85,0,0.6)]'
                            : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ background: f.swatch || f.hex }}
                      />
                    ))}
                    <span className="text-xs font-mono text-[#9DA4B4] ml-2">
                      {selectedFilament.name}
                    </span>
                  </div>

                  {/* Computed Metrics & Price Card */}
                  {estimate && (
                    <div className="p-4 rounded-xl bg-[#0B0D12] border border-[#FF5500]/35 space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                        <div>
                          <div className="font-mono text-[10px] text-[#7D8596] uppercase">
                            Geschätzter Preisvorschlag ({form.material})
                          </div>
                          <div className="font-mono text-2xl font-bold text-[#FF7326]">
                            {formatEUR(estimate.estimatedPrice)}
                          </div>
                        </div>
                        <div className="text-right">
                          {estimate.fitsBuildPlate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/35 font-mono text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Passt auf 256³ mm Bett
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/35 font-mono text-[11px] text-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Größer als 256 mm (Teilung nötig)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-[#141720]">
                          <div className="flex items-center gap-1 text-[#7D8596] text-[10px]">
                            <Ruler className="w-3 h-3 text-[#38BDF8]" />
                            Maße
                          </div>
                          <div className="font-mono font-semibold text-white text-[11px] mt-0.5">
                            {estimate.dimensionsText}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#141720]">
                          <div className="flex items-center gap-1 text-[#7D8596] text-[10px]">
                            <Scale className="w-3 h-3 text-[#FF5500]" />
                            Filament
                          </div>
                          <div className="font-mono font-semibold text-white text-[11px] mt-0.5">
                            ~{estimate.estimatedGrams} g ({estimate.volumeCm3} cm³)
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#141720]">
                          <div className="flex items-center gap-1 text-[#7D8596] text-[10px]">
                            <Clock className="w-3 h-3 text-[#38BDF8]" />
                            Druckzeit
                          </div>
                          <div className="font-mono font-semibold text-white text-[11px] mt-0.5">
                            ~{estimate.printTimeLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick 3-step summary */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-[11px] text-[#8E95A5]">
                <div>
                  <span className="font-mono text-[#FF5500] font-bold">01</span> .STL oder Link
                  schicken
                </div>
                <div>
                  <span className="font-mono text-[#FF5500] font-bold">02</span> Exaktes Slicing &
                  Freigabe
                </div>
                <div>
                  <span className="font-mono text-[#FF5500] font-bold">03</span> Druck & DHL-Versand
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CUSTOM PRINT INQUIRY FORM */}
          <div className="lg:col-span-6">
            <div className="cad-card rounded-2xl bg-[#111318] border border-white/[0.1] p-6 sm:p-7 shadow-2xl">
              {submittedId ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Wunschdruck-Anfrage gesendet!
                  </h3>
                  <p className="text-sm text-[#9DA4B4] max-w-md mx-auto">
                    Deine Anfrage <span className="font-mono text-[#FF7326]">{submittedId}</span>{' '}
                    (inkl. deiner Daten & evtl. .STL-Datei) ist im Creator Studio eingegangen. Wir
                    melden uns kurzfristig mit dem finalen Druck-Go!
                  </p>
                  <button
                    onClick={() => setSubmittedId(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#1A1E2A] hover:bg-[#242938] text-sm font-medium text-white border border-white/[0.1] cursor-pointer"
                  >
                    Weitere Anfrage stellen
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#FF5500]" />
                      <h3 className="font-display text-lg font-bold text-white">
                        {stlFile ? 'Berechnete .STL direkt anfragen' : 'Wunschdruck unverbindlich anfragen'}
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] text-[#7D8596]">ANTWORT IN 24H</span>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs">
                      {error}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                        Dein Name *
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Alex"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                        E-Mail *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="alex@beispiel.de"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                      Projekttitel / Was soll gedruckt werden? *
                    </label>
                    <input
                      required
                      value={form.projectTitle}
                      onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                      placeholder="z.B. Kopfhörer-Halter für Schreibtischkante / Custom Logo"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                        Material
                      </label>
                      <select
                        value={form.material}
                        onChange={(e) => setForm({ ...form, material: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                      >
                        {MATERIALS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                        Wunschfarbe
                      </label>
                      <select
                        value={form.colorId}
                        onChange={(e) => setForm({ ...form, colorId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                      >
                        {FILAMENTS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.finish})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!estimate && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                          Ca. Maße (optional)
                        </label>
                        <input
                          value={form.dimensions}
                          onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                          placeholder="z.B. 12 × 8 × 5 cm"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                          Link (MakerWorld / Printables)
                        </label>
                        <div className="relative">
                          <Link2 className="w-4 h-4 text-[#7D8596] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            value={form.stlLink}
                            onChange={(e) => setForm({ ...form, stlLink: e.target.value })}
                            placeholder="https://makerworld.com/..."
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                      Hinweise & Anforderungen
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Indoor oder Outdoor? Besondere Stabilität oder Stückzahl?"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white resize-none"
                    />
                  </div>

                  {/* Optional Reference Image */}
                  <div>
                    <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                      Referenzbild / Skizze (optional)
                    </label>
                    {refPreview ? (
                      <div className="relative inline-flex items-center gap-3 p-2 rounded-xl bg-[#0C0E13] border border-white/[0.12]">
                        <img
                          src={refPreview}
                          alt="Referenz"
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                        <div className="text-xs text-[#C4CAD6] pr-6">{refImageFile?.name}</div>
                        <button
                          type="button"
                          onClick={() => {
                            setRefImageFile(null);
                            setRefPreview(null);
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/10 hover:bg-red-500/30 text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/[0.14] hover:border-[#FF5500]/60 bg-[#0C0E13] text-xs text-[#9DA4B4] hover:text-white cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-[#FF5500]" />
                        <span>Bild / Screenshot anhängen (PNG, JPG, WEBP)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRefFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_10px_28px_rgba(255,85,0,0.28)] transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {submitting
                        ? 'Wird übermittelt...'
                        : estimate
                        ? `Mit .STL anfragen (Richtpreis ${formatEUR(estimate.estimatedPrice)})`
                        : 'Wunschdruck kostenlos anfragen'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
