import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz: solo contiene el "hueco" donde se pintan las rutas.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="text-center py-3">
      <img src="logo.png" alt="Arreglalo Ya" height="80" class="rounded-3" />
    </div>
    <router-outlet />
  `,
})
export class App {}