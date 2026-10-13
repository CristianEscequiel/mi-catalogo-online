import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../entities/product.entity';
import { Status } from '../models/status.enum';
import { ProductPage } from '../models/product-page.model';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { escapeLike } from 'src/common/escape-like';
import { canModify } from 'src/common/ownership';
import { Payload } from 'src/auth/models/payload.model';
import { ImageStorage } from 'src/files/image-storage.port';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private postRepository: Repository<Product>,
    private readonly fileStorageService: ImageStorage,
  ) {}

  async create(body: CreateProductDto, userId: number, role: string) {
    try {
      const normalizedCategoryIds = this.normalizeCategoryIds(body.categoryIds);

      if (role === 'GUEST') {
        const count = await this.postRepository.count();
        if (count >= 5) {
          throw new ForbiddenException('Límite de demo alcanzado');
        }
      }
      const newProduct = await this.postRepository.save({
        ...body,
        user: { id: userId },
        categories: normalizedCategoryIds?.map((id) => ({ id })),
      });
      return this.findOne(newProduct.id);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error creating product', error instanceof Error ? error.stack : String(error));
      throw new BadRequestException('Error creating product');
    }
  }

  // Listado público: solo PUBLISHED. El filtro de categoría usa EXISTS (no un WHERE sobre el join) para que cada
  // producto conserve todas sus categorías y para que skip/take pagine productos y no filas del join.
  async findPublicPage(query: ListProductsQueryDto): Promise<ProductPage> {
    const { page, limit, search, categoryId } = query;

    const qb = this.postRepository.createQueryBuilder('p').leftJoinAndSelect('p.user', 'u').leftJoinAndSelect('u.profile', 'up').leftJoinAndSelect('p.categories', 'c').where('p.status = :status', { status: Status.PUBLISHED });

    if (search) {
      qb.andWhere(`(p.name ILIKE :q ESCAPE '\\' OR p.description ILIKE :q ESCAPE '\\')`, { q: `%${escapeLike(search)}%` });
    }
    if (categoryId) {
      qb.andWhere('EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = :categoryId)', { categoryId });
    }

    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    return this.findProductById(id);
  }

  // Lectura pública por id: lo que no está PUBLISHED responde igual que un id inexistente.
  async findPublishedById(id: number) {
    const product = await this.postRepository.findOne({
      where: { id, status: Status.PUBLISHED },
      relations: ['user.profile', 'categories'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async findOneBySlug(slug: string) {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      throw new BadRequestException('Product slug is required');
    }

    const products = await this.postRepository.find({
      where: { slug: normalizedSlug, status: Status.PUBLISHED },
      relations: ['user.profile', 'categories'],
      take: 2,
    });

    if (products.length === 0) {
      throw new NotFoundException(`Product with slug ${normalizedSlug} not found`);
    }

    if (products.length > 1) {
      throw new ConflictException(`Product slug ${normalizedSlug} is duplicated`);
    }

    return products[0];
  }

  async update(id: number, updateProductDto: UpdateProductDto, actor: Payload) {
    const product = await this.findOwnedProduct(id, actor);
    try {
      const { categoryIds, thumbnailUrl: _thumbnailUrl, ...rest } = updateProductDto;
      const normalizedCategoryIds = this.normalizeCategoryIds(categoryIds);
      const updatedProduct = this.postRepository.merge(product, rest);
      // Update many-to-many categories when ids are provided (including empty array to clear)
      if (normalizedCategoryIds !== undefined) {
        updatedProduct.categories = normalizedCategoryIds.map((categoryId) => ({ id: categoryId })) as Product['categories'];
      }
      return await this.postRepository.save(updatedProduct);
    } catch (error) {
      this.logger.error('Error updating product', error instanceof Error ? error.stack : String(error));
      throw new BadRequestException('Error updating product');
    }
  }

  async remove(id: number, actor: Payload) {
    const product = await this.findOwnedProduct(id, actor);
    await this.fileStorageService.deleteByPublicPath(product.thumbnailUrl);
    await this.postRepository.delete(product.id);
    return { message: 'Product deleted' };
  }

  async uploadImage(id: number, filename: string, actor: Payload) {
    const imageUrl = this.fileStorageService.buildPublicPath(UPLOAD_FOLDERS.products, filename);
    let product: Product;
    try {
      product = await this.findOwnedProduct(id, actor);
    } catch (error) {
      // FileInterceptor ya escribió el archivo antes de entrar al handler: si se rechaza, no debe quedar huérfano.
      await this.fileStorageService.deleteByPublicPath(imageUrl);
      throw error;
    }

    if (product.thumbnailUrl) {
      throw new ConflictException('Product already has an image. Delete it before uploading a new one.');
    }

    product.thumbnailUrl = imageUrl;

    const savedProduct = await this.postRepository.save(product);
    return {
      id: savedProduct.id,
      imageUrl: savedProduct.thumbnailUrl,
    };
  }

  async deleteImage(id: number, actor: Payload) {
    const product = await this.findOwnedProduct(id, actor);
    if (!product.thumbnailUrl) {
      throw new NotFoundException('Product has no image to delete');
    }

    await this.fileStorageService.deleteByPublicPath(product.thumbnailUrl);
    product.thumbnailUrl = null;

    const savedProduct = await this.postRepository.save(product);
    return {
      id: savedProduct.id,
      imageUrl: savedProduct.thumbnailUrl,
    };
  }

  // 404 si no existe y 403 si el actor no es el dueño ni ADMIN. Siempre antes de tocar la base o los archivos.
  private async findOwnedProduct(id: number, actor: Payload) {
    const product = await this.findProductById(id);
    if (!canModify(actor, product.user?.id)) {
      throw new ForbiddenException('No tenés permiso sobre este producto');
    }
    return product;
  }

  private async findProductById(id: number) {
    const product = await this.postRepository.findOne({
      where: { id },
      relations: ['user.profile', 'categories'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }
  async findProductByCategoryId(categoryId: number) {
    return this.postRepository.find({
      where: {
        categories: { id: categoryId },
        status: Status.PUBLISHED,
      },
      relations: ['user.profile'],
    });
  }

  // Público: solo los PUBLISHED de ese usuario; sin ninguno devuelve [] (no 404).
  async findPublishedByUserId(id: number) {
    return this.postRepository.find({
      where: { user: { id }, status: Status.PUBLISHED },
      relations: ['user.profile', 'categories'],
    });
  }

  async publish(id: number, userId: number) {
    const product = await this.findOne(id);
    if (product.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to publish this product');
    }
    if (!product.name || !product.description || product.categories.length === 0) {
      throw new BadRequestException('Product content , title and at leat one categorty are required');
    }
    // const updatedPost = await this.postRepository.save(changes);

    return this.findOne(product.id);
  }

  private normalizeCategoryIds(categoryIds?: number[]) {
    if (categoryIds === undefined) {
      return undefined;
    }

    const normalized = Array.from(new Set(categoryIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
    return normalized;
  }
}
