import React, { useState, lazy, Suspense } from 'react';
import {
  Upload,
  CheckCircle2,
  Link2,
  Send,
  X,
  Box,
  Sparkles,
} from 'lucide-react';
import { FILAMENTS, formatEUR } from '../data/filaments';
import { createInquiry } from '../api';

const ModelViewer3D = lazy(() => import('./ModelViewer3D'));

export default function CustomPrintSection({ onInquiryCreated }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [stlLink, setStlLink] = useState('');
  const [colorId, setColorId] = useState('matt-schwarz');
  const [note, setNote] = useState('');

  // Single unified upload (either an image OR a .stl 3D file!)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [stlFile, setStlFile] = useState(null);
  const [parsedStl, setParsedStl] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedId, setSubmittedId] = useState(null);

  const selectedFilament =
    FILAMENTS.find((f) => f.id === colorId) || FILAMENTS[0];

  const handlePickedFile = async (picked) => {
    if (!picked) return;
    setError('');

    if (picked.name.toLowerCase().endsWith('.stl')) {
      try {
        const [{ parseStlArrayBuffer, estimateStlPrint }, buf] = await Promise.all([
          import('../utils/stlPricing'),
          picked.arrayBuffer(),
        ]);
        const parsed = parseStlArrayBuffer(buf);
        const est = estimateStlPrint({
          parsed,
          material: 'PLA',
          infillPercent: 15,
          layerHeight: '0.16 mm',
          scalePercent: 100,
        });
        setStlFile(picked);
        setParsedStl(parsed);
        setEstimate(est);
        setImageFile(null);
        setImagePreview(null);
      } catch {
        setError('Die .STL-Datei konnte leider nicht gelesen werden.');
      }
      return;
    }

    if (picked.type?.startsWith('image/')) {
      setImageFile(picked);
      setImagePreview(URL.createObjectURL(picked));
      setStlFile(null);
      setParsedStl(null);
      setEstimate(null);
      return;
    }

    setError('Bitte ein Bild (JPG/PNG) oder eine .STL-Datei auswählen.');
  };

  const clearAttachment = () => {
    setImageFile(null);
    setImagePreview(null);
    setStlFile(null);
    setParsedStl(null);
    setEstimate(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Bitte gib kurz deinen Namen ein.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('contact', contact.trim());
      fd.append('stlLink', stlLink.trim());
      fd.append('material', 'PLA');
      fd.append('colorName', selectedFilament.name);
      fd.append('description', note.trim());

      if (estimate) {
        fd.append('dimensions', estimate.dimensionsText);
        fd.append('stlMetrics', JSON.stringify(estimate));
      }
      if (imageFile) fd.append('referenceImage', imageFile);
      if (stlFile) fd.append('stlFile', stlFile);

      const created = await createInquiry(fd);
      onInquiryCreated(created);
      setSubmittedId(created.id);
      setName('');
      setContact('');
      setStlLink('');
      setNote('');
      clearAttachment();
    } catch (err) {
      setError(err.message || 'Konnte Anfrage nicht senden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="custom-print" className="py-18 buildplate-grid relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151822] border border-[#38BDF8]/30 font-mono text-xs text-[#38BDF8]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>WUNSCHDRUCK • 100% PLA</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Eigenes 3D-Modell? Schick&apos;s mir einfach!
          </h2>
          <p className="text-sm sm:text-base text-[#9DA4B4] max-w-xl mx-auto">
            Hast du was Cooles auf MakerWorld, Printables oder Thingiverse gefunden oder ein Bild
            davon? Einfach Name, Link oder Foto rein — ich druck&apos;s dir in PLA.
          </p>
        </div>

        <div className="cad-card rounded-2xl bg-[#111318] border border-white/[0.1] p-6 sm:p-8 shadow-2xl">
          {submittedId ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                Ist angekommen! 🙌
              </h3>
              <p className="text-sm text-[#9DA4B4] max-w-md mx-auto">
                Ich schau mir dein Teil direkt an und meld mich bei dir!
                <span className="block font-mono text-xs text-[#FF7326] mt-1">
                  Nr. {submittedId}
                </span>
              </p>
              <button
                onClick={() => setSubmittedId(null)}
                className="px-5 py-2.5 rounded-xl bg-[#1A1E2A] hover:bg-[#242938] text-sm font-medium text-white border border-white/[0.1] cursor-pointer"
              >
                Noch was schicken
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs">
                  {error}
                </div>
              )}

              {/* Name + optional Contact */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Dein Name *
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Max"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    WhatsApp / Insta (optional)
                  </label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="nur falls ich dich noch nicht hab"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
              </div>

              {/* 3D Model Link */}
              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Link zum 3D-Modell (MakerWorld / Printables / Thingiverse)
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-[#7D8596] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={stlLink}
                    onChange={(e) => setStlLink(e.target.value)}
                    placeholder="https://makerworld.com/..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
              </div>

              {/* Single Dropzone for Image OR .STL */}
              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Oder Bild / .STL-Datei reinziehen (optional)
                </label>

                {parsedStl ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[#38BDF8]">
                        <Box className="w-3.5 h-3.5" />
                        {stlFile?.name}
                      </span>
                      <button
                        type="button"
                        onClick={clearAttachment}
                        className="text-[#8E95A5] hover:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Entfernen
                      </button>
                    </div>
                    <Suspense
                      fallback={
                        <div className="h-56 rounded-xl bg-[#090B10] border border-white/[0.1] flex items-center justify-center font-mono text-xs text-[#38BDF8]">
                          3D-Vorschau wird geladen...
                        </div>
                      }
                    >
                      <ModelViewer3D
                        geometry={parsedStl.geometry}
                        colorHex={selectedFilament.hex}
                        secondaryHex={selectedFilament.secondaryHex}
                        finish={selectedFilament.finish}
                        heightClass="h-56"
                        label={`3D-VORSCHAU // ${selectedFilament.name.toUpperCase()}`}
                      />
                    </Suspense>
                    {estimate && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] font-mono text-xs">
                        <span className="text-[#9DA4B4]">
                          {estimate.dimensionsText} • ~{estimate.estimatedGrams} g PLA • ~
                          {estimate.printTimeLabel}
                        </span>
                        <span className="text-[#FF7326] font-bold">
                          ca. {formatEUR(estimate.estimatedPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : imagePreview ? (
                  <div className="relative inline-flex items-center gap-3 p-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.12]">
                    <img
                      src={imagePreview}
                      alt="Bildvorschau"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="text-xs text-[#C4CAD6] pr-7">{imageFile?.name}</div>
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="absolute top-2 right-2 p-1 rounded-md bg-white/10 hover:bg-red-500/30 text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      handlePickedFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border border-dashed text-xs cursor-pointer transition-colors ${
                      dragActive
                        ? 'border-[#FF5500] bg-[#FF5500]/10 text-white'
                        : 'border-white/[0.16] hover:border-[#FF5500]/60 bg-[#0C0E13] text-[#9DA4B4] hover:text-white'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-[#FF5500]" />
                    <span>Bild, Screenshot oder .STL-Datei auswählen</span>
                    <input
                      type="file"
                      accept="image/*,.stl"
                      onChange={(e) => handlePickedFile(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 5 PLA Colors Click-Pills */}
              <div>
                <div className="text-xs font-mono text-[#9DA4B4] mb-2">
                  Wunschfarbe (PLA)
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILAMENTS.map((f) => {
                    const active = colorId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setColorId(f.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1B202C] border-[#FF5500] text-white shadow-[0_0_14px_rgba(255,85,0,0.22)]'
                            : 'bg-[#0C0E13] border-white/[0.08] text-[#9DA4B4] hover:border-white/25'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ background: f.swatch || f.hex }}
                        />
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Short optional message */}
              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Kurze Nachricht (optional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="z.B. wie groß ungefähr, oder einfach was dir einfällt..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_10px_28px_rgba(255,85,0,0.28)] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Wird gesendet...' : 'Anfrage schicken'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
