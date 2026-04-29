import { defineCollection, defineContentConfig, z } from '@nuxt/content';

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
      }),
    }),
    highscores: defineCollection({
      type: 'data',
      source: 'highscores.json',
      schema: z.object({
        entries: z.array(
          z.object({
            name: z.string(),
            score: z.number(),
            createdAt: z.string(),
          })
        ),
      }),
    }),
  },
});
