
export interface ProductResModel {
  id:number,
  name: string,
  slug?: string | null ,
  description: string ,
  sku?: string | null ,
  price: number ,
  stock: number ,
  categories: Array<{
    id:number,
    name?: string,
    description?: string,
    imageUrl?: string | null,
  }> ,
  thumbnailUrl?: string | null ,
  status: 'DRAFT'| 'PUBLIC' | 'ARCHIVED',
}
