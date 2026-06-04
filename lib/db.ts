import { Pool, type QueryResultRow } from "pg"

const globalForPg = globalThis as unknown as {
  pgPool?: Pool
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool()
  }
  return globalForPg.pgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return getPool().query<T>(text, params)
}

if (process.env.NODE_ENV === "development") {
  const cleanup = async () => {
    if (globalForPg.pgPool) {
      await globalForPg.pgPool.end()
      globalForPg.pgPool = undefined
    }
  }
  process.once("beforeExit", cleanup)
}
