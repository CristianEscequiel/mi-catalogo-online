import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../shared/header/header';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [RouterOutlet, Header],
  template: `
  <app-header></app-header>
  <div class="h-[calc(100vh-60px)]">
    <router-outlet></router-outlet>
  </div>
`
})
export class Layout {

}
