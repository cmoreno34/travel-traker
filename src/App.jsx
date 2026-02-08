import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ============================================
const CONFIG = {
  // Tu Client ID de Google Cloud Console
  GOOGLE_CLIENT_ID: '677981622650-5a62o9t668gtqr0ekn85ve1mt2hkhv2i.apps.googleusercontent.com',
  
  // Tarifa por kilómetro (estándar Hacienda)
  RATE_PER_KM: 0.26,
  
  // Año por defecto
  DEFAULT_YEAR: 2025
};

// ============================================
// DISTANCIAS ENTRE UBICACIONES (km)
// ============================================
const DISTANCES = {
  'casa': { 'ie_segovia': 95, 'ie_madrid_tower': 12, 'eae_joaquin_costa': 8, 'ufv': 25, 'ceu': 18, 'slu': 15, 'casa': 0 },
  'ie_segovia': { 'casa': 95, 'ie_madrid_tower': 90, 'eae_joaquin_costa': 92, 'ufv': 85, 'ceu': 88, 'slu': 90, 'ie_segovia': 0 },
  'ie_madrid_tower': { 'casa': 12, 'ie_segovia': 90, 'eae_joaquin_costa': 5, 'ufv': 20, 'ceu': 15, 'slu': 12, 'ie_madrid_tower': 0 },
  'eae_joaquin_costa': { 'casa': 8, 'ie_segovia': 92, 'ie_madrid_tower': 5, 'ufv': 22, 'ceu': 14, 'slu': 10, 'eae_joaquin_costa': 0 },
  'ufv': { 'casa': 25, 'ie_segovia': 85, 'ie_madrid_tower': 20, 'eae_joaquin_costa': 22, 'ceu': 12, 'slu': 18, 'ufv': 0 },
  'ceu': { 'casa': 18, 'ie_segovia': 88, 'ie_madrid_tower': 15, 'eae_joaquin_costa': 14, 'ufv': 12, 'slu': 8, 'ceu': 0 },
  'slu': { 'casa': 15, 'ie_segovia': 90, 'ie_madrid_tower': 12, 'eae_joaquin_costa': 10, 'ufv': 18, 'ceu': 8, 'slu': 0 }
};

const LOCATION_NAMES = {
  'casa': 'Casa (Monasterio de Silos 38)',
  'ie_segovia': 'IE Segovia',
  'ie_madrid_tower': 'IE Madrid Tower',
  'eae_joaquin_costa': 'EAE Joaquín Costa',
  'ufv': 'UFV',
  'ceu': 'CEU',
  'slu': 'SLU'
};

