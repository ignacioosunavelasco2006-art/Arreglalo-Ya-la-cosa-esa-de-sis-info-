import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz: solo contiene el "hueco" donde se pintan las rutas.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
