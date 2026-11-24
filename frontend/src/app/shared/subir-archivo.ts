import { Component, inject, input, output, signal } from '@angular/core';

import { ArchivosService, TipoArchivo } from '../core/archivos.service';
import { mensajeDeError } from '../core/errores';
import { ArchivoSubido } from '../core/modelos';

const MAX_BYTES = 5 * 1024 * 1024;

// Botón para elegir y subir un archivo. Al terminar avisa con la "ruta" que devolvió el servidor.
// Uso:  <app-subir-archivo tipo="documento" aceptar="image/*,application/pdf" (subido)="guardar($event)" />
@Component({
  selector: 'app-subir-archivo',
  template: `
    <input type="file" class="form-control form-control-sm" [accept]="aceptar()"
           [disabled]="subiendo() || deshabilitado()" (change)="elegir($event)" />
    @if (subiendo()) { <div class="form-text">Subiendo...</div> }
    @if (error()) { <div class="text-danger small mt-1">{{ error() }}</div> }
  `,
})
export class SubirArchivo {
  private api = inject(ArchivosService);

  tipo = input.required<TipoArchivo>();
  aceptar = input('image/*');
  deshabilitado = input(false);
  subido = output<ArchivoSubido>();

  subiendo = signal(false);
  error = signal<string | null>(null);

  elegir(evento: Event) {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    if (!archivo) return;

    this.error.set(null);
    if (archivo.size > MAX_BYTES) {
      this.error.set('El archivo supera el máximo de 5 MB.');
      campo.value = '';
      return;
    }

    this.subiendo.set(true);
    this.api.subir(this.tipo(), archivo).subscribe({
      next: (resultado) => {
        this.subiendo.set(false);
        campo.value = ''; // deja el campo listo para otro archivo
        this.subido.emit(resultado);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.subiendo.set(false);
        campo.value = '';
      },
    });
  }
}
