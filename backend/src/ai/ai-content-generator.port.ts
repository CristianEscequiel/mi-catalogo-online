export interface ProductCategoryOption {
  id: number;
  name: string;
}

export interface GeneratedProductContent {
  description: string;
  slug: string;
}

export interface GeneratedProductFromImage {
  name: string;
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  slug: string;
}

// Puerto de generación de contenido con IA. Es una clase abstracta para que sirva de token de inyección de Nest
// (los consumidores piden `AiContentGenerator`, no el proveedor). El adaptador actual es `OpenaiService` (OpenAI).
export abstract class AiContentGenerator {
  abstract generateProductContent(name: string): Promise<GeneratedProductContent>;
  abstract generateProductFromImage(imageUrl: string, categories: ProductCategoryOption[]): Promise<GeneratedProductFromImage>;
}
