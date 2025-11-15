// Database Connection and Query Client
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config/index.js';
import * as schema from './schema.js';

// Create PostgreSQL connection pool
export const pool = new Pool(config.database.options);

// Test database connection
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(1);
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

// Export schema for use in services
export { schema };
