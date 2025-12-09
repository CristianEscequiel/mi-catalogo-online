import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../core/state/auth.store';
import { RouterLink } from "@angular/router";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { AuthFacade } from '../../features/auth/services/auth.facade';

import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';


@Component({
  standalone: true,
  selector: 'app-header',
  imports: [RouterLink , FontAwesomeModule , CdkMenu, CdkMenuItem, CdkMenuTrigger ],
  templateUrl: './header.html'
})
export class Header {
  faRightFromBracket = faRightFromBracket
  private store = inject(AuthStore);
  private authFacade = inject(AuthFacade)
  isLoggedIn = this.store.isLoggedIn;
  userName = computed(() => (this.store.userProfile()?.name ?? ''));
  userLastName = computed(() => (this.store.userProfile()?.lastName ?? ''));
  avatar = computed(() => (this.store.userProfile() as any)?.avatar ?? null);

  logOut(){
    this.authFacade.logout();
  }

}
