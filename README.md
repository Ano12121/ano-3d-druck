# LAYERLAB — 3D-Druck Studio & Boutique Online-Shop

Moderner Full-Stack 3D-Druck-Shop mit interaktivem **3D-STL-Viewer**, **automatischem `.STL`-Volumen- & Preisrechner**, **PIN-geschütztem Creator Studio**, **Stripe Checkout**, **E-Mail-Benachrichtigungen** und **Live-Druckstatus-Tracker**.

## Schnellstart (Lokal)

```bash
npm install
npm run dev
```

* Shop-Frontend: `http://localhost:5173`
* Backend-API: `http://localhost:3001`
* Standard-PIN fürs **Creator Studio**: `2026` (direkt im Studio unter *Sicherheit* änderbar)

## Live schalten (Produktion / Hosting)

1. Erstelle eine `.env`-Datei auf Basis von `.env.example` und trage optional deinen `STRIPE_SECRET_KEY` sowie deine SMTP-Daten ein.
2. Baue das Frontend und starte den Produktionsserver:

```bash
npm run build
npm start
```

Express liefert automatisch das gebaute `dist/`-Frontend, die `/api`-Endpunkte und alle hochgeladenen Fotos & `.stl`-Dateien unter `/uploads` aus einem einzigen Prozess aus (ideal für Render, Railway, Fly.io oder einen eigenen VPS).
