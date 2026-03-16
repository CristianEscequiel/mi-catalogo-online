import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../shared/header/header';
import { ToastContainer } from '../../../shared/notifications/toast-container';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [RouterOutlet, Header, ToastContainer],
  template: `
  <app-header></app-header>
  <app-toast-container></app-toast-container>
  <div class="container mx-auto h-[calc(100vh-60px)] p-2">
    <router-outlet></router-outlet>
  </div>
`
})
export class Layout {

}
