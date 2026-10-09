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
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link to="/register">
              <Button className="bg-aksurim-highlight text-aksurim-dark hover:opacity-90 font-bold rounded-full px-6">
                Cadastro GRATUITO
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-aksurim-highlight/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Domine o seu dinheiro.<br />Conecte a sua família.
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              O Aksurim Controle organiza as suas contas em uma fila inteligente para você nunca mais pagar juros. Feito para o seu bolso, perfeito para dividir.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto bg-aksurim-highlight text-aksurim-dark hover:opacity-90 font-bold rounded-full h-14 px-8 text-lg flex items-center gap-2 group">
                  Criar minha conta grátis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full h-14 px-8 text-lg border-aksurim-primary text-white hover:bg-aksurim-primary">
                  Já tenho uma conta
                </Button>
              </Link>
            </div>

            {/* HERO IMAGES - CAROUSEL (Simulated with grid for now) */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 shadow-2xl transition-transform hover:-translate-y-2 duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />
                <img src="/images/hero-sad.png" alt="Casal Preocupado" className="w-full h-64 object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute bottom-6 left-6 right-6 z-20 text-left">
                  <h3 className="text-xl font-bold text-white mb-2">O fim do mês virou motivo de estresse?</h3>
                </div>
              </div>
              <div className="group relative rounded-2xl overflow-hidden border border-aksurim-highlight/30 bg-black/20 shadow-2xl shadow-aksurim-highlight/10 transition-transform hover:-translate-y-2 duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent z-10" />
                <img src="/images/hero-happy.png" alt="Casal Feliz" className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute bottom-6 left-6 right-6 z-20 text-left">
                  <h3 className="text-xl font-bold text-aksurim-highlight mb-2">A paz financeira na palma da mão.</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS SECTION */}
        <section className="py-24 bg-black/20 border-t border-white/10">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Como funciona?</h2>
              <p className="text-slate-400 text-lg">Três pilares fundamentais para transformar sua relação com o dinheiro.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
              {/* PILLAR 1 */}
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl overflow-hidden h-56 border border-white/10 shadow-lg relative group">
                  <img src="/images/pillar-1.jpg" alt="Fila Inteligente" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-aksurim-highlight/10 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-aksurim-highlight" />
                    </div>
                    <h3 className="text-2xl font-bold">Fila Inteligente</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Não perca tempo caçando boletos. Nosso algoritmo prioriza o que está atrasado e o que vence hoje.
                  </p>
                </div>
              </div>

              {/* PILLAR 2 */}
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl overflow-hidden h-56 border border-white/10 shadow-lg relative group">
                  <img src="/images/pillar-2.jpg" alt="Gestão Compartilhada" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-aksurim-highlight/10 rounded-lg">
                      <Link2 className="w-6 h-6 text-aksurim-highlight" />
                    </div>
                    <h3 className="text-2xl font-bold">Gestão Compartilhada</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Sincronize as finanças da casa. Saiba exatamente quem pagou o quê, com total transparência e sem atritos.
                  </p>
                </div>
              </div>

              {/* PILLAR 3 */}
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl overflow-hidden h-56 border border-white/10 shadow-lg relative group">
                  <img src="/images/pillar-3.jpg" alt="Inteligência Visual" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-aksurim-highlight/10 rounded-lg">
                      <PieChart className="w-6 h-6 text-aksurim-highlight" />
                    </div>
                    <h3 className="text-2xl font-bold">Inteligência Visual</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Transforme dados em decisões com gráficos automáticos, visão de fluxo de caixa e relatórios corporativos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BOTTOM */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-aksurim-highlight/5" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl font-bold mb-6">Pronto para assumir o controle?</h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Junte-se à plataforma que está revolucionando a forma como pessoas e famílias gerenciam seu dinheiro.
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-aksurim-highlight text-aksurim-dark hover:opacity-90 font-bold rounded-full h-14 px-10 text-lg">
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
