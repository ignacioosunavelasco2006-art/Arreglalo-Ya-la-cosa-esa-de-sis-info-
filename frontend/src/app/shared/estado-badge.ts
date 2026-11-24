import { Component, computed, input } from '@angular/core';

import { TipoEstado, etiquetaEstado } from '../core/estados';

// Uso:  <app-estado tipo="trabajo" [valor]="t.estado" />
@Component({
  selector: 'app-estado',
  template: `<span [class]="'badge text-bg-' + info().color">{{ info().texto }}</span>`,
})
export class EstadoBadge {
  tipo = input.required<TipoEstado>();
  valor = input.required<string>();

  info = computed(() => etiquetaEstado(this.tipo(), this.valor()));
}
