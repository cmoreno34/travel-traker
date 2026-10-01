// ============================================
// EXPORTACIÓN A EXCEL (.xlsx)
// ============================================
// Se guardan números y fechas reales (no texto), así Excel en español no
// reinterpreta "24.70" como 2470, que es lo que pasaba con el CSV.
import { LOCATION_NAMES } from './trips.js';

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const EUR = '#,##0.00 "€"';
const DATE = 'dd/mm/yyyy';

const round = (n, decimals = 2) => Math.round(n * 10 ** decimals) / 10 ** decimals;
const header = (titles) => titles.map(value => ({ value, fontWeight: 'bold' }));
const text = (value) => ({ value: value ?? '', type: String });
const num = (value, format, extra) => ({ value, type: Number, ...(format && { format }), ...extra });

// write-excel-file convierte las fechas en UTC: se pasa la medianoche UTC del
// día local para que Excel no muestre el día anterior
const excelDate = (d) => {
  const x = new Date(d);
  return { value: new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())), type: Date, format: DATE };
};

export const tripsSheet = (trips) => {
  const totalKm = trips.reduce((s, t) => s + t.distance, 0);
  const totalAmount = round(trips.reduce((s, t) => s + round(t.amount), 0));
  return {
    sheet: 'Detalle viajes',
    data: [
      header(['Fecha', 'Evento', 'Origen', 'Destino', 'Tipo', 'Km', 'Importe (€)']),
      ...trips.map(t => [
        excelDate(t.date),
        text((t.event || '').trim()),
        text(LOCATION_NAMES[t.origin]),
        text(LOCATION_NAMES[t.destination]),
        text(t.type),
        num(t.distance),
        num(round(t.amount), EUR),
      ]),
      [{ value: 'TOTAL', fontWeight: 'bold' }, null, null, null, null,
        num(totalKm, null, { fontWeight: 'bold' }), num(totalAmount, EUR, { fontWeight: 'bold' })],
    ],
    columns: [{ width: 12 }, { width: 45 }, { width: 30 }, { width: 30 }, { width: 8 }, { width: 8 }, { width: 13 }],
    stickyRowsCount: 1,
  };
};

export const reportSheet = (reports, year) => {
  const totals = reports.reduce((acc, r) => ({
    km: acc.km + r.totalKm, amount: acc.amount + r.totalAmount, fuel: acc.fuel + r.fuelExpense, liters: acc.liters + r.fuelLiters
  }), { km: 0, amount: 0, fuel: 0, liters: 0 });
  const bold = { fontWeight: 'bold' };
  return {
    sheet: `Resumen ${year}`,
    data: [
      header(['Mes', 'Año', 'Km totales', 'Importe km (€)', 'Gasto combustible (€)', 'Litros', 'Consumo L/100km', 'Coste real €/km']),
      ...reports.map(r => [
        text(MONTHS[r.month]),
        num(r.year),
        num(r.totalKm),
        num(round(r.totalAmount), EUR),
        num(round(r.fuelExpense), EUR),
        num(round(r.fuelLiters), '0.00'),
        r.consumptionPer100km ? num(round(r.consumptionPer100km), '0.00') : null,
        r.costPerKm ? num(round(r.costPerKm, 3), '0.000 "€"') : null,
      ]),
      [{ value: 'TOTAL', ...bold }, num(year, null, bold), num(totals.km, null, bold),
        num(round(totals.amount), EUR, bold), num(round(totals.fuel), EUR, bold), num(round(totals.liters), '0.00', bold), null, null],
      [],
      [{ value: 'Diferencia (Importe - Combustible)', ...bold }, null, null, num(round(totals.amount - totals.fuel), EUR, bold)],
    ],
    columns: [{ width: 34 }, { width: 7 }, { width: 11 }, { width: 15 }, { width: 21 }, { width: 10 }, { width: 16 }, { width: 15 }],
    stickyRowsCount: 1,
  };
};

// La librería se carga solo al exportar para no engordar la carga inicial
export const downloadExcel = async (sheets, fileName) => {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  await writeExcelFile(sheets).toFile(fileName);
};
