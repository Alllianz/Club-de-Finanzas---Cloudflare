import "dotenv/config";
import prisma from "../lib/prisma";
import {
  ArticleSection,
  ArticleStatus,
  Role,
} from "../lib/generated/prisma/enums";

type MockArticle = {
  section: ArticleSection;
  category: string;
  title: string;
  excerpt: string;
  ctaLabel: string;
  ctaUrl: string;
  isFeatured?: boolean;
  daysAgo: number;
};

const buildMockArticles = (): MockArticle[] => [
  {
    section: ArticleSection.HOME,
    category: "Destacada de la semana",
    title:
      "Convocatoria abierta: charla sobre macro, carry trade y valuacion para estudiantes UBA",
    excerpt:
      "Una invitacion en formato editorial para empujar asistencia, sumar comunidad y marcar agenda.",
    ctaLabel: "Ver invitacion completa",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    isFeatured: true,
    daysAgo: 3,
  },
  {
    section: ArticleSection.HOME,
    category: "Portfolio",
    title: "Portfolio Estrategia 2026",
    excerpt:
      "Lectura del escenario 2026 y construccion de una cartera diversificada con foco academico y practico.",
    ctaLabel: "Ir a LinkedIn",
    ctaUrl:
      "https://www.linkedin.com/posts/club-de-finanzas-uba_estrategia-2026-portafolio-ugcPost-7427859546221547520-MIMs",
    daysAgo: 20,
  },
  {
    section: ArticleSection.HOME,
    category: "Research",
    title: "Publicacion de Ratios Financieros - Price to Earnings (P/E)",
    excerpt:
      "Pieza para bajar conceptos tecnicos a una lectura clara, util y aplicable.",
    ctaLabel: "Leer analisis",
    ctaUrl:
      "https://www.linkedin.com/posts/club-de-finanzas-uba_ratios-financieros-price-to-earnings-p-activity-7402128083065053185-ry6f",
    daysAgo: 60,
  },
  {
    section: ArticleSection.HOME,
    category: "Invitaciones",
    title: "Workshop interno: modelizacion financiera aplicada a casos reales",
    excerpt:
      "Actividad del club para reforzar la propuesta academica y mostrar profundidad de trabajo.",
    ctaLabel: "Ver detalle",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 10,
  },
  {
    section: ArticleSection.PORTFOLIO,
    category: "Asignacion",
    title: "Portfolio Estrategia 2026",
    excerpt:
      "Criterios de asignacion y construccion de cartera diversificada para 2026.",
    ctaLabel: "Ver publicacion",
    ctaUrl:
      "https://www.linkedin.com/posts/club-de-finanzas-uba_estrategia-2026-portafolio-ugcPost-7427859546221547520-MIMs",
    daysAgo: 20,
  },
  {
    section: ArticleSection.PORTFOLIO,
    category: "Renta fija",
    title: "Bonos hard dollar vs. CER: criterios para decidir sin ruido",
    excerpt:
      "Comparativo sintetico de carry, sensibilidad y escenarios para discutir posicionamiento.",
    ctaLabel: "Leer analisis",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 24,
  },
  {
    section: ArticleSection.PORTFOLIO,
    category: "Metodologia",
    title: "Como documentamos decisiones de cartera dentro del club",
    excerpt:
      "Proceso, criterios y disciplina para que cada movimiento tenga justificacion y trazabilidad.",
    ctaLabel: "Ver metodologia",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 80,
  },
  {
    section: ArticleSection.RESEARCH,
    category: "Research + Portfolio",
    title: "Publicacion de Ratios Financieros - Price to Earnings (P/E)",
    excerpt:
      "Pieza de educacion financiera con lectura clara y aplicable para estudiantes.",
    ctaLabel: "Leer informe",
    ctaUrl:
      "https://www.linkedin.com/posts/club-de-finanzas-uba_ratios-financieros-price-to-earnings-p-activity-7402128083065053185-ry6f",
    daysAgo: 60,
  },
  {
    section: ArticleSection.RESEARCH,
    category: "Educacion",
    title: "Duration explicada desde cero y aplicada a bonos locales",
    excerpt:
      "Articulo breve para alumnos que necesitan una entrada clara al concepto.",
    ctaLabel: "Abrir nota",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 30,
  },
  {
    section: ArticleSection.RESEARCH,
    category: "Valuacion",
    title: "DCF en lenguaje simple: supuestos, errores frecuentes y uso real",
    excerpt:
      "Entrenamiento tecnico con una bajada visual apta para feed.",
    ctaLabel: "Ver explicacion",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 45,
  },
  {
    section: ArticleSection.NEWS,
    category: "Club",
    title: "Noticias del club: agenda mensual y novedades institucionales",
    excerpt:
      "Actualizacion mensual con anuncios relevantes del club, fechas clave y resumen de actividades.",
    ctaLabel: "Ver novedades",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    isFeatured: true,
    daysAgo: 5,
  },
  {
    section: ArticleSection.NEWS,
    category: "Eventos",
    title: "Ciclo de charlas 2026: cronograma confirmado para el segundo trimestre",
    excerpt:
      "Cronograma de eventos con speakers invitados, temas y modalidad de participacion.",
    ctaLabel: "Ver cronograma",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 9,
  },
  {
    section: ArticleSection.NEWS,
    category: "Comunidad",
    title: "Convocatoria de voluntarios para produccion editorial y cobertura",
    excerpt:
      "Se abre una nueva convocatoria interna para sumar colaboradores en redaccion y cobertura.",
    ctaLabel: "Postularme",
    ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    daysAgo: 14,
  },
];

async function seedInitialArticles(authorId: string) {
  const existingArticles = await prisma.article.count();
  if (existingArticles > 0) {
    const existingNews = await prisma.article.count({
      where: { section: ArticleSection.NEWS },
    });

    if (existingNews > 0) {
      console.log("Articles already present, skipping mock article seed.");
      return;
    }

    const now = Date.now();
    const newsArticles = buildMockArticles()
      .filter((item) => item.section === ArticleSection.NEWS)
      .map((item) => ({
        section: item.section,
        category: item.category,
        title: item.title,
        excerpt: item.excerpt,
        content: item.excerpt,
        ctaLabel: item.ctaLabel,
        ctaUrl: item.ctaUrl,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(now - item.daysAgo * 24 * 60 * 60 * 1000),
        isFeatured: Boolean(item.isFeatured),
        authorId,
      }));

    if (newsArticles.length > 0) {
      await prisma.article.createMany({ data: newsArticles });
      console.log(`News mock articles created: ${newsArticles.length}`);
    }

    return;
  }

  const now = Date.now();
  const articles = buildMockArticles().map((item) => ({
    section: item.section,
    category: item.category,
    title: item.title,
    excerpt: item.excerpt,
    content: item.excerpt,
    ctaLabel: item.ctaLabel,
    ctaUrl: item.ctaUrl,
    status: ArticleStatus.PUBLISHED,
    publishedAt: new Date(now - item.daysAgo * 24 * 60 * 60 * 1000),
    isFeatured: Boolean(item.isFeatured),
    authorId,
  }));

  await prisma.article.createMany({ data: articles });
  console.log(`Mock articles created: ${articles.length}`);
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "mateoyastor60@gmail.com")
    .trim()
    .toLowerCase();
  const fullName = process.env.SEED_ADMIN_FULLNAME || "Mateo Yastor";

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, isActive: true, fullName },
    create: {
      email,
      fullName,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.updateMany({
    where: { id: { not: admin.id } },
    data: { isActive: false },
  });

  await seedInitialArticles(admin.id);

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
