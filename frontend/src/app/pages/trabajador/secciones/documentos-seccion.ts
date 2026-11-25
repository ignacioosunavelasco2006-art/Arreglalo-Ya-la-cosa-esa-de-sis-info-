import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ArchivosService } from '../../../core/archivos.service';
import { mensajeDeError } from '../../../core/errores';
import { NOMBRE_DOCUMENTO } from '../../../core/estados';
import { ArchivoSubido, DocumentoTrabajador } from '../../../core/modelos';
import { MiPerfilService } from '../../../core/mi-perfil.service';
import { SubirArchivo } from '../../../shared/subir-archivo';

// RF-04 / CU-04: el trabajador sube su carnet y su certificado de antecedentes.
// Los documentos son privados: solo los ve él y la supervisión.
@Component({
  selector: 'app-documentos-seccion',
  imports: [DatePipe, FormsModule, SubirArchivo],
  template: `
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="h5">Documentos</h2>
        <p class="small text-muted">
          Sube una foto o PDF legible de tu <strong>carnet de identidad</strong> y de tu
          <strong>certificado de antecedentes</strong>. Solo tú y el equipo supervisor pueden verlos.
        </p>

        <ul class="list-group mb-3">
          @for (d of documentos(); track d.id_documento) {
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                {{ nombreDocumento(d.tipo) }}
                <div class="small text-muted">Subido el {{ d.fecha_subida | date: 'dd/MM/yyyy HH:mm' }}</div>
              </div>
              <button class="btn btn-outline-primary btn-sm" type="button" (click)="ver(d)">Ver</button>
            </li>
          } @empty {
            <li class="list-group-item text-muted">Aún no subiste documentos.</li>
          }
        </ul>

        <div class="row g-2 align-items-start">
          <div class="col-sm-4">
            <select class="form-select form-select-sm" aria-label="Tipo de documento"
                    [ngModel]="tipo()" (ngModelChange)="tipo.set($event)">
              <option value="carnet">Carnet de identidad</option>
              <option value="antecedentes">Certificado de antecedentes</option>
              <option value="otro">Otro documento</option>
            </select>
          </div>
          <div class="col-sm-8">
            <app-subir-archivo tipo="documento" aceptar="image/jpeg,image/png,image/webp,application/pdf"
                               (subido)="registrar($event)" />
          </div>
        </div>

        @if (error()) { <div class="text-danger small mt-2">{{ error() }}</div> }
      </div>
    </div>
  `,
})
export class DocumentosSeccion {
  private archivos = inject(ArchivosService);
  private api = inject(MiPerfilService);

  documentos = input.required<DocumentoTrabajador[]>();
  cambio = output<void>();

  tipo = signal('carnet');
  error = signal<string | null>(null);

  nombreDocumento(tipo: string) {
    return NOMBRE_DOCUMENTO[tipo] ?? tipo;
  }

  ver(d: DocumentoTrabajador) {
    this.error.set(null);
    this.archivos.abrir(d.ruta_archivo, () => this.error.set('No se pudo abrir el documento.'));
  }

  // El archivo ya está en el servidor: ahora se registra en el perfil
  registrar(archivo: ArchivoSubido) {
    this.error.set(null);
    this.api.subirDocumento(this.tipo(), archivo.ruta).subscribe({
      next: () => this.cambio.emit(),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }
}
