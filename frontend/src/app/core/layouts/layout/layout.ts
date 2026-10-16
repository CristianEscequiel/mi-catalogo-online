import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../shared/header/header';
import { ToastContainer } from '../../../shared/notifications/toast-container';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-layout',
  imports: [RouterOutlet, Header, ToastContainer],
  template: `
  <app-toast-container></app-toast-container>
  <app-header>
    <router-outlet></router-outlet>
  </app-header>
`,
})
export class Layout {

}
