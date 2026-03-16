import { Injectable, computed, signal } from '@angular/core';

type AppTheme = 'meadowlight' | 'meadowdark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'app-theme';
  private readonly _theme = signal<AppTheme>('meadowlight');

  readonly theme = this._theme.asReadonly();
  readonly isDarkTheme = computed(() => this._theme() === 'meadowdark');

  init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const savedTheme = this.getSavedTheme();
    if (savedTheme) {
      this.applyTheme(savedTheme, false);
      return;
    }

    this.applyTheme(this.getSystemTheme(), false);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (this.getSavedTheme()) {
        return;
      }

      this.applyTheme(event.matches ? 'meadowdark' : 'meadowlight', false);
    });
  }

  setTheme(theme: AppTheme): void {
    this.applyTheme(theme, true);
  }

  private applyTheme(theme: AppTheme, persist: boolean): void {
    this._theme.set(theme);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }

    if (persist && typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, theme);
    }
  }

  private getSavedTheme(): AppTheme | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawTheme = localStorage.getItem(this.storageKey);
    if (rawTheme === 'meadowlight' || rawTheme === 'meadowdark') {
      return rawTheme;
    }

    return null;
  }

  private getSystemTheme(): AppTheme {
    if (typeof window === 'undefined') {
      return 'meadowlight';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'meadowdark' : 'meadowlight';
  }
}
