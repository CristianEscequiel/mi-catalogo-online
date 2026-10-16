import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CategoryListComponent } from '../components/category-list/category-list.component';

@Component({
  standalone: true,
  selector: 'app-category-admin',
  imports: [CategoryListComponent],
  templateUrl: 'category-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryAdminComponent {
}
