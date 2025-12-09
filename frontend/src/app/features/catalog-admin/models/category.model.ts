export interface CategoryModel {
  name: string;
  description: string;
  imageUrl: string;
}

export interface CategoryResModel extends CategoryModel {
  id: number;
}
