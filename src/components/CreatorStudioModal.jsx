import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Package,
  ClipboardList,
  Sliders,
  Trash2,
  Pencil,
  Check,
  ImagePlus,
  ExternalLink,
  Cpu,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  LogOut,
  Box,
  ShieldCheck,
  KeyRound,
  Download,
  Camera,
  Share2,
  RefreshCw,
  FileCode2,
  Clock,
  Scale,
  Layers,
  Thermometer,
} from 'lucide-react';
import PhotoStudioTab from './PhotoStudioTab';
import {
  CATEGORIES,
  FILAMENTS,
  ORDER_STEPS,
  formatEUR,
} from '../data/filaments';
import {
  adminLogin,
  adminLogout,
  changeAdminPin,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus,
  deleteOrder,
  updateInquiryStatus,
  deleteInquiry,
  updateStudioSettings,
} from '../api';
import { optimizeImageFile, uploadFileDirectToBlob } from '../utils/uploadHelper';

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  description: '',
  price: '29.90',
  compareAtPrice: '',
  category: 'Gaming & Desk',
  badge: 'Neu',
  material: 'PLA',
  colors: ['matt-schwarz', 'matt-weiss', 'rot-schwarz', 'galaxy-blau-lila', 'pink'],
  layerHeight: '0.16 mm',
  printTime: '4h 15m',
  dimensions: '140 × 120 × 110 mm',
  weight: '135 g',
  infill: '15% Gyroid',
  stockMode: 'made-to-order',
  stockCount: '5',
  leadTime: '2–3 Werktage',
  featured: true,
};

