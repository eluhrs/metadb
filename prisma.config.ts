// @ts-nocheck
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://metadb_user:super_secure_metadb_password@db:5432/metadb_prod",
  },
};
