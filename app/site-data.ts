export type FeedEntry = {
  category: string;
  date: string;
  title: string;
  excerpt: string;
  href: string;
  cta: string;
  imageUrl?: string;
};

export type Person = {
  name: string;
  role: string;
  bio: string;
  initials: string;
  imageUrl?: string | null;
  profileUrl?: string | null;
  section?: "LEADERSHIP" | "PORTFOLIO" | "RESEARCH" | "RRII";
};

export type NavigationItem = {
  href: string;
  label: string;
};

export const navigation: NavigationItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/research", label: "Research" },
  { href: "/portfolio", label: "Portafolio" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
  { href: "/miembros", label: "Miembros" },
  { href: "/unite", label: "Unite" },
];

export const contactLinks = [
  {
    label: "LinkedIn",
    value: "Club de Finanzas UBA",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
  },
  {
    label: "Instagram",
    value: "@clubdefinanzasuba",
    href: "https://instagram.com/clubdefinanzasuba",
  },
  {
    label: "WhatsApp",
    value: "Canal oficial",
    href: "https://whatsapp.com/channel/clubdefinanzasuba",
  },
  {
    label: "Mail",
    value: "hola@clubdefinanzasuba.com",
    href: "mailto:hola@clubdefinanzasuba.com",
  },
];

export const homeFeatured = {
  category: "Destacada de la semana",
  date: "11 de marzo de 2026",
  title: "Convocatoria abierta: charla sobre macro, carry trade y valuación para estudiantes UBA",
  excerpt:
    "Una invitación en formato editorial para empujar asistencia, sumar comunidad y marcar agenda. La pieza principal ocupa la home completa y funciona como noticia del día o promoción de un evento clave.",
  href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
  cta: "Ver invitación completa",
};

export const homeFeed: FeedEntry[] = [
  {
    category: "Portfolio",
    date: "Febrero 2026",
    title: "Portfolio Estrategia 2026",
    excerpt:
      "Lectura del escenario 2026, criterios de asignación y construcción de una cartera diversificada con foco académico y práctico.",
    href: "https://www.linkedin.com/posts/club-de-finanzas-uba_estrategia-2026-portafolio-ugcPost-7427859546221547520-MIMs?utm_source=social_share_send&utm_medium=ios_app&rcm=ACoAADfFs6QBrRwlErmxmoZqDDqkyL79ZUQN40Q&utm_campaign=copy_link",
    cta: "Ir a LinkedIn",
  },
  {
    category: "Research",
    date: "Diciembre 2025",
    title: "Publicación de Ratios Financieros - Price to Earnings (P/E)",
    excerpt:
      "Una pieza para bajar conceptos técnicos a una lectura clara, útil y aplicable para estudiantes y jóvenes profesionales.",
    href: "https://www.linkedin.com/posts/club-de-finanzas-uba_ratios-financieros-price-to-earnings-p-activity-7402128083065053185-ry6f?utm_source=share&utm_medium=member_ios&rcm=ACoAADfFs6QBrRwlErmxmoZqDDqkyL79ZUQN40Q",
    cta: "Leer análisis",
  },
  {
    category: "Invitaciones",
    date: "Marzo 2026",
    title: "Workshop interno: modelización financiera aplicada a casos reales",
    excerpt:
      "Actividad del club para reforzar la propuesta académica y mostrar profundidad de trabajo más allá de redes.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Ver detalle",
  },
  {
    category: "Research",
    date: "Noviembre 2025",
    title: "Riesgo país, spread y duration: una lectura para no especialistas",
    excerpt:
      "Pieza de educación financiera con tono serio y estructura visual de informe breve.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Abrir informe",
  },
  {
    category: "Portfolio",
    date: "Octubre 2025",
    title: "Seguimiento del portafolio de renta mixta local - mayo",
    excerpt:
      "Seguimiento de una cartera local con criterio de riesgo, horizonte y consistencia metodológica.",
    href: "https://www.linkedin.com/posts/club-de-finanzas-uba_seguimiento-portfolio-renta-mixta-local-activity-7399929441407111168-m_3T?utm_medium=ios_app&rcm=ACoAADfFs6QBrRwlErmxmoZqDDqkyL79ZUQN40Q&utm_source=social_share_send&utm_campaign=copy_link",
    cta: "Ver seguimiento",
  },
];

