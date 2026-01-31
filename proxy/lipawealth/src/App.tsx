import { createSignal, type Component, Show, onMount } from 'solid-js';
import {
  TrendingUp,
  Globe,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  Smartphone,
  ChevronRight,
  ExternalLink,
  Menu,
  X
} from 'lucide-solid';
import HaikuBlog from './components/HaikuBlog';
import init, { greet } from 'lipa-engine';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import MagneticCursor from './components/MagneticCursor';
import RevealText from './components/RevealText';
import FluidBackground from './components/FluidBackground';
import LiquidTypography from './components/LiquidTypography';
import { ToastContainer, showToast } from './components/Toast';

const App: Component = () => {
  const [activeTab, setActiveTab] = createSignal('local');
  const [isScrolled, setIsScrolled] = createSignal(false);
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
  const [rustGreeting, setRustGreeting] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(true);

  // Handle scroll effect for navbar
  onMount(async () => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    // Initialize WASM and DB
    try {
      await init();
      setRustGreeting(greet('LipaWealth User'));
      showToast('Vault Initialized: Swiss Standard Active', 'success');
      setIsLoading(false);
    } catch (e) {
      console.error("Initialization Fail:", e);
      setIsLoading(false); // Reveal anyway to avoid soft-lock
    }

    // Initialize Luxury Smooth Scroll (Lenis)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Snapping Logic
    const sections = gsap.utils.toArray('.fp-section');
    ScrollTrigger.create({
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      snap: {
        snapTo: 1 / (sections.length - 1),
        duration: { min: 0.2, max: 0.8 },
        delay: 0.1,
        ease: 'power2.inOut'
      }
    });

    // High-Key Sweep (No longer dark)
    gsap.to('body', {
      scrollTrigger: {
        trigger: '#trust',
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => {
          gsap.to('body', { backgroundColor: '#f8fafc', duration: 1 });
          gsap.to('.vault-content', { opacity: 1, scale: 1, duration: 1, ease: 'expo.out' });
        },
        onLeave: () => {
          gsap.to('body', { backgroundColor: '#ffffff', duration: 1 });
        },
      }
    });

    // Staggered Reveals
    const revealSections = ['.fp-section'];
    revealSections.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        gsap.from(el.querySelectorAll('.reveal-card, h3, p'), {
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
          },
          y: 60,
          opacity: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: 'expo.out'
        });
      }
    });

    // Expose lenis to window for other components
    (window as any).lenis = lenis;

    return () => {
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div class={`min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden font-sans cursor-none transition-opacity duration-1000 ${isLoading() ? 'opacity-0' : 'opacity-100'}`}>
      <FluidBackground />
      <MagneticCursor />

      {/* Side Pagination Dots */}
      <div class="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4">
        {['hero', 'dashboard', 'ecosystem', 'insights-anchor', 'trust'].map(id => (
          <button
            onClick={() => scrollToSection(id)}
            class="w-2 h-2 rounded-full bg-slate-200 hover:bg-emerald-500 transition-all duration-300 border border-slate-300"
            title={id}
          />
        ))}
      </div>

      {/* Pre-loader Overlay */}
      <Show when={isLoading()}>
        <div class="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6">
          <div class="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center animate-bounce">
            <div class="w-4 h-4 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Initializing Switzerland in Nairobi</div>
        </div>
      </Show>

      {/* Sticky Navigation */}
      <nav class={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled() ? 'glass py-4' : 'bg-transparent py-6'}`}>
        <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div class="flex items-center gap-3 cursor-pointer group" onClick={() => scrollToSection('hero')}>
            <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <div class="w-4 h-4 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <span class="font-black text-xl tracking-tighter uppercase italic text-slate-900">LipaWealth</span>
          </div>

          {/* Desktop Menu */}
          <div class="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            <button onClick={() => scrollToSection('dashboard')} class="hover:text-emerald-600 transition-colors">Portfolio</button>
            <button onClick={() => scrollToSection('ecosystem')} class="hover:text-emerald-600 transition-colors">Ecosystem</button>
            <button onClick={() => scrollToSection('insights-anchor')} class="hover:text-emerald-600 transition-colors text-emerald-600">Insights</button>
          </div>

          <div class="hidden md:block">
            <button class="bg-slate-900 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:shadow-emerald-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-xl shadow-slate-900/10">
              Elevate Portfolio
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div class="md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen())} class="p-2 text-slate-900">
              {mobileMenuOpen() ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <Show when={mobileMenuOpen()}>
        <div class="fixed inset-0 z-40 bg-white pt-32 px-6 animate-fade-in">
          <div class="flex flex-col gap-8 text-2xl font-black uppercase tracking-tighter">
            <button onClick={() => scrollToSection('dashboard')}>Portfolio</button>
            <button onClick={() => scrollToSection('ecosystem')}>Ecosystem</button>
            <button onClick={() => scrollToSection('insights-anchor')} class="text-emerald-600">Insights</button>
          </div>
        </div>
      </Show>

      <main>
        {/* Hero Section */}
        <section id="hero" class="fp-section pt-20">
          {/* Ambient Background */}
          <div class="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl opacity-60 translate-x-1/3 -translate-y-1/3" />
          <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-100/50 rounded-full blur-3xl opacity-60 -translate-x-1/3 translate-y-1/3" />

          <div class="max-w-7xl mx-auto w-full px-6 relative z-10 flex flex-col justify-center h-full">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <div class="flex flex-col items-start gap-10">
                <div class="animate-fade-in-up">
                  <div class="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-100/50 backdrop-blur-sm text-emerald-800 text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    {rustGreeting() || 'Initializing Core...'}
                  </div>
                </div>

                <div class="h-[300px] md:h-[400px] flex flex-col justify-center">
                  <LiquidTypography id="hero-1" text="The Swiss" class="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter" />
                  <LiquidTypography id="hero-2" text="Standard" class="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter" />
                  <LiquidTypography id="hero-3" text="for Kenya." class="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter text-gradient" />
                </div>

                <p class="text-lg md:text-xl text-slate-500 max-w-xl font-medium leading-relaxed animate-fade-in-up delay-200">
                  Sophisticated wealth management for the modern African professional. Navigate local opportunities and global markets with award-winning precision.
                </p>

                <div class="flex flex-wrap gap-5 mt-4 animate-fade-in-up delay-300">
                  <button class="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-600 hover:scale-105 transition-all duration-300 shadow-xl shadow-slate-900/20 group">
                    Open Private Account <ArrowRight size={18} class="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button class="px-10 py-5 rounded-2xl border border-slate-200 font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-600">
                    View Advisory Fees
                  </button>
                </div>
              </div>

              {/* Abstract Visual / Dashboard Teaser */}
              <div class="relative hidden lg:block animate-fade-in-up delay-300">
                <div class="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-3xl" />
                <div class="relative glass rounded-3xl p-8 premium-shadow border-white/50 rotate-[-4deg] hover:rotate-0 transition-transform duration-700 ease-out">
                  <div class="flex justify-between items-center mb-8">
                    <div class="text-xs font-black uppercase tracking-widest text-slate-400">Total Asset Value</div>
                    <div class="p-2 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp size={20} /></div>
                  </div>
                  <div class="text-5xl font-black text-slate-900 mb-2">KES 148.2M</div>
                  <div class="text-sm font-bold text-emerald-600">+12.4% vs Last Quarter</div>
                  <div class="mt-8 h-32 flex items-end gap-2 opacity-50">
                    {[40, 65, 55, 80, 70, 90, 85].map(h => (
                      <div class={`flex-1 bg-slate-900 rounded-t-sm`} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio Dashboard Preview */}
        <section id="dashboard" class="fp-section bg-slate-50/30">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-slate-200/50 to-transparent" />

          <div class="max-w-7xl mx-auto relative z-10 w-full">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20 animate-fade-in-up delay-100">
              <div class="max-w-2xl">
                <h2 class="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-[0.9]">
                  <RevealText text="Real-Time Allocation" type="chars" stagger={0.03} />
                </h2>
                <p class="text-slate-500 text-lg font-medium leading-relaxed">Unified command for local (KES) and global ($) assets. Monitor your net worth across currencies and asset classes in one view.</p>
              </div>
              <div class="flex p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setActiveTab('local')}
                  class={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab() === 'local' ? 'bg-slate-900 text-white shadow-lg scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  Local Stocks
                </button>
                <button
                  onClick={() => setActiveTab('global')}
                  class={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab() === 'global' ? 'bg-slate-900 text-white shadow-lg scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  Wall Street
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative pb-32">
              {/* Main Visual/Featured Card */}
              <div class="lg:col-span-12 xl:col-span-8 group">
                <Show when={activeTab() === 'local'}>
                  <div class="glass reveal-card p-12 md:p-16 rounded-[3rem] premium-shadow transition-all duration-700 bg-white/80 group cursor-pointer relative overflow-hidden border-emerald-100/30">
                    <div class="flex flex-col md:flex-row justify-between gap-12">
                      <div class="flex-1">
                        <div class="flex items-center gap-4 mb-12">
                          <div class="p-5 bg-emerald-50 rounded-3xl text-emerald-600 group-hover:bg-slate-900 group-hover:text-emerald-400 transition-all duration-500 shadow-sm">
                            <TrendingUp size={32} />
                          </div>
                          <span class="px-4 py-1.5 bg-emerald-100/50 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-[0.2em] border border-emerald-200/30 shadow-inner">Featured Holding</span>
                        </div>
                        <h3 class="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 leading-none text-slate-900">Safaricom PLC</h3>
                        <p class="text-sm text-slate-400 font-bold tracking-[0.3em] uppercase mb-12 flex items-center gap-3">
                          NSE: SCOM <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Price
                        </p>
                        <div class="flex gap-16">
                          <div>
                            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-4">Allocation</span>
                            <span class="text-4xl font-black tabular-nums tracking-tighter text-slate-900">42.8%</span>
                          </div>
                          <div>
                            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-4">Total Value</span>
                            <span class="text-4xl font-black tabular-nums tracking-tighter text-slate-900">KES 4.8M</span>
                          </div>
                        </div>
                      </div>
                      <div class="hidden md:flex flex-col justify-end items-end h-[300px] w-[300px]">
                        <div class="w-full h-full bg-slate-50 rounded-[4rem] flex items-center justify-center p-8 border border-slate-100 group-hover:scale-105 transition-transform duration-700">
                          <BarChart3 class="text-slate-200 group-hover:text-emerald-500 transition-colors duration-500" size={120} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>

                <Show when={activeTab() === 'global'}>
                  <div class="glass reveal-card p-12 md:p-16 rounded-[3rem] premium-shadow transition-all duration-700 bg-white/80 group cursor-pointer relative overflow-hidden border-indigo-100/30">
                    <div class="flex flex-col md:flex-row justify-between gap-12">
                      <div class="flex-1">
                        <div class="flex items-center gap-4 mb-12">
                          <div class="p-5 bg-indigo-50 rounded-3xl text-indigo-600 group-hover:bg-slate-900 group-hover:text-indigo-400 transition-all duration-500 shadow-sm">
                            <Globe size={32} />
                          </div>
                          <span class="px-4 py-1.5 bg-indigo-100/50 text-indigo-800 rounded-full font-black text-[10px] uppercase tracking-[0.2em] border border-indigo-200/30 shadow-inner">Global Focus</span>
                        </div>
                        <h3 class="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 leading-none text-slate-900">NVIDIA Corp</h3>
                        <p class="text-sm text-slate-400 font-bold tracking-[0.3em] uppercase mb-12 flex items-center gap-3">
                          NASDAQ: NVDA <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Price
                        </p>
                        <div class="flex gap-16">
                          <div>
                            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-4">Allocation</span>
                            <span class="text-4xl font-black tabular-nums tracking-tighter text-slate-900">18.2%</span>
                          </div>
                          <div>
                            <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-4">Total Value</span>
                            <span class="text-4xl font-black tabular-nums tracking-tighter text-slate-900">$ 8,120</span>
                          </div>
                        </div>
                      </div>
                      <div class="hidden md:flex flex-col justify-end items-end h-[300px] w-[300px]">
                        <div class="w-full h-full bg-slate-50 rounded-[4rem] flex items-center justify-center p-8 border border-slate-100 group-hover:scale-105 transition-transform duration-700">
                          <TrendingUp class="text-slate-200 group-hover:text-indigo-500 transition-colors duration-500" size={120} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Show>
              </div>

              {/* Sidebar Staggered Card */}
              <div class="lg:col-span-12 xl:col-span-4 lg:mt-32 xl:mt-64 relative group reveal-card">
                <div class="glass p-10 rounded-[2.5rem] premium-shadow transition-all duration-500 bg-white group cursor-pointer border-slate-100 hover:-translate-y-4">
                  <div class="flex justify-between items-start mb-16">
                    <div class="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                      <TrendingUp size={28} />
                    </div>
                    <span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-100 shadow-sm">+8.4% YTD</span>
                  </div>
                  <h3 class="text-4xl font-black uppercase tracking-tighter mb-1 leading-tight">KCB Group</h3>
                  <p class="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-12 leading-relaxed">Systemic Kenyan Banking <br /> Sector Lead</p>
                  <div class="h-px bg-slate-100 my-8 w-full group-hover:bg-slate-200 transition-colors" />
                  <div class="flex justify-between items-end">
                    <div>
                      <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Value</span>
                      <span class="text-4xl font-black tabular-nums tracking-tighter">KES 2.1M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-slate-900 rounded-3xl p-10 text-white flex flex-col justify-between relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors duration-700" />
              <div>
                <h4 class="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-12">Consolidated Portfolio</h4>
                <div class="space-y-8">
                  <div>
                    <span class="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Total Net Worth</span>
                    <span class="text-5xl font-black tracking-tighter">KES 148.2M</span>
                  </div>
                  <div>
                    <span class="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Monthly Yield (est)</span>
                    <span class="text-3xl font-black tracking-tighter text-emerald-400">KES 840,000</span>
                  </div>
                </div>
              </div>
              <div class="mt-16 space-y-4">
                <div class="flex items-center gap-4 text-sm font-bold text-slate-400 group-hover:text-white transition-colors">
                  <div class="p-2 bg-white/5 rounded-lg"><Smartphone size={16} /></div> M-PESA Express Enabled
                </div>
                <div class="flex items-center gap-4 text-sm font-bold text-slate-400 group-hover:text-white transition-colors">
                  <div class="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><ShieldCheck size={16} /></div> CBK Insured Vaults
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Grid */}
        <section id="ecosystem" class="fp-section bg-white border-y border-slate-50">
          <div class="max-w-7xl mx-auto w-full">
            <h2 class="text-center text-5xl md:text-7xl font-black uppercase tracking-tighter mb-24 max-w-4xl mx-auto leading-[0.85]">
              <RevealText text="Modern Assets." type="chars" stagger={0.03} /> <br />
              <span class="text-slate-200/60"><RevealText text="Borderless Execution." type="chars" stagger={0.03} /></span>
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: 'MMF Treasury', desc: 'Secure local yields exceeding 15% ARR with daily liquidity.', icon: <TrendingUp /> },
                { title: 'Global Equity', desc: 'Direct access to NYSE/LSE indices with 0% brokerage fees.', icon: <Globe /> },
                { title: 'Salary Credit', desc: 'Instant liquidity against your corporate employment history.', icon: <CreditCard /> },
                { title: 'Consultancy', desc: 'Bespoke advisory from CFA-chartered specialists.', icon: <ShieldCheck /> }
              ].map(item => (
                <div class="p-10 rounded-3xl border border-slate-100 hover:border-emerald-500/20 hover:bg-slate-50 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-300 group cursor-pointer bg-white reveal-card">
                  <div class="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-12 group-hover:bg-emerald-600 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-slate-900/20">
                    {item.icon}
                  </div>
                  <h3 class="text-xl font-black uppercase tracking-tight mb-4">{item.title}</h3>
                  <p class="text-sm text-slate-500 font-medium leading-relaxed mb-10">{item.desc}</p>
                  <div class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-emerald-600 transition-colors">
                    Explore Service <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Haiku Blog Integrated as "Market Insights" */}
        <div id="insights-anchor" class="bg-slate-900 pt-32 pb-12 px-6 text-center border-t border-slate-800 relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-8">
            <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live Signal Feed
          </div>
          <h2 class="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white mb-6">Market Insights</h2>
          <p class="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs max-w-md mx-auto">Direct Signal Intelligence from the Vault. Verified Data Only.</p>
        </div>
        <HaikuBlog />

        {/* Trust & Regulatory */}
        <section id="trust" class="fp-section">
          <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

          <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center relative z-10 w-full">
            <div class="vault-content">
              <h2 class="text-6xl md:text-7xl font-black leading-[0.9] tracking-tighter mb-10 text-white mix-blend-difference">Regulated. <br />Locked. <br />Resilient.</h2>
              <p class="text-slate-400 text-lg font-medium mb-12 leading-relaxed max-w-md">
                LipaWealth is fully regulated by the **Capital Markets Authority (CMA)**. Your assets are held in segregated trust accounts with Tier-1 Kenyan custodian banks.
              </p>
              <div class="grid grid-cols-2 gap-6">
                <div class="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <span class="block text-4xl font-black mb-2 text-emerald-400">KES 4.2B+</span>
                  <span class="text-[10px] text-slate-500 font-black uppercase tracking-widest">Managed Assets</span>
                </div>
                <div class="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <span class="block text-4xl font-black mb-2 text-emerald-400">256-bit</span>
                  <span class="text-[10px] text-slate-500 font-black uppercase tracking-widest">AES Encryption</span>
                </div>
              </div>
            </div>

            <div class="glass p-16 rounded-[3rem] shadow-2xl bg-white/5 text-white relative rotate-3 hover:rotate-0 transition-all duration-700 ease-out border border-white/10">
              <div class="absolute -top-6 -right-6 p-6 bg-emerald-600 rounded-3xl text-white shadow-2xl shadow-emerald-500/30">
                <ShieldCheck size={40} />
              </div>
              <h3 class="text-3xl font-black uppercase tracking-tighter mb-8 underline decoration-emerald-500 underline-offset-8">Bank-Grade API</h3>
              <p class="text-slate-400 text-lg leading-relaxed mb-12">
                Our platform integrates directly with the NSE Central Depository (CDSC) and global custodians to ensure T+1 settlement across all currency pairs.
              </p>
              <div class="space-y-6">
                {['Direct M-PESA C2B/B2C hooks', 'CMA Regulatory Oversight', 'Biometric Vault Access'].map(t => (
                  <div class="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                    <div class="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" /> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="bg-slate-950 text-white section-padding border-t border-slate-900">
        <div class="max-w-7xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div class="col-span-2">
              <div class="flex items-center gap-3 mb-10">
                <div class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <div class="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
                <span class="font-black text-2xl tracking-tighter uppercase italic">LipaWealth</span>
              </div>
              <p class="text-slate-500 text-sm max-w-xs mb-10 leading-relaxed font-medium">
                Bridging the gap between Kenyan ambition and global financial markets. Private banking for the next generation.
              </p>
              <div class="flex gap-4">
                <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-500 transition-all cursor-pointer group">
                  <ExternalLink size={16} class="text-slate-400 group-hover:text-white" />
                </div>
              </div>
            </div>
            <div>
              <h4 class="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-8">Ecosystem</h4>
              <ul class="text-xs space-y-5 font-bold text-slate-400">
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> NSE Equities</li>
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> Wall Street Direct</li>
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> Money Markets</li>
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> Salary Advance</li>
              </ul>
            </div>
            <div>
              <h4 class="text-[10px] text-slate-500 font-black uppercase tracking_widest mb-8">Company</h4>
              <ul class="text-xs space-y-5 font-bold text-slate-400">
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> CMA Licenses</li>
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> Risk Policy</li>
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> Partnerships</li>
                <li class="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"><div class="w-1 h-1 bg-slate-700 rounded-full" /> Fees</li>
              </ul>
            </div>
          </div>
          <div class="border-t border-slate-900 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <span class="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] hover:text-slate-400 transition-colors cursor-default">© 2026 LipaWealth Private Banking Group</span>
            <div class="text-[9px] text-slate-700 max-w-sm text-center md:text-right leading-relaxed italic">
              Disclaimer: Investing involves risk. Regulatory oversight provided by the Capital Markets Authority. M-PESA is a registered trademark of Safaricom PLC.
            </div>
          </div>
        </div>
      </footer>
      <ToastContainer />
    </div >
  );
};

export default App;
