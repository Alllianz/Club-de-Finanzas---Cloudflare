import "dotenv/config";
import prisma from "../lib/prisma";
import { ContactLinkKind, TeamSection } from "../lib/types";

type TeamSeed = {
  fullName: string;
  title: string;
  section: TeamSection;
  profileUrl?: string | null;
  shortBio?: string | null;
  displayOrder: number;
};

const leaders: TeamSeed[] = [
  { fullName: "Julián Robin", title: "Presidente", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/julian-robin-aa5019201/", displayOrder: 1 },
  { fullName: "Sol Saumell", title: "Vice-Presidente", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/sol-saumell-b88051192/", displayOrder: 2 },
  { fullName: "Alejo Fabiano", title: "Líder de Portfolio y Noticias", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/alejo-fabiano-084447221/", displayOrder: 3 },
  { fullName: "Fausto Crivelli", title: "Líder de Relaciones Institucionales y Marketing", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/fausto-crivelli/", displayOrder: 4 },
  { fullName: "Ignacio Cicero", title: "Líder de Research", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/ignacio-nicolas-cicero-1146a22a2/", displayOrder: 5 },
  { fullName: "Tomás Gómez Zelijoski", title: "Co-Founder", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/tom%C3%A1s-g%C3%B3mez-zelijoski-522314121/", displayOrder: 6 },
  { fullName: "David Berisso Quintana", title: "Co-Founder", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/davidberisso/", displayOrder: 7 },
  { fullName: "Francisco Pisano", title: "Miembro del consejo directivo", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/juan-francisco-pisano-94a83522a/", displayOrder: 8 },
  { fullName: "Javier San José", title: "Miembro del consejo directivo", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/javiersanjosee/", displayOrder: 9 },
  { fullName: "Selene Najle", title: "Miembro del consejo directivo", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/selene-najle/", displayOrder: 10 },
  { fullName: "Andrés Escalona", title: "Miembro del consejo directivo", section: TeamSection.LEADERSHIP, profileUrl: "https://www.linkedin.com/in/andresescalonasoret/", displayOrder: 11 },
];

const portfolioTeam: TeamSeed[] = [
  { fullName: "Federico Sánchez", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/federico-sanchez-7891851b2/", displayOrder: 1 },
  { fullName: "Rodrigo Hermo", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/rodrigo-hermo-20132a168/", displayOrder: 2 },
  { fullName: "Renzo Bazzano Berutto", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: null, displayOrder: 3 },
  { fullName: "Martiniano Gil", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/martinianogil/", displayOrder: 4 },
  { fullName: "Luciano Mora", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/luciano-mora/?locale=es", displayOrder: 5 },
  { fullName: "Lautaro Ulecia", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/lautaro-ulecia-cardoso-0bab3a1b5/", displayOrder: 6 },
  { fullName: "Ines Bilicich", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/in%C3%A9s-bilicich/", displayOrder: 7 },
  { fullName: "Pablo Portella Beltrán", title: "Miembro Portfolio", section: TeamSection.PORTFOLIO, profileUrl: "https://www.linkedin.com/in/pabloportelabeltran/", displayOrder: 8 },
];

const rriiTeam: TeamSeed[] = [
  { fullName: "Francisco Jose Jaime Cuneo", title: "Miembro RRII y Marketing", section: TeamSection.RRII, profileUrl: "https://www.linkedin.com/in/francisco-jaime-cuneo/?skipRedirect=true", displayOrder: 1 },
  { fullName: "Camilo Alias", title: "Miembro RRII y Marketing", section: TeamSection.RRII, profileUrl: "https://www.linkedin.com/in/camiloalias/?locale=es", displayOrder: 2 },
  { fullName: "Martín Lasebnik", title: "Miembro RRII y Marketing", section: TeamSection.RRII, profileUrl: "https://www.linkedin.com/in/mart%C3%ADn-lasebnik-a1b59318b/", displayOrder: 3 },
];

const researchTeam: TeamSeed[] = [
  { fullName: "Tomás Valles", title: "Miembro Research", section: TeamSection.RESEARCH, profileUrl: "https://www.linkedin.com/in/tomas-valles-497152228/", displayOrder: 1 },
  { fullName: "Ivo Dubilet", title: "Miembro Research", section: TeamSection.RESEARCH, profileUrl: "https://www.linkedin.com/in/ivo-dubilet-3941b4265/", displayOrder: 2 },
  { fullName: "Faustina", title: "Miembro Research", section: TeamSection.RESEARCH, profileUrl: null, displayOrder: 3 },
  { fullName: "Facundo", title: "Miembro Research", section: TeamSection.RESEARCH, profileUrl: null, displayOrder: 4 },
  { fullName: "Facundo (2)", title: "Miembro Research", section: TeamSection.RESEARCH, profileUrl: null, displayOrder: 5 },
];

const contactLinks = [
  {
    kind: ContactLinkKind.OTHER,
    label: "Mandá tu CV",
    value: "Formulario de postulación",
    href: "https://docs.google.com/forms/d/e/1FAIpQLSeTCZ_j5gp4teXV7_J3Pwz2Lb0zmq3hpr19R9IAV9DNmUb7tw/viewform",
    sortOrder: 1,
  },
  {
    kind: ContactLinkKind.OTHER,
    label: "Donaciones",
    value: "Cafecito",
    href: "https://cafecito.app/clubfinanzasuba",
    sortOrder: 2,
  },
  {
    kind: ContactLinkKind.WHATSAPP,
    label: "Canal de difusión",
    value: "WhatsApp",
    href: "https://chat.whatsapp.com/GMWbCTJPGvsFTeSA7I7JWP",
    sortOrder: 3,
  },
  {
    kind: ContactLinkKind.WHATSAPP,
    label: "Canal de debate",
    value: "Members",
    href: "https://chat.whatsapp.com/",
    sortOrder: 4,
  },
  {
    kind: ContactLinkKind.LINKEDIN,
    label: "LinkedIn",
    value: "Club de Finanzas UBA",
    href: "https://www.linkedin.com/company/club-de-finanzas-uba/",
    sortOrder: 5,
  },
  {
    kind: ContactLinkKind.INSTAGRAM,
    label: "Instagram",
    value: "@clubdefinanzasuba",
    href: "https://www.instagram.com/clubdefinanzasuba/",
    sortOrder: 6,
  },
  {
    kind: ContactLinkKind.X,
    label: "X",
    value: "@ClubFinanzasUBA",
    href: "https://x.com/ClubFinanzasUBA",
    sortOrder: 7,
  },
  {
    kind: ContactLinkKind.EMAIL,
    label: "Mail",
    value: "clubfinanzasuba@gmail.com",
    href: "mailto:clubfinanzasuba@gmail.com",
    sortOrder: 8,
  },
];

async function main() {
  const team = [...leaders, ...portfolioTeam, ...rriiTeam, ...researchTeam];
  await prisma.postAuthor.deleteMany({});
  await prisma.teamMember.deleteMany({});

  await prisma.teamMember.createMany({
    data: team.map((person) => ({
      fullName: person.fullName,
      title: person.title,
      shortBio: person.shortBio ?? null,
      imageUrl: null,
      profileUrl: person.profileUrl ?? null,
      section: person.section,
      displayOrder: person.displayOrder,
      isActive: true,
    })),
  });

  await prisma.contactLink.deleteMany({});
  await prisma.contactLink.createMany({ data: contactLinks });

  console.log(`Team members cargados: ${team.length}`);
  console.log(`Contact links cargados: ${contactLinks.length}`);
}

async function runWithRetry() {
  const retries = 2;
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      await main();
      return;
    } catch (error) {
      lastError = error;
      if (attempt <= retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

runWithRetry()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
