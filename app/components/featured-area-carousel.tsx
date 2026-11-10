"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

export type CarouselSlide = {
  area: "PORTFOLIO" | "RESEARCH" | "FUTUROS";
  areaLabel: string;
  badge: string;
  badgeBg: string;
  title: string;
  excerpt: string;
  date: string;
  href: string;
  ctaText: string;
  isPdf?: boolean;
  tagline: string;
  metrics: { label: string; value: string }[];
};

const defaultSlides: CarouselSlide[] = [
  {
    area: "PORTFOLIO",
    areaLabel: "Portafolio",
    badge: "Cartera Cuantitativa",
    badgeBg: "bg-[#1e3a8a] text-white",
    title: "Estrategia de Portafolio: Asignación Cuantitativa y Renta Mixta",
    excerpt:
      "Modelo de optimización con frontera eficiente Markowitz, diversificación factorial en CEDEARs y gestión de riesgo en deuda soberana argentina.",
    date: "Informe Técnico 2026",
    href: "/Portafolio.pdf",
    ctaText: "Descargar Informe PDF",
    isPdf: true,
    tagline: "Frontera Eficiente · Retorno Real · Simplex Ponderado",
    metrics: [
      { label: "Sharpe Ratio", value: "1.42" },
      { label: "Volatilidad", value: "14.8%" },
      { label: "Retorno Esp.", value: "+28.5%" },
    ],
  },
  {
    area: "RESEARCH",
    areaLabel: "Research",
    badge: "Análisis Fundamental",
    badgeBg: "bg-[#0284c7] text-white",
    title: "Valuación Fundamental: Ratios P/E, Flujos DCF y Riesgo País",
    excerpt:
      "Tesis macrofinanciera sobre la curva de rendimientos de letras del tesoro (LECAPs/BONCAPs), brecha cambiaria y solvencia corporativa.",
    date: "Tesis de Research 2026",
    href: "/Research.pdf",
    ctaText: "Descargar Tesis PDF",
    isPdf: true,
    tagline: "Modelos DCF · Curvas de Rendimiento · Spreads Soberanos",
    metrics: [
      { label: "P/E Merval", value: "7.8x" },
      { label: "Riesgo País", value: "580 bps" },
      { label: "Cobertura FCF", value: "3.2x" },
    ],
  },
  {
    area: "FUTUROS",
    areaLabel: "Futuros",
    badge: "Derivados & Apalancamiento",
    badgeBg: "bg-[#00a8a8] text-white",
    title: "Mercado de Derivados: Tasas Implícitas en Dólar Futuro Matba Rofex",
    excerpt:
      "Curva de tasas implícitas (TNA/TEA), forward arbitrage y plataforma de paper trading institucional con margen apalancado de hasta 100x.",
    date: "Plataforma & Análisis 2026",
    href: "/futuros#terminal-futuros",
    ctaText: "Acceder al Terminal de Futuros",
    isPdf: false,
    tagline: "Dólar Matba Rofex · Arbitraje Sintético · Paper Trading 100x",
    metrics: [
      { label: "TNA Implícita", value: "38.2%" },
      { label: "Apalancamiento", value: "1x a 100x" },
      { label: "Matching Órdenes", value: "100% Real-Time" },
    ],
  },
];

export function FeaturedAreaCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = defaultSlides.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-play cada 6 segundos
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const slide = defaultSlides[currentIndex];

  // Gestos táctiles en mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    touchStartX.current = null;
  };

  return (
    <section
      className="w-full max-w-full overflow-hidden border-b border-[#e5e7eb] bg-gradient-to-b from-[#f8fafc] to-[#ffffff] py-10 sm:py-14"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Carrusel Institucional de Publicaciones"
    >
      <div className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Encabezado y Selector de Área */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-5 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                Publicaciones Nucleares de las 3 Áreas
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
              Producción Técnica Institucional
            </h2>
          </div>

          {/* Selector de diapositivas por área */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white p-1.5 shadow-xs">
            {defaultSlides.map((s, idx) => {
              const active = currentIndex === idx;
              return (
                <button
                  key={s.area}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    active
                      ? "bg-[#0b1727] text-white shadow-xs"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b1727]"
                  }`}
                >
                  {s.areaLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjeta del Slide Activo */}
        <div className="relative overflow-hidden rounded-2xl border border-[#cbd5e1] bg-white shadow-sm transition-all duration-300 hover:border-[#1e3a8a] hover:shadow-md">
          {/* Barra superior de acento cromático */}
          <div
            className={`h-1.5 w-full ${
              slide.area === "PORTFOLIO"
                ? "bg-[#1e3a8a]"
                : slide.area === "RESEARCH"
                ? "bg-[#0284c7]"
                : "bg-[#00a8a8]"
            }`}
          />

          <div className="grid grid-cols-1 items-stretch gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.9fr] lg:gap-10">
            {/* Columna Izquierda: Información Editorial */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${slide.badgeBg}`}
                  >
                    {slide.badge}
                  </span>
                  <span className="font-mono text-xs text-[#64748b]">
                    {slide.date}
                  </span>
                </div>

                <h3 className="mt-4 font-serif text-xl sm:text-2xl lg:text-3xl font-bold leading-tight tracking-tight text-[#0b1727]">
                  {slide.title}
                </h3>

                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#475569]">
                  {slide.excerpt}
                </p>

                <p className="mt-2 text-xs font-medium text-[#b89047]">
                  ✦ {slide.tagline}
                </p>
              </div>

              {/* Botón de Acción y Controles de Navegación */}
              <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-[#f1f5f9]">
                {slide.isPdf ? (
                  <a
                    href={slide.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0b1727] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#1e3a8a] active:scale-[0.99]"
                  >
                    <span>📄 {slide.ctaText}</span>
                    <span>↗</span>
                  </a>
                ) : (
                  <Link
                    href={slide.href}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0b1727] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#1e3a8a] active:scale-[0.99]"
                  >
                    <span>⚡ {slide.ctaText}</span>
                    <span>→</span>
                  </Link>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={prevSlide}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#0b1727] shadow-xs transition hover:bg-[#f1f5f9]"
                    aria-label="Slide anterior"
                  >
                    ‹
                  </button>
                  <span className="font-mono text-xs text-[#64748b] px-1">
                    {currentIndex + 1} / {total}
                  </span>
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#0b1727] shadow-xs transition hover:bg-[#f1f5f9]"
                    aria-label="Slide siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Métricas Analíticas */}
            <div className="flex flex-col justify-center rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-5 sm:p-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b1727]">
                Métricas Clave del Área:
              </span>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {slide.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-[#e5e7eb] bg-white p-3 text-center shadow-xs"
                  >
                    <span className="block font-serif text-lg sm:text-xl font-bold text-[#0b1727]">
                      {m.value}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-[#64748b] uppercase">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-[#d8e5f8] bg-[#f0f6ff] p-3 text-center">
                <p className="text-xs text-[#1e3a8a]">
                  Documento e investigación elaborados 100% de forma autónoma e independiente por miembros de la Universidad de Buenos Aires.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
