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
  { href: "/portfolio", label: "Portafolio" },
  { href: "/futuros", label: "Futuros" },
  { href: "/research", label: "Research" },
  { href: "/sobre-nosotros", label: "Nosotros" },
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
    name: "Julian Robin",
    role: "Presidente del Club de Finanzas",
    bio: "Presidente del Club de Finanzas UBA. Coordinación general, dirección institucional y consolidación académica con el mercado de capitales.",
    initials: "JR",
    profileUrl: "https://www.linkedin.com/in/julian-robin-aa5019201/",
    section: "LEADERSHIP",
  },
  {
    name: "Fausto Crivelli",
    role: "Presidente de Portafolio",
    bio: "Lidera la estrategia cuantitativa, modelos de optimización de media-varianza de Markowitz, análisis de covarianzas y asignación de activos.",
    initials: "FC",
    profileUrl: "https://www.linkedin.com/in/fausto-crivelli/",
    section: "LEADERSHIP",
  },
  {
    name: "Fausto Crivelli",
    role: "Presidente de Futuros",
    bio: "Lidera la división de Futuros, derivados financieros, estrategias de cobertura sintética, curvas de tasas y operaciones a término.",
    initials: "FC",
    profileUrl: "https://www.linkedin.com/in/fausto-crivelli/",
    section: "LEADERSHIP",
  },
  {
    name: "Ignacio Cicero",
    role: "Presidente de Research",
    bio: "Coordina los informes de valuación fundamental, modelos de flujos de fondos descontados (DCF), múltiplos comparables y proyecciones macroeconómicas.",
    initials: "IC",
    profileUrl: "https://www.linkedin.com/in/ignacio-nicolas-cicero-1146a22a2/",
    section: "LEADERSHIP",
  },
];

export const defaultTeamBySection: Record<string, Person[]> = {
  LEADERSHIP: leadership,
  PORTFOLIO: [
    {
      name: "Luciano Mora",
      role: "Analista Sr Portfolio",
      bio: "Especialista en análisis de covarianzas, pruebas fuera de muestra y asignación de activos en infraestructura y energía.",
      initials: "LM",
      profileUrl: "https://www.linkedin.com/in/luciano-mora/?locale=es",
      section: "PORTFOLIO",
    },
    {
      name: "Florencia Beluzzo",
      role: "Analista Sr Portfolio",
      bio: "Análisis de ratios de liquidez, dividend yields, cobertura de deuda y sensibilidad beta sectorial.",
      initials: "FB",
      profileUrl: null,
      section: "PORTFOLIO",
    },
    {
      name: "Federico Sánchez",
      role: "Miembro Portfolio",
      bio: "Análisis cuantitativo de activos y optimización de carteras.",
      initials: "FS",
      profileUrl: "https://www.linkedin.com/in/federico-sanchez-7891851b2/",
      section: "PORTFOLIO",
    },
    {
      name: "Rodrigo Hermo",
      role: "Miembro Portfolio",
      bio: "Seguimiento de carteras y modelos de renta fija.",
      initials: "RH",
      profileUrl: "https://www.linkedin.com/in/rodrigo-hermo-20132a168/",
      section: "PORTFOLIO",
    },
    {
      name: "Martiniano Gil",
      role: "Miembro Portfolio",
      bio: "Estrategias de inversión y asignación táctica.",
      initials: "MG",
      profileUrl: "https://www.linkedin.com/in/martinianogil/",
      section: "PORTFOLIO",
    },
    {
      name: "Lautaro Ulecia",
      role: "Miembro Portfolio",
      bio: "Modelado de riesgo y sensibilidad de carteras.",
      initials: "LU",
      profileUrl: "https://www.linkedin.com/in/lautaro-ulecia-cardoso-0bab3a1b5/",
      section: "PORTFOLIO",
    },
  ],
  RESEARCH: [
    {
      name: "Ivo Dubilet",
      role: "Analista de Renta Variable",
      bio: "Valuación fundamental de empresas y modelos DCF.",
      initials: "ID",
      profileUrl: "https://www.linkedin.com/in/ivo-dubilet-3941b4265/",
      section: "RESEARCH",
    },
    {
      name: "Tomás Valles",
      role: "Analista de Renta Variable",
      bio: "Análisis sectorial y múltiplos comparables de mercado.",
      initials: "TV",
      profileUrl: "https://www.linkedin.com/in/tomas-valles-497152228/",
      section: "RESEARCH",
    },
    {
      name: "Facundo Godoy",
      role: "Analista de Renta Variable",
      bio: "Estados financieros y análisis de solvencia corporativa.",
      initials: "FG",
      profileUrl: null,
      section: "RESEARCH",
    },
    {
      name: "Faustina Failo",
      role: "Analista de Renta Variable",
      bio: "Investigación fundamental de industrias y ventajas competitivas.",
      initials: "FF",
      profileUrl: null,
      section: "RESEARCH",
    },
    {
      name: "Vicente Deiros",
      role: "Analista de Renta Variable",
      bio: "Valuación de activos y modelado de flujos de fondos.",
      initials: "VD",
      profileUrl: null,
      section: "RESEARCH",
    },
    {
      name: "Facundo Rojas",
      role: "Analista de Renta Variable",
      bio: "Análisis cuantitativo de balances e indicadores financieros.",
      initials: "FR",
      profileUrl: null,
      section: "RESEARCH",
    },
  ],
  RRII: [
    {
      name: "Francisco Jose Jaime Cuneo",
      role: "Miembro RRII y Marketing",
      bio: "Alianzas corporativas y difusión institucional del club.",
      initials: "FJ",
      profileUrl: "https://www.linkedin.com/in/francisco-jaime-cuneo/?skipRedirect=true",
      section: "RRII",
    },
    {
      name: "Camilo Alias",
      role: "Miembro RRII y Marketing",
      bio: "Coordinación de eventos, charlas y relaciones institucionales.",
      initials: "CA",
      profileUrl: "https://www.linkedin.com/in/camiloalias/?locale=es",
      section: "RRII",
    },
    {
      name: "Martín Lasebnik",
      role: "Miembro RRII y Marketing",
      bio: "Comunidad, comunicación institucional y convenios.",
      initials: "ML",
      profileUrl: "https://www.linkedin.com/in/mart%C3%ADn-lasebnik-a1b59318b/",
      section: "RRII",
    },
  ],
};
