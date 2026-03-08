import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.post('/paints/sync', async (req: Request, res: Response) => {
  const rawBody = req.body;
  const paints = Array.isArray(rawBody)
    ? rawBody.map((item: any) => item.json ? item.json : item)
    : [];

  if (!Array.isArray(paints) || paints.length === 0) {
    return res.status(400).json({ error: 'Expected a non-empty array of paints' });
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const paint of paints) {
    const { name, brandSlug, type, code } = paint;

    if (!name || !brandSlug || !type) {
      results.errors.push(`Missing fields for paint: ${JSON.stringify(paint)}`);
      continue;
    }

    try {
      const brand = await prisma.paintBrand.findUnique({
        where: { slug: brandSlug }
      });

      if (!brand) {
        results.errors.push(`Unknown brand slug: ${brandSlug}`);
        continue;
      }

      const existing = await prisma.paint.findFirst({
        where: {
          brandId: brand.id,
          code: code ?? undefined,
          name: name,
        }
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      await prisma.paint.create({
        data: {
          name,
          code: code ?? null,
          type,
          brandId: brand.id,
        }
      });

      results.created++;
    } catch (err) {
      results.errors.push(`Error on "${name}": ${(err as Error).message}`);
    }
  }

  return res.status(200).json(results);
});

router.get('/paints/export', async (req, res) => {
  const paints = await prisma.paint.findMany({
    include: { brand: true }
  });
  res.json(paints.map((p: (typeof paints)[number]) => ({
    name: p.name,
    code: p.code,
    type: p.type,
    brandSlug: p.brand.slug,
  })));
});

export default router;