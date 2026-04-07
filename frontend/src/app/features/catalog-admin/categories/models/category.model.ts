export interface CategoryModel {
  name: string;
  description: string;
  imageUrl?: string | null;
}

export interface CategoryResModel extends CategoryModel {
  id: number;
  slug?: string | null;
  productsCount?: number;
  products?: Array<{ id: number }>;
}
