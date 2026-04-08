export interface RegisterRequest {
  email: string;
  password: string;
  profile: {
    name: string;
    lastName: string;
  };
}
