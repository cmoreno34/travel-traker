// ============================================
// DISTANCIAS ENTRE UBICACIONES (km)
// ============================================
export const DISTANCES = {
  'casa': { 'ie_segovia': 95, 'ie_madrid_tower': 12, 'eae_joaquin_costa': 8, 'ufv': 25, 'ceu': 18, 'slu': 15, 'uc3m': 22, 'casa': 0 },
  'ie_segovia': { 'casa': 95, 'ie_madrid_tower': 90, 'eae_joaquin_costa': 92, 'ufv': 85, 'ceu': 88, 'slu': 90, 'uc3m': 95, 'ie_segovia': 0 },
  'ie_madrid_tower': { 'casa': 12, 'ie_segovia': 90, 'eae_joaquin_costa': 5, 'ufv': 20, 'ceu': 15, 'slu': 12, 'uc3m': 18, 'ie_madrid_tower': 0 },
  'eae_joaquin_costa': { 'casa': 8, 'ie_segovia': 92, 'ie_madrid_tower': 5, 'ufv': 22, 'ceu': 14, 'slu': 10, 'uc3m': 16, 'eae_joaquin_costa': 0 },
  'ufv': { 'casa': 25, 'ie_segovia': 85, 'ie_madrid_tower': 20, 'eae_joaquin_costa': 22, 'ceu': 12, 'slu': 18, 'uc3m': 30, 'ufv': 0 },
  'ceu': { 'casa': 18, 'ie_segovia': 88, 'ie_madrid_tower': 15, 'eae_joaquin_costa': 14, 'ufv': 12, 'slu': 8, 'uc3m': 25, 'ceu': 0 },
  'slu': { 'casa': 15, 'ie_segovia': 90, 'ie_madrid_tower': 12, 'eae_joaquin_costa': 10, 'ufv': 18, 'ceu': 8, 'uc3m': 20, 'slu': 0 },
  'uc3m': { 'casa': 22, 'ie_segovia': 95, 'ie_madrid_tower': 18, 'eae_joaquin_costa': 16, 'ufv': 30, 'ceu': 25, 'slu': 20, 'uc3m': 0 }
};

export const LOCATION_NAMES = {
  'casa': 'Casa (Monasterio de Silos 38)',
  'ie_segovia': 'IE Segovia',
  'ie_madrid_tower': 'IE Madrid Tower',
  'eae_joaquin_costa': 'EAE Joaquín Costa',
  'ufv': 'UFV',
  'ceu': 'CEU',
  'slu': 'SLU',
  'uc3m': 'UC3M (Getafe)'
};

// IMPORTANTE: el orden importa. Las claves más específicas deben ir antes
// que las genéricas (p.ej. ie_segovia antes de ie_madrid_tower) para que
// "IE Segovia Business School" no caiga en Madrid Tower.
// Los textos se buscan como subcadena; las RegExp sirven para siglas cortas
// que solo deben contar como palabra suelta ("IE" sí, "cliente" no).
export const LOCATION_KEYWORDS = {
  'ie_segovia': ['segovia', 'ie segovia', 'campus segovia'],
  'ie_madrid_tower': [
    'tower', 'ie madrid', 'ie tower', 'madrid tower',
    'data_driven', 'data driven', 'caleido', 'torre caleido',
    // Genérico IE (cualquier sesión IE que no sea Segovia)
    'ie business school', 'ie business', 'ie university',
    'instituto de empresa', 'ie school',
    /\bie\b/,
    // Revisiones de proyecto final y alumnos de IE
    'final project review', 'ana rull', 'rull orti',
  ],
  'eae_joaquin_costa': [
    'eae', 'joaquin costa', 'mamgc',
    'master en marketing', 'marketing y gestion', 'ft-es-a',
    'eae business school', 'eae business', 'eae madrid',
  ],
  'ufv': ['ufv', 'villanueva', 'francisco vitoria', 'aib', 'aib1', 'ciencia de datos', 'fundamentos de ciencia', 'big data'],
  'ceu': ['ceu', 'san pablo'],
  'slu': ['slu', 'saint louis', 'san luis', 'btm', 'btm?2500', 'btm 2500'],
  'uc3m': ['uc3m', 'uc3', 'getafe', 'carlos iii', 'tutoria']
};

// Ubicaciones facturables (solo IE y EAE)
export const BILLABLE_LOCATIONS = ['ie_segovia', 'ie_madrid_tower', 'eae_joaquin_costa'];

