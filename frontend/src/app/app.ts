import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Layout } from './core/layouts/layout/layout';

@Component({
  selector: 'app-root',
  imports: [Layout],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend');
}