export const portfolioIntro =
  "Área enfocada en construcción y seguimiento de carteras, asset allocation y modelos cuantitativos de renta fija y variable. Presentamos tesis de inversión fundamental y análisis de activos.";

export const portfolioFeed: FeedEntry[] = [
  {
    category: "Asignación",
    date: "Febrero 2026",
    title: "Portfolio Estrategia 2026",
    excerpt:
      "Lectura del escenario 2026, criterios de asignación y construcción de una cartera diversificada con foco académico y práctico.",
    href: "https://www.linkedin.com/posts/club-de-finanzas-uba_estrategia-2026-portafolio-ugcPost-7427859546221547520-MIMs?utm_source=social_share_send&utm_medium=ios_app&rcm=ACoAADfFs6QBrRwlErmxmoZqDDqkyL79ZUQN40Q&utm_campaign=copy_link",
    cta: "Ver publicación",
  },
  {
    category: "Renta fija",
    date: "Febrero 2026",
    title: "Bonos hard dollar vs. CER: criterios para decidir sin ruido",
    excerpt:
      "Comparativo sintético de carry, sensibilidad y escenarios para discutir posicionamiento con mayor precisión.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Leer análisis",
  },
  {
    category: "Seguimiento",
    date: "Octubre 2025",
    title: "Seguimiento del portafolio de renta mixta local - mayo",
    excerpt:
      "Seguimiento de una cartera local con criterio de riesgo, horizonte y consistencia metodológica.",
    href: "https://www.linkedin.com/posts/club-de-finanzas-uba_seguimiento-portfolio-renta-mixta-local-activity-7399929441407111168-m_3T?utm_medium=ios_app&rcm=ACoAADfFs6QBrRwlErmxmoZqDDqkyL79ZUQN40Q&utm_source=social_share_send&utm_campaign=copy_link",
    cta: "Abrir post",
  },
  {
    category: "Metodología",
    date: "Diciembre 2025",
    title: "Cómo documentamos decisiones de cartera dentro del club",
    excerpt:
      "Proceso, criterios y disciplina para que cada movimiento tenga justificación y trazabilidad.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Ver metodología",
  },
];

export const researchIntro =
  "Research concentra informes, marcos conceptuales y estudios macroeconómicos. Formación de alto nivel en valuación de activos y coyuntura financiera.";

export const researchFeed: FeedEntry[] = [
  {
    category: "Research + Portfolio",
    date: "Diciembre 2025",
    title: "Publicación de Ratios Financieros - Price to Earnings (P/E)",
    excerpt:
      "Una pieza para bajar conceptos técnicos a una lectura clara, útil y aplicable para estudiantes y jóvenes profesionales.",
    href: "https://www.linkedin.com/posts/club-de-finanzas-uba_ratios-financieros-price-to-earnings-p-activity-7402128083065053185-ry6f?utm_source=share&utm_medium=member_ios&rcm=ACoAADfFs6QBrRwlErmxmoZqDDqkyL79ZUQN40Q",
    cta: "Leer informe",
  },
  {
    category: "Educación",
    date: "Febrero 2026",
    title: "Duration explicada desde cero y aplicada a bonos locales",
    excerpt:
      "Artículo breve para alumnos que necesitan una entrada clara al concepto antes de ir a un informe completo.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Abrir nota",
  },
  {
    category: "Valuación",
    date: "Enero 2026",
    title: "DCF en lenguaje simple: supuestos, errores frecuentes y uso real",
    excerpt:
      "Pieza orientada a entrenamiento técnico con una bajada visual apta para feed.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Ver explicación",
  },
  {
    category: "Mercado",
    date: "Diciembre 2025",
    title: "Riesgo país y spreads: por qué importan y qué no te dicen solos",
    excerpt:
      "Análisis corto con foco en interpretación, no en repetir indicadores sin contexto.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Ir al contenido",
  },
];

