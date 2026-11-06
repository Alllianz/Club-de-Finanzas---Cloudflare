import Image from "next/image";
import type { Person } from "../site-data";

type PeopleGridProps = {
  people: Person[];
};

export function PeopleGrid({ people }: PeopleGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {people.map((person) => (
        <article
          key={`${person.name}-${person.role}`}
          className="flex flex-col rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff]"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#d8e5f8] bg-[#091a36]">
              {person.imageUrl ? (
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-base font-bold text-white">
                  {person.initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#0e2246]">{person.name}</h3>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0062ff]">{person.role}</p>
            </div>
          </div>
          {person.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-[#475569]">{person.bio}</p>
          ) : null}
          {person.profileUrl ? (
            <div className="mt-4 border-t border-[#f1f5f9] pt-3">
              <a
                href={person.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0062ff] hover:underline"
              >
                <span>Perfil LinkedIn</span>
                <span>↗</span>
              </a>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
