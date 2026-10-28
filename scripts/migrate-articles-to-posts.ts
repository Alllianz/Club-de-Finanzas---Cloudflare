import "dotenv/config";
import prisma from "../lib/prisma";
import { AssetKind, PostSection, PostStatus, PostType, TeamSection } from "../lib/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureTeamMember(fullName: string) {
  const existing = await prisma.teamMember.findFirst({ where: { fullName } });
  if (existing) return existing;

  return prisma.teamMember.create({
    data: {
      fullName,
      title: "Autor",
      section: TeamSection.LEADERSHIP,
      isActive: true,
      displayOrder: 0,
    },
  });
}

async function run() {
  const articles = await prisma.article.findMany({ include: { author: true }, orderBy: { createdAt: "asc" } });

  for (const article of articles) {
    const slugBase = slugify(article.title) || `post-${article.id.slice(0, 8)}`;
    const slug = `${slugBase}-${article.id.slice(0, 4)}`;

    const teamMember = await ensureTeamMember(article.author.fullName || article.author.email);

    await prisma.post.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        type: PostType.NEWSLETTER,
        section:
          article.section === "NEWS"
            ? PostSection.NEWSLETTER
            : (article.section as unknown as PostSection),
        status: article.status as unknown as PostStatus,
        title: article.title,
        summary: article.excerpt,
        body: article.content,
        isFeatured: article.isFeatured,
        featuredOrder: article.isFeatured ? 0 : 10,
        publishedAt: article.publishedAt,
        assets: article.ctaUrl
          ? {
              create: [
                {
                  kind: AssetKind.IMAGE,
                  url: article.ctaUrl,
                  sortOrder: 0,
                },
              ],
            }
          : undefined,
        authors: {
          create: [
            {
              teamMemberId: teamMember.id,
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  console.log(`Migrados ${articles.length} artículos a Post.`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