export default function CreatorStudioModal({
  open,
  authenticated,
  isDefaultPin,
  blobConfigured,
  geminiConfigured,
  directGeminiConfigured,
  lanUrls,
  studio,
  products,
  orders,
  inquiries,
  studioPhotos,
  onClose,
  onAuthChange,
  onRefresh,
  onShowToast,
}) {
  const [tab, setTab] = useState('upload'); // upload | manage | orders | inbox | settings
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState([]);
  const [existingModelUrl, setExistingModelUrl] = useState(null);
  const [removeModel, setRemoveModel] = useState(false);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [modelFile, setModelFile] = useState(null);
  const [slicerMeta, setSlicerMeta] = useState(null);
  const [slicerExtra, setSlicerExtra] = useState(null); // transient UI data (thumbnailFile, suggestedPrice)
  const [slicerParsing, setSlicerParsing] = useState(false);
  const [slicerDragOver, setSlicerDragOver] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');

  const [studioDraft, setStudioDraft] = useState(null);
  const [savingStudio, setSavingStudio] = useState(false);

  // PIN change form
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '' });
  const [pinMsg, setPinMsg] = useState('');

  useEffect(() => {
    if (studio) {
      setStudioDraft(JSON.parse(JSON.stringify(studio)));
    }
  }, [studio, open]);

  // Always fetch fresh orders/inquiries when opening Creator Studio or switching to orders/inbox
  useEffect(() => {
    if (open && authenticated) {
      onRefresh();
    }
  }, [open, authenticated, tab]);

  if (!open) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      await adminLogin(pinInput);
      setPinInput('');
      await onAuthChange(true);
      onShowToast('Creator Studio entsperrt!');
    } catch (err) {
      setLoginError(err.message || 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    await onAuthChange(false);
    onShowToast('Creator Studio gesperrt.');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setExistingImages([]);
    setExistingModelUrl(null);
    setRemoveModel(false);
    setNewFiles([]);
    setNewPreviews([]);
    setModelFile(null);
    setSlicerMeta(null);
    setSlicerExtra(null);
    setError('');
  };

  const buildCleanSlicerMeta = (parsed) => ({
    sourceType: parsed.sourceType,
    slicerName: parsed.slicerName,
    fileName: parsed.fileName,
    printTimeSeconds: parsed.printTimeSeconds || 0,
    printTimeLabel: parsed.printTimeLabel || '',
    printTimeLong: parsed.printTimeLong || '',
    weightGrams: parsed.weightGrams || 0,
    filamentMeters: parsed.filamentMeters || 0,
    layerHeight: parsed.layerHeight || '',
    infill: parsed.infill || '',
    dimensions: parsed.dimensions || '',
    nozzleDiameter: parsed.nozzleDiameter || '',
    nozzleTemp: parsed.nozzleTemp || null,
    bedTemp: parsed.bedTemp || null,
    printerModel: parsed.printerModel || '',
    totalLayers: parsed.totalLayers || null,
    supports: parsed.supports,
    platesCount: parsed.platesCount || 1,
  });

  const handleImportProductSlicer = async (file) => {
    if (!file) return;
    setError('');
    setSlicerParsing(true);
    try {
      const { parseSlicerFile } = await import('../utils/slicerParser');
      const parsed = await parseSlicerFile(file);
      const cleanMeta = buildCleanSlicerMeta(parsed);
      setSlicerMeta(cleanMeta);
      setSlicerExtra({
        suggestedPrice: parsed.suggestedPrice,
        thumbnailFile: parsed.thumbnailFile,
        thumbnailUrl: parsed.thumbnailUrl,
      });

      setForm((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : parsed.suggestedTitle || prev.title,
        printTime: parsed.printTimeLabel || prev.printTime,
        weight: parsed.weightLabel || prev.weight,
        layerHeight: parsed.layerHeight || prev.layerHeight,
        infill: parsed.infill || prev.infill,
        dimensions: parsed.dimensions || prev.dimensions,
        price:
          !editingId && prev.price === EMPTY_FORM.price && parsed.suggestedPrice
            ? parsed.suggestedPrice.toFixed(2)
            : prev.price,
      }));

      // Automatically attach extracted Slicer preview photo if no image is selected yet
      if (parsed.thumbnailFile && existingImages.length === 0 && newFiles.length === 0) {
        setNewFiles([parsed.thumbnailFile]);
        setNewPreviews([parsed.thumbnailUrl]);
      }

      const bits = [
        parsed.printTimeLabel && `⏱ ${parsed.printTimeLabel}`,
        parsed.weightLabel && `⚖ ${parsed.weightLabel}`,
        parsed.layerHeight && `↕ ${parsed.layerHeight}`,
      ]
        .filter(Boolean)
        .join(' • ');
      onShowToast(
        bits
          ? `Slicer-Daten übernommen (${bits})`
          : `Slicer-Datei "${file.name}" eingelesen!`
      );
    } catch (err) {
      setError(err.message || 'Slicer-Datei konnte nicht ausgelesen werden.');
    } finally {
      setSlicerParsing(false);
    }
  };

  const handleAttachOrderSlicer = async (order, file) => {
    if (!file) return;
    try {
      const { parseSlicerFile } = await import('../utils/slicerParser');
      const parsed = await parseSlicerFile(file);
      const cleanMeta = buildCleanSlicerMeta(parsed);
      await handleOrderUpdate(
        order.id,
        {
          slicerMeta: cleanMeta,
          ...(order.status === 'neu' ? { status: 'slicing' } : {}),
        },
        `Slicer-Daten (${parsed.printTimeLabel || file.name}) an ${order.id} angehängt!`
      );
    } catch (err) {
      onShowToast(err.message || 'Slicer-Datei konnte nicht gelesen werden.');
    }
  };

  const handleFillLivePrinterFromSlicer = async (file) => {
    if (!file) return;
    try {
      const { parseSlicerFile } = await import('../utils/slicerParser');
      const parsed = await parseSlicerFile(file);
      setStudioDraft((prev) => ({
        ...prev,
        printerStatus: {
          ...prev?.printerStatus,
          active: true,
          modelName: parsed.suggestedTitle || prev?.printerStatus?.modelName || file.name,
          printer: parsed.printerModel || prev?.printerStatus?.printer || 'Mein 3D-Drucker',
          material: parsed.material ? `${parsed.material}` : 'PLA',
          nozzleTemp: parsed.nozzleTemp || prev?.printerStatus?.nozzleTemp || 210,
          bedTemp: parsed.bedTemp || prev?.printerStatus?.bedTemp || 60,
          remaining: parsed.printTimeLabel || prev?.printerStatus?.remaining || '',
          progress: 0,
        },
      }));
      onShowToast(
        `Slicer-Daten ins Live-Widget geladen (${parsed.printTimeLabel || file.name}) — noch auf "Speichern" klicken!`
      );
    } catch (err) {
      onShowToast(err.message || 'Slicer-Datei konnte nicht gelesen werden.');
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      title: product.title || '',
      subtitle: product.subtitle || '',
      description: product.description || '',
      price: String(product.price ?? '29.90'),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      category: product.category || 'Gaming & Desk',
      badge: product.badge || '',
      material: product.material || 'PLA',
      colors: product.colors?.length
        ? product.colors
        : ['matt-schwarz', 'matt-weiss', 'rot-schwarz', 'galaxy-blau-lila', 'pink'],
      layerHeight: product.specs?.layerHeight || '0.16 mm',
      printTime: product.specs?.printTime || '4h 00m',
      dimensions: product.specs?.dimensions || '120 × 120 × 100 mm',
      weight: product.specs?.weight || '120 g',
      infill: product.specs?.infill || '15% Gyroid',
      stockMode: product.stockMode || 'made-to-order',
      stockCount: String(product.stockCount ?? 5),
      leadTime: product.leadTime || '2–3 Werktage',
      featured: Boolean(product.featured),
    });
    setExistingImages(product.images || []);
    setExistingModelUrl(product.modelUrl || null);
    setRemoveModel(false);
    setNewFiles([]);
    setNewPreviews([]);
    setModelFile(null);
    setSlicerMeta(product.slicerMeta || null);
    setSlicerExtra(null);
    setError('');
    setTab('upload');
  };

  const addSelectedFiles = (fileList) => {
    const all = Array.from(fileList || []);
    // If the user drops a slicer file onto the photo dropzone, import it seamlessly!
    const droppedSlicer = all.find((f) =>
      /\.(3mf|gcode|gco|bgcode)$/i.test(f.name || '')
    );
    if (droppedSlicer) {
      handleImportProductSlicer(droppedSlicer);
    }
    const incoming = all.filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;
    const totalAllowed = Math.max(0, 6 - existingImages.length - newFiles.length);
    const sliced = incoming.slice(0, totalAllowed);
    setNewFiles((prev) => [...prev, ...sliced]);
    setNewPreviews((prev) => [...prev, ...sliced.map((f) => URL.createObjectURL(f))]);
  };

  const toggleColor = (colorId) => {
    setForm((prev) => {
      const exists = prev.colors.includes(colorId);
      if (exists && prev.colors.length === 1) return prev;
      return {
        ...prev,
        colors: exists
          ? prev.colors.filter((c) => c !== colorId)
          : [...prev.colors, colorId],
      };
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (existingImages.length === 0 && newFiles.length === 0) {
      setError('Bitte lade mindestens ein Foto deiner 3D-Kreation hoch.');
      return;
    }

    setSaving(true);
    setUploadStatus('');
    try {
      // 1. Optimize smartphone photos client-side (fast loads & tiny payloads)
      let optimizedImages = [];
      if (newFiles.length > 0) {
        setUploadStatus('Optimiere Fotos...');
        optimizedImages = await Promise.all(
          newFiles.map((file) => optimizeImageFile(file, 1920, 0.86))
        );
      }

      // 2. Upload images & large .STL directly to Vercel Blob when Cloud Storage is active
      //    (bypasses Vercel's 4.5 MB Serverless Function limit — supports .STL up to 150 MB!)
      let finalExistingImages = [...existingImages];
      let fallbackImageFiles = [];
      let directModelUrl = null;
      let fallbackModelFile = modelFile;

      if (blobConfigured) {
        if (optimizedImages.length > 0) {
          const uploadedUrls = [];
          for (let i = 0; i < optimizedImages.length; i++) {
            setUploadStatus(`Lädt Foto ${i + 1}/${optimizedImages.length} hoch...`);
            const url = await uploadFileDirectToBlob(optimizedImages[i], {
              folder: 'products',
              admin: true,
            });
            if (url) {
              uploadedUrls.push(url);
            } else {
              fallbackImageFiles.push(optimizedImages[i]);
            }
          }
          finalExistingImages = [...uploadedUrls, ...finalExistingImages];
        }

        if (modelFile) {
          const sizeMb = (modelFile.size / (1024 * 1024)).toFixed(1);
          setUploadStatus(`Lädt 3D-Modell hoch (${sizeMb} MB)...`);
          const url = await uploadFileDirectToBlob(modelFile, {
            folder: 'models',
            admin: true,
            onProgress: (pct) => setUploadStatus(`Lädt 3D-Modell hoch (${pct}%)...`),
          });
          if (url) {
            directModelUrl = url;
            fallbackModelFile = null;
          }
        }
      } else {
        fallbackImageFiles = optimizedImages;
      }

      setUploadStatus('Speichert Kreation...');
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'colors') {
          fd.append('colors', JSON.stringify(v));
        } else {
          fd.append(k, String(v));
        }
      });
      fd.append('existingImages', JSON.stringify(finalExistingImages));
      fd.append('slicerMeta', slicerMeta ? JSON.stringify(slicerMeta) : 'null');
      if (removeModel) fd.append('removeModel', 'true');
      if (directModelUrl) fd.append('uploadedModelUrl', directModelUrl);
      fallbackImageFiles.forEach((file) => fd.append('images', file));
      if (fallbackModelFile) fd.append('modelFile', fallbackModelFile);

      if (editingId) {
        await updateProduct(editingId, fd);
        onShowToast('Kreation erfolgreich aktualisiert!');
      } else {
        await createProduct(fd);
        onShowToast('Neue 3D-Kreation live im Shop veröffentlicht!');
      }
      await onRefresh();
      resetForm();
      setTab('manage');
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`"${title}" wirklich aus dem Shop entfernen?`)) return;
    try {
      await deleteProduct(id);
      await onRefresh();
      onShowToast('Kreation entfernt.');
    } catch (err) {
      onShowToast(err.message || 'Löschen fehlgeschlagen.');
    }
  };

  const handleOrderUpdate = async (orderId, payload, msg) => {
    try {
      await updateOrderStatus(orderId, payload);
      await onRefresh();
      onShowToast(msg);
    } catch (err) {
      onShowToast(err.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Auftrag ${orderId} wirklich löschen?`)) return;
    try {
      await deleteOrder(orderId);
      await onRefresh();
      onShowToast(`Auftrag ${orderId} gelöscht.`);
    } catch (err) {
      onShowToast(err.message);
    }
  };

  const copyTrackingLink = (orderId) => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(orderId)}`;
    navigator.clipboard?.writeText(url);
    onShowToast(`Live-Tracking-Link für ${orderId} kopiert (einfach in WhatsApp einfügen)!`);
  };

  const handleInquiryStatus = async (id, status) => {
    try {
      await updateInquiryStatus(id, status);
      await onRefresh();
      onShowToast(`Anfrage ${id} aktualisiert.`);
    } catch (err) {
      onShowToast(err.message);
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm(`Anfrage ${id} wirklich löschen?`)) return;
    try {
      await deleteInquiry(id);
      await onRefresh();
      onShowToast(`Anfrage ${id} gelöscht.`);
    } catch (err) {
      onShowToast(err.message);
    }
  };

  const handleSaveStudio = async (e) => {
    e.preventDefault();
    setSavingStudio(true);
    try {
      await updateStudioSettings(studioDraft);
      await onRefresh();
      onShowToast('Studio- & Drucker-Einstellungen gespeichert!');
    } catch (err) {
      onShowToast(err.message);
    } finally {
      setSavingStudio(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinMsg('');
    try {
      await changeAdminPin(pinForm.currentPin, pinForm.newPin);
      setPinForm({ currentPin: '', newPin: '' });
      setPinMsg('PIN erfolgreich geändert!');
      await onRefresh();
      onShowToast('Neue Studio-PIN gespeichert!');
    } catch (err) {
      setPinMsg(err.message || 'PIN konnte nicht geändert werden.');
    }
  };

  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  // ==================== LOCKED VIEW (PIN / PASSWORD LOGIN) ====================
  if (!authenticated) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      >
        <div
          className="cad-card w-full max-w-md rounded-2xl bg-[#111318] border border-white/[0.12] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 bg-[#0B0D12] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#FF5500]" />
              <span className="font-mono text-xs uppercase tracking-wider text-white">
                Creator Studio • Geschützter Bereich
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#FF5500]/15 border border-[#FF5500]/35 flex items-center justify-center mx-auto">
                <KeyRound className="w-7 h-7 text-[#FF5500]" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Studio entsperren</h2>
              <p className="text-xs text-[#9DA4B4]">
                Gib deine Studio-PIN ein, um Kreationen & .STL-Modelle hochzuladen, Bestellungen
                zu verwalten und den Live-Drucker zu steuern.
              </p>
            </div>

            {isDefaultPin && (
              <div className="p-3 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-xs text-[#93DCFB] text-center">
                Ersteinrichtung — Standard-PIN: <strong className="font-mono text-white">2026</strong>
                <br />
                <span className="text-[11px] opacity-80">
                  (Kannst du sofort nach dem Login ändern)
                </span>
              </div>
            )}

            {loginError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 text-center">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                Studio-PIN / Passwort
              </label>
              <input
                type="password"
                autoFocus
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl bg-[#0B0D12] border border-white/[0.12] focus:border-[#FF5500] focus:outline-none font-mono text-center text-lg tracking-[0.25em] text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_8px_28px_rgba(255,85,0,0.3)] cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{loggingIn ? 'Prüfe PIN...' : 'Creator Studio öffnen'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== UNLOCKED STUDIO DASHBOARD ====================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[92vh] rounded-2xl bg-[#0E1015] border border-white/[0.12] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Studio Bar */}
        <div className="px-5 py-3.5 bg-[#0A0C10] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/40 flex items-center justify-center">
              <Upload className="w-4 h-4 text-[#FF5500]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white leading-tight flex items-center gap-2">
                Creator Studio
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 font-mono text-[10px] text-emerald-400">
                  ENTSPERRT
                </span>
              </h2>
              <p className="font-mono text-[11px] text-[#7D8596]">
                FOTOS & .STL UPLOAD • DRUCK-QUEUE • WUNSCHDRUCK
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#141720] border border-white/[0.08]">
              {[
                { id: 'photo-studio', label: 'KI Fotostudio', icon: Camera },
                { id: 'upload', label: editingId ? 'Bearbeiten' : 'Upload', icon: ImagePlus },
                { id: 'manage', label: `Shop (${products.length})`, icon: Package },
                { id: 'orders', label: `Aufträge (${orders.length})`, icon: ClipboardList },
                { id: 'inbox', label: `Wunschdruck (${inquiries.length})`, icon: Sparkles },
                { id: 'settings', label: 'Studio & PIN', icon: Sliders },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      tab === t.id
                        ? 'bg-[#FF5500] text-white shadow'
                        : 'text-[#9DA4B4] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                onRefresh();
                onShowToast('Aufträge & Daten aktualisiert!');
              }}
              title="Jetzt aktualisieren"
              className="p-2 rounded-lg text-[#8E95A5] hover:text-[#38BDF8] hover:bg-white/[0.08] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              title="Studio sperren / abmelden"
              className="p-2 rounded-lg text-[#8E95A5] hover:text-amber-300 hover:bg-white/[0.08] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#8E95A5] hover:text-white hover:bg-white/[0.08] cursor-pointer"
              aria-label="Studio schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {/* TAB 0: AI PHOTO STUDIO (PHONE PHOTO -> DARK STUDIO SHOT) */}
          {tab === 'photo-studio' && (
            <PhotoStudioTab
              geminiConfigured={geminiConfigured}
              directGeminiConfigured={directGeminiConfigured}
              lanUrls={lanUrls}
              studioPhotos={studioPhotos || []}
              onRefresh={onRefresh}
              onShowToast={onShowToast}
              onUseForProduct={(imageUrl, suggestedTitle) => {
                setExistingImages((prev) =>
                  prev.includes(imageUrl) ? prev : [imageUrl, ...prev]
                );
                if (suggestedTitle && !form.title) {
                  setForm((prev) => ({ ...prev, title: suggestedTitle }));
                }
                setTab('upload');
                onShowToast('Studio-Foto in den Produkt-Upload übernommen!');
              }}
            />
          )}

          {/* TAB 1: UPLOAD / EDIT CREATION (+ OPTIONAL .STL 3D MODEL!) */}
          {tab === 'upload' && (
            <form onSubmit={handleProductSubmit} className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {editingId ? 'Kreation bearbeiten' : 'Neue 3D-Kreation hochladen'}
                  </h3>
                  <p className="text-sm text-[#8E95A5] mt-0.5">
                    Lade Fotos (und optional direkt eine .STL-Datei für den 3D-Viewer) hoch.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('photo-studio')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5500]/15 hover:bg-[#FF5500]/25 border border-[#FF5500]/40 text-xs font-mono text-[#FF8547] cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Handyfoto erst im KI Fotostudio aufwerten</span>
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-white cursor-pointer"
                    >
                      + Lieber neu erstellen
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* SLICER FILE AUTO-IMPORT (.3MF / .GCODE.3MF / .GCODE / .BGCODE) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setSlicerDragOver(true);
                }}
                onDragLeave={() => setSlicerDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSlicerDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleImportProductSlicer(f);
                }}
                className={`rounded-2xl border-2 border-dashed p-5 transition-all space-y-4 ${
                  slicerDragOver
                    ? 'border-[#38BDF8] bg-[#38BDF8]/12'
                    : slicerMeta
                    ? 'border-[#38BDF8]/45 bg-gradient-to-br from-[#0F1724] to-[#12151D]'
                    : 'border-[#38BDF8]/30 bg-gradient-to-br from-[#101622] to-[#12151D]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/35 flex items-center justify-center shrink-0">
                      <FileCode2 className="w-5 h-5 text-[#38BDF8]" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Fertige Slicer-Datei reinziehen
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 font-mono text-[10px] text-[#38BDF8]">
                          .3MF • .GCODE.3MF • .GCODE • .BGCODE
                        </span>
                      </div>
                      <p className="text-xs text-[#8E95A5] mt-0.5">
                        Übernimmt automatisch Druckzeit, Gewicht, Schichthöhe, Infill, Maße &amp; Vorschau aus Bambu Studio, OrcaSlicer, PrusaSlicer &amp; Cura
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {slicerMeta && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlicerMeta(null);
                          setSlicerExtra(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-red-500/20 text-[#9DA4B4] hover:text-red-300 text-xs cursor-pointer"
                      >
                        Zurücksetzen
                      </button>
                    )}
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#56CAF9] text-[#090A0D] font-semibold text-xs cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{slicerParsing ? 'Liest aus...' : 'Slicer-Datei wählen'}</span>
                      <input
                        type="file"
                        accept=".3mf,.gcode,.gco,.bgcode"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImportProductSlicer(f);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {slicerMeta && (
                  <div className="rounded-xl bg-[#0A0D14] border border-[#38BDF8]/25 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-mono text-[#38BDF8]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-white">
                          {slicerMeta.slicerName || 'Slicer'}
                        </span>
                        <span className="text-[#7D8596] truncate max-w-[260px]">
                          {slicerMeta.fileName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {slicerExtra?.suggestedPrice && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                price: slicerExtra.suggestedPrice.toFixed(2),
                              }));
                              onShowToast(
                                `Preisvorschlag ${formatEUR(slicerExtra.suggestedPrice)} übernommen.`
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FF5500]/15 hover:bg-[#FF5500]/30 border border-[#FF5500]/40 font-mono text-[11px] text-[#FF8547] cursor-pointer"
                          >
                            Preisvorschlag: {formatEUR(slicerExtra.suggestedPrice)} übernehmen
                          </button>
                        )}
                        {slicerExtra?.thumbnailFile &&
                          !newFiles.includes(slicerExtra.thumbnailFile) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (existingImages.length + newFiles.length >= 6) return;
                                setNewFiles((prev) => [slicerExtra.thumbnailFile, ...prev]);
                                setNewPreviews((prev) => [slicerExtra.thumbnailUrl, ...prev]);
                                onShowToast('Slicer-Vorschau als Foto hinzugefügt!');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 font-mono text-[11px] text-[#38BDF8] cursor-pointer"
                            >
                              + Slicer-Vorschau als Foto
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                      {slicerMeta.printTimeLabel && (
                        <div className="p-2.5 rounded-lg bg-[#121622] border border-white/[0.06]">
                          <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#38BDF8]" /> DRUCKZEIT
                          </div>
                          <div className="text-white font-bold mt-0.5">
                            {slicerMeta.printTimeLong || slicerMeta.printTimeLabel}
                          </div>
                        </div>
                      )}
                      {slicerMeta.weightGrams > 0 && (
                        <div className="p-2.5 rounded-lg bg-[#121622] border border-white/[0.06]">
                          <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                            <Scale className="w-3 h-3 text-[#FF5500]" /> FILAMENT
                          </div>
                          <div className="text-white font-bold mt-0.5">
                            {Math.round(slicerMeta.weightGrams)} g PLA
                            {slicerMeta.filamentMeters > 0
                              ? ` (${slicerMeta.filamentMeters} m)`
                              : ''}
                          </div>
                        </div>
                      )}
                      {slicerMeta.layerHeight && (
                        <div className="p-2.5 rounded-lg bg-[#121622] border border-white/[0.06]">
                          <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#FF5500]" /> SCHICHT / INFILL
                          </div>
                          <div className="text-white font-bold mt-0.5">
                            {slicerMeta.layerHeight}
                            {slicerMeta.infill ? ` • ${slicerMeta.infill}` : ''}
                          </div>
                        </div>
                      )}
                      {(slicerMeta.nozzleTemp || slicerMeta.printerModel || slicerMeta.nozzleDiameter) && (
                        <div className="p-2.5 rounded-lg bg-[#121622] border border-white/[0.06]">
                          <div className="text-[10px] text-[#7D8596] flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-[#38BDF8]" /> DRUCKER / TEMP
                          </div>
                          <div className="text-white font-bold mt-0.5 truncate">
                            {slicerMeta.nozzleTemp
                              ? `${slicerMeta.nozzleTemp}°C / ${slicerMeta.bedTemp || 60}°C`
                              : slicerMeta.printerModel || slicerMeta.nozzleDiameter}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#8E95A5]">
                      {slicerMeta.dimensions && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                          Maße: {slicerMeta.dimensions}
                        </span>
                      )}
                      {slicerMeta.nozzleDiameter && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                          Düse: {slicerMeta.nozzleDiameter}
                        </span>
                      )}
                      {slicerMeta.totalLayers && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                          {slicerMeta.totalLayers} Layer
                        </span>
                      )}
                      {slicerMeta.printerModel && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                          Drucker: {slicerMeta.printerModel}
                        </span>
                      )}
                      {slicerMeta.supports !== null && slicerMeta.supports !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.05]">
                          Support: {slicerMeta.supports ? 'Ja' : 'Nein'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addSelectedFiles(e.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
                  dragOver
                    ? 'border-[#FF5500] bg-[#FF5500]/10'
                    : 'border-white/[0.14] bg-[#12151D]'
                }`}
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF5500]/15 border border-[#FF5500]/35 flex items-center justify-center mx-auto">
                    <ImagePlus className="w-6 h-6 text-[#FF5500]" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Fotos deiner 3D-Kreation hierher ziehen oder auswählen
                  </div>
                  <p className="text-xs text-[#8E95A5]">
                    Bis zu 6 Bilder (JPG, PNG, WEBP) • Das erste Bild ist dein Shop-Cover
                  </p>
                  <label className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Bilder wählen</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => addSelectedFiles(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>

                {(existingImages.length > 0 || newPreviews.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5 pt-5 border-t border-white/[0.08]">
                    {existingImages.map((url, idx) => (
                      <div
                        key={`ex-${idx}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.15] bg-black"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setExistingImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/75 hover:bg-red-500 text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {newPreviews.map((url, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-[#FF5500]/60 bg-black"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setNewFiles((prev) => prev.filter((_, i) => i !== idx));
                            setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/75 hover:bg-red-500 text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional 3D STL File Upload for Interactive 3D Viewer */}
              <div className="p-4 rounded-2xl bg-[#12151D] border border-[#38BDF8]/25 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/35 flex items-center justify-center shrink-0">
                    <Box className="w-5 h-5 text-[#38BDF8]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Interaktives 3D-Modell anhängen (.STL — optional)
                    </div>
                    <div className="text-xs text-[#8E95A5]">
                      {modelFile
                        ? `Ausgewählt: ${modelFile.name}`
                        : existingModelUrl && !removeModel
                        ? `Aktives 3D-Modell: ${existingModelUrl.split('/').pop()}`
                        : 'Kunden können dein Modell direkt im Browser drehen & in Filament-Farben färben'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(modelFile || (existingModelUrl && !removeModel)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setModelFile(null);
                        setRemoveModel(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 text-xs cursor-pointer"
                    >
                      Entfernen
                    </button>
                  )}
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B2233] hover:bg-[#252E44] border border-[#38BDF8]/40 text-xs font-mono text-[#38BDF8] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>.STL wählen</span>
                    <input
                      type="file"
                      accept=".stl"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setModelFile(f);
                          setRemoveModel(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Name der Kreation *
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="z.B. Cyberpunk Kopfhörer-Halter"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Kurze Headline / Untertitel
                  </label>
                  <input
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="z.B. Ultrastabiles Matte-PLA Design mit Kabelclip"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                  Beschreibung
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Was macht dieses Teil besonders? Welches Finish, welche Nutzung?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white resize-none"
                />
              </div>

              {/* Pricing & Category (100% PLA) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Preis (€) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.10"
                    min="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Streichpreis (€ opt.)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={form.compareAtPrice}
                    onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                    placeholder="optional"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Kategorie (Material: PLA)
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#FF5500] focus:outline-none text-sm text-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'Alle').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selectable Filament Colors */}
              <div>
                <label className="block text-xs font-mono text-[#9DA4B4] mb-2">
                  Wählbare Filament-Farben für Käufer
                </label>
                <div className="flex flex-wrap gap-2">
                  {FILAMENTS.map((f) => {
                    const active = form.colors.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleColor(f.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1C212E] border-[#FF5500] text-white'
                            : 'bg-[#12151D] border-white/[0.08] text-[#8E95A5]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 flex items-center justify-center"
                          style={{ background: f.swatch || f.hex }}
                        >
                          {active && (
                            <Check
                              className={`w-2.5 h-2.5 ${
                                f.id === 'matt-weiss' ? 'text-black' : 'text-white'
                              }`}
                            />
                          )}
                        </span>
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3D Print Technical Specs */}
              <div className="p-4 rounded-2xl bg-[#12151D] border border-white/[0.08] space-y-3">
                <div className="font-mono text-xs uppercase text-[#FF7326]">
                  3D-Druck Spezifikationen
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    ['layerHeight', 'Schichthöhe'],
                    ['printTime', 'Druckzeit'],
                    ['dimensions', 'Maße'],
                    ['weight', 'Gewicht'],
                    ['infill', 'Infill'],
                  ].map(([field, lbl]) => (
                    <div key={field}>
                      <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                        {lbl}
                      </label>
                      <input
                        value={form[field]}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-lg bg-[#0A0C10] border border-white/[0.08] font-mono text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock, Badge & Hero Toggle */}
              <div className="grid sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Verfügbarkeit
                  </label>
                  <select
                    value={form.stockMode}
                    onChange={(e) => setForm({ ...form, stockMode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] text-sm text-white"
                  >
                    <option value="made-to-order">Auf Bestellung drucken</option>
                    <option value="in-stock">Direkt auf Lager</option>
                  </select>
                </div>

                {form.stockMode === 'in-stock' ? (
                  <div>
                    <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                      Stück auf Lager
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stockCount}
                      onChange={(e) => setForm({ ...form, stockCount: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] font-mono text-sm text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                      Lieferzeit
                    </label>
                    <input
                      value={form.leadTime}
                      onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] text-sm text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono text-[#9DA4B4] mb-1.5">
                    Badge-Label
                  </label>
                  <select
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] text-sm text-white"
                  >
                    <option value="">Kein Badge</option>
                    <option value="Neu">Neu</option>
                    <option value="Bestseller">Bestseller</option>
                    <option value="Limitiert">Limitiert</option>
                    <option value="Custom Color">Custom Color</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] cursor-pointer text-xs text-white">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="accent-[#FF5500] w-4 h-4"
                  />
                  <span>Im Hero hervorheben</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-3 rounded-xl bg-[#181C26] text-sm font-medium text-white cursor-pointer"
                  >
                    Abbrechen
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] disabled:opacity-50 text-white font-semibold text-sm shadow-[0_10px_28px_rgba(255,85,0,0.3)] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {saving
                      ? uploadStatus || 'Wird gespeichert...'
                      : editingId
                      ? 'Änderungen speichern'
                      : 'Jetzt im Shop veröffentlichen'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANAGE PRODUCTS */}
          {tab === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Deine veröffentlichten 3D-Kreationen
                  </h3>
                  <p className="text-xs text-[#8E95A5]">
                    Bearbeite Preise, Fotos, 3D-.STL-Modelle & Specs jederzeit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setTab('upload');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white text-xs font-semibold cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>Neue Kreation</span>
                </button>
              </div>

              <div className="grid gap-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 rounded-xl bg-[#141720] border border-white/[0.08]"
                  >
                    <img
                      src={p.images?.[0]}
                      alt={p.title}
                      className="w-full sm:w-20 h-32 sm:h-16 rounded-lg object-cover bg-black shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display font-semibold text-white truncate">
                          {p.title}
                        </h4>
                        {p.featured && (
                          <span className="px-2 py-0.5 rounded bg-[#FF5500]/20 text-[#FF7326] font-mono text-[10px]">
                            HERO
                          </span>
                        )}
                        {(p.modelUrl || p.demoModel) && (
                          <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] font-mono text-[10px]">
                            {p.modelUrl ? 'STL 3D' : '3D MESH'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#8E95A5] mt-1">
                        <span>{p.category}</span>
                        <span>•</span>
                        <span>{p.material}</span>
                        <span>•</span>
                        <span className="text-white font-semibold">{formatEUR(p.price)}</span>
                        <span>•</span>
                        <span>❤ {p.likes || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 cursor-pointer"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS & PRINT QUEUE */}
          {tab === 'orders' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#141720] border border-white/[0.08]">
                  <div className="font-mono text-xs text-[#7D8596]">BESTELLUNGEN GESAMT</div>
                  <div className="font-mono text-2xl font-bold text-white mt-1">
                    {orders.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#141720] border border-white/[0.08]">
                  <div className="font-mono text-xs text-[#7D8596]">AKTIV IN PRODUKTION</div>
                  <div className="font-mono text-2xl font-bold text-[#FF7326] mt-1">
                    {orders.filter((o) => o.status !== 'versendet').length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#141720] border border-white/[0.08]">
                  <div className="font-mono text-xs text-[#7D8596]">UMSATZ GESAMT</div>
                  <div className="font-mono text-2xl font-bold text-emerald-400 mt-1">
                    {formatEUR(totalRevenue)}
                  </div>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-[#141720] border border-white/[0.07] text-[#8E95A5]">
                  Noch keine Bestellungen eingegangen.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl bg-[#141720] border border-white/[0.09] space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/[0.07]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-base font-bold text-[#FF7326]">
                              {order.id}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.07] font-mono text-[11px] text-[#C4CAD6]">
                              {order.paymentMethod}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase ${
                                order.paymentStatus === 'bezahlt'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                              }`}
                            >
                              {order.paymentStatus === 'bezahlt' ? 'Bezahlt' : 'Zahlung offen'}
                            </span>
                            {order.paymentStatus !== 'bezahlt' && (
                              <button
                                onClick={() =>
                                  handleOrderUpdate(
                                    order.id,
                                    { paymentStatus: 'bezahlt' },
                                    `${order.id} als bezahlt markiert.`
                                  )
                                }
                                className="text-[11px] font-mono text-[#38BDF8] hover:underline cursor-pointer"
                              >
                                ✓ Als bezahlt markieren
                              </button>
                            )}
                          </div>
                          <div className="text-sm text-white font-medium mt-1">
                            {order.customer?.name}
                            {(order.customer?.contact || order.customer?.email) && (
                              <span className="text-[#8E95A5] font-normal">
                                {' '}
                                ({order.customer?.contact || order.customer?.email})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#8E95A5]">
                            {order.customer?.deliveryMode || 'Übergabe'}
                            {order.customer?.street
                              ? ` • ${order.customer.street}, ${order.customer.postalCode} ${order.customer.city}`
                              : ''}
                          </div>
                          {order.customer?.notes && (
                            <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#0A0C10] border border-white/[0.06] text-xs text-[#D0D5DF]">
                              Notiz: &ldquo;{order.customer.notes}&rdquo;
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-white">
                            {formatEUR(order.total)}
                          </div>
                          <div className="font-mono text-[11px] text-[#7D8596]">
                            {new Date(order.createdAt).toLocaleString('de-DE')}
                          </div>
                        </div>
                      </div>

                      {/* Ordered Print Items */}
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0D0F14] border border-white/[0.06]"
                          >
                            <img
                              src={item.image}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                {item.quantity}× {item.title}
                              </div>
                              <div className="text-[11px] text-[#9DA4B4] flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ background: item.colorHex }}
                                />
                                <span>{item.colorName}</span>
                                <span>•</span>
                                <span>{item.sizeOption}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Print Pipeline Status Bar + Live Progress + Share Tracking Link */}
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-mono text-[11px] text-[#7D8596] uppercase">
                            Druck-Status & Live-Fortschritt:
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF5500]/15 hover:bg-[#FF5500]/25 border border-[#FF5500]/35 text-[11px] font-mono text-[#FF8547] cursor-pointer">
                              <FileCode2 className="w-3 h-3" />
                              <span>
                                {order.slicerMeta ? 'Slicer-Datei aktualisieren' : 'Slicer-Datei'}
                              </span>
                              <input
                                type="file"
                                accept=".3mf,.gcode,.gco,.bgcode"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAttachOrderSlicer(order, f);
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => copyTrackingLink(order.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/35 text-[11px] font-mono text-[#38BDF8] cursor-pointer"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>WhatsApp-Link kopieren</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 cursor-pointer"
                              title="Auftrag löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {order.slicerMeta && (
                          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-[#0B1018] border border-[#38BDF8]/25 font-mono text-[11px] text-[#C4CAD6]">
                            <FileCode2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                            <span className="text-[#38BDF8] font-semibold">
                              {order.slicerMeta.slicerName || 'Slicer'}:
                            </span>
                            {order.slicerMeta.printTimeLabel && (
                              <span>⏱ {order.slicerMeta.printTimeLabel}</span>
                            )}
                            {order.slicerMeta.weightGrams > 0 && (
                              <span>• ⚖ {Math.round(order.slicerMeta.weightGrams)} g PLA</span>
                            )}
                            {order.slicerMeta.layerHeight && (
                              <span>• ↕ {order.slicerMeta.layerHeight}</span>
                            )}
                            {order.slicerMeta.printerModel && (
                              <span className="text-[#8E95A5]">
                                • {order.slicerMeta.printerModel}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {ORDER_STEPS.map((st) => (
                            <button
                              key={st.key}
                              onClick={() =>
                                handleOrderUpdate(
                                  order.id,
                                  {
                                    status: st.key,
                                    ...(st.key === 'finish' || st.key === 'versendet'
                                      ? { progress: 100 }
                                      : {}),
                                  },
                                  `${order.id} → ${st.label}`
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                order.status === st.key
                                  ? 'bg-[#FF5500] text-white shadow'
                                  : 'bg-[#0C0E13] text-[#9DA4B4] hover:text-white border border-white/[0.08]'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick Live % Buttons */}
                        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#0C0E13] border border-white/[0.06]">
                          <span className="font-mono text-[11px] text-[#8E95A5]">
                            Fortschritt: <strong className="text-[#FF7326]">{order.progress ?? 0}%</strong>
                          </span>
                          <div className="flex flex-wrap gap-1 ml-auto">
                            {[0, 25, 50, 75, 90, 100].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() =>
                                  handleOrderUpdate(
                                    order.id,
                                    {
                                      progress: pct,
                                      status: pct === 100 ? 'finish' : pct > 0 ? 'im_druck' : order.status,
                                    },
                                    `${order.id} auf ${pct}% gesetzt!`
                                  )
                                }
                                className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                                  (order.progress ?? 0) === pct
                                    ? 'bg-[#FF5500] text-white'
                                    : 'bg-white/[0.06] text-[#9DA4B4] hover:text-white'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOM PRINT INQUIRIES */}
          {tab === 'inbox' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF5500]" />
                <h3 className="font-display text-xl font-bold text-white">
                  Wunschdruck & .STL-Anfragen ({inquiries.length})
                </h3>
              </div>

              {inquiries.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#141720] border border-white/[0.08] text-center text-sm text-[#8E95A5]">
                  Noch keine Wunschdruck-Anfragen eingegangen.
                </div>
              ) : (
                <div className="space-y-3">
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-4 rounded-2xl bg-[#141720] border border-white/[0.08] space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-xs text-[#38BDF8]">{inq.id}</div>
                          <h4 className="font-display font-bold text-white mt-0.5">
                            {inq.projectTitle}
                          </h4>
                          <div className="text-xs text-[#8E95A5]">
                            Von {inq.name}
                            {inq.contact || inq.email ? ` (${inq.contact || inq.email})` : ''} •
                            PLA • {inq.colorName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={inq.status}
                            onChange={(e) => handleInquiryStatus(inq.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0B0D12] border border-white/[0.12] text-xs font-mono text-white"
                          >
                            <option value="offen">Offen</option>
                            <option value="angebot_gesendet">Besprochen</option>
                            <option value="in_arbeit">Im Drucker</option>
                            <option value="abgeschlossen">Fertig</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteInquiry(inq.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 cursor-pointer"
                            title="Anfrage löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {inq.stlMetrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#0B0D12] border border-[#FF5500]/30 font-mono text-[11px]">
                          <div>
                            <span className="text-[#7D8596] block text-[9px]">CA. PREIS</span>
                            <span className="text-[#FF7326] font-bold">
                              {formatEUR(inq.stlMetrics.estimatedPrice)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#7D8596] block text-[9px]">GEWICHT</span>
                            <span className="text-white">{inq.stlMetrics.estimatedGrams} g PLA</span>
                          </div>
                          <div>
                            <span className="text-[#7D8596] block text-[9px]">DRUCKZEIT</span>
                            <span className="text-white">{inq.stlMetrics.printTimeLabel}</span>
                          </div>
                          <div>
                            <span className="text-[#7D8596] block text-[9px]">MASSE</span>
                            <span className="text-white">{inq.stlMetrics.dimensionsText}</span>
                          </div>
                        </div>
                      )}

                      {inq.description && (
                        <p className="text-xs text-[#C4CAD6] leading-relaxed">
                          {inq.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        {inq.stlFileUrl && (
                          <a
                            href={inq.stlFileUrl}
                            download={inq.stlFileName || 'modell.stl'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5500]/20 border border-[#FF5500]/45 text-[#FF8547] hover:bg-[#FF5500] hover:text-white font-mono transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>.STL herunterladen ({inq.stlFileName || 'Datei'})</span>
                          </a>
                        )}
                        {inq.stlLink && (
                          <a
                            href={inq.stlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] hover:underline"
                          >
                            <span>3D-Modell Link öffnen</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {inq.referenceImage && (
                        <img
                          src={inq.referenceImage}
                          alt="Referenzbild"
                          className="w-32 h-24 rounded-lg object-cover border border-white/[0.1]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STUDIO, LIVE PRINTER & PIN */}
          {tab === 'settings' && studioDraft && (
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left: Branding & Live Printer Widget */}
              <form onSubmit={handleSaveStudio} className="lg:col-span-7 space-y-5">
                <div className="p-5 rounded-2xl bg-[#141720] border border-white/[0.09] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.07]">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#38BDF8]" />
                      <h3 className="font-display font-bold text-white">
                        Branding & Live-Drucker Widget
                      </h3>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/35 text-[11px] font-mono text-[#38BDF8] cursor-pointer">
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>Aus Slicer-Datei füllen</span>
                      <input
                        type="file"
                        accept=".3mf,.gcode,.gco,.bgcode"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFillLivePrinterFromSlicer(f);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-[#9DA4B4] mb-1">
                        Dein Name / Studio-Name
                      </label>
                      <input
                        value={studioDraft.brandName || ''}
                        onChange={(e) =>
                          setStudioDraft({ ...studioDraft, brandName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0D12] border border-white/[0.1] text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#9DA4B4] mb-1">
                        Untertitel
                      </label>
                      <input
                        value={studioDraft.tagline || ''}
                        onChange={(e) =>
                          setStudioDraft({ ...studioDraft, tagline: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0D12] border border-white/[0.1] text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(studioDraft.printerStatus?.active)}
                      onChange={(e) =>
                        setStudioDraft({
                          ...studioDraft,
                          printerStatus: {
                            ...studioDraft.printerStatus,
                            active: e.target.checked,
                          },
                        })
                      }
                      className="accent-[#FF5500] w-4 h-4"
                    />
                    <span>&ldquo;Gerade auf dem Druckbett&rdquo; Widget auf der Startseite zeigen</span>
                  </label>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                        Dein 3D-Drucker
                      </label>
                      <input
                        value={studioDraft.printerStatus?.printer || ''}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            printerStatus: {
                              ...studioDraft.printerStatus,
                              printer: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                        Aktueller Druck
                      </label>
                      <input
                        value={studioDraft.printerStatus?.modelName || ''}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            printerStatus: {
                              ...studioDraft.printerStatus,
                              modelName: e.target.value,
                            },
                          })
                        }
                        placeholder="z.B. Kopfhörer-Ständer für Lukas"
                        className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#9DA4B4] mb-1">
                      <span>Druckfortschritt</span>
                      <span className="text-[#FF7326]">
                        {studioDraft.printerStatus?.progress || 0}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={studioDraft.printerStatus?.progress || 0}
                      onChange={(e) =>
                        setStudioDraft({
                          ...studioDraft,
                          printerStatus: {
                            ...studioDraft.printerStatus,
                            progress: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-[#FF5500]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                        Düse °C
                      </label>
                      <input
                        type="number"
                        value={studioDraft.printerStatus?.nozzleTemp || 210}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            printerStatus: {
                              ...studioDraft.printerStatus,
                              nozzleTemp: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                        Bett °C
                      </label>
                      <input
                        type="number"
                        value={studioDraft.printerStatus?.bedTemp || 60}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            printerStatus: {
                              ...studioDraft.printerStatus,
                              bedTemp: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                        Restzeit
                      </label>
                      <input
                        value={studioDraft.printerStatus?.remaining || ''}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            printerStatus: {
                              ...studioDraft.printerStatus,
                              remaining: e.target.value,
                            },
                          })
                        }
                        placeholder="z.B. 1h 20m"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingStudio}
                  className="w-full py-3 px-5 rounded-xl bg-[#FF5500] hover:bg-[#FF6B1F] text-white font-semibold text-sm cursor-pointer"
                >
                  {savingStudio ? 'Speichert...' : 'Einstellungen speichern'}
                </button>
              </form>

              {/* Right: Security (Change PIN) & Cloud Status */}
              <div className="lg:col-span-5 space-y-5">
                <form
                  onSubmit={handleChangePin}
                  className="p-5 rounded-2xl bg-[#141720] border border-white/[0.09] space-y-3.5"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.07]">
                    <KeyRound className="w-4 h-4 text-[#FF5500]" />
                    <h3 className="font-display font-bold text-white">
                      Studio-PIN ändern (lokal)
                    </h3>
                  </div>

                  {pinMsg && (
                    <div className="p-2.5 rounded-lg bg-white/[0.06] text-xs text-[#38BDF8]">
                      {pinMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                      Aktuelle PIN
                    </label>
                    <input
                      type="password"
                      required
                      value={pinForm.currentPin}
                      onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#7D8596] mb-1">
                      Neue PIN (mind. 4 Zeichen)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={pinForm.newPin}
                      onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                      placeholder="Neue PIN"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B0D12] border border-white/[0.1] font-mono text-sm text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1E2332] hover:bg-[#283044] border border-white/[0.12] text-xs font-semibold text-white cursor-pointer"
                  >
                    PIN aktualisieren
                  </button>
                </form>

                {/* Clean System Status Card */}
                <div className="p-5 rounded-2xl bg-[#141720] border border-white/[0.09] space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.07]">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-display font-bold text-white">System-Status</h3>
                  </div>

                  <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#0B0D12]">
                    <div>
                      <div className="font-semibold text-white">Cloud-Speicher (Vercel Blob)</div>
                      <div className="text-[11px] text-[#7D8596]">
                        Fotos, Produkte & verschlüsselte Aufträge
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded font-mono text-[10px] ${
                        blobConfigured
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {blobConfigured ? 'DAUERHAFT AKTIV' : 'LOKAL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#0B0D12]">
                    <div>
                      <div className="font-semibold text-white">Material-Profil</div>
                      <div className="text-[11px] text-[#7D8596]">5 PLA-Farben aktiv</div>
                    </div>
                    <span className="px-2 py-1 rounded font-mono text-[10px] bg-[#FF5500]/15 text-[#FF7326]">
                      100% PLA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
