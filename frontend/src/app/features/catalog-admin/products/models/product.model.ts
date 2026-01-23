export interface ProductModel {
  name: string,
  slug?: string | null ,
  description: string ,
  sku?: string | null ,
  price: number ,
  categoryIds: number[] ,
  thumbnailUrl?: string | null ,
  imageUrl?: string | null ,
  status: 'DRAFT'| 'PUBLIC' | 'ARCHIVED',
}
