export interface Asiento {
  asiento_id: number;
  numero_asiento: string;
  clase_asiento: 'Negocios' | 'Economica';
  estado: 'Libre' | 'Ocupado';
  reservacion_id: number | null;
}
