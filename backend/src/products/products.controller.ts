import { Controller, Get } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

interface Category {
  CATEGORIA: string;
  DESCRIPCION: string;
  SLUG: string;
}

interface Product {
  CODIGO: string;
  NOMBRE: string;
  DESCRIPCION: string;
  PRECIO: number;
  IMAGENES: string[];
  CATEGORIA: string;
  SKU: string;
}

@Controller('products')
export class ProductsController {
  constructor(private userService: UsersService) {}
  private readonly categories: Category[] = [
    {
      CATEGORIA: 'Electronica',
      DESCRIPCION: 'Dispositivos, accesorios y gadgets para el dia a dia.',
      SLUG: 'electronica',
    },
    {
      CATEGORIA: 'HogarYDecoracion',
      DESCRIPCION: 'Articulos para equipar la casa y decorar cada ambiente.',
      SLUG: 'hogar-decoracion',
    },
    {
      CATEGORIA: 'Moda',
      DESCRIPCION: 'Ropa, calzado y accesorios para todas las temporadas.',
      SLUG: 'moda',
    },
    {
      CATEGORIA: 'BellezaYSalud',
      DESCRIPCION: 'Cosmetica, cuidado personal y bienestar integral.',
      SLUG: 'belleza-salud',
    },
    {
      CATEGORIA: 'DeportesYFitness',
      DESCRIPCION: 'Indumentaria, equipamiento y suplementos deportivos.',
      SLUG: 'deportes-fitness',
    },
    {
      CATEGORIA: 'BebesYNinos',
      DESCRIPCION: 'Productos esenciales para bebes, ninos y su cuidado.',
      SLUG: 'bebes-ninos',
    },
    {
      CATEGORIA: 'Mascotas',
      DESCRIPCION: 'Alimento, juguetes y accesorios para companeros de cuatro patas.',
      SLUG: 'mascotas',
    },
    {
      CATEGORIA: 'Supermercado',
      DESCRIPCION: 'Despensa, bebidas y productos de limpieza para el hogar.',
      SLUG: 'supermercado',
    },
  ];

  private readonly products: Product[] = [
    {
      CODIGO: 'ELEC-001',
      NOMBRE: 'Auriculares Inalambricos Noise Cancel',
      DESCRIPCION: 'Auriculares bluetooth con cancelacion activa de ruido y autonomia de 30 horas.',
      PRECIO: 129.99,
      IMAGENES: ['https://images.unsplash.com/photo-1511379938547-c1f69419868d', 'https://images.unsplash.com/photo-1517059224940-d4af9eec41e5'],
      CATEGORIA: 'Electronica',
      SKU: 'SKU-0001',
    },
    {
      CODIGO: 'ELEC-002',
      NOMBRE: 'Smartwatch Fitness Pro',
      DESCRIPCION: 'Reloj inteligente resistente al agua con GPS y monitoreo de salud 24/7.',
      PRECIO: 199.5,
      IMAGENES: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30', 'https://images.unsplash.com/photo-1526401281623-359c3d138cc5'],
      CATEGORIA: 'Electronica',
      SKU: 'SKU-0002',
    },
    {
      CODIGO: 'HOME-101',
      NOMBRE: 'Lampara Minimalista Nordic Light',
      DESCRIPCION: 'Lampara de mesa con luz regulable y acabados en madera natural.',
      PRECIO: 89.99,
      IMAGENES: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85', 'https://images.unsplash.com/photo-1487015307662-3a541e6e3922'],
      CATEGORIA: 'HogarYDecoracion',
      SKU: 'SKU-0101',
    },
    {
      CODIGO: 'MODA-201',
      NOMBRE: 'Campera Impermeable Urban',
      DESCRIPCION: 'Campera liviana impermeable con respiracion activa y capucha desmontable.',
      PRECIO: 159.0,
      IMAGENES: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b'],
      CATEGORIA: 'Moda',
      SKU: 'SKU-0201',
    },
    {
      CODIGO: 'BEL-301',
      NOMBRE: 'Set Skincare Glow Essentials',
      DESCRIPCION: 'Rutina facial de cuatro pasos con ingredientes naturales para todo tipo de piel.',
      PRECIO: 79.75,
      IMAGENES: ['https://images.unsplash.com/photo-1515378791036-0648a3ef77b2', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9'],
      CATEGORIA: 'BellezaYSalud',
      SKU: 'SKU-0301',
    },
    {
      CODIGO: 'FIT-401',
      NOMBRE: 'Kit Entrenamiento Funcional',
      DESCRIPCION: 'Pack con bandas de resistencia, rueda abdominal y mat antideslizante.',
      PRECIO: 139.9,
      IMAGENES: ['https://images.unsplash.com/photo-1517832207067-4db24a2ae47c', 'https://images.unsplash.com/photo-1599058917212-d750089bc07c'],
      CATEGORIA: 'DeportesYFitness',
      SKU: 'SKU-0401',
    },
    {
      CODIGO: 'BB-501',
      NOMBRE: 'Cochecito Travel System',
      DESCRIPCION: 'Cochecito 3 en 1 con huevito, moisés y estructura plegable ultraliviana.',
      PRECIO: 459.99,
      IMAGENES: ['https://images.unsplash.com/photo-1508801280502-3c07653e514b', 'https://images.unsplash.com/photo-1506045412240-22980140a405'],
      CATEGORIA: 'BebesYNinos',
      SKU: 'SKU-0501',
    },
    {
      CODIGO: 'PET-601',
      NOMBRE: 'Cama Ortopedica para Mascotas',
      DESCRIPCION: 'Cama viscoelastica lavable ideal para perros medianos y grandes.',
      PRECIO: 99.45,
      IMAGENES: ['https://images.unsplash.com/photo-1619983081593-ec0d5110751e', 'https://images.unsplash.com/photo-1568572933382-74d440642117'],
      CATEGORIA: 'Mascotas',
      SKU: 'SKU-0601',
    },
    {
      CODIGO: 'SUP-701',
      NOMBRE: 'Caja Gourmet Semanal',
      DESCRIPCION: 'Seleccion de productos gourmet organicos listos para tu despensa.',
      PRECIO: 59.99,
      IMAGENES: ['https://images.unsplash.com/photo-1515003197210-e0cd71810b5f', 'https://images.unsplash.com/photo-1498837167922-ddd27525d352'],
      CATEGORIA: 'Supermercado',
      SKU: 'SKU-0701',
    },
  ];

  @Get('categories')
  getCategories() {
    return {
      categorias: this.categories,
    };
  }

  @Get()
  getAllProducts() {
    return {
      productos: this.products,
    };
  }
  @Get('usersCategories')
  getUsers() {
    return this.userService.findAll();
  }
}
