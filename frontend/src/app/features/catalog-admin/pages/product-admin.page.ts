import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkWithHref, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-prd-admin',
  imports: [RouterOutlet,RouterModule],
  templateUrl: 'product-admin.html'
})
export class PrdAdminComponet {

}
