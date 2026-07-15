import { PuestoControl } from '../repositories/catalogos.repo';
import { Etiqueta } from '../repositories/etiqueta.repo';
import { RegistroControl } from '../repositories/estado.repo';

export const puestosCocina: PuestoControl[] = [
  { puestocontrol_id: 'p0', puestocontrol_n: 'Reparador', puestocontrol_c: '00' },
  { puestocontrol_id: 'p1', puestocontrol_n: 'Control de Fuga y retencion de horno', puestocontrol_c: '01' },
  { puestocontrol_id: 'p2', puestocontrol_n: 'Control de Retencion de hornalla y encedido electrico', puestocontrol_c: '02' },
  { puestocontrol_id: 'p3', puestocontrol_n: 'Control Final', puestocontrol_c: '03' },
];

export const puestosTermo: PuestoControl[] = [
  { puestocontrol_id: 't0', puestocontrol_n: 'Reparador', puestocontrol_c: '00' },
  { puestocontrol_id: 't1', puestocontrol_n: 'Control eléctrico', puestocontrol_c: '01' },
  { puestocontrol_id: 't2', puestocontrol_n: 'Control Final', puestocontrol_c: '02' },
];

export const puestosConAteq: PuestoControl[] = [
  { puestocontrol_id: 'a0', puestocontrol_n: 'Reparador', puestocontrol_c: '00' },
  { puestocontrol_id: 'a1', puestocontrol_n: 'Control eléctrico', puestocontrol_c: '01' },
  { puestocontrol_id: 'a2', puestocontrol_n: 'ATEQ', puestocontrol_c: '02' },
  { puestocontrol_id: 'a3', puestocontrol_n: 'Control Final', puestocontrol_c: '03' },
];

export const etiquetaCocina: Etiqueta = {
  numero: 1456778,
  producto_id: 'prod-uuid',
  producto_n: 'Cocina 4H Blanca',
  color: '#32CD32',
  tipo: 'COCINA',
};

export const etiquetaTermo: Etiqueta = {
  numero: 220011,
  producto_id: 'prod-termo',
  producto_n: 'Termotanque 50L',
  color: '#00FFFF',
  tipo: 'TERMOTANQUE',
};

export function registro(over: Partial<RegistroControl>): RegistroControl {
  return {
    id: 'reg-id',
    etiqueta: 1456778,
    puestocontrol_id: 't1',
    puestocontrol_n: 'Control eléctrico',
    controlador_estado: true,
    controlador_falla_id: null,
    controlador_falla_n: null,
    controlador_fechahora: new Date(),
    controlador_empleado_id: 'e1',
    controlador_empleado_n: 'Op 1',
    reparador_estado: null,
    reparador_falla_id: null,
    reparador_falla_n: null,
    reparador_fechahora: null,
    reparador_empleado_id: null,
    reparador_empleado_n: null,
    secundario_empleado_id: 'e2',
    secundario_empleado_n: 'Op 2',
    barral: null,
    etiqueta_asociada: null,
    ...over,
  };
}
