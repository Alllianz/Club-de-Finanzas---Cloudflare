import "dotenv/config";
import prisma from "../lib/prisma";
import { ArticleSection } from "../lib/types";

async function main() {
  const sections = [
    ArticleSection.HOME,
    ArticleSection.PORTFOLIO,
    ArticleSection.RESEARCH,
  ];

  for (const section of sections) {
    const featured = await prisma.article.findMany({
      where: { section, isFeatured: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    if (featured.length > 1) {
      const keep = featured[0].id;
      const remove = featured.slice(1).map((a) => a.id);

      await prisma.article.updateMany({
        where: { id: { in: remove } },
        data: { isFeatured: false },
      });

      console.log("normalized", section, "kept", keep, "removed", remove.length);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
