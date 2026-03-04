import { Component } from '@angular/core';
import { CategoryListComponent } from '../components/category-list/category-list.component';

@Component({
  standalone: true,
  selector: 'app-category-admin',
  imports: [CategoryListComponent],
  templateUrl: 'category-admin.html'
})
export class CategoryAdminComponent {
}
