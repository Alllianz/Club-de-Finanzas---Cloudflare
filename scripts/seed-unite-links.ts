import "dotenv/config";
import prisma from "../lib/prisma";
import { ContactLinkKind } from "../lib/types";

const links = [
  {
    kind: ContactLinkKind.OTHER,
    label: "Mandá tu CV",
    value: "Formulario de postulación",
    href: "https://docs.google.com/forms/d/e/1FAIpQLSeTCZ_j5gp4teXV7_J3Pwz2Lb0zmq3hpr19R9IAV9DNmUb7tw/viewform",
    sortOrder: 1,
    isActive: true,
  },
  {
    kind: ContactLinkKind.OTHER,
    label: "Donaciones",
    value: "Cafecito",
    href: "https://cafecito.app/clubfinanzasuba",
    sortOrder: 2,
    isActive: true,
  },
  {
    kind: ContactLinkKind.WHATSAPP,
    label: "Canal de difusión",
    value: "WhatsApp",
    href: "https://chat.whatsapp.com/GMWbCTJPGvsFTeSA7I7JWP",
    sortOrder: 3,
    isActive: true,
  },
  {
    kind: ContactLinkKind.WHATSAPP,
    label: "Canal de debate (members)",
    value: "Pendiente link",
    href: "https://chat.whatsapp.com/",
    sortOrder: 4,
    isActive: true,
  },
  {
    kind: ContactLinkKind.LINKEDIN,
    label: "LinkedIn",
    value: "Club de Finanzas UBA",
    href: "https://www.linkedin.com/in/club-de-finanzas-uba/",
    sortOrder: 5,
    isActive: true,
  },
  {
    kind: ContactLinkKind.INSTAGRAM,
    label: "Instagram",
    value: "@clubdefinanzasuba",
    href: "https://www.instagram.com/clubdefinanzasuba/",
    sortOrder: 6,
    isActive: true,
  },
  {
    kind: ContactLinkKind.X,
    label: "X",
    value: "@ClubFinanzasUBA",
    href: "https://x.com/ClubFinanzasUBA",
    sortOrder: 7,
    isActive: true,
  },
  {
    kind: ContactLinkKind.EMAIL,
    label: "Mail",
    value: "clubfinanzasuba@gmail.com",
    href: "mailto:clubfinanzasuba@gmail.com",
    sortOrder: 8,
    isActive: true,
  },
];

async function main() {
  await prisma.contactLink.deleteMany({});
  await prisma.contactLink.createMany({ data: links });

  console.log(`Contact links de Unite cargados: ${links.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
