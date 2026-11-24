import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { ArchivosService } from '../core/archivos.service';

// Las imágenes están protegidas (hace falta sesión), así que no sirve un <img src="..."> normal:
// se descargan con el token y se muestran desde la memoria del navegador.
@Component({
  selector: 'app-imagen',
  template: `
    @if (url(); as u) {
      <img [src]="u" [alt]="alt()" class="img-thumbnail" style="max-height: 140px; cursor: zoom-in"
           (click)="abrir()" />
    } @else if (fallo()) {
      <span class="small text-muted">No se pudo cargar la imagen</span>
    } @else {
      <span class="small text-muted">Cargando imagen...</span>
    }
  `,
})
export class Imagen implements OnInit, OnDestroy {
  private api = inject(ArchivosService);
  private sanitizador = inject(DomSanitizer);

  ruta = input.required<string>();
  alt = input('Imagen');

  url = signal<SafeUrl | null>(null);
  fallo = signal(false);
  private urlObjeto: string | null = null;

  ngOnInit() {
    this.api.descargar(this.ruta()).subscribe({
      next: (blob) => {
        this.urlObjeto = URL.createObjectURL(blob);
        // La URL la creamos nosotros desde un blob propio: es segura
        this.url.set(this.sanitizador.bypassSecurityTrustUrl(this.urlObjeto));
      },
      error: () => this.fallo.set(true),
    });
  }

  abrir() {
    if (this.urlObjeto) window.open(this.urlObjeto, '_blank');
  }

  ngOnDestroy() {
    if (this.urlObjeto) URL.revokeObjectURL(this.urlObjeto);
  }
}
