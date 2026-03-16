import { Component, inject, signal } from '@angular/core';
import { Layout } from './core/layouts/layout/layout';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [Layout],
  templateUrl: './app.html',
})
export class App {
  private readonly themeService = inject(ThemeService);
  protected readonly title = signal('frontend');

  constructor() {
    this.themeService.init();
  }
}
