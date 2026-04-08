import { FormControl } from "@angular/forms";

export interface UserFormLogin {
  email: FormControl;
  password: FormControl;
}

export interface UserFormRegister {
  name: FormControl;
  lastName: FormControl;
  email: FormControl;
  password: FormControl;
}
