# 🚗 TravelTracker - Gestión de Viajes Profesionales

Aplicación para gestionar viajes profesionales, conectar con Google Calendar y generar reportes para Hacienda.

**URL de la app:** https://cmoreno34.github.io/travel-traker/

---

## 🚀 Despliegue

Cada push a `main` publica la app automáticamente en GitHub Pages
(`.github/workflows/pages.yml`). En Settings → Pages, "Source" debe ser **GitHub Actions**.

---

## 🔧 Google Cloud - URI de redirección (solo una vez)

Añade esta URI en Google Cloud Console → Credenciales → tu cliente OAuth → URIs de redirección autorizados:

```
https://cmoreno34.github.io/travel-traker/
```

⚠️ **Importante:** es `travel-traker` (como el repositorio) e incluye la barra final `/`.
Si falta, Google muestra el error `redirect_uri_mismatch` al conectar.

---

## 📋 Uso de la App

### 1. Facturas
Haz clic en "Cargar Ballenoil 2025" para importar tus 11 facturas.

### 2. Calendario
- Elige el año arriba a la derecha
- Haz clic en "Conectar con Google" y autoriza el acceso
- Importa los eventos del año (se leen todos tus calendarios). Importar un año
  no borra los eventos ya guardados de otros años
- **❓ Eventos por asignar:** la app pregunta por los títulos que no reconoce
  (primero los que parecen IE/EAE ⭐ y los que se repiten). Elige el sitio o
  "No es un viaje": la respuesta vale para todos los eventos con ese título,
  también los futuros, y no se vuelve a preguntar
- Si un evento tiene el sitio mal, cámbialo en la tabla: la app aprende la corrección
- **🧠 Aprendido:** lista de lo aprendido, para cambiarlo u olvidarlo

### 3. Viajes
- Se calculan solos al importar o al responder preguntas
- Filtra por mes si lo necesitas
- Cada día se calcula la ruta Casa → sitios del día (en orden) → Casa. Solo se
  facturan los tramos que salen de IE/EAE o llegan a IE/EAE

### 4. Reportes
- Resumen mensual del año elegido
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

Se buscan en el título, la descripción y la ubicación del evento (sin
distinguir mayúsculas ni acentos). La lista completa está en `LOCATION_KEYWORDS`
(`src/trips.js`). Algunos ejemplos:

- **IE Segovia:** segovia, códigos de grupo de IE con "S" (p. ej. `BBA/SEP-2026/1.S.A`)
- **IE Madrid Tower:** tower, ie madrid, caleido, "IE" como palabra suelta, final project review, otros códigos de IE (p. ej. `BBA/SEP-2026/OPT.M.A`)
- **EAE:** eae, joaquin costa, mamgc
- **UFV:** ufv, villanueva
- **CEU:** ceu, san pablo
- **SLU:** slu, saint louis, btm, padre rubio
- **UC3M:** uc3m, getafe, tutoria

Las sesiones asíncronas (`ASYNC_...`) son online y no cuentan como viaje.

---

## 💾 Almacenamiento

Los datos se guardan en localStorage del navegador. Puedes borrarlos desde Reportes → 🗑️

---

## 🛠️ Desarrollo Local

```bash
npm install
npm run dev
```

Abre http://localhost:5173/travel-traker/

Para desarrollo local, añade también esta URI en Google Cloud:
```
http://localhost:5173/travel-traker/
```

---

## 📊 Tarifa

Configurada a **0,26 €/km** (estándar Hacienda).

Para cambiarla, edita `RATE_PER_KM` en `src/App.jsx`.
