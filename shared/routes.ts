import { z } from 'zod';
import { insertCompanySchema, companies, companyQuerySchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies' as const,
      input: companyQuerySchema,
      responses: {
        200: z.object({
          data: z.array(z.custom<typeof companies.$inferSelect>()),
          total: z.number(),
          page: z.number(),
          limit: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/companies/:id' as const,
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    // Admin only routes
    create: {
      method: 'POST' as const,
      path: '/api/companies' as const,
      input: insertCompanySchema,
      responses: {
        201: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/companies/:id' as const,
      input: insertCompanySchema.partial(),
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/companies/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/companies/upload' as const,
      // FormData is not easily typed here, handled in backend
      responses: {
        200: z.object({
          message: z.string(),
          count: z.number(),
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts' as const,
      responses: {
        200: z.array(z.custom<any>()), // Post type
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/posts/:slug' as const,
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
  },
  faqs: {
    list: {
      method: 'GET' as const,
      path: '/api/faqs' as const,
      responses: {
        200: z.array(z.custom<any>()), // Faq type
      },
    },
  },
  admin: {
    check: {
      method: 'GET' as const,
      path: '/api/admin/check' as const,
      responses: {
        200: z.object({ isAdmin: z.boolean() }),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
