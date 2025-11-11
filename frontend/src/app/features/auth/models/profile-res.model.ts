export interface ProfileResponse {

  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    name: string;
    lastName: string;
    avatar: string | null;
    createdAt: string;
    updatedAt: string;
  }
}