const LOCATION_KEYWORDS = {
  'ie_segovia': ['segovia', 'ie segovia'],
  'ie_madrid_tower': ['tower', 'ie madrid', 'ie tower', 'madrid tower'],
  'eae_joaquin_costa': ['eae', 'joaquin costa', 'joaquín costa'],
  'ufv': ['ufv', 'villanueva', 'francisco vitoria'],
  'ceu': ['ceu', 'san pablo'],
  'slu': ['slu', 'saint louis', 'san luis']
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

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(CONFIG.DEFAULT_YEAR);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [activeTab, setActiveTab] = useState('facturas');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [manualEvents, setManualEvents] = useState([]);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const detectLocation = useCallback((text) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    for (const [locationKey, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) return locationKey;
      }
    }
    return null;
  }, []);

  // Cargar token de URL al iniciar (OAuth redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
        setStatusMessage('✅ Conectado con Google Calendar');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    
    const savedInvoices = localStorage.getItem('travel_invoices');
    const savedTrips = localStorage.getItem('travel_trips');
    const savedEvents = localStorage.getItem('travel_events');
    const savedManual = localStorage.getItem('travel_manual');
    
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    if (savedTrips) setTrips(JSON.parse(savedTrips).map(t => ({...t, date: new Date(t.date)})));
    if (savedEvents) setCalendarEvents(JSON.parse(savedEvents).map(e => ({...e, start: new Date(e.start)})));
    if (savedManual) setManualEvents(JSON.parse(savedManual).map(e => ({...e, start: new Date(e.start)})));
  }, []);

  useEffect(() => {
    if (invoices.length > 0) localStorage.setItem('travel_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    if (trips.length > 0) localStorage.setItem('travel_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    if (calendarEvents.length > 0) localStorage.setItem('travel_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    if (manualEvents.length > 0) localStorage.setItem('travel_manual', JSON.stringify(manualEvents));
  }, [manualEvents]);

  const loadSampleData = useCallback(() => {
    setInvoices(SAMPLE_INVOICES);
    setStatusMessage('✅ Facturas de Ballenoil 2025 cargadas');
  }, []);

  // Obtener URL de redirección para GitHub Pages
  const getRedirectUri = () => {
    const url = window.location.origin + window.location.pathname;
    // Quitar trailing slash si existe y añadir uno limpio
    return url.endsWith('/') ? url.slice(0, -1) + '/' : url + '/';
  };

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
    setStatusMessage('📡 Obteniendo eventos del calendario...');
    
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    
    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startDate.toISOString()}&` +
        `timeMax=${endDate.toISOString()}&` +
        `singleEvents=true&orderBy=startTime&maxResults=2500`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const data = await response.json();
      
      if (data.error) {
        setStatusMessage(`❌ Error: ${data.error.message}`);
        if (data.error.code === 401) {
          setIsAuthenticated(false);
          setAccessToken(null);
        }
        setIsLoading(false);
        return;
      }
      
      if (data.items && data.items.length > 0) {
        const allEvents = data.items.map(event => ({
          id: event.id,
          title: event.summary || 'Sin título',
          start: new Date(event.start.dateTime || event.start.date),
          location: detectLocation(event.summary) || detectLocation(event.location),
          originalLocation: event.location
        }));
        
        const relevantEvents = allEvents.filter(event => event.location !== null);
        
        setCalendarEvents(relevantEvents);
        setStatusMessage(`✅ ${relevantEvents.length} eventos relevantes de ${data.items.length} totales`);
        
        if (relevantEvents.length === 0) {
          setStatusMessage(`⚠️ Ningún evento coincide con IE/EAE/UFV/CEU/SLU. Primeros: ${allEvents.slice(0, 3).map(e => e.title).join(', ')}`);
        }
      } else {
        setStatusMessage('⚠️ No se encontraron eventos en ' + selectedYear);
      }
    } catch (error) {
      setStatusMessage(`❌ Error de conexión: ${error.message}`);
    }
    
    setIsLoading(false);
  }, [accessToken, selectedYear, detectLocation]);

  const addManualEvent = useCallback((event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newEvent = {
      id: `manual_${Date.now()}`,
      title: formData.get('title'),
      start: new Date(formData.get('date')),
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
    const allEvents = [...calendarEvents, ...manualEvents].sort((a, b) => 
      new Date(a.start) - new Date(b.start)
    );
    
    if (allEvents.length === 0) {
      setStatusMessage('⚠️ No hay eventos para calcular viajes');
      return [];
    }
    
    const calculatedTrips = [];
    let previousLocation = 'casa';
    let previousDate = null;

    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];
      const destination = event.location;
      if (!destination) continue;
      
      const eventDate = new Date(event.start);
      const dateStr = eventDate.toDateString();
      
      let origin = 'casa';
      if (previousDate && previousDate.toDateString() === dateStr) {
        origin = previousLocation;
      }
      
      const distanceToDestination = DISTANCES[origin]?.[destination] || 0;
      
      calculatedTrips.push({
        id: `${event.id}-ida`,
        date: eventDate,
        month: eventDate.getMonth(),
        year: eventDate.getFullYear(),
        origin,
        destination,
        distance: distanceToDestination,
        type: 'ida',
        event: event.title,
        amount: distanceToDestination * CONFIG.RATE_PER_KM
      });

      const nextEvent = allEvents[i + 1];
      const hasMoreEventsToday = nextEvent && new Date(nextEvent.start).toDateString() === dateStr;
      
      if (!hasMoreEventsToday) {
        const distanceBack = DISTANCES[destination]?.['casa'] || 0;
        calculatedTrips.push({
          id: `${event.id}-vuelta`,
          date: eventDate,
          month: eventDate.getMonth(),
          year: eventDate.getFullYear(),
          origin: destination,
          destination: 'casa',
          distance: distanceBack,
          type: 'vuelta',
          event: event.title,
          amount: distanceBack * CONFIG.RATE_PER_KM
        });
        previousLocation = 'casa';
      } else {
        previousLocation = destination;
      }
      
      previousDate = eventDate;
    }
    
    setTrips(calculatedTrips);
    setStatusMessage(`✅ ${calculatedTrips.length} viajes calculados`);
    return calculatedTrips;
  }, [calendarEvents, manualEvents]);

  const generateMonthlyReports = useCallback(() => {
    const calculatedTrips = calculateTrips();
    if (calculatedTrips.length === 0) return;
    
    const reports = {};

    for (const trip of calculatedTrips) {
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

    for (const key of Object.keys(reports)) {
      const report = reports[key];
      if (report.totalKm > 0 && report.fuelLiters > 0) {
        report.consumptionPer100km = (report.fuelLiters / report.totalKm) * 100;
        report.costPerKm = report.fuelExpense / report.totalKm;
      }
    }

    setMonthlyReports(Object.values(reports).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
    setStatusMessage(`✅ Reportes generados`);
  }, [calculateTrips, invoices]);

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
    if (trips.length === 0) return;
    
    let csv = 'Fecha,Evento,Origen,Destino,Tipo,Kilómetros,Importe (€)\n';
    const filteredTrips = selectedMonth !== null ? trips.filter(t => t.month === selectedMonth) : trips;
    
    for (const trip of filteredTrips) {
      csv += `${new Date(trip.date).toLocaleDateString('es-ES')},"${trip.event}",${LOCATION_NAMES[trip.origin]},${LOCATION_NAMES[trip.destination]},${trip.type},${trip.distance},${trip.amount.toFixed(2)}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `detalle_viajes_${selectedYear}${selectedMonth !== null ? '_' + MONTHS[selectedMonth] : ''}.csv`;
    link.click();
    setStatusMessage('✅ Detalle exportado');
  }, [trips, selectedMonth, selectedYear]);

  const clearAllData = useCallback(() => {
    if (confirm('¿Seguro que quieres borrar todos los datos?')) {
      setInvoices([]);
      setCalendarEvents([]);
      setTrips([]);
      setMonthlyReports([]);
      setManualEvents([]);
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
            
            <nav className="flex gap-1 bg-slate-800 p-1 rounded-xl">
              {[['facturas', '📁'], ['calendario', '📅'], ['viajes', '🛣️'], ['reportes', '📊']].map(([key, icon]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                  {icon}
                </button>
              ))}
            </nav>
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

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="font-semibold text-amber-400 mb-2">⚙️ Configuración OAuth</p>
              <p className="text-sm text-slate-300 mb-2">Añade esta URL en Google Cloud Console → Credenciales → tu cliente OAuth → URIs de redirección:</p>
              <code className="block bg-slate-800 px-3 py-2 rounded text-cyan-400 text-sm break-all">{getRedirectUri()}</code>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              {!isAuthenticated ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">🔐</div>
                  <h3 className="text-lg font-semibold mb-2">Conecta tu Google Calendar</h3>
                  <p className="text-slate-400 mb-6 text-sm">Importa tus citas de IE, EAE, UFV, CEU y SLU</p>
                  <button onClick={handleGoogleAuth} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium hover:shadow-lg transition-all">
                    🔗 Conectar con Google
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                    <p className="text-emerald-400 font-medium">✅ Conectado</p>
                    <div className="flex gap-2 items-center">
                      <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                      </select>
                      <button onClick={fetchCalendarEvents} disabled={isLoading} className="px-4 py-2 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50">
                        {isLoading ? '⏳...' : `📥 Importar ${selectedYear}`}
                      </button>
                    </div>
                  </div>

                  {calendarEvents.length > 0 && (
                    <div className="overflow-x-auto">
                      <p className="text-emerald-400 mb-2 text-sm">✓ {calendarEvents.length} eventos</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="pb-2">Fecha</th>
                            <th className="pb-2">Evento</th>
                            <th className="pb-2">Destino</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calendarEvents.slice(0, 15).map((event) => (
                            <tr key={event.id} className="border-b border-slate-800/50">
                              <td className="py-2 font-mono text-xs">{new Date(event.start).toLocaleDateString('es-ES')}</td>
                              <td className="py-2">{event.title}</td>
                              <td className="py-2"><span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">{LOCATION_NAMES[event.location]}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {calendarEvents.length > 15 && <p className="text-center text-slate-400 py-2 text-sm">... y {calendarEvents.length - 15} más</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                {trips.length > 0 && <button onClick={exportTripsToCSV} className="px-4 py-2 bg-emerald-500 rounded-xl font-medium">📥 CSV</button>}
              </div>
            </div>

            {trips.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">🛣️</div>
                <p className="text-slate-400">Importa eventos y haz clic en "Calcular"</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const f = selectedMonth !== null ? trips.filter(t => t.month === selectedMonth) : trips;
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

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
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
                      {(selectedMonth !== null ? trips.filter(t => t.month === selectedMonth) : trips).slice(0, 50).map((trip) => (
                        <tr key={trip.id} className="border-b border-slate-800/50">
                          <td className="py-2 font-mono text-xs">{new Date(trip.date).toLocaleDateString('es-ES')}</td>
                          <td className="py-2 text-xs">{trip.event?.substring(0, 25)}</td>
                          <td className="py-2 text-xs">
                            {LOCATION_NAMES[trip.origin]?.split(' ')[0]} → {LOCATION_NAMES[trip.destination]?.split(' ')[0]}
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
              <h2 className="text-xl font-bold">📊 Reportes</h2>
              <div className="flex gap-2">
                <button onClick={generateMonthlyReports} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-medium">📊 Generar</button>
                {monthlyReports.length > 0 && <button onClick={exportToCSV} className="px-4 py-2 bg-emerald-500 rounded-xl font-medium">📥 CSV</button>}
                <button onClick={clearAllData} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium">🗑️</button>
              </div>
            </div>

            {monthlyReports.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-slate-400">Carga facturas, importa eventos y genera reportes</p>
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
