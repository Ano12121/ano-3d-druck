# Ano — 3D-Druck Studio (100 % PLA)

Moderner Full-Stack 3D-Druck-Shop für **100 % PLA**-Kreationen mit:
* **5 Studio-PLA-Farben:** Matt-Schwarz, Matt-Weiß, Rot-Schwarz Mix, Galaxy Blau-Lila & Pink
* **Interaktiver 3D-Viewer (`.STL`):** Lazy-geladener Three.js WebGL-Viewer mit Live-Filament-Farbwechsel
* **Einfacher Wunschdruck & Checkout:** Nur Name als Pflichtfeld, 3D-Modell-Links (MakerWorld / Printables / Thingiverse), Bild- oder `.STL`-Upload
* **Live-Druckstatus-Tracker:** Auto-Refresh alle 8 Sek., Prozentbalken & 1-Klick-WhatsApp-Link (`?track=ANO-2026-XXXX`)
* **PIN-geschütztes Creator Studio:** Produkt-Upload, Auftragsverwaltung, KI-Fotostudio (inkl. 1-Klick-Gemini-Premium-Prompt & lokalem 4:3 Studio-Look)
* **Dauerhafter Cloud-Speicher:** Versionierte Snapshots + AES-256-GCM-verschlüsselter Auftrags-Vault in **Vercel Blob**

## Lokal starten

```bash
npm install
npm run dev
```

* Frontend: `http://localhost:5173` (im WLAN auch direkt am Handy erreichbar)
* Backend-API: `http://localhost:3001`

## Produktion / Vercel Deploy

```bash
npm run build
vercel --prod
```
