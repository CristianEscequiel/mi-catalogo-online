import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Env } from 'src/env.model';

export interface ProductCategoryOption {
  id: number;
  name: string;
}

interface ProductFromImageAiResponse {
  name: string;
  description: string;
  categoryName: string | null;
}

@Injectable()
export class OpenaiService {
  private openai: OpenAI;

  constructor(configService: ConfigService<Env>) {
    const apiKey = configService.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private resolveSuggestedCategory(categoryName: string | null, categories: ProductCategoryOption[]) {
    if (!categoryName) {
      return null;
    }

    const normalizedSuggested = this.normalizeText(categoryName);
    if (!normalizedSuggested) {
      return null;
    }

    const exactMatch = categories.find((category) => this.normalizeText(category.name) === normalizedSuggested);
    if (exactMatch) {
      return exactMatch;
    }

    return (
      categories.find((category) => {
        const normalizedCategory = this.normalizeText(category.name);
        return normalizedCategory.includes(normalizedSuggested) || normalizedSuggested.includes(normalizedCategory);
      }) ?? null
    );
  }
  private generateSlug(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async generateProductContent(name: string) {
    const response = await this.openai.responses.create({
      model: 'gpt-5.4-nano',
      instructions: `
      You generate ecommerce product content.
      Return ONLY valid JSON with this shape:
      {
        "description": "string"
      }

      Rules:
      - description: max 200 characters, clear and commercial, in Spanish
      - do not include markdown
      - do not include extra text
      `,
      input: name,
    });

    const text = response.output_text;

    try {
      const parsed = JSON.parse(text);

      return {
        description: parsed.description,
        slug: this.generateSlug(name),
      };
    } catch {
      throw new Error('Invalid AI response format');
    }
  }

  async generateProductFromImage(imageUrl: string, categories: ProductCategoryOption[]) {
    if (!imageUrl?.trim()) {
      throw new BadRequestException('imageUrl is required');
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      throw new BadRequestException('categories are required');
    }

    const categoriesContext = categories.map((category) => `- id: ${category.id}, name: ${category.name}`).join('\n');

    let outputText = '';
    try {
      const response = await this.openai.responses.create({
        model: 'gpt-4.1-mini',
        instructions: `
Eres un asistente para catálogo ecommerce de productos técnicos.
Responde únicamente JSON válido con esta forma exacta:
{
  "name": "string",
  "description": "string",
  "categoryName": "string | null"
}

Reglas obligatorias:
- Responde en español.
- name: breve, claro, comercial, basado en lo visible en la imagen.
- description: corta, útil, natural, sin exageraciones.
- categoryName: elige exclusivamente entre las categorías disponibles; si no hay coincidencia razonable, devuelve null.
- No inventes especificaciones técnicas no visibles.
- No incluyas markdown ni texto fuera del JSON.
        `,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Analiza la imagen de producto y sugiere datos del formulario.\nCategorías disponibles:\n${categoriesContext}`,
              },
              {
                type: 'input_image',
                image_url: imageUrl,
                detail: 'auto',
              },
            ],
          },
        ],
      });
      outputText = response.output_text;
    } catch {
      throw new BadGatewayException('OpenAI request failed');
    }

    let parsed: ProductFromImageAiResponse;
    try {
      parsed = JSON.parse(outputText) as ProductFromImageAiResponse;
    } catch {
      throw new BadRequestException('Invalid AI response format');
    }

    const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
    const description = typeof parsed?.description === 'string' ? parsed.description.trim() : '';
    const categoryName = typeof parsed?.categoryName === 'string' ? parsed.categoryName.trim() : null;

    if (!name) {
      throw new BadRequestException('Image could not be analyzed into a valid product name');
    }

    const matchedCategory = this.resolveSuggestedCategory(categoryName, categories);

    return {
      name,
      description,
      categoryId: matchedCategory?.id ?? null,
      categoryName: matchedCategory?.name ?? null,
      slug: this.generateSlug(name),
    };
  }
}