// Normalizar texto: minúsculas + sin acentos
export const normalize = (s) => (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

// Texto en el que buscar keywords: sin etiquetas HTML ni enlaces. Los enlaces
// de Meet/Teams/Zoom llevan IDs aleatorios que pueden contener "eae", "slu"...
const toSearchText = (s) => normalize(s)
  .replace(/<[^>]*>/g, ' ')
  .replace(/https?:\/\/\S+/g, ' ');

// Detecta la ubicación buscando keywords en título, descripción y location
// del evento. Normaliza acentos para que "joaquín"/"joaquin" sean equivalentes.
export const detectLocation = (event) => {
  if (!event) return null;
  const haystack = [event.summary, event.description, event.location, event.title]
    .map(toSearchText)
    .filter(Boolean)
    .join(' \n ');
  if (!haystack.trim()) return null;
  for (const [locationKey, keywords] of Object.entries(LOCATION_KEYWORDS)) {
    for (const keyword of keywords) {
      const found = keyword instanceof RegExp
        ? keyword.test(haystack)
        : haystack.includes(normalize(keyword));
      if (found) return locationKey;
    }
  }
  return null;
};

// Eventos que mencionan IE/EAE/business school pero no se han mapeado.
// Aquí sí se miran los enlaces (p.ej. ie.zoom.us): es solo una lista para revisar.
const SUSPECT_RE = /\b(ie|eae|business school|instituto de empresa)\b/;
export const isSuspectUnmapped = (event) => {
  if (event.location) return false;
  return SUSPECT_RE.test(normalize(`${event.title} ${event.description} ${event.originalLocation || ''}`));
};

// "2025-03-10" (eventos de día completo / alta manual) se interpreta en hora
// local; new Date('2025-03-10') lo tomaría como medianoche UTC.
export const parseEventDate = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
};

// Clave para deduplicar un evento que aparece en varios calendarios.
// OJO: todas las repeticiones de un evento periódico comparten iCalUID,
// así que hay que incluir el inicio o solo sobreviviría la primera clase.
export const eventKey = (ev) => {
  const start = ev.start?.dateTime ? new Date(ev.start.dateTime).getTime() : ev.start?.date;
  return `${ev.iCalUID || ev.id}|${start}`;
};

// Invitaciones que el usuario ha rechazado: no hubo desplazamiento
export const isDeclined = (ev) =>
  (ev.attendees || []).some(a => a.self && a.responseStatus === 'declined');

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Calcula los tramos facturables. Cada día se recorre la ruta
// casa → paradas del día (en orden) → casa, fusionando eventos seguidos en el
// mismo sitio. Un tramo es facturable si sale de IE/EAE o llega a IE/EAE.
export const buildTrips = (events, ratePerKm) => {
  const byDay = new Map();
  const sorted = events
    .filter(e => e.location && DISTANCES[e.location])
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  for (const ev of sorted) {
    const key = dayKey(new Date(ev.start));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(ev);
  }

  const trips = [];
  for (const [key, dayEvents] of byDay) {
    const date = new Date(dayEvents[0].start);
    const stops = [];
    for (const ev of dayEvents) {
      if (stops.length && stops[stops.length - 1].location === ev.location) continue;
      stops.push(ev);
    }
    const route = [{ location: 'casa' }, ...stops, { location: 'casa' }];

    for (let i = 1; i < route.length; i++) {
      const from = route[i - 1];
      const to = route[i];
      const toBillable = BILLABLE_LOCATIONS.includes(to.location);
      if (!toBillable && !BILLABLE_LOCATIONS.includes(from.location)) continue;

      const distance = DISTANCES[from.location]?.[to.location] || 0;
      trips.push({
        id: `${key}-${i}`,
        date,
        month: date.getMonth(),
        year: date.getFullYear(),
        origin: from.location,
        destination: to.location,
        distance,
        type: to.location === 'casa' ? 'vuelta' : 'ida',
        event: (toBillable ? to : from).title,
        amount: distance * ratePerKm,
        billable: true
      });
    }
  }
  return trips;
};

export const buildMonthlyReports = (trips, invoices) => {
  const reports = {};

  for (const trip of trips) {
    const key = `${trip.year}-${trip.month}`;
    if (!reports[key]) {
      reports[key] = { month: trip.month, year: trip.year, trips: [], totalKm: 0, totalAmount: 0, fuelExpense: 0, fuelLiters: 0 };
    }
    reports[key].trips.push(trip);
    reports[key].totalKm += trip.distance;
    reports[key].totalAmount += trip.amount;
  }

  for (const invoice of invoices) {
    const key = `${invoice.year}-${invoice.month}`;
    if (reports[key]) {
      reports[key].fuelExpense += invoice.totalAmount;
      reports[key].fuelLiters += invoice.totalLiters;
    }
  }

  for (const report of Object.values(reports)) {
    if (report.totalKm > 0 && report.fuelLiters > 0) {
      report.consumptionPer100km = (report.fuelLiters / report.totalKm) * 100;
      report.costPerKm = report.fuelExpense / report.totalKm;
    }
  }

  return Object.values(reports).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
};
