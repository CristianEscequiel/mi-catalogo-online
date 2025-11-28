
export interface ProductResModel {
  id:number,
  name: string,
  slug?: string | null ,
  description: string ,
  sku?: string | null ,
  price: number ,
  categories: [
    {
      id:number
    }
  ] ,
  thumbnailUrl?: string | null ,
  status: 'DRAFT'| 'PUBLIC' | 'ARCHIVED',
}
