import { ArrowRight, CheckCircle2, Link2, PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-aksurim-dark text-slate-50 font-sans selection:bg-aksurim-highlight selection:text-aksurim-dark">
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-aksurim-dark/80 backdrop-blur supports-[backdrop-filter]:bg-aksurim-dark/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="Aksurim Controle" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold tracking-tight text-white">
              Aksurim <span className="text-aksurim-highlight">Controle</span>
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="px-2 py-1 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Entrar
            </Link>
            <Link to="/register">
              <Button className="bg-aksurim-highlight text-aksurim-dark rounded-full px-4 text-xs font-bold hover:opacity-90 sm:px-6 sm:text-sm">
                Cadastro GRATUITO
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-16 sm:py-20 lg:py-32">
          {/* Background Glow */}
          <div className="bg-aksurim-highlight/10 pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

          <div className="relative z-10 container mx-auto px-4 text-center">
            <h1 className="mb-6 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl md:text-7xl">
              Domine o seu dinheiro.
              <br />
              <span className="from-aksurim-highlight bg-gradient-to-r via-lime-300 to-emerald-300 bg-clip-text text-transparent">
                Prospere em conjunto.
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg md:text-xl">
              O Aksurim Controle organiza as suas contas em uma fila inteligente
              para você nunca mais pagar juros. Feito para o seu bolso e
              perfeito para compartilhar — em família, a dois, entre amigos,
              repúblicas ou projetos em grupo.
            </p>

            <div className="mb-20 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="bg-aksurim-highlight text-aksurim-dark group flex h-14 w-full items-center justify-center gap-2 rounded-full px-8 text-lg font-bold hover:opacity-90 sm:w-auto"
                >
                  Criar minha conta grátis
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-aksurim-primary hover:bg-aksurim-primary h-14 w-full rounded-full px-8 text-lg text-white sm:w-auto"
                >
                  Já tenho uma conta
                </Button>
              </Link>
            </div>

            {/* HERO IMAGES - CAROUSEL (Simulated with grid for now) */}
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl transition-transform duration-300 hover:-translate-y-2">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <img
                  src="/images/hero-sad.png"
                  alt="Preocupação com contas no fim do mês"
                  loading="eager"
                  decoding="async"
                  className="h-64 w-full object-cover object-center opacity-80 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute right-6 bottom-6 left-6 z-20 text-left">
                  <h3 className="mb-2 text-xl font-bold text-white">
                    O fim do mês virou motivo de estresse?
                  </h3>
                </div>
              </div>
              <div className="group border-aksurim-highlight/30 shadow-aksurim-highlight/10 relative overflow-hidden rounded-2xl border bg-black/20 shadow-2xl transition-transform duration-300 hover:-translate-y-2">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                <img
                  src="/images/hero-happy.png"
                  alt="Tranquilidade e organização financeira"
                  loading="eager"
                  decoding="async"
                  className="h-64 w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute right-6 bottom-6 left-6 z-20 text-left">
                  <h3 className="text-aksurim-highlight mb-2 text-xl font-bold">
                    A paz financeira na palma da mão.
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS SECTION */}
        <section className="border-t border-white/10 bg-black/20 py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-5xl">
                Como funciona?
              </h2>
              <p className="text-lg text-slate-400">
                Três pilares fundamentais para transformar sua relação com o
                dinheiro.
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-3">
              {/* PILLAR 1 */}
              <div className="flex flex-col gap-6">
                <div className="group relative h-56 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                  <img
                    src="/images/pillar-1.jpg"
                    alt="Fila Inteligente"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-aksurim-highlight/10 rounded-lg p-2">
                      <CheckCircle2 className="text-aksurim-highlight h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold">Fila Inteligente</h3>
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    Não perca tempo procurando boletos e anotações. Nosso
                    algoritmo prioriza o que está atrasado e o que vence hoje.
                  </p>
                </div>
              </div>

              {/* PILLAR 2 */}
              <div className="flex flex-col gap-6">
                <div className="group relative h-56 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                  <img
                    src="/images/pillar-2.jpg"
                    alt="Gestão Compartilhada"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-aksurim-highlight/10 rounded-lg p-2">
                      <Link2 className="text-aksurim-highlight h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold">Gestão Compartilhada</h3>
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    Sincronize as despesas da casa, do apartamento ou do seu
                    grupo. Saiba exatamente quem pagou e o que foi quitado, com
                    total transparência e sem atritos.
                  </p>
                </div>
              </div>

              {/* PILLAR 3 */}
              <div className="flex flex-col gap-6">
                <div className="group relative h-56 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                  <img
                    src="/images/pillar-3.jpg"
                    alt="Inteligência Visual"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="bg-aksurim-highlight/10 rounded-lg p-2">
                      <PieChart className="text-aksurim-highlight h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold">Inteligência Visual</h3>
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    Transforme dados em decisões com gráficos automáticos, visão
                    de fluxo de receita e relatórios corporativos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BOTTOM */}
        <section className="relative overflow-hidden py-24">
          <div className="bg-aksurim-highlight/5 absolute inset-0" />
          <div className="relative z-10 container mx-auto px-4 text-center">
            <h2 className="mb-6 text-4xl font-bold">
              Pronto para assumir o controle?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">
              Junte-se à plataforma que está revolucionando a forma como
              pessoas, famílias e grupos organizam e compartilham suas finanças.
            </p>
            <Link to="/register">
              <Button
                size="lg"
                className="bg-aksurim-highlight text-aksurim-dark h-14 rounded-full px-10 text-lg font-bold hover:opacity-90"
              >
                Criar conta gratuita agora
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-aksurim-dark py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <img src="/logo-icon.png" alt="Aksurim Controle" className="h-6 w-6 object-contain grayscale" />
            <span className="font-semibold text-slate-300">Aksurim Controle</span>
          </div>
          <div className="text-sm text-slate-500 text-center md:text-right">
            &copy; 2024 - {new Date().getFullYear()} <a href="https://aksurim.com" target="_blank" rel="noopener noreferrer" className="hover:text-aksurim-highlight transition-colors font-semibold">Aksurim Software</a>.<br className="md:hidden" />
            <span className="hidden md:inline"> • </span>
            Projetado e desenvolvido com excelência.
          </div>
        </div>
      </footer>
    </div>
  );
}
