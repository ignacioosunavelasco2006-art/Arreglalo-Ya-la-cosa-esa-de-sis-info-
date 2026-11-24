import { Component, effect, inject, input, output, signal } from '@angular/core';

import { CatalogosService } from '../../../core/catalogos.service';
import { mensajeDeError } from '../../../core/errores';
import { Categoria, PerfilPrivado, Zona } from '../../../core/modelos';
import { MiPerfilService } from '../../../core/mi-perfil.service';

// RF-04 (habilidades y precios estimados) y RF-05 (zonas de cobertura).
@Component({
  selector: 'app-servicios-seccion',
  template: `
    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-7">
        <div class="card h-100"><div class="card-body">
          <h2 class="h5">Servicios que ofreces</h2>
          <p class="small text-muted">Marca tus habilidades y, si quieres, un precio estimado desde el cual trabajas.</p>

          @for (c of categorias(); track c.id_categoria) {
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="form-check flex-grow-1 mb-0">
                <input class="form-check-input" type="checkbox" [id]="'cat-' + c.id_categoria"
                       [checked]="seleccionCategorias().has(c.id_categoria)"
                       (change)="alternarCategoria(c.id_categoria, $event)" />
                <label class="form-check-label" [for]="'cat-' + c.id_categoria">{{ c.nombre }}</label>
              </div>
              @if (seleccionCategorias().has(c.id_categoria)) {
                <input type="number" min="0" class="form-control form-control-sm" style="max-width: 8rem"
                       placeholder="Bs desde..." [attr.aria-label]="'Precio estimado de ' + c.nombre"
                       [value]="seleccionCategorias().get(c.id_categoria) ?? ''"
                       (input)="cambiarPrecio(c.id_categoria, $event)" />
              }
            </div>
          }

          @if (errorCategorias()) { <div class="text-danger small">{{ errorCategorias() }}</div> }
          @if (exitoCategorias()) { <div class="text-success small">Servicios guardados.</div> }
          <button class="btn btn-primary btn-sm mt-2" type="button" [disabled]="guardando()" (click)="guardarCategorias()">
            Guardar servicios
          </button>
        </div></div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card h-100"><div class="card-body">
          <h2 class="h5">Zonas donde trabajas</h2>
          <p class="small text-muted">Solo recibirás solicitudes de estas zonas.</p>

          @for (z of zonas(); track z.id_zona) {
            <div class="form-check">
              <input class="form-check-input" type="checkbox" [id]="'zona-' + z.id_zona"
                     [checked]="seleccionZonas().has(z.id_zona)" (change)="alternarZona(z.id_zona, $event)" />
              <label class="form-check-label" [for]="'zona-' + z.id_zona">{{ z.nombre }}</label>
            </div>
          }

          @if (errorZonas()) { <div class="text-danger small">{{ errorZonas() }}</div> }
          @if (exitoZonas()) { <div class="text-success small">Zonas guardadas.</div> }
          <button class="btn btn-primary btn-sm mt-2" type="button" [disabled]="guardando()" (click)="guardarZonas()">
            Guardar zonas
          </button>
        </div></div>
      </div>
    </div>
  `,
})
export class ServiciosSeccion {
  private catalogos = inject(CatalogosService);
  private api = inject(MiPerfilService);

  perfil = input.required<PerfilPrivado>();
  cambio = output<void>();

  categorias = signal<Categoria[]>([]);
  zonas = signal<Zona[]>([]);
  seleccionCategorias = signal(new Map<number, number | null>());
  seleccionZonas = signal(new Set<number>());

  guardando = signal(false);
  errorCategorias = signal<string | null>(null);
  errorZonas = signal<string | null>(null);
  exitoCategorias = signal(false);
  exitoZonas = signal(false);

  constructor() {
    this.catalogos.todo().subscribe(({ categorias, zonas }) => {
      this.categorias.set(categorias);
      this.zonas.set(zonas);
    });

    // Cada vez que el perfil se recarga, la selección vuelve a lo que está guardado
    effect(() => {
      const p = this.perfil();
      this.seleccionCategorias.set(new Map(p.categorias.map((c) => [c.id_categoria, c.precio_estimado])));
      this.seleccionZonas.set(new Set(p.zonas.map((z) => z.id_zona)));
    });
  }

  alternarCategoria(id: number, evento: Event) {
    const marcada = (evento.target as HTMLInputElement).checked;
    const copia = new Map(this.seleccionCategorias());
    if (marcada) copia.set(id, copia.get(id) ?? null);
    else copia.delete(id);
    this.seleccionCategorias.set(copia);
  }

  cambiarPrecio(id: number, evento: Event) {
    const valor = (evento.target as HTMLInputElement).value;
    const copia = new Map(this.seleccionCategorias());
    copia.set(id, valor === '' ? null : Number(valor));
    this.seleccionCategorias.set(copia);
  }

  alternarZona(id: number, evento: Event) {
    const marcada = (evento.target as HTMLInputElement).checked;
    const copia = new Set(this.seleccionZonas());
    if (marcada) copia.add(id);
    else copia.delete(id);
    this.seleccionZonas.set(copia);
  }

  guardarCategorias() {
    this.errorCategorias.set(null);
    this.exitoCategorias.set(false);
    const lista = [...this.seleccionCategorias().entries()].map(([id_categoria, precio]) => ({
      id_categoria,
      ...(precio !== null && precio >= 0 ? { precio_estimado: precio } : {}),
    }));
    if (lista.length === 0) {
      this.errorCategorias.set('Elige al menos un servicio.');
      return;
    }
    this.guardando.set(true);
    this.api.asignarCategorias(lista).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exitoCategorias.set(true);
        this.cambio.emit();
      },
      error: (e) => {
        this.errorCategorias.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  guardarZonas() {
    this.errorZonas.set(null);
    this.exitoZonas.set(false);
    const ids = [...this.seleccionZonas()];
    if (ids.length === 0) {
      this.errorZonas.set('Elige al menos una zona.');
      return;
    }
    this.guardando.set(true);
    this.api.asignarZonas(ids).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exitoZonas.set(true);
        this.cambio.emit();
      },
      error: (e) => {
        this.errorZonas.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }
}
