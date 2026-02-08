# 🚗 TravelTracker - Gestión de Viajes Profesionales

Aplicación para gestionar viajes profesionales, conectar con Google Calendar y generar reportes para Hacienda.

**URL de la app:** https://cmoreno34.github.io/travel-tracker/

---

## 🚀 Despliegue en GitHub Pages

### Paso 1: Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repositorio: `travel-tracker`
3. Marca "Public"
4. Haz clic en "Create repository"

### Paso 2: Subir el código

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/cmoreno34/travel-tracker.git
git push -u origin main
```

### Paso 3: Instalar dependencias y desplegar

```bash
npm install
npm run deploy
```

### Paso 4: Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: `gh-pages` / `/ (root)`
5. Save

Tu app estará en: https://cmoreno34.github.io/travel-tracker/

---

## 🔧 Google Cloud - URI de redirección

Añade esta URI en Google Cloud Console → Credenciales → tu cliente OAuth:

```
https://cmoreno34.github.io/travel-tracker/
```

⚠️ **Importante:** Incluye la barra final `/`

---

## 📋 Uso de la App

### 1. Facturas
Haz clic en "Cargar Ballenoil 2025" para importar tus 11 facturas.

### 2. Calendario
- Haz clic en "Conectar con Google"
- Autoriza el acceso
- Importa los eventos del año

### 3. Viajes
- Haz clic en "Calcular" para generar los viajes
- Filtra por mes si lo necesitas

### 4. Reportes
- Genera el resumen mensual
- Exporta a CSV para Hacienda

---

## 📍 Ubicaciones y Distancias

| Ubicación | Desde Casa |
|-----------|------------|
| IE Segovia | 95 km |
| IE Madrid Tower | 12 km |
| EAE Joaquín Costa | 8 km |
| UFV | 25 km |
| CEU | 18 km |
| SLU | 15 km |

---

## 🔑 Palabras Clave para Detección

Los eventos se detectan buscando estas palabras en el título:

- **IE Segovia:** segovia
- **IE Madrid Tower:** tower, ie madrid
- **EAE:** eae, joaquin costa
- **UFV:** ufv, villanueva
- **CEU:** ceu, san pablo
- **SLU:** slu, saint louis

---

## 💾 Almacenamiento

Los datos se guardan en localStorage del navegador. Puedes borrarlos desde Reportes → 🗑️

---

## 🛠️ Desarrollo Local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

Para desarrollo local, añade también esta URI en Google Cloud:
```
http://localhost:5173/
```

---

## 📊 Tarifa

Configurada a **0,26 €/km** (estándar Hacienda).

Para cambiarla, edita `src/App.jsx` línea 10.
