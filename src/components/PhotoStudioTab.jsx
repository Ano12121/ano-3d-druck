import React, { useState } from 'react';
import {
  Camera,
  Sparkles,
  Upload,
  Smartphone,
  Wand2,
  Inbox,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
  Trash2,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { FILAMENTS } from '../data/filaments';
import {
  saveGeminiApiKey,
  transformStudioPhoto,
  saveLocalStudioPhoto,
  deleteStudioPhoto,
} from '../api';
import { renderLocalStudioLook } from '../utils/localStudioFilter';

const STYLE_PRESETS = [
  {
    id: 'obsidian-dark',
    name: 'Dark Obsidian Studio',
    desc: 'Dunkler Schiefer & Signal-Orange Rim-Light (Shop-Look)',
    swatch: 'linear-gradient(135deg, #0D0F14 0%, #1F2330 65%, #FF5500 100%)',
  },
  {
    id: 'cyber-galaxy',
    name: 'Cyber Neon Desk',
    desc: 'Dunkles Alu & Blau-Lila / Cyan Ambient-Glow',
    swatch: 'linear-gradient(135deg, #0B0D14 0%, #4F46E5 60%, #38BDF8 100%)',
  },
  {
    id: 'warm-atelier',
    name: 'Architektur-Beton Warm',
    desc: 'Dunkler Betonsockel & warmes Galerie-Spotlight',
    swatch: 'linear-gradient(135deg, #151412 0%, #3F372E 60%, #F59E0B 100%)',
  },
  {
    id: 'clean-gallery',
    name: 'Minimalist Hell-Grau',
    desc: 'Heller Design-Sockel — mega Kontrast für Matt-Schwarz',
    swatch: 'linear-gradient(135deg, #E5E7EB 0%, #CBD5E1 60%, #94A3B8 100%)',
  },
];

export default function PhotoStudioTab({
  geminiConfigured,
  lanUrls,
  studioPhotos,
  onRefresh,
  onUseForProduct,
  onShowToast,
}) {
  const [rawFile, setRawFile] = useState(null);
  const [rawPreview, setRawPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('obsidian-dark');
  const [colorOverride, setColorOverride] = useState('original');
  const [customNote, setCustomNote] = useState('');
  const [busyMode, setBusyMode] = useState(null); // 'gemini' | 'local' | 'raw-inbox'
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Inline Gemini API Key Setup
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const [copiedUrl, setCopiedUrl] = useState(false);

  const mobileUrl = lanUrls?.[0] || window.location.origin;

  const pickFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Bitte wähle ein Bild (JPG, PNG, WEBP, HEIC) aus.');
      return;
    }
    setError('');
    setRawFile(file);
    setRawPreview(URL.createObjectURL(file));
    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    setSavingKey(true);
    setError('');
    try {
      await saveGeminiApiKey(apiKeyInput);
      setApiKeyInput('');
      setShowKeyBox(false);
      await onRefresh();
      onShowToast('Gemini API-Key gespeichert — KI Fotostudio ist jetzt LIVE!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearKey = async () => {
    await saveGeminiApiKey('');
    await onRefresh();
    onShowToast('Gemini API-Key entfernt.');
  };

  const runGeminiOrInbox = async (mode) => {
    if (!rawFile) {
      setError('Bitte lade zuerst ein Handyfoto deines 3D-Drucks hoch.');
      return;
    }
    setError('');
    setBusyMode(mode);
    try {
      const fd = new FormData();
      fd.append('rawPhoto', rawFile);
      fd.append('title', title || 'Mein 3D-Druck');
      fd.append('style', style);
      fd.append('colorOverride', colorOverride);
      fd.append('customNote', customNote);
      fd.append('mode', mode);

      await transformStudioPhoto(fd);
      await onRefresh();
      setRawFile(null);
      setRawPreview(null);
      setTitle('');
      setCustomNote('');
      onShowToast(
        mode === 'gemini'
          ? 'Dein KI Studio-Foto ist fertig!'
          : 'Handyfoto in Rohfoto-Inbox gespeichert — sag mir im Chat Bescheid!'
      );
    } catch (err) {
      setError(err.message || 'Konnte Foto nicht verarbeiten.');
    } finally {
      setBusyMode(null);
    }
  };

  const runLocalStudioFilter = async () => {
    if (!rawFile) {
      setError('Bitte lade zuerst ein Handyfoto deines 3D-Drucks hoch.');
      return;
    }
    setError('');
    setBusyMode('local');
    try {
      const styledFile = await renderLocalStudioLook(rawFile, style);
      const fd = new FormData();
      fd.append('originalPhoto', rawFile);
      fd.append('styledPhoto', styledFile);
      fd.append('title', title || 'Mein 3D-Druck');
      fd.append('style', style);
      fd.append('colorOverride', colorOverride);
      fd.append('customNote', customNote);

      await saveLocalStudioPhoto(fd);
      await onRefresh();
      setRawFile(null);
      setRawPreview(null);
      setTitle('');
      setCustomNote('');
      onShowToast('Sofort-Studio-Foto im 4:3-Look erstellt!');
    } catch (err) {
      setError(err.message || 'Sofort-Studio-Look fehlgeschlagen.');
    } finally {
      setBusyMode(null);
    }
  };

  const handleDeletePhoto = async (id) => {
    await deleteStudioPhoto(id);
    await onRefresh();
    onShowToast('Foto entfernt.');
  };

  const copyMobileUrl = () => {
    navigator.clipboard?.writeText(mobileUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header + Handy WLAN Upload Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#131722] border border-white/[0.09]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF5500] to-[#9333EA] flex items-center justify-center shrink-0 shadow-lg">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white flex flex-wrap items-center gap-2">
              <span>KI Fotostudio</span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                  geminiConfigured
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35'
                    : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/35'
                }`}
              >
                {geminiConfigured ? 'GEMINI KI LIVE' : 'BEREIT FÜR HANDY-UPLOAD'}
              </span>
            </h3>
            <p className="text-xs text-[#9DA4B4] mt-0.5">
              Handyfoto vom 3D-Druck hochladen → in Sekunden ein edles Studio-Produktfoto bekommen
              und mit 1 Klick in den Shop übernehmen.
            </p>
          </div>
        </div>

        {/* Local Wi-Fi Link for Smartphone */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-white/[0.1] shrink-0">
          <Smartphone className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="text-[#7D8596] font-mono">DIREKT AM HANDY (GLEICHES WLAN)</div>
            <div className="font-mono text-white font-semibold">{mobileUrl}</div>
          </div>
          <button
            type="button"
            onClick={copyMobileUrl}
            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white cursor-pointer"
            title="WLAN-Link kopieren"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Gemini API Key Quick Config Strip */}
      <div className="p-4 rounded-2xl bg-[#12151D] border border-white/[0.08] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <KeyRound
              className={`w-4 h-4 ${geminiConfigured ? 'text-emerald-400' : 'text-[#FF7326]'}`}
            />
            {geminiConfigured ? (
              <span className="text-[#D0D5DF]">
                <strong className="text-emerald-400">Gemini KI-Bildgenerator verbunden!</strong>{' '}
                Jedes Handyfoto kann per Knopfdruck neu beleuchtet & ins Dark-Studio gesetzt werden.
              </span>
            ) : (
              <span className="text-[#B8BFCE]">
                Für vollautomatische KI-Studio-Szenen direkt auf Knopfdruck: kostenlosen{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#38BDF8] underline inline-flex items-center gap-0.5"
                >
                  Google Gemini API-Key <ExternalLink className="w-3 h-3" />
                </a>{' '}
                eintragen — oder nutze ohne Key sofort den <strong>Sofort-Studio-Look</strong> / die{' '}
                <strong>Antigravity Rohfoto-Inbox</strong>.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {geminiConfigured && (
              <button
                type="button"
                onClick={handleClearKey}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[11px] font-mono text-red-300 cursor-pointer"
              >
                Key entfernen
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKeyBox((s) => !s)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-mono text-white cursor-pointer"
            >
              {geminiConfigured ? 'Key ändern' : '+ Gemini Key verbinden'}
            </button>
          </div>
        </div>

        {showKeyBox && (
          <form onSubmit={handleSaveKey} className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.07]">
            <input
              type="password"
              required
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... (wird nur lokal in server/data/secrets.json gespeichert)"
              className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-[#0A0C10] border border-white/[0.12] focus:border-[#FF5500] focus:outline-none font-mono text-xs text-white"
            />
            <button
              type="submit"
              disabled={savingKey}
              className="px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white text-xs font-semibold cursor-pointer"
            >
              {savingKey ? 'Speichert...' : 'Key speichern'}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Main Upload + Controls Grid */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* Left: Raw Phone Photo Uploader */}
        <div className="lg:col-span-5 space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
              dragOver
                ? 'border-[#FF5500] bg-[#FF5500]/10'
                : 'border-white/[0.15] bg-[#12151D]'
            }`}
          >
            {rawPreview ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/[0.1]">
                  <img
                    src={rawPreview}
                    alt="Handyfoto Vorschau"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 font-mono text-[10px] text-white">
                    ORIGINAL HANDYFOTO
                  </span>
                </div>
                <div className="flex justify-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs text-white cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Anderes Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#FF5500]/15 border border-[#FF5500]/35 flex items-center justify-center mx-auto">
                  <Camera className="w-7 h-7 text-[#FF5500]" />
                </div>
                <div className="font-display font-semibold text-white">
                  1. Handyfoto deines 3D-Drucks hochladen
                </div>
                <p className="text-xs text-[#8E95A5]">
                  Einfach auf dem Tisch oder Druckbett knipsen — Hintergrund ist egal!
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white text-xs font-semibold cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Handy-Kamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1B202C] hover:bg-[#252C3D] border border-white/[0.12] text-white text-xs font-semibold cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Galerie / PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-[#9DA4B4] mb-1">
              Name für dieses Foto / Produkt
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Galaxy Kopfhörer-Halter"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
            />
          </div>
        </div>

        {/* Right: Studio Style, Color & Action Buttons */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="text-xs font-mono text-[#9DA4B4] uppercase mb-2">
              2. Studio-Look wählen
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStyle(preset.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    style === preset.id
                      ? 'bg-[#1A1F2C] border-[#FF5500] text-white shadow-[0_0_18px_rgba(255,85,0,0.2)]'
                      : 'bg-[#12151D] border-white/[0.08] text-[#9DA4B4] hover:border-white/20'
                  }`}
                >
                  <span
                    className="w-9 h-9 rounded-lg border border-white/20 shrink-0"
                    style={{ background: preset.swatch }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{preset.name}</div>
                    <div className="text-[11px] text-[#8E95A5] line-clamp-1">{preset.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Color Override for Gemini AI */}
          <div>
            <div className="text-xs font-mono text-[#9DA4B4] uppercase mb-2">
              3. Filamentfarbe (Original behalten oder umfärben)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColorOverride('original')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                  colorOverride === 'original'
                    ? 'bg-[#1C212E] border-[#FF5500] text-white'
                    : 'bg-[#12151D] border-white/[0.08] text-[#9DA4B4]'
                }`}
              >
                Originalfarbe behalten
              </button>
              {FILAMENTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setColorOverride(f.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                    colorOverride === f.id
                      ? 'bg-[#1C212E] border-[#FF5500] text-white'
                      : 'bg-[#12151D] border-white/[0.08] text-[#9DA4B4]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ background: f.swatch || f.hex }}
                  />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#9DA4B4] mb-1">
              Extra Wunsch-Notiz (optional)
            </label>
            <input
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="z.B. leichter Rauch im Hintergrund, von schräg oben fotografiert..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-xs text-white"
            />
          </div>

          {/* 3 Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={Boolean(busyMode) || !rawFile}
              onClick={() => runGeminiOrInbox('gemini')}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF7A26] hover:brightness-110 disabled:opacity-45 text-white font-semibold text-sm shadow-[0_10px_28px_rgba(255,85,0,0.28)] transition-all cursor-pointer"
            >
              {busyMode === 'gemini' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>KI erstellt dein Studio-Foto (ca. 10–20 Sek.)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {geminiConfigured
                      ? 'Mit Gemini KI in Studio-Foto verwandeln'
                      : 'Mit Gemini KI verwandeln (Key oben eintragen)'}
                  </span>
                </>
              )}
            </button>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={Boolean(busyMode) || !rawFile}
                onClick={runLocalStudioFilter}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#191E2B] hover:bg-[#232A3C] disabled:opacity-45 border border-white/[0.12] text-white text-xs font-semibold cursor-pointer"
              >
                {busyMode === 'local' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 text-[#38BDF8]" />
                )}
                <span>Sofort-Studio-Look (ohne Key)</span>
              </button>

              <button
                type="button"
                disabled={Boolean(busyMode) || !rawFile}
                onClick={() => runGeminiOrInbox('raw-inbox')}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#151822] hover:bg-[#1E2331] disabled:opacity-45 border border-[#FF5500]/35 text-[#FFB088] text-xs font-semibold cursor-pointer"
              >
                {busyMode === 'raw-inbox' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Inbox className="w-4 h-4 text-[#FF5500]" />
                )}
                <span>In Rohfoto-Inbox für Antigravity legen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Studio Photo Gallery (Before / After + 1-Click Send to Product Upload) */}
      <div className="space-y-3 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-lg font-bold text-white">
            Deine Fotostudio-Ergebnisse ({studioPhotos.length})
          </h4>
          <span className="font-mono text-[11px] text-[#7D8596]">
            ROHFOTOS: server/uploads/raw/ • STUDIO: server/uploads/studio/
          </span>
        </div>

        {studioPhotos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#12151D] border border-white/[0.07] text-center text-xs text-[#8E95A5]">
            Noch keine eigenen Fotos im Fotostudio. Lade oben einfach dein erstes Handyfoto hoch —
            danach kannst du das Ergebnis mit einem Klick als Shop-Produktfoto übernehmen!
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {studioPhotos.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#141720] border border-white/[0.09] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display font-semibold text-white text-sm flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.status === 'fertig' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          FERTIG
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px]">
                          IN ROHFOTO-INBOX
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-[#7D8596] mt-0.5">
                      Stil: {item.style} • {item.engine}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(item.id)}
                    className="p-1.5 rounded-lg text-[#7D8596] hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Before / After Preview */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/[0.08]">
                    <img
                      src={item.originalUrl}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 font-mono text-[9px] text-white/85">
                      VORHER
                    </span>
                  </div>

                  {item.studioUrl ? (
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-[#FF5500]/50">
                      <img
                        src={item.studioUrl}
                        alt="Studio Ergebnis"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#FF5500] font-mono text-[9px] text-white font-bold">
                        STUDIO-LOOK
                      </span>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-xl bg-[#0B0D12] border border-dashed border-amber-400/35 flex flex-col items-center justify-center p-3 text-center">
                      <Inbox className="w-5 h-5 text-amber-300 mb-1.5" />
                      <div className="text-[11px] font-medium text-amber-200">
                        Bereit für Antigravity
                      </div>
                      <div className="text-[10px] text-[#7D8596] mt-0.5">
                        Sag mir einfach im Chat: „Mach aus meinen Rohfotos Studio-Bilder!“
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Use & Download Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onUseForProduct(item.studioUrl || item.originalUrl, item.title)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white text-xs font-semibold cursor-pointer"
                  >
                    <span>Als Produktfoto übernehmen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {item.studioUrl && (
                    <a
                      href={item.studioUrl}
                      download={`${item.title || 'studio-foto'}.jpg`}
                      className="inline-flex items-center gap-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
