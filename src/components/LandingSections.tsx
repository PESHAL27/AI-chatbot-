import React from 'react';
import { 
  Globe, 
  FileText, 
  Brain, 
  Image as ImageIcon, 
  Calculator, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Cpu, 
  Check, 
  GraduationCap, 
  Code2, 
  Microscope, 
  Briefcase, 
  Palette,
  Zap
} from 'lucide-react';

interface LandingSectionsProps {
  onStartChat: (initialPrompt?: string) => void;
  onOpenDocuments: () => void;
  onOpenMemory: () => void;
  onOpenAuth: () => void;
}

export const LandingSections: React.FC<LandingSectionsProps> = ({
  onStartChat,
  onOpenDocuments,
  onOpenMemory,
  onOpenAuth,
}) => {
  return (
    <div className="w-full relative z-10 select-none text-left">
      {/* =========================================================================
          1. PRODUCT SHOWCASE SECTION ("AI that works the way you do")
          ========================================================================= */}
      <section id="about-section" className="py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.05)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading, Description & CTA */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a180b] border border-[rgba(180,255,100,0.25)] text-xs font-semibold text-[#9CFF45]">
              <Sparkles className="w-3.5 h-3.5 text-[#9CFF45]" />
              <span>THE PML WORKSPACE</span>
            </div>

            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              A smarter way to work with AI.
            </h2>

            <p className="text-base text-[#A8B0A5] leading-relaxed">
              PML blends real-time web intelligence, deep document vector search, mathematical verification, and cross-session memory into a single frictionless dashboard.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Instant access to real-time web facts & encyclopedia knowledge',
                'Deep document reasoning across PDF, DOCX, and text datasets',
                'Long-term personal memory tailored to your workflow',
                'Autonomous multi-tool decision routing and execution'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-[#A8B0A5]">
                  <div className="w-5 h-5 rounded-full bg-[#122814] border border-[rgba(180,255,100,0.3)] flex items-center justify-center text-[#9CFF45] flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={() => onStartChat()}
                className="btn-lime px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(156,255,69,0.3)]"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenDocuments}
                className="btn-glass px-5 py-3 rounded-full text-sm font-medium cursor-pointer"
              >
                Document Library
              </button>
            </div>
          </div>

          {/* Right Column: Desktop Workspace Dashboard Preview */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl p-1 bg-gradient-to-b from-[rgba(180,255,100,0.25)] via-[rgba(180,255,100,0.08)] to-transparent shadow-2xl">
              <div className="rounded-xl bg-[#071007] border border-[rgba(180,255,100,0.15)] overflow-hidden">
                {/* Simulated Window Top Bar */}
                <div className="h-10 px-4 bg-[#0a180b] border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="px-3 py-0.5 rounded-md bg-black/40 border border-white/5 text-[11px] font-mono text-[#A8B0A5]">
                    pml.ai/workspace
                  </div>
                  <div className="w-12" />
                </div>

                {/* Dashboard Inner Canvas */}
                <div className="p-6 grid grid-cols-12 gap-6 min-h-[380px]">
                  {/* Mini Sidebar */}
                  <div className="col-span-4 border-r border-white/5 pr-4 space-y-4 hidden sm:block">
                    <button 
                      onClick={() => onStartChat()}
                      className="w-full py-2 px-3 rounded-xl bg-[#9CFF45] text-[#050805] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ New Chat</span>
                    </button>

                    <div className="space-y-1 text-xs text-[#A8B0A5]">
                      <div className="px-2 py-1.5 rounded-lg bg-white/5 text-white font-medium flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-[#9CFF45]" />
                        <span>Recent Conversations</span>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-white/5 truncate">Research: Quantum Algorithms</div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-white/5 truncate">Analysis: Q3 Market Report.pdf</div>
                      <div className="px-2 py-1.5 rounded-lg hover:bg-white/5 truncate">Math: Linear Optimization</div>
                    </div>
                  </div>

                  {/* Mini Main Panel */}
                  <div className="col-span-12 sm:col-span-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#9CFF45] uppercase">Live AI Session</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">Active</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#A8B0A5]">
                        <span className="text-white font-semibold block mb-1">User:</span>
                        Search the web for James Webb Space Telescope discoveries and calculate distances.
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d200f]/80 border border-[rgba(180,255,100,0.2)] text-xs text-white">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#122814] text-[#9CFF45] text-[10px] font-semibold mb-2">
                          <Globe className="w-3 h-3" /> Web Search + Calculator Tools Executed
                        </div>
                        <p className="text-[#A8B0A5] leading-relaxed">
                          NASA's JWST recently identified 6 massive candidate galaxies dated 500-700 million years after the Big Bang, located approximately 13.1 billion light years away...
                        </p>
                      </div>
                    </div>

                    {/* Simulated Input Console */}
                    <div className="p-2.5 rounded-full bg-[#0a180b] border border-[rgba(180,255,100,0.25)] flex items-center justify-between text-xs">
                      <span className="text-[#758072] px-2">Ask PML anything...</span>
                      <button 
                        onClick={() => onStartChat()}
                        className="p-1.5 rounded-full bg-[#9CFF45] text-[#050805] cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. INTELLIGENT ROUTER VISUAL DIAGRAM
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a180b] border border-[rgba(180,255,100,0.25)] text-xs font-semibold text-[#9CFF45] mb-4">
            <Cpu className="w-3.5 h-3.5 text-[#9CFF45]" />
            <span>NEURAL ORCHESTRATION</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight mb-4">
            Intelligent Autonomous Routing
          </h2>
          <p className="text-base text-[#A8B0A5]">
            PML dynamically evaluates every user prompt and dispatches queries to the exact specialized tool needed for verified accuracy.
          </p>
        </div>

        {/* Product Architecture Diagram */}
        <div className="relative max-w-4xl mx-auto p-8 rounded-3xl bg-[#071007]/80 border border-[rgba(180,255,100,0.15)] shadow-2xl backdrop-blur-xl">
          {/* Subtle connecting lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-[80%] h-[80%] rounded-full border border-dashed border-[rgba(180,255,100,0.2)] animate-spin-slow" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Top Node Row */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 w-full mb-8 text-center">
              <div className="p-3.5 rounded-2xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] flex flex-col items-center">
                <Globe className="w-5 h-5 text-[#9CFF45] mb-1.5" />
                <span className="text-xs font-bold text-white">Web Search</span>
                <span className="text-[10px] text-[#A8B0A5]">Live Web & News</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] flex flex-col items-center">
                <FileText className="w-5 h-5 text-[#9CFF45] mb-1.5" />
                <span className="text-xs font-bold text-white">Document RAG</span>
                <span className="text-[10px] text-[#A8B0A5]">PDF/DOCX Vectors</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] flex flex-col items-center">
                <BookOpen className="w-5 h-5 text-[#9CFF45] mb-1.5" />
                <span className="text-xs font-bold text-white">Wikipedia</span>
                <span className="text-[10px] text-[#A8B0A5]">Encyclopedia</span>
              </div>
            </div>

            {/* Central PML Core Hub */}
            <div className="my-2 p-6 rounded-3xl bg-[#0d2210] border-2 border-[#9CFF45] shadow-[0_0_40px_rgba(156,255,69,0.25)] flex flex-col items-center max-w-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#9CFF45] text-[#050805] flex items-center justify-center font-black text-lg mb-2 shadow-md">
                PML
              </div>
              <h3 className="font-bold text-base text-white">PML AI CORE</h3>
              <p className="text-xs text-[#A8B0A5] mt-1">Autonomous Multi-Agent Routing Engine</p>
            </div>

            {/* Bottom Node Row */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 w-full mt-8 text-center">
              <div className="p-3.5 rounded-2xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] flex flex-col items-center">
                <Brain className="w-5 h-5 text-[#9CFF45] mb-1.5" />
                <span className="text-xs font-bold text-white">Memory</span>
                <span className="text-[10px] text-[#A8B0A5]">Persistent Storage</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] flex flex-col items-center">
                <ImageIcon className="w-5 h-5 text-[#9CFF45] mb-1.5" />
                <span className="text-xs font-bold text-white">Vision</span>
                <span className="text-[10px] text-[#A8B0A5]">Visual Inspection</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] flex flex-col items-center">
                <Calculator className="w-5 h-5 text-[#9CFF45] mb-1.5" />
                <span className="text-xs font-bold text-white">Calculator</span>
                <span className="text-[10px] text-[#A8B0A5]">Python Code Math</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. USE CASES SECTION ("One AI. Many possibilities.")
          ========================================================================= */}
      <section id="use-cases-section" className="py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a180b] border border-[rgba(180,255,100,0.25)] text-xs font-semibold text-[#9CFF45] mb-4">
            <Zap className="w-3.5 h-3.5 text-[#9CFF45]" />
            <span>VERSATILE CAPABILITIES</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight mb-4">
            One AI. Many possibilities.
          </h2>
          <p className="text-base text-[#A8B0A5]">
            Tailored solutions for every discipline, from academic research to production codebases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              icon: <GraduationCap className="w-6 h-6 text-[#9CFF45]" />,
              title: 'Students',
              desc: 'Master complex course material, solve mathematical proofs, and cite academic papers effortlessly.'
            },
            {
              icon: <Code2 className="w-6 h-6 text-[#9CFF45]" />,
              title: 'Developers',
              desc: 'Debug stack traces, architect microservices, and inspect code screenshots directly.'
            },
            {
              icon: <Microscope className="w-6 h-6 text-[#9CFF45]" />,
              title: 'Researchers',
              desc: 'Query extensive PDF libraries via vector RAG, synthesize journals, and extract verified data.'
            },
            {
              icon: <Briefcase className="w-6 h-6 text-[#9CFF45]" />,
              title: 'Professionals',
              desc: 'Summarize complex contracts, analyze financial reports, and maintain contextual project memory.'
            },
            {
              icon: <Palette className="w-6 h-6 text-[#9CFF45]" />,
              title: 'Creators',
              desc: 'Brainstorm storylines, refine creative copy, and transform unstructured thoughts into polished output.'
            }
          ].map((uc, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#0a180b]/80 border border-[rgba(180,255,100,0.12)] hover:border-[rgba(180,255,100,0.3)] transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#0f2412] border border-[rgba(180,255,100,0.2)] flex items-center justify-center mb-4">
                  {uc.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{uc.title}</h3>
                <p className="text-xs text-[#A8B0A5] leading-relaxed">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          4. HOW PML WORKS (01 Ask, 02 PML Understands, 03 Get Results)
          ========================================================================= */}
      <section id="how-it-works-section" className="py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a180b] border border-[rgba(180,255,100,0.25)] text-xs font-semibold text-[#9CFF45] mb-4">
            <span>SIMPLE WORKFLOW</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight mb-4">
            How PML Works
          </h2>
          <p className="text-base text-[#A8B0A5]">
            Three seamless steps from your initial question to verified intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Ask',
              desc: 'Ask PML anything via text, voice speech, or upload documents and screenshots.'
            },
            {
              step: '02',
              title: 'PML Understands',
              desc: 'The autonomous router identifies intent and triggers web search, memory, RAG, or calculators.'
            },
            {
              step: '03',
              title: 'Get Results',
              desc: 'Receive comprehensive, mathematically verified, and sourced answers in real time.'
            }
          ].map((st, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-[#071007] border border-[rgba(180,255,100,0.15)] relative">
              <span className="text-4xl font-display font-black text-[#9CFF45]/30 block mb-4">
                {st.step}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{st.title}</h3>
              <p className="text-sm text-[#A8B0A5] leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. PRICING SECTION
          ========================================================================= */}
      <section id="pricing-section" className="py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a180b] border border-[rgba(180,255,100,0.25)] text-xs font-semibold text-[#9CFF45] mb-4">
            <span>PLANS & PRICING</span>
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight mb-4">
            Predictable intelligence for everyone
          </h2>
          <p className="text-base text-[#A8B0A5]">
            Start free with full core access or upgrade for unlimited high-capacity document RAG.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-[#0a180b]/70 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Starter</h3>
              <p className="text-xs text-[#A8B0A5] mb-6">For casual exploration and daily questions.</p>
              <div className="text-4xl font-display font-black text-white mb-6">$0 <span className="text-xs font-normal text-[#A8B0A5]">/ forever</span></div>
              <ul className="space-y-3 text-xs text-[#A8B0A5] mb-8">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Standard AI Reasoning</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Live Web & Wikipedia Search</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> 5 Document Vector Uploads</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Long-Term Context Memory</li>
              </ul>
            </div>
            <button
              onClick={() => onStartChat()}
              className="w-full py-3 rounded-full btn-glass text-xs font-semibold cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier (Highlighted) */}
          <div className="p-8 rounded-3xl bg-[#0d2210] border-2 border-[#9CFF45] shadow-[0_0_35px_rgba(156,255,69,0.2)] relative flex flex-col justify-between">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#9CFF45] text-[#050805] text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Pro Intelligence</h3>
              <p className="text-xs text-[#A8B0A5] mb-6">For researchers, developers & professionals.</p>
              <div className="text-4xl font-display font-black text-white mb-6">$20 <span className="text-xs font-normal text-[#A8B0A5]">/ month</span></div>
              <ul className="space-y-3 text-xs text-white mb-8">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Unlimited High-Speed AI Queries</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> High-Capacity Document Vector Search</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Deep Mathematical Verification Engine</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Unlimited Cross-Session Memory</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Priority Multi-Modal Vision Processing</li>
              </ul>
            </div>
            <button
              onClick={() => onOpenAuth()}
              className="w-full py-3 rounded-full btn-lime text-xs font-semibold cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.3)]"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="p-8 rounded-3xl bg-[#0a180b]/70 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Enterprise</h3>
              <p className="text-xs text-[#A8B0A5] mb-6">Dedicated deployment and customized models.</p>
              <div className="text-4xl font-display font-black text-white mb-6">Custom</div>
              <ul className="space-y-3 text-xs text-[#A8B0A5] mb-8">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Dedicated Enterprise VPC & Endpoints</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> Custom Document Vector Connectors</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> SOC-2 / HIPAA Level Compliance</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#9CFF45]" /> 24/7 Dedicated Support SLA</li>
              </ul>
            </div>
            <button
              onClick={() => onOpenAuth()}
              className="w-full py-3 rounded-full btn-glass text-xs font-semibold cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. FINAL CTA SECTION ("Ready to think smarter?")
          ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.05)]">
        <div className="relative rounded-3xl p-12 sm:p-16 bg-gradient-to-b from-[#0e2412] to-[#060c07] border border-[rgba(180,255,100,0.25)] text-center overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[rgba(156,255,69,0.12)] blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="font-display font-black text-4xl sm:text-6xl text-white tracking-tight">
              Ready to think smarter?
            </h2>
            <p className="text-base sm:text-lg text-[#A8B0A5]">
              Experience a more intelligent way to work, learn and create with PML.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => onStartChat()}
                className="btn-lime px-8 py-3.5 rounded-full text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(156,255,69,0.4)]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenDocuments}
                className="btn-glass px-6 py-3.5 rounded-full text-sm font-medium cursor-pointer"
              >
                Explore PML
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PROFESSIONAL FOOTER
          ========================================================================= */}
      <footer className="py-16 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto border-t border-[rgba(255,255,255,0.06)] text-xs text-[#A8B0A5]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-6 h-6 text-[#9CFF45] fill-current">
                  <circle cx="16" cy="16" r="3.2" fill="#9CFF45" />
                  <circle cx="16" cy="6" r="2.2" fill="#9CFF45" opacity="0.9" />
                  <circle cx="16" cy="26" r="2.2" fill="#9CFF45" opacity="0.9" />
                  <circle cx="6" cy="16" r="2.2" fill="#9CFF45" opacity="0.9" />
                  <circle cx="26" cy="16" r="2.2" fill="#9CFF45" opacity="0.9" />
                  <circle cx="9" cy="9" r="1.8" fill="#9CFF45" opacity="0.75" />
                  <circle cx="23" cy="9" r="1.8" fill="#9CFF45" opacity="0.75" />
                  <circle cx="9" cy="23" r="1.8" fill="#9CFF45" opacity="0.75" />
                  <circle cx="23" cy="23" r="1.8" fill="#9CFF45" opacity="0.75" />
                </svg>
              </div>
              <span className="text-xl font-black text-white tracking-tight">PML</span>
            </div>
            <p className="text-sm text-[#A8B0A5] max-w-xs">
              Your intelligent AI assistant to explore ideas, analyze documents, search the web, and get things done.
            </p>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-2">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-2">Product</div>
            <div><button onClick={() => onStartChat()} className="hover:text-white cursor-pointer">AI Workspace</button></div>
            <div><button onClick={onOpenDocuments} className="hover:text-white cursor-pointer">Document RAG</button></div>
            <div><button onClick={onOpenMemory} className="hover:text-white cursor-pointer">Memory Engine</button></div>
            <div><a href="#features-section" className="hover:text-white">Web Search</a></div>
            <div><a href="#pricing-section" className="hover:text-white">Pricing</a></div>
          </div>

          {/* Col 3: Resources */}
          <div className="space-y-2">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-2">Resources</div>
            <div><a href="#how-it-works-section" className="hover:text-white">Documentation</a></div>
            <div><a href="#about-section" className="hover:text-white">Architecture</a></div>
            <div><a href="#use-cases-section" className="hover:text-white">Use Cases</a></div>
            <div><a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="hover:text-white">FastAPI Swagger</a></div>
          </div>

          {/* Col 4: Company */}
          <div className="space-y-2">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-2">Company</div>
            <div><a href="#about-section" className="hover:text-white">About Us</a></div>
            <div><a href="#pricing-section" className="hover:text-white">Security</a></div>
            <div><a href="#about-section" className="hover:text-white">Privacy Policy</a></div>
            <div><a href="#about-section" className="hover:text-white">Terms of Service</a></div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 PML AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