export const newsIntro =
  "Noticias y novedades institucionales del Club de Finanzas UBA: agenda de conferencias, charlas con referentes del mercado y convocatorias.";

export const newsFeed: FeedEntry[] = [
  {
    category: "Club",
    date: "Marzo 2026",
    title: "Agenda del club: actividades confirmadas para abril",
    excerpt:
      "Resumen de fechas, charlas y encuentros planificados para el próximo mes con links de seguimiento.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Ver agenda",
  },
  {
    category: "Eventos",
    date: "Marzo 2026",
    title: "Cobertura: encuentro de análisis macro con invitados del sector",
    excerpt:
      "Síntesis de los temas tratados, conclusiones clave y material complementario para la comunidad.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Leer cobertura",
  },
  {
    category: "Comunidad",
    date: "Febrero 2026",
    title: "Convocatoria abierta para sumar voluntarios al equipo editorial",
    excerpt:
      "Buscamos perfiles para redacción, diseño y coordinación de contenido institucional.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Postularme",
  },
  {
    category: "Institucional",
    date: "Febrero 2026",
    title: "Nuevo calendario de reuniones y comisiones de trabajo",
    excerpt:
      "Publicamos el calendario operativo para ordenar seguimiento de proyectos y responsabilidades.",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    cta: "Ver calendario",
  },
];

export const storyBlocks = [
  {
    title: "Trayectoria",
    text: "El club surge desde la UBA para transformar interés en finanzas en producción real: informes cuantitativos, publicaciones, conferencias y comunidad activa.",
  },
  {
    title: "Objetivo",
    text: "Construir una plataforma estudiantil con nivel editorial y técnico de excelencia, conectando a estudiantes con las principales firmas del mercado de capitales.",
  },
  {
    title: "Forma de trabajo",
    text: "Equipos especializados en Portfolio, Research y Relaciones Institucionales, aplicando metodologías analíticas rigurosas.",
  },
];

export const objectives = [
  "Formar estudiantes en finanzas aplicadas, análisis fundamental, renta fija y asset allocation.",
  "Publicar reportes y modelos de valuación con calidad profesional y rigor metodológico.",
  "Construir una red activa de networking con profesionales, docentes y referentes de la industria.",
  "Consolidar una organización académica de referencia para toda la comunidad universitaria.",
];

export const leadership: Person[] = [
  {
    name: "Fausto Crivelli",
    role: "Presidente de Portafolio",
    bio: "Lidera la estrategia cuantitativa, modelos de optimización de media-varianza de Markowitz y selección de activos de renta variable.",
    initials: "FC",
  },
  {
    name: "Cicero Ignacio",
    role: "Líder de Research",
    bio: "Coordina los informes de valuación fundamental, modelos de flujos descontados (DCF), simulaciones de Monte Carlo y análisis macro.",
    initials: "CI",
  },
  {
    name: "Luciano Mora",
    role: "Analista Sr Portfolio",
    bio: "Especialista en análisis de covarianzas, pruebas fuera de muestra y asignación de activos en infraestructura y energía.",
    initials: "LM",
  },
  {
    name: "Florencia Beluzzo",
    role: "Analista Sr Portfolio",
    bio: "Análisis de ratios de liquidez, dividend yields, cobertura de deuda y sensibilidad beta sectorial.",
    initials: "FB",
  },
  {
    name: "Equipo Research",
    role: "Analistas de Renta Variable",
    bio: "Integrado por Ivo Dubilet, Facundo Godoy, Faustina Failo, Vicente Deiros y Facundo Rojas en valuación de activos y estados financieros.",
    initials: "RE",
  },
];
