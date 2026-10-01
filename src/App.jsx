import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LOCATION_NAMES, BILLABLE_LOCATIONS, detectLocation, isSuspectUnmapped,
  parseEventDate, eventKey, isDeclined, buildTrips, buildMonthlyReports
} from './trips.js';

// ============================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ============================================
const CONFIG = {
  // Tu Client ID de Google Cloud Console
  GOOGLE_CLIENT_ID: '677981622650-5a62o9t668gtqr0ekn85ve1mt2hkhv2i.apps.googleusercontent.com',
  
  // Tarifa por kilómetro (estándar Hacienda)
  RATE_PER_KM: 0.26,
  
  // Año por defecto
  DEFAULT_YEAR: new Date().getFullYear()
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const SAMPLE_INVOICES = [
  { month: 0, year: 2025, totalLiters: 169.69, baseAmount: 188.64, taxAmount: 39.61, totalAmount: 228.25, invoiceNumber: 'FRA/2025012212' },
  { month: 1, year: 2025, totalLiters: 126.61, baseAmount: 143.25, taxAmount: 30.08, totalAmount: 173.33, invoiceNumber: 'FRA/2025038573' },
  { month: 2, year: 2025, totalLiters: 197.24, baseAmount: 221.51, taxAmount: 46.52, totalAmount: 268.03, invoiceNumber: 'FRA/2025054481' },
  { month: 3, year: 2025, totalLiters: 128.43, baseAmount: 140.93, taxAmount: 29.60, totalAmount: 170.53, invoiceNumber: 'FRA/2025087164' },
  { month: 4, year: 2025, totalLiters: 194.89, baseAmount: 210.29, taxAmount: 44.16, totalAmount: 254.45, invoiceNumber: 'FRA/2025112545' },
  { month: 5, year: 2025, totalLiters: 240.90, baseAmount: 257.09, taxAmount: 53.99, totalAmount: 311.08, invoiceNumber: 'FRA/2025141282' },
  { month: 6, year: 2025, totalLiters: 225.95, baseAmount: 247.09, taxAmount: 51.89, totalAmount: 298.98, invoiceNumber: 'FRA/2025167988' },
  { month: 7, year: 2025, totalLiters: 114.16, baseAmount: 123.50, taxAmount: 25.94, totalAmount: 149.44, invoiceNumber: 'FRA/2025193155' },
  { month: 8, year: 2025, totalLiters: 369.20, baseAmount: 405.28, taxAmount: 85.11, totalAmount: 490.39, invoiceNumber: 'FRA/2025220368' },
  { month: 9, year: 2025, totalLiters: 382.39, baseAmount: 422.49, taxAmount: 88.72, totalAmount: 511.21, invoiceNumber: 'FRA/2025249047' },
  { month: 10, year: 2025, totalLiters: 401.42, baseAmount: 453.64, taxAmount: 95.26, totalAmount: 548.90, invoiceNumber: 'FRA/2025277716' }
];

// Lee un array guardado en localStorage, reconvirtiendo la fecha indicada
const loadStored = (key, dateField) => {
  try {
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    return dateField ? items.map(it => ({ ...it, [dateField]: new Date(it[dateField]) })) : items;
  } catch {
    return [];
  }
};

const shortName = (loc) => loc === 'casa' ? 'Casa' : LOCATION_NAMES[loc];

// URL de redirección OAuth: raíz de la app en GitHub Pages (base de Vite),
// aunque se haya abierto como .../index.html
const getRedirectUri = () => window.location.origin + import.meta.env.BASE_URL;

export default function App() {
  const [invoices, setInvoices] = useState(() => loadStored('travel_invoices'));
  const [calendarEvents, setCalendarEvents] = useState(() => loadStored('travel_events', 'start'));
  const [trips, setTrips] = useState(() => loadStored('travel_trips', 'date'));
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() => Number(localStorage.getItem('travel_year')) || CONFIG.DEFAULT_YEAR);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [activeTab, setActiveTab] = useState('facturas');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [manualEvents, setManualEvents] = useState(() => loadStored('travel_manual', 'start'));
  const [missedEvents, setMissedEvents] = useState(() => loadStored('travel_review', 'start'));
  // Sitio elegido a mano por evento (clave eventKey → ubicación o 'none')
  const [locationOverrides, setLocationOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('travel_overrides') || '{}');
    } catch {
      return {};
    }
  });
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Cargar token de URL al iniciar (OAuth redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
        setStatusMessage('✅ Conectado con Google Calendar');
      } else {
        setStatusMessage(`❌ Google no autorizó el acceso: ${params.get('error')}`);
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Se guarda siempre (también vacío) para que borrar el último elemento persista
  useEffect(() => {
    localStorage.setItem('travel_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('travel_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('travel_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem('travel_manual', JSON.stringify(manualEvents));
  }, [manualEvents]);

  useEffect(() => {
    localStorage.setItem('travel_review', JSON.stringify(missedEvents));
  }, [missedEvents]);

  useEffect(() => {
    localStorage.setItem('travel_overrides', JSON.stringify(locationOverrides));
  }, [locationOverrides]);

  useEffect(() => {
    localStorage.setItem('travel_year', String(selectedYear));
  }, [selectedYear]);

  const yearEvents = useMemo(
    () => calendarEvents.filter(e => new Date(e.start).getFullYear() === selectedYear),
    [calendarEvents, selectedYear]
  );
  const yearReview = useMemo(
    () => missedEvents
      .filter(e => new Date(e.start).getFullYear() === selectedYear)
      .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [missedEvents, selectedYear]
  );
  const yearTrips = useMemo(() => trips.filter(t => t.year === selectedYear), [trips, selectedYear]);
  const visibleTrips = selectedMonth !== null ? yearTrips.filter(t => t.month === selectedMonth) : yearTrips;
  const monthlyReports = useMemo(
    () => buildMonthlyReports(yearTrips, invoices.filter(i => i.year === selectedYear)),
    [yearTrips, invoices, selectedYear]
  );

  const loadSampleData = useCallback(() => {
    setInvoices(SAMPLE_INVOICES);
    setStatusMessage('✅ Facturas de Ballenoil 2025 cargadas');
  }, []);

  const handleGoogleAuth = useCallback(() => {
    const redirectUri = getRedirectUri();
    setStatusMessage(`🔗 Redirigiendo a Google... (URI: ${redirectUri})`);
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CONFIG.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')}`;
    
    window.location.href = authUrl;
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    if (!accessToken) {
      setStatusMessage('❌ No hay conexión con Google Calendar');
      return;
    }

    setIsLoading(true);
    setStatusMessage('📡 Obteniendo eventos de todos tus calendarios...');

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // GET paginado; devuelve { items } o { error }
    const fetchAllPages = async (url, baseParams = {}) => {
      const items = [];
      let pageToken;
      do {
        const params = new URLSearchParams(baseParams);
        if (pageToken) params.set('pageToken', pageToken);
        const resp = await fetch(`${url}?${params.toString()}`, { headers: authHeader });
        const data = await resp.json();
        if (data.error) return { items, error: data.error };
        if (data.items) items.push(...data.items);
        pageToken = data.nextPageToken;
      } while (pageToken);
      return { items };
    };

    try {
      // 1) Listar todos los calendarios del usuario (no solo "primary")
      const calList = await fetchAllPages('https://www.googleapis.com/calendar/v3/users/me/calendarList');
      if (calList.error) {
        setStatusMessage(`❌ Error: ${calList.error.message}`);
        if (calList.error.code === 401) {
          setIsAuthenticated(false);
          setAccessToken(null);
        }
        setIsLoading(false);
        return;
      }

      const calendars = calList.items.filter(c => !c.hidden);

      // 2) Pedir eventos de cada calendario en paralelo, paginando
      const results = await Promise.all(calendars.map(async (cal) => {
        const { items, error } = await fetchAllPages(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`,
          {
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '2500',
          }
        );
        if (error) console.warn(`Calendario ${cal.summary}: ${error.message}`);
        return { cal, items, error };
      }));
      const failed = results.filter(r => r.error).map(r => r.cal.summary);

      // 3) Consolidar y deduplicar (evento puede aparecer en varios calendarios)
      const seen = new Set();
      const allRaw = [];
      for (const { cal, items } of results) {
        for (const ev of items) {
          if (!ev.start || isDeclined(ev)) continue;
          const key = eventKey(ev);
          if (seen.has(key)) continue;
          seen.add(key);
          allRaw.push({ ...ev, _calendarName: cal.summary });
        }
      }

      // 4) Detectar ubicación con título + descripción + location;
      //    si el usuario la eligió a mano, manda su elección
      const allEvents = allRaw.map(event => {
        const key = eventKey(event);
        const autoLocation = detectLocation(event);
        const override = locationOverrides[key];
        return {
          id: event.id,
          key,
          title: event.summary || 'Sin título',
          description: event.description || '',
          start: parseEventDate(event.start.dateTime || event.start.date),
          location: override === 'none' ? null : (override || autoLocation),
          autoLocation,
          originalLocation: event.location,
          calendar: event._calendarName,
        };
      }).filter(e => e.start.getFullYear() === selectedYear);

      const relevantEvents = allEvents.filter(e => e.location !== null);

      // 5) Para revisar: mencionan IE/EAE/business pero no se detectan solos
      const missed = allEvents.filter(e => isSuspectUnmapped({ ...e, location: e.autoLocation }));
      const pending = missed.filter(e => !locationOverrides[e.key]);

      // Reemplazar solo los eventos del año importado; los de otros años se conservan
      const otherYears = (e) => new Date(e.start).getFullYear() !== selectedYear;
      setCalendarEvents(prev => [...prev.filter(otherYears), ...relevantEvents]);
      setMissedEvents(prev => [...prev.filter(otherYears), ...missed]);

      const billable = relevantEvents.filter(e => BILLABLE_LOCATIONS.includes(e.location)).length;
      let msg = `✅ ${relevantEvents.length} eventos relevantes (${billable} de IE/EAE) de ${allEvents.length} totales en ${selectedYear} (${calendars.length} calendarios)`;
      if (failed.length > 0) msg += ` · ❌ No se pudo leer: ${failed.join(', ')}`;
      if (pending.length > 0) {
        msg += ` · ⚠️ ${pending.length} posibles IE/EAE sin asignar (revisa la lista)`;
        console.warn('Eventos sospechosos no mapeados:', pending);
      }
      setStatusMessage(msg);
    } catch (error) {
      setStatusMessage(`❌ Error de conexión: ${error.message}`);
    }

    setIsLoading(false);
  }, [accessToken, selectedYear, locationOverrides]);

  // Asignar a mano el sitio de un evento de la lista de revisión.
  // value: ubicación, 'none' (no es un viaje) o '' (volver a sin asignar)
  const assignLocation = useCallback((event, value) => {
    setLocationOverrides(prev => {
      const next = { ...prev };
      if (value) next[event.key] = value;
      else delete next[event.key];
      return next;
    });
    setCalendarEvents(prev => {
      const rest = prev.filter(e => e.key !== event.key);
      return value && value !== 'none' ? [...rest, { ...event, location: value }] : rest;
    });
    setStatusMessage(value && value !== 'none'
      ? `✅ "${event.title}" → ${LOCATION_NAMES[value]}. Pulsa "Calcular" en Viajes para actualizar`
      : `✅ "${event.title}" no cuenta como viaje`);
  }, []);

  const addManualEvent = useCallback((event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newEvent = {
      id: `manual_${Date.now()}`,
      title: formData.get('title'),
      start: parseEventDate(formData.get('date')),
      location: formData.get('destination'),
      isManual: true
    };
    setManualEvents(prev => [...prev, newEvent]);
    setShowManualEntry(false);
    event.target.reset();
    setStatusMessage('✅ Viaje añadido');
  }, []);

  const deleteManualEvent = useCallback((id) => {
    setManualEvents(prev => prev.filter(e => e.id !== id));
    setStatusMessage('🗑️ Viaje eliminado');
  }, []);

  const calculateTrips = useCallback(() => {
    const allEvents = [...calendarEvents, ...manualEvents];
    
    if (allEvents.length === 0) {
      setStatusMessage('⚠️ No hay eventos para calcular viajes');
      return [];
    }
    
    const calculatedTrips = buildTrips(allEvents, CONFIG.RATE_PER_KM);
    setTrips(calculatedTrips);
    const inYear = calculatedTrips.filter(t => t.year === selectedYear).length;
    setStatusMessage(`✅ ${inYear} viajes facturables (IE/EAE) calculados en ${selectedYear}`);
    return calculatedTrips;
  }, [calendarEvents, manualEvents, selectedYear]);

  // Los reportes se derivan de los viajes del año; generar = recalcular viajes
  const generateMonthlyReports = useCallback(() => {
    if (calculateTrips().length > 0) setStatusMessage(`✅ Reportes de ${selectedYear} generados`);
  }, [calculateTrips, selectedYear]);

  const exportToCSV = useCallback(() => {
    if (monthlyReports.length === 0) return;
    
    let csv = 'Mes,Año,Km Totales,Importe Km (€),Gasto Combustible (€),Litros,Consumo L/100km,Coste Real €/km\n';
    
    for (const report of monthlyReports) {
      csv += `${MONTHS[report.month]},${report.year},${report.totalKm},${report.totalAmount.toFixed(2)},${report.fuelExpense.toFixed(2)},${report.fuelLiters.toFixed(2)},${(report.consumptionPer100km || 0).toFixed(2)},${(report.costPerKm || 0).toFixed(3)}\n`;
    }
    
    const totals = monthlyReports.reduce((acc, r) => ({
      km: acc.km + r.totalKm, amount: acc.amount + r.totalAmount, fuel: acc.fuel + r.fuelExpense, liters: acc.liters + r.fuelLiters
    }), { km: 0, amount: 0, fuel: 0, liters: 0 });
    
    csv += `\nTOTAL,${selectedYear},${totals.km},${totals.amount.toFixed(2)},${totals.fuel.toFixed(2)},${totals.liters.toFixed(2)},,\n`;
    csv += `\nDiferencia (Importe - Combustible):,${(totals.amount - totals.fuel).toFixed(2)}€\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `viajes_profesionales_${selectedYear}.csv`;
    link.click();
    setStatusMessage('✅ CSV exportado');
  }, [monthlyReports, selectedYear]);

  const exportTripsToCSV = useCallback(() => {
    if (visibleTrips.length === 0) return;
    
    let csv = 'Fecha,Evento,Origen,Destino,Tipo,Kilómetros,Importe (€)\n';
    
    for (const trip of visibleTrips) {
      csv += `${new Date(trip.date).toLocaleDateString('es-ES')},"${(trip.event || '').replace(/"/g, '""')}",${LOCATION_NAMES[trip.origin]},${LOCATION_NAMES[trip.destination]},${trip.type},${trip.distance},${trip.amount.toFixed(2)}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `detalle_viajes_${selectedYear}${selectedMonth !== null ? '_' + MONTHS[selectedMonth] : ''}.csv`;
    link.click();
    setStatusMessage('✅ Detalle exportado');
  }, [visibleTrips, selectedMonth, selectedYear]);

  const clearAllData = useCallback(() => {
    if (confirm('¿Seguro que quieres borrar todos los datos?')) {
      setInvoices([]);
      setCalendarEvents([]);
      setTrips([]);
      setManualEvents([]);
      setMissedEvents([]);
      setLocationOverrides({});
      localStorage.clear();
      setStatusMessage('🗑️ Datos borrados');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-xl">🚗</div>
              <div>
                <h1 className="text-lg font-bold">Travel<span className="text-cyan-400">Tracker</span></h1>
                <p className="text-xs text-slate-400">Gestión de viajes profesionales</p>
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} title="Año" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                {Array.from({ length: CONFIG.DEFAULT_YEAR - 2024 + 2 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <nav className="flex gap-1 bg-slate-800 p-1 rounded-xl">
                {[['facturas', '📁'], ['calendario', '📅'], ['viajes', '🛣️'], ['reportes', '📊']].map(([key, icon]) => (
                  <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    {icon}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          
          {statusMessage && (
            <div className="mt-2 px-3 py-2 bg-slate-800 rounded-lg text-sm text-amber-400">{statusMessage}</div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* FACTURAS */}
        {activeTab === 'facturas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xl font-bold">📁 Facturas de Combustible</h2>
              <button onClick={loadSampleData} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium hover:shadow-lg transition-all">
                📥 Cargar Ballenoil 2025
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-slate-400">Haz clic en "Cargar Ballenoil 2025" para importar las facturas</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400 mb-1">Total</p>
                    <p className="text-2xl font-bold text-cyan-400">{invoices.reduce((s, i) => s + i.totalAmount, 0).toFixed(2)}€</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400 mb-1">Litros</p>
                    <p className="text-2xl font-bold text-emerald-400">{invoices.reduce((s, i) => s + i.totalLiters, 0).toFixed(0)}L</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400 mb-1">€/L medio</p>
                    <p className="text-2xl font-bold text-amber-400">{(invoices.reduce((s, i) => s + i.baseAmount, 0) / invoices.reduce((s, i) => s + i.totalLiters, 0)).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-sm text-slate-400 mb-1">IVA</p>
                    <p className="text-2xl font-bold text-purple-400">{invoices.reduce((s, i) => s + i.taxAmount, 0).toFixed(2)}€</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {invoices.map((inv, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-800 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⛽</span>
                          <div>
                            <p className="font-medium">{MONTHS[inv.month]}</p>
                            <p className="text-xs text-slate-400">{inv.invoiceNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400">{inv.totalAmount.toFixed(2)}€</p>
                          <p className="text-xs text-slate-400">{inv.totalLiters.toFixed(1)}L</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CALENDARIO */}
        {activeTab === 'calendario' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">📅 Google Calendar</h2>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              {!isAuthenticated ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">🔐</div>
                  <h3 className="text-lg font-semibold mb-2">Conecta tu Google Calendar</h3>
                  <p className="text-slate-400 mb-6 text-sm">Importa tus citas de IE, EAE, UFV, CEU y SLU</p>
                  <button onClick={handleGoogleAuth} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium hover:shadow-lg transition-all">
                    🔗 Conectar con Google
                  </button>
                  <details className="mt-6 text-left bg-slate-800/60 rounded-xl p-4 text-sm">
                    <summary className="cursor-pointer text-slate-400">¿Google muestra "redirect_uri_mismatch"? (configuración única)</summary>
                    <p className="text-slate-300 mt-2 mb-2">No es un error de la app: es un aviso para configurar Google una sola vez. En Google Cloud Console → Credenciales → tu cliente OAuth → URIs de redirección autorizados, añade exactamente:</p>
                    <code className="block bg-slate-900 px-3 py-2 rounded text-cyan-400 break-all">{getRedirectUri()}</code>
                  </details>
                </div>
              ) : (
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                  <p className="text-emerald-400 font-medium">✅ Conectado</p>
                  <button onClick={fetchCalendarEvents} disabled={isLoading} className="px-4 py-2 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50">
                    {isLoading ? '⏳...' : `📥 Importar ${selectedYear}`}
                  </button>
                </div>
              )}

              {yearEvents.length > 0 && (
                <div className="overflow-x-auto mt-2">
                  <p className="text-emerald-400 mb-2 text-sm">✓ {yearEvents.length} eventos guardados de {selectedYear} ({yearEvents.filter(e => BILLABLE_LOCATIONS.includes(e.location)).length} de IE/EAE)</p>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="pb-2">Fecha</th>
                          <th className="pb-2">Evento</th>
                          <th className="pb-2">Destino</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...yearEvents].sort((a, b) => new Date(a.start) - new Date(b.start)).map((event) => (
                          <tr key={`${event.id}-${new Date(event.start).getTime()}`} className="border-b border-slate-800/50">
                            <td className="py-2 font-mono text-xs">{new Date(event.start).toLocaleDateString('es-ES')}</td>
                            <td className="py-2">{event.title}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${BILLABLE_LOCATIONS.includes(event.location) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>{LOCATION_NAMES[event.location]}</span>
                              {event.key && locationOverrides[event.key] && <span className="ml-1 text-xs text-slate-500" title="Asignado a mano">✋</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {yearReview.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                <h3 className="font-semibold text-amber-400 mb-1">
                  ⚠️ {yearReview.length} eventos para revisar ({yearReview.filter(e => !locationOverrides[e.key]).length} sin asignar)
                </h3>
                <p className="text-sm text-slate-300 mb-3">Parecen de IE/EAE pero no se detectan solos. Elige el sitio de cada uno o "No es un viaje": se recuerda para las próximas importaciones. Después pulsa "Calcular" en Viajes.</p>
                <div className="space-y-2 max-h-96 overflow-y-auto text-sm">
                  {yearReview.map((event) => {
                    const value = locationOverrides[event.key] || '';
                    return (
                      <div key={event.key} className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs text-slate-400 w-20">{new Date(event.start).toLocaleDateString('es-ES')}</span>
                        <span className="flex-1 min-w-[10rem]">{event.title}</span>
                        <select
                          value={value}
                          onChange={(e) => assignLocation(event, e.target.value)}
                          className={`bg-slate-800 border rounded-lg px-2 py-1 text-xs ${value ? 'border-slate-700' : 'border-amber-500/60 text-amber-300'}`}
                        >
                          <option value="">— Sin asignar —</option>
                          {Object.entries(LOCATION_NAMES).filter(([k]) => k !== 'casa').map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                          <option value="none">No es un viaje</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Viajes manuales */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">➕ Viajes Manuales</h3>
                <button onClick={() => setShowManualEntry(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium">Añadir</button>
              </div>
              {manualEvents.length > 0 ? (
                <div className="space-y-2">
                  {manualEvents.map((event) => (
                    <div key={event.id} className="flex justify-between items-center bg-slate-800 rounded-xl p-3">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-slate-400">{new Date(event.start).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">{LOCATION_NAMES[event.location]}</span>
                        <button onClick={() => deleteManualEvent(event.id)} className="text-red-400 hover:text-red-300">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-4 text-sm">Sin viajes manuales</p>
              )}
            </div>
          </div>
        )}

        {/* VIAJES */}
        {activeTab === 'viajes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xl font-bold">🛣️ Viajes</h2>
              <div className="flex gap-2 items-center">
                <button onClick={calculateTrips} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium">🔄 Calcular</button>
                <select value={selectedMonth ?? ''} onChange={(e) => setSelectedMonth(e.target.value === '' ? null : parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                  <option value="">Todos</option>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                {visibleTrips.length > 0 && <button onClick={exportTripsToCSV} className="px-4 py-2 bg-emerald-500 rounded-xl font-medium">📥 CSV</button>}
              </div>
            </div>

            {yearTrips.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">🛣️</div>
                <p className="text-slate-400">Sin viajes en {selectedYear}. Importa eventos y haz clic en "Calcular"</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const f = visibleTrips;
                    return (
                      <>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Km</p>
                          <p className="text-2xl font-bold text-cyan-400">{f.reduce((s, t) => s + t.distance, 0)}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Importe</p>
                          <p className="text-2xl font-bold text-emerald-400">{f.reduce((s, t) => s + t.amount, 0).toFixed(2)}€</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Viajes</p>
                          <p className="text-2xl font-bold text-amber-400">{f.length}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto max-h-[32rem] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Fecha</th>
                        <th className="pb-2">Evento</th>
                        <th className="pb-2">Ruta</th>
                        <th className="pb-2">Km</th>
                        <th className="pb-2">€</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTrips.map((trip) => (
                        <tr key={trip.id} className="border-b border-slate-800/50">
                          <td className="py-2 font-mono text-xs">{new Date(trip.date).toLocaleDateString('es-ES')}</td>
                          <td className="py-2 text-xs">{trip.event?.substring(0, 25)}</td>
                          <td className="py-2 text-xs">
                            {shortName(trip.origin)} → {shortName(trip.destination)}
                            <span className={`ml-2 px-1 rounded text-xs ${trip.type === 'ida' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{trip.type}</span>
                          </td>
                          <td className="py-2 font-mono">{trip.distance}</td>
                          <td className="py-2 font-mono text-emerald-400">{trip.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* REPORTES */}
        {activeTab === 'reportes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xl font-bold">📊 Reportes {selectedYear}</h2>
              <div className="flex gap-2">
                <button onClick={generateMonthlyReports} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium">📊 Generar</button>
                {monthlyReports.length > 0 && <button onClick={exportToCSV} className="px-4 py-2 bg-emerald-500 rounded-xl font-medium">📥 CSV</button>}
                <button onClick={clearAllData} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium">🗑️</button>
              </div>
            </div>

            {monthlyReports.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-slate-400">Sin viajes en {selectedYear}. Carga facturas, importa eventos y genera reportes</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const t = monthlyReports.reduce((a, r) => ({ km: a.km + r.totalKm, amount: a.amount + r.totalAmount, fuel: a.fuel + r.fuelExpense, liters: a.liters + r.fuelLiters }), { km: 0, amount: 0, fuel: 0, liters: 0 });
                    return (
                      <>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Km</p>
                          <p className="text-2xl font-bold text-cyan-400">{t.km}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Importe Km</p>
                          <p className="text-2xl font-bold text-emerald-400">{t.amount.toFixed(2)}€</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Combustible</p>
                          <p className="text-2xl font-bold text-amber-400">{t.fuel.toFixed(2)}€</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-sm text-slate-400 mb-1">Diferencia</p>
                          <p className={`text-2xl font-bold ${t.amount - t.fuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(t.amount - t.fuel).toFixed(2)}€</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Mes</th>
                        <th className="pb-2">Km</th>
                        <th className="pb-2">€ Km</th>
                        <th className="pb-2">Gasolina</th>
                        <th className="pb-2">L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReports.map((r) => (
                        <tr key={`${r.year}-${r.month}`} className="border-b border-slate-800/50">
                          <td className="py-2">{MONTHS[r.month]?.substring(0, 3)}</td>
                          <td className="py-2 font-mono">{r.totalKm}</td>
                          <td className="py-2 font-mono text-emerald-400">{r.totalAmount.toFixed(0)}</td>
                          <td className="py-2 font-mono text-amber-400">{r.fuelExpense.toFixed(0)}</td>
                          <td className="py-2 font-mono">{r.fuelLiters.toFixed(0)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-800 font-bold">
                        <td className="py-2">TOTAL</td>
                        <td className="py-2 font-mono">{monthlyReports.reduce((s, r) => s + r.totalKm, 0)}</td>
                        <td className="py-2 font-mono text-emerald-400">{monthlyReports.reduce((s, r) => s + r.totalAmount, 0).toFixed(0)}</td>
                        <td className="py-2 font-mono text-amber-400">{monthlyReports.reduce((s, r) => s + r.fuelExpense, 0).toFixed(0)}</td>
                        <td className="py-2 font-mono">{monthlyReports.reduce((s, r) => s + r.fuelLiters, 0).toFixed(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <p className="font-semibold text-emerald-400 mb-1">📋 Para Hacienda</p>
                  <p className="text-sm text-slate-300">Exporta el CSV con el detalle de viajes coordinado con tu Google Calendar.</p>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modal añadir viaje */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowManualEntry(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">➕ Añadir Viaje</h3>
              <button onClick={() => setShowManualEntry(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <form onSubmit={addManualEvent} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fecha</label>
                <input type="date" name="date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <input type="text" name="title" placeholder="Ej: Clase IE Segovia" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Destino</label>
                <select name="destination" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                  {Object.entries(LOCATION_NAMES).filter(([k]) => k !== 'casa').map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManualEntry(false)} className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-cyan-500 rounded-xl font-medium">Añadir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
