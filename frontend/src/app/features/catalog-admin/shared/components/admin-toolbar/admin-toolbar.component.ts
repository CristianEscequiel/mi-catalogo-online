import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-toolbar.component.html',
})
export class AdminToolbarComponent {
  @Input({ required: true }) searchControl!: FormControl<string>;
  @Input() searchPlaceholder = 'Buscar';
  @Input() buttonLabel = 'Nuevo';

  @Output() create = new EventEmitter<void>();

  onCreate() {
    this.create.emit();
  }
}

