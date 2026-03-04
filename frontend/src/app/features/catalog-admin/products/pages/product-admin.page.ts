import { Component} from '@angular/core';
import { PrdListComponent } from '../components/product-list/product-list.component';

@Component({
  standalone: true,
  selector: 'app-prd-admin',
  imports: [PrdListComponent],
  templateUrl: 'product-admin.html'
})
export class PrdAdminComponet {

}
