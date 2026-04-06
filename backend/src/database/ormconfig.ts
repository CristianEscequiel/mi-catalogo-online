import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const isTypeScriptRuntime = __filename.endsWith('.ts');
const extension = isTypeScriptRuntime ? 'ts' : 'js';
const runtimeRoot = isTypeScriptRuntime ? 'src' : 'dist';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? process.env.POSTGRES_HOST,
  port: parseInt(process.env.DB_PORT ?? process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? process.env.POSTGRES_USER,
  password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
  database: process.env.DB_NAME ?? process.env.POSTGRES_DB,
  entities: [join(process.cwd(), runtimeRoot, '**', `*.entity.${extension}`)],
  migrations: [join(process.cwd(), runtimeRoot, 'database', 'migrations', `*.${extension}`)],
  synchronize: false,
});
