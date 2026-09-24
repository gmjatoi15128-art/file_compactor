import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Download,
  EyeOff,
  FileArchive,
  FileText,
  HardDriveDownload,
  Image as ImageIcon,
  Info,
  LockKeyhole,
  Mail,
  Menu,
  MousePointer2,
  PackageCheck,
  Presentation,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Trash2,
  UploadCloud,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import logoSrc from '@assets/6cb2cce7-25c2-4adc-809c-da788b55df69_1790148775765.png';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { compressImageFile, type FileCompressionResult } from '@/lib/compression';
import { compressOfficeFile, compressPdfFile } from '@/lib/document-compression';

const queryClient = new QueryClient();
const MAX_FILE_SIZE = 25 * 1024 * 1024;

type ToolSlug = 'pdf' | 'jpg' | 'png' | 'webp' | 'docx' | 'pptx' | 'xlsx';
type Goal = 'quality' | 'balanced' | 'smallest' | 'target';
type ProcessorResult = FileCompressionResult;
type Processor = (file: File, goal: Goal, targetSize?: number) => Promise<ProcessorResult>;

const toolConfigs: Record<ToolSlug, {
  slug: ToolSlug;
  name: string;
  format: string;
  description: string;
  accept: string;
  extensions: string[];
  icon: LucideIcon;
  tone: string;
  available: boolean;
}> = {
  pdf: { slug: 'pdf', name: 'PDF compressor', format: 'PDF', description: 'Make documents lighter to email, upload, and store without the technical guesswork.', accept: '.pdf,application/pdf', extensions: ['PDF'], icon: FileText, tone: 'rose', available: true },
  jpg: { slug: 'jpg', name: 'JPG compressor', format: 'JPG / JPEG', description: 'Reduce photo file size while keeping the details that matter.', accept: '.jpg,.jpeg,image/jpeg', extensions: ['JPG', 'JPEG'], icon: ImageIcon, tone: 'amber', available: true },
  png: { slug: 'png', name: 'PNG compressor', format: 'PNG', description: 'Trim the weight of screenshots, graphics, and transparent images.', accept: '.png,image/png', extensions: ['PNG'], icon: ImageIcon, tone: 'sky', available: true },
  webp: { slug: 'webp', name: 'WebP compressor', format: 'WebP', description: 'Prepare modern web images that load quickly and stay crisp.', accept: '.webp,image/webp', extensions: ['WEBP'], icon: ImageIcon, tone: 'violet', available: true },
  docx: { slug: 'docx', name: 'DOCX compressor', format: 'Word document', description: 'A focused place for lighter Word files, with no settings maze.', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['DOCX'], icon: FileText, tone: 'blue', available: true },
  pptx: { slug: 'pptx', name: 'PPTX compressor', format: 'PowerPoint presentation', description: 'Get presentations ready to send when every megabyte counts.', accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['PPTX'], icon: Presentation, tone: 'orange', available: true },
  xlsx: { slug: 'xlsx', name: 'XLSX compressor', format: 'Excel workbook', description: 'Make workbooks easier to move around while keeping the file intact.', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['XLSX'], icon: Table2, tone: 'emerald', available: true },
};

const routeForExtension: Record<string, string> = {
  pdf: '/compress-pdf', jpg: '/compress-jpg', jpeg: '/compress-jpg', png: '/compress-png',
  webp: '/compress-webp', docx: '/compress-docx', pptx: '/compress-pptx', xlsx: '/compress-xlsx',
};

const processors: Partial<Record<ToolSlug, Processor>> = {
  pdf: (file, goal, targetSize) => compressPdfFile(file, goal, targetSize),
  jpg: (file, goal, targetSize) => compressImageFile(file, 'jpg', goal, targetSize),
  png: (file, goal, targetSize) => compressImageFile(file, 'png', goal, targetSize),
  webp: (file, goal, targetSize) => compressImageFile(file, 'webp', goal, targetSize),
  docx: (file, goal, targetSize) => compressOfficeFile(file, goal, targetSize),
  pptx: (file, goal, targetSize) => compressOfficeFile(file, goal, targetSize),
  xlsx: (file, goal, targetSize) => compressOfficeFile(file, goal, targetSize),
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function Logo({ inverted = false }: { inverted?: boolean }) {
  return <Link href="/" aria-label="File Compactor home" className="logo-lockup focus-ring shrink-0" data-testid="link-logo">
    <span className="logo-mark" aria-hidden="true"><img src={logoSrc} alt="" /></span>
    <span className={`logo-wordmark ${inverted ? 'logo-wordmark-inverted' : ''}`}><span>File</span> <span>Compactor</span></span>
  </Link>;
}

function Header() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location]);
  const links = [
    { href: '/tools', label: 'Tools' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/privacy', label: 'Privacy' },
  ];
  return <header className="sticky top-0 z-40 border-b border-[hsl(var(--border)/.75)] bg-[hsl(var(--background)/.92)] backdrop-blur-md">
    <div className="container-narrow flex h-[70px] items-center justify-between">
      <Logo />
      <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
        {links.map((link) => <Link key={link.href} href={link.href} data-testid={`link-nav-${link.label.toLowerCase().replaceAll(' ', '-')}`} className={`focus-ring text-sm font-semibold transition-colors hover:text-[hsl(var(--primary))] ${location === link.href ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{link.label}</Link>)}
        <Link href="/compress-jpg" data-testid="link-nav-compress" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--background))] transition-transform hover:-translate-y-0.5">Compress a file <ArrowRight size={15} /></Link>
      </nav>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation menu" data-testid="button-mobile-menu" className="focus-ring rounded-lg p-2 md:hidden">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
    </div>
    {open && <nav className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-4 md:hidden" aria-label="Mobile navigation">
      <div className="container-narrow flex flex-col gap-1">
        {links.map((link) => <Link key={link.href} href={link.href} data-testid={`link-mobile-${link.label.toLowerCase().replaceAll(' ', '-')}`} className="focus-ring rounded-lg px-3 py-3 text-sm font-semibold">{link.label}</Link>)}
        <Link href="/compress-jpg" data-testid="link-mobile-compress" className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Compress a file <ArrowRight size={15} /></Link>
      </div>
    </nav>}
  </header>;
}

function Footer() {
  return <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
    <div className="container-narrow grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
         <div className="mb-4"><Logo inverted /></div>
        <p className="max-w-[260px] text-sm leading-6 text-[hsl(var(--background)/.62)]">A quieter way to make files smaller. Built for the moment you just need it to work.</p>
        <p className="mt-7 font-mono text-[10px] uppercase tracking-[.15em] text-[hsl(var(--background)/.4)]">Made for the web · 2024</p>
      </div>
      <FooterColumn title="Compress" links={[['JPG', '/compress-jpg'], ['PNG', '/compress-png'], ['WebP', '/compress-webp'], ['PDF', '/compress-pdf']]} />
      <FooterColumn title="Explore" links={[['All tools', '/tools'], ['How it works', '/how-it-works'], ['About', '/about'], ['Contact', '/contact']]} />
      <FooterColumn title="Read the fine print" links={[['Privacy', '/privacy'], ['Terms', '/terms']]} />
    </div>
    <div className="border-t border-[hsl(var(--background)/.12)] py-5">
      <div className="container-narrow flex flex-col gap-2 text-xs text-[hsl(var(--background)/.45)] sm:flex-row sm:items-center sm:justify-between">
        <span>File Compactor is a focused utility, not a file archive.</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole size={12} /> Your files stay in your browser when browser-side processing is available.</span>
      </div>
    </div>
  </footer>;
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return <div><p className="eyebrow mb-4 text-[hsl(var(--background)/.42)]">{title}</p><div className="flex flex-col gap-3">{links.map(([label, href]) => <Link key={href} href={href} data-testid={`link-footer-${label.toLowerCase().replaceAll(' ', '-')}`} className="w-fit text-sm text-[hsl(var(--background)/.78)] transition-colors hover:text-[hsl(var(--primary))]">{label}</Link>)}</div></div>;
}

function Shell({ children }: { children: ReactNode }) {
  return <><Header /><main>{children}</main><Footer /></>;
}

function SectionHeading({ eyebrow, title, body, align = 'left' }: { eyebrow: string; title: string; body?: string; align?: 'left' | 'center' }) {
  return <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
    <p className="eyebrow mb-4 text-[hsl(var(--primary))]">{eyebrow}</p>
    <h2 className="display-font text-3xl font-extrabold leading-[1.04] tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">{title}</h2>
    {body && <p className="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">{body}</p>}
  </div>;
}

function QuickUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [goal, setGoal] = useState<Goal>('balanced');
  const [targetSize, setTargetSize] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<FileCompressionResult | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const config = file ? toolConfigs[(file.name.split('.').pop()?.toLowerCase() === 'jpeg' ? 'jpg' : file.name.split('.').pop()?.toLowerCase()) as ToolSlug] : undefined;
  useEffect(() => {
    if (!result) {
      setResultUrl('');
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);
  const choose = (candidate?: File) => {
    if (!candidate) return;
    if (candidate.size > MAX_FILE_SIZE) {
      setError('This file is larger than the current 25 MB limit.');
      setFile(null);
      return;
    }
    const extension = candidate.name.split('.').pop()?.toLowerCase() ?? '';
    if (!routeForExtension[extension]) {
      setError('That format is not supported yet. Choose a PDF, image, or Office file.');
      setFile(null);
      return;
    }
    setError('');
    setFile(candidate);
    setGoal('balanced');
    setTargetSize('');
    setResult(null);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); };
  const processFile = async () => {
    if (!file || !config) return;
    const processor = processors[config.slug];
    if (!processor) return;
    setError('');
    setProcessing(true);
    try {
      setResult(await processor(file, goal, goal === 'target' ? Number(targetSize) : undefined));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The file could not be processed.');
    } finally {
      setProcessing(false);
    }
  };
  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setGoal('balanced');
    setTargetSize('');
    if (inputRef.current) inputRef.current.value = '';
  };
  const goals = [
    { id: 'quality' as Goal, label: 'Best quality', text: 'Preserve detail first', icon: Sparkles },
    { id: 'balanced' as Goal, label: 'Balanced', text: 'A sensible middle ground', icon: SlidersHorizontal },
    { id: 'smallest' as Goal, label: 'Smallest possible', text: 'Prioritize a lighter file', icon: HardDriveDownload },
    { id: 'target' as Goal, label: 'Target size', text: 'Aim for a specific size', icon: ScanLine },
  ];
  return <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-[var(--shadow-lg)]">
    <input ref={inputRef} type="file" className="sr-only" accept={Object.keys(routeForExtension).map((ext) => `.${ext}`).join(',')} onChange={(event) => choose(event.target.files?.[0])} data-testid="input-home-file" />
    {!file ? <div
      role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
      data-testid="dropzone-home" className={`focus-ring flex min-h-[278px] flex-col items-center justify-center rounded-[21px] border-2 border-dashed px-5 py-10 text-center transition-colors ${dragging ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)]'}`}>
      <div className="float-soft mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[hsl(var(--foreground))] text-[hsl(var(--primary))] shadow-[var(--shadow-md)]"><UploadCloud size={29} strokeWidth={1.8} /></div>
      <p className="text-lg font-bold">Drop a file here</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">or <span className="font-bold text-[hsl(var(--primary))]">browse your device</span></p>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground)/.75)]">PDF · JPG · PNG · WEBP · DOCX · PPTX · XLSX</p>
    </div> : <div className="rounded-[21px] bg-[hsl(var(--background)/.55)] px-4 py-7 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><Check size={25} /></div>
      <p className="truncate text-lg font-bold" data-testid="text-home-file-name">{file.name}</p>
      <p className="mt-1 font-mono text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-home-file-size">{formatBytes(file.size)} · {config?.format} · ready</p>
      <div className="mx-auto mt-6 grid max-w-sm gap-2 text-left">
        {goals.map(({ id, label, text, icon: GoalIcon }) => <button key={id} type="button" onClick={() => { setGoal(id); setResult(null); }} data-testid={`button-home-goal-${id}`} className={`focus-ring flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${goal === id ? 'border-[hsl(var(--primary)/.55)] bg-[hsl(var(--accent))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${goal === id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}><GoalIcon size={15} /></span><span><strong className="block text-xs">{label}</strong><span className="block text-[10px] text-[hsl(var(--muted-foreground))]">{text}</span></span>{goal === id && <Check size={15} className="ml-auto text-[hsl(var(--primary))]" />}</button>)}
      </div>
      {goal === 'target' && <label className="mx-auto mt-3 block max-w-sm text-left"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Target size in MB</span><input type="number" min="0.01" step="0.01" value={targetSize} onChange={(event) => { setTargetSize(event.target.value); setResult(null); }} placeholder="e.g. 2" data-testid="input-home-target-size" className="focus-ring w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm" /></label>}
      <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" disabled={processing} onClick={processFile} data-testid="button-home-process" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50">{processing ? 'Compressing…' : 'Compress file'} <ArrowRight size={15} /></button><button type="button" disabled={processing} onClick={reset} data-testid="button-home-clear" className="focus-ring rounded-full border border-[hsl(var(--border))] px-4 py-3 text-sm font-semibold">Choose another</button></div>
      {result && <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--accent))] p-4 text-left" data-testid="status-home-result"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">Compression complete</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{result.verified ? 'Output verified' : 'Verification unavailable'} · {result.qualityLabel}</p></div><a href={resultUrl} download={result.fileName} data-testid="button-home-download" className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Download size={14} /> Download</a></div><div className="mt-3 grid grid-cols-3 gap-2 border-t border-[hsl(var(--primary)/.16)] pt-3 text-[10px]"><div><span className="block text-[hsl(var(--muted-foreground))]">Original</span><strong className="mt-1 block font-mono">{formatBytes(result.originalSize)}</strong></div><div><span className="block text-[hsl(var(--muted-foreground))]">Result</span><strong className="mt-1 block font-mono">{formatBytes(result.size)}</strong></div><div><span className="block text-[hsl(var(--muted-foreground))]">Saved</span><strong className="mt-1 block font-mono">{result.savedPercent.toFixed(1)}%</strong></div></div><p className="mt-3 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{result.dimensions}{result.notice ? ` · ${result.notice}` : ''}</p></div>}
    </div>}
    {error && <div role="alert" className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="alert-home-upload"><AlertCircle size={15} /> {error}</div>}
  </div>;
}

function Home() {
  useDocumentMeta('File Compactor — smaller files, without the fuss', 'A clear, privacy-conscious way to compress everyday files in your browser.');
  return <Shell>
    <section className="paper-grid relative overflow-hidden border-b border-[hsl(var(--border))]">
      <div className="container-narrow grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1fr_480px] lg:gap-20 lg:pb-28 lg:pt-24">
        <div className="animate-rise">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> A calmer file utility</div>
          <h1 className="display-font max-w-[650px] text-[clamp(3.15rem,7vw,6.3rem)] font-extrabold leading-[.91] text-[hsl(var(--foreground))]">Smaller files.<br /><span className="text-[hsl(var(--primary))]">No small print.</span></h1>
          <p className="mt-7 max-w-[480px] text-lg leading-8 text-[hsl(var(--muted-foreground))]">Compress the files you need, choose how far to go, and keep the process close. No account, no settings maze, no mystery upload.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[hsl(var(--primary))]" /> Privacy-minded by design</span><span className="inline-flex items-center gap-2"><Zap size={16} className="text-[hsl(var(--primary))]" /> Built for quick wins</span></div>
        </div>
        <div className="animate-rise-delay"><QuickUpload /><p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">Start with one file. There is nothing to install.</p></div>
      </div>
      <div className="pointer-events-none absolute -bottom-12 -right-8 hidden h-56 w-56 rounded-full border-[20px] border-[hsl(var(--primary)/.08)] lg:block" />
    </section>
    <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]"><div className="container-narrow flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-5 text-xs font-bold text-[hsl(var(--muted-foreground))] sm:justify-between"><span className="eyebrow text-[hsl(var(--muted-foreground)/.8)]">Supported today</span>{['PDF', 'JPG / JPEG', 'PNG', 'WEBP', 'DOCX', 'PPTX', 'XLSX'].map((item) => <span key={item} className="font-mono text-[11px] tracking-wide">{item}</span>)}</div></section>
    <section className="container-narrow grid gap-12 py-24 lg:grid-cols-[.8fr_1.2fr] lg:py-32">
      <SectionHeading eyebrow="Why File Compactor" title="The useful middle ground between “send it” and “why is this so big?”" body="The best file tools disappear into the task. We keep the choices legible and the boundaries honest, so you can get on with your day." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Benefit icon={LockKeyhole} title="Private by default" text="When browser-side processing is available, the file stays in your tab instead of taking a detour through a server." />
        <Benefit icon={SlidersHorizontal} title="A choice that means something" text="Pick quality, balance, a smaller file, or a target size—without needing to know a codec from a container." />
        <Benefit icon={Clock3} title="No ceremony" text="No account, queue, or dashboard. Just the file in front of you and a clear next step." />
        <Benefit icon={EyeOff} title="No invented results" text="We only show a result when a real processor has produced one. No made-up percentages, ever." />
      </div>
    </section>
    <section className="bg-[hsl(var(--foreground))] py-24 text-[hsl(var(--background))]"><div className="container-narrow"><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><SectionHeading eyebrow="Pick a tool" title="A small set of tools, kept sharp." body="Start with the format you have. Each compressor has the same calm workflow." /><Link href="/tools" data-testid="link-home-all-tools" className="focus-ring inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--background)/.25)] px-4 py-2.5 text-sm font-bold transition-colors hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]">View all tools <ArrowRight size={15} /></Link></div><div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{(Object.values(toolConfigs).slice(0, 4)).map((tool) => <ToolCard key={tool.slug} tool={tool} dark />)}</div></div></section>
    <section className="container-narrow grid gap-12 py-24 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-32"><div><SectionHeading eyebrow="How it works" title="Three clear steps. Then you are done." body="File Compactor keeps the interface out of the way, while leaving you in control of the one decision that matters: what should the result prioritize?" /><Link href="/how-it-works" data-testid="link-home-how-it-works" className="focus-ring mt-7 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">See the full workflow <ArrowRight size={16} /></Link></div><div className="space-y-3"><Step number="01" icon={MousePointer2} title="Choose your file" text="Drop it in or browse your device. We check the format before you go any further." /><Step number="02" icon={SlidersHorizontal} title="Set your goal" text="Choose Best quality, Balanced, Smallest possible, or tell us a target size." /><Step number="03" icon={PackageCheck} title="Take the result" text="Download only after a real processor has finished. If a tool is not ready, we tell you plainly." /></div></section>
    <FAQ />
    <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--accent))] py-20"><div className="container-narrow flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center"><div><p className="eyebrow mb-3 text-[hsl(var(--accent-foreground))]">Ready when you are</p><h2 className="display-font max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">Give that oversized file a little breathing room.</h2></div><Link href="/tools" data-testid="link-home-cta" className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--background))] transition-transform hover:-translate-y-0.5">Browse compressors <ArrowRight size={16} /></Link></div></section>
  </Shell>;
}

function Benefit({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-transform hover:-translate-y-1"><Icon size={20} className="mb-8 text-[hsl(var(--primary))]" /><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>;
}

function Step({ number, icon: Icon, title, text }: { number: string; icon: LucideIcon; title: string; text: string }) {
  return <div className="group flex gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-colors hover:border-[hsl(var(--primary)/.45)]"><span className="font-mono text-xs text-[hsl(var(--primary))]">{number}</span><div className="flex-1"><div className="flex items-center gap-2"><Icon size={17} className="text-[hsl(var(--primary))]" /><h3 className="font-bold">{title}</h3></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div><ArrowDownRight size={16} className="mt-1 text-[hsl(var(--muted-foreground)/.45)] transition-transform group-hover:translate-x-1 group-hover:translate-y-1" /></div>;
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const questions = [
    ['Do I need to upload my file to use File Compactor?', 'For tools with browser-side processing, no. The file can be read and processed in your browser. Tools still in preparation will not claim to process or upload your file.'],
    ['What does “Target size” do?', 'It gives a future processor a concrete size to aim for. If the available processor cannot meet the target without unacceptable quality loss, it should say so rather than quietly inventing a result.'],
    ['Will compression always make a file smaller?', 'Not always. Some files are already optimized, and some formats do not have useful browser-side compression yet. File Compactor will only show a result after a real comparison.'],
    ['Do you keep my files?', 'Browser-side tools are designed to keep file bytes in your browser. We do not present a server upload or storage flow in this version. See the privacy page for the precise boundary.'],
  ];
  return <section className="container-narrow grid gap-12 py-24 lg:grid-cols-[.7fr_1.3fr]"><SectionHeading eyebrow="Good to know" title="Questions, answered without the footnotes." body="If your question is not here, we would rather hear it than guess. Reach us from the contact page." /><div className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">{questions.map(([question, answer], index) => <div key={question}><button type="button" onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index} data-testid={`button-faq-${index}`} className="focus-ring flex w-full items-center justify-between gap-5 py-5 text-left text-sm font-bold">{question}{open === index ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{open === index && <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-[hsl(var(--muted-foreground))]" data-testid={`text-faq-answer-${index}`}>{answer}</p>}</div>)}</div></section>;
}

function ToolCard({ tool, dark = false }: { tool: typeof toolConfigs[ToolSlug]; dark?: boolean }) {
  const Icon = tool.icon;
  return <Link href={`/compress-${tool.slug}`} data-testid={`link-tool-${tool.slug}`} className={`group rounded-2xl border p-5 transition-all hover:-translate-y-1 ${dark ? 'border-[hsl(var(--background)/.15)] bg-[hsl(var(--background)/.06)] hover:border-[hsl(var(--primary)/.6)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/.5)]'}`}><div className={`mb-9 flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-[hsl(var(--primary)/.16)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'}`}><Icon size={20} /></div><div className="flex items-end justify-between gap-2"><div><p className={`font-mono text-[10px] uppercase tracking-[.14em] ${dark ? 'text-[hsl(var(--background)/.5)]' : 'text-[hsl(var(--muted-foreground))]'}`}>{tool.format}</p><h3 className="mt-1 font-bold">{tool.name.replace(' compressor', '')}</h3></div><ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></div></Link>;
}

function ToolsPage() {
  useDocumentMeta('Compression tools — File Compactor', 'Simple compressors for images, documents, and presentations.');
  return <Shell><PageIntro eyebrow="Tools" title="The right compressor for the file in front of you." body="Every tool follows the same simple path. Choose a format, set your goal, and download a verified result when processing finishes." /><section className="container-narrow pb-28"><div className="mb-7 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"><ScanLine size={17} className="text-[hsl(var(--primary))]" /> All seven tools process files in your browser. Files up to 25 MB are supported.</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.values(toolConfigs).map((tool) => <div key={tool.slug} className="relative"><ToolCard tool={tool} /><span className={`absolute right-4 top-4 rounded-full px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] ${tool.available ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{tool.available ? 'Browser ready' : 'In preparation'}</span></div>)}</div></section></Shell>;
}

function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <section className="paper-grid border-b border-[hsl(var(--border))]"><div className="container-narrow max-w-4xl pb-20 pt-20 lg:pb-24 lg:pt-28"><p className="eyebrow mb-5 text-[hsl(var(--primary))]">{eyebrow}</p><h1 className="display-font max-w-4xl text-5xl font-extrabold leading-[.96] sm:text-7xl">{title}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">{body}</p></div></section>;
}

function ToolPage({ config, processor }: { config: typeof toolConfigs[ToolSlug]; processor?: Processor }) {
  useDocumentMeta(`${config.name} — File Compactor`, `A clear way to make ${config.format} files smaller.`);
  const Icon = config.icon;
  const [file, setFile] = useState<File | null>(null);
  const [goal, setGoal] = useState<Goal>('balanced');
  const [targetSize, setTargetSize] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProcessorResult | null>(null);
  const [resultUrl, setResultUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!result) {
      setResultUrl('');
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);
  const goals = useMemo(() => [
    { id: 'quality' as Goal, label: 'Best quality', text: 'Preserve detail first', icon: Sparkles },
    { id: 'balanced' as Goal, label: 'Balanced', text: 'A sensible middle ground', icon: SlidersHorizontal },
    { id: 'smallest' as Goal, label: 'Smallest possible', text: 'Prioritize a lighter file', icon: HardDriveDownload },
    { id: 'target' as Goal, label: 'Target size', text: 'Aim for a specific size', icon: ScanLine },
  ], []);
  const choose = (candidate?: File) => {
    if (!candidate) return;
    if (candidate.size > MAX_FILE_SIZE) { setError('This file is larger than the current 25 MB limit.'); setFile(null); return; }
    const extension = candidate.name.split('.').pop()?.toLowerCase() ?? '';
    const accepted = config.extensions.map((item) => item.toLowerCase()).includes(extension) || candidate.type === config.accept.split(',')[1];
    if (!accepted) { setError(`Please choose a ${config.format} file.`); setFile(null); return; }
    setError(''); setResult(null); setFile(candidate);
  };
  const processFile = async () => {
    if (!file) return;
    if (!processor) { setError(config.available ? 'The browser-side compression engine is not connected yet. Your file has not been uploaded or changed.' : 'This processor is still being built. Your file has not been uploaded or changed.'); return; }
    setError(''); setProcessing(true);
    try { setResult(await processor(file, goal, goal === 'target' ? Number(targetSize) : undefined)); } catch (caught) { setError(caught instanceof Error ? caught.message : 'The file could not be processed.'); } finally { setProcessing(false); }
  };
  const reset = () => { setFile(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = ''; };
  return <Shell>
    <section className="paper-grid border-b border-[hsl(var(--border))]"><div className="container-narrow pb-12 pt-14 lg:pb-16 lg:pt-20"><Link href="/tools" data-testid="link-tool-back" className="focus-ring mb-10 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"><ArrowRight size={14} className="rotate-180" /> All tools</Link><div className="flex max-w-3xl items-start gap-5"><div className={`mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]`}><Icon size={27} /></div><div><p className="eyebrow mb-3 text-[hsl(var(--primary))]">{config.format} tool</p><h1 className="display-font text-4xl font-extrabold leading-[.98] sm:text-6xl">{config.name}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">{config.description}</p></div></div></div></section>
    <section className="container-narrow grid gap-12 py-14 lg:grid-cols-[1.1fr_.9fr] lg:gap-20 lg:py-20">
      <div>
        <div className="mb-7 flex items-center justify-between"><div><p className="eyebrow text-[hsl(var(--primary))]">01 · Select a file</p><h2 className="mt-2 text-xl font-extrabold">Bring your {config.format} file</h2></div>{file && <button type="button" onClick={reset} data-testid="button-tool-reset" className="focus-ring inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"><Trash2 size={14} /> Remove</button>}</div>
        <div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }} data-testid={`dropzone-${config.slug}`} className={`focus-ring flex min-h-[285px] flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 text-center transition-colors ${dragging ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}>
          <input ref={inputRef} type="file" className="sr-only" accept={config.accept} onChange={(event) => choose(event.target.files?.[0])} data-testid={`input-file-${config.slug}`} />
          {file ? <div className="w-full max-w-sm"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><Check size={27} /></div><p className="truncate text-lg font-bold" data-testid={`text-selected-name-${config.slug}`}>{file.name}</p><p className="mt-1 font-mono text-xs text-[hsl(var(--muted-foreground))]" data-testid={`text-selected-size-${config.slug}`}>{formatBytes(file.size)} · {file.type || `${config.format} file`}</p><button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} data-testid={`button-replace-${config.slug}`} className="focus-ring mt-6 rounded-full border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold">Replace file</button></div> : <><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--primary))]"><UploadCloud size={27} /></div><p className="text-lg font-bold">Drop your file here</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">or <span className="font-bold text-[hsl(var(--primary))]">browse your device</span></p><p className="mt-5 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground)/.7)]">{config.extensions.join(' · ')} only</p></>}</div>
        {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[hsl(var(--destructive)/.24)] bg-[hsl(var(--destructive)/.06)] px-4 py-3 text-sm font-semibold text-[hsl(var(--destructive))]" data-testid={`alert-tool-${config.slug}`}><AlertCircle size={17} className="mt-0.5 shrink-0" /> <span>{error}</span></div>}
        {result && <div className="mt-4 rounded-2xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--accent))] p-4" data-testid={`status-result-${config.slug}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3"><PackageCheck size={22} className="mt-0.5 text-[hsl(var(--primary))]" /><div><p className="text-sm font-bold">Compression complete</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{result.verified ? 'Output verified' : 'Verification unavailable'} · {result.qualityLabel}</p></div></div>
            <a href={resultUrl} download={result.fileName} data-testid={`button-download-${config.slug}`} className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><Download size={15} /> Download</a>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[hsl(var(--primary)/.16)] pt-4 text-xs">
            <div><span className="block text-[hsl(var(--muted-foreground))]">Original</span><strong className="mt-1 block font-mono">{formatBytes(result.originalSize)}</strong></div>
            <div><span className="block text-[hsl(var(--muted-foreground))]">Result</span><strong className="mt-1 block font-mono">{formatBytes(result.size)}</strong></div>
            <div><span className="block text-[hsl(var(--muted-foreground))]">Saved</span><strong className="mt-1 block font-mono">{result.savedPercent.toFixed(1)}%</strong></div>
          </div>
          <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">{result.dimensions}{result.notice ? ` · ${result.notice}` : ''}</p>
        </div>}
      </div>
      <aside className="lg:pt-2">
        <div className="mb-7"><p className="eyebrow text-[hsl(var(--primary))]">02 · Set your goal</p><h2 className="mt-2 text-xl font-extrabold">What matters most?</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The processor will use this preference when it creates your result.</p></div>
        <div className="space-y-2">{goals.map((item) => { const GoalIcon = item.icon; return <button type="button" key={item.id} onClick={() => setGoal(item.id)} aria-pressed={goal === item.id} data-testid={`button-goal-${item.id}`} className={`focus-ring flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${goal === item.id ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/.45)]'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${goal === item.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}><GoalIcon size={17} /></span><span className="flex-1"><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">{item.text}</span></span>{goal === item.id && <Check size={17} className="text-[hsl(var(--primary))]" />}</button>; })}</div>
        {goal === 'target' && <label className="mt-3 block"><span className="mb-2 block text-xs font-bold">Target size in MB</span><input type="number" min="0.1" step="0.1" value={targetSize} onChange={(event) => setTargetSize(event.target.value)} placeholder="e.g. 2.5" data-testid="input-target-size" className="focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 text-sm outline-none" /></label>}
        <div className="mt-8 border-t border-[hsl(var(--border))] pt-6"><button type="button" disabled={!file || processing} onClick={processFile} data-testid={`button-process-${config.slug}`} className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45">{processing ? 'Processing…' : 'Compress file'} <ArrowRight size={16} /></button><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><Info size={14} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />{config.available ? 'Processing happens in your browser. The original file stays unchanged.' : 'This format is supported in the interface, but its processor is not available yet.'}</p></div>
      </aside>
    </section>
    <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]"><div className="container-narrow grid gap-8 py-12 sm:grid-cols-3"><MiniNote icon={ShieldCheck} title="No mystery uploads" text="Your selection is held by this page only." /><MiniNote icon={Info} title="Real states only" text="No progress or size savings are invented." /><MiniNote icon={RefreshCcw} title="Change your mind" text="Replace or remove the file at any point." /></div></section>
  </Shell>;
}

function MiniNote({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="flex gap-3"><Icon size={18} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text}</p></div></div>;
}

function HowItWorks() {
  useDocumentMeta('How File Compactor works', 'A transparent, browser-first workflow for smaller files.');
  return <Shell><PageIntro eyebrow="How it works" title="Compression should feel like a straight line." body="File Compactor is designed around a tiny, predictable workflow: select a file, express a preference, and only then receive a real result." /><section className="container-narrow py-20 lg:py-28"><div className="grid gap-5 lg:grid-cols-3">{[['01', MousePointer2, 'Select', 'Drop a supported file into a tool or browse your device. We validate the extension and 25 MB limit before anything else.'], ['02', SlidersHorizontal, 'Choose', 'Pick the tradeoff that fits this moment. Best quality, Balanced, Smallest possible, or a concrete target size.'], ['03', Download, 'Receive', 'A format-specific processor runs in your browser, verifies the result, and gives you a download only after it is ready.']].map(([number, Icon, title, text]) => { const StepIcon = Icon as LucideIcon; return <div key={number as string} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7"><span className="font-mono text-xs text-[hsl(var(--primary))]">{number as string}</span><StepIcon size={28} className="mt-14 text-[hsl(var(--primary))]" /><h2 className="mt-6 text-2xl font-extrabold">{title as string}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text as string}</p></div>; })}</div><div className="mt-16 grid gap-10 rounded-3xl bg-[hsl(var(--foreground))] p-8 text-[hsl(var(--background))] sm:p-12 lg:grid-cols-[1fr_1fr] lg:items-center"><div><p className="eyebrow text-[hsl(var(--primary))]">The important part</p><h2 className="display-font mt-4 text-3xl font-extrabold sm:text-4xl">If a result cannot be verified, it is not offered.</h2></div><p className="text-sm leading-7 text-[hsl(var(--background)/.65)]">Images are re-encoded in the browser, PDFs are rebuilt and checked for page-count changes, and Office files are repackaged and checked as valid document packages. Files that would become larger are kept unchanged.</p></div></section></Shell>;
}

function Privacy() {
  useDocumentMeta('Privacy — File Compactor', 'What happens to your files when you use File Compactor.');
  return <Shell><PageIntro eyebrow="Privacy" title="Your file should not take a sightseeing tour." body="File Compactor processes the supported formats locally in your browser, without an account or upload queue." /><section className="container-narrow grid gap-12 py-20 lg:grid-cols-[.7fr_1.3fr] lg:py-28"><div className="flex h-fit items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--accent))] p-5"><LockKeyhole size={23} className="text-[hsl(var(--primary))]" /><span className="text-sm font-bold">No account or file history is part of this product.</span></div><div className="prose prose-sm max-w-2xl prose-headings:font-extrabold prose-headings:tracking-tight prose-p:leading-7 prose-p:text-[hsl(var(--muted-foreground))]"><h2>Browser-side processing</h2><p>Images, PDFs, and Office files are read by your browser and processed in the page. File bytes are not sent to a File Compactor server by the compression flow.</p><h2>What this version does not do</h2><p>This version does not provide an account system, cloud storage, file history, analytics dashboard, or background upload queue. Files are held in memory while the tab is open and are never used for training, sold, or shared by this app.</p><h2>What your browser may retain</h2><p>Your browser can keep temporary object URLs and page state while this tab is open. Closing the tab or refreshing generally clears that in-memory selection. Downloads are controlled by your browser and saved wherever you choose.</p><h2>Third-party services</h2><p>The site may use standard hosting and font delivery infrastructure to load the interface. Those services can receive the normal technical information involved in serving a web page, but the selected file is not uploaded for compression.</p><h2>Questions</h2><p>If a future processor changes the processing boundary, this page should be updated before that processor is enabled.</p></div></section></Shell>;
}

function About() {
  return <Shell><PageIntro eyebrow="About" title="A small tool with a strong point of view." body="File Compactor exists for the ordinary moments when a file is just a little too large and every other tool feels like overkill." /><section className="container-narrow grid gap-12 py-20 lg:grid-cols-2 lg:py-28"><div><p className="eyebrow mb-4 text-[hsl(var(--primary))]">The principle</p><h2 className="display-font text-4xl font-extrabold leading-tight">Clarity is a feature.</h2></div><div className="space-y-5 text-base leading-8 text-[hsl(var(--muted-foreground))]"><p>We made File Compactor to feel dependable around the files people actually have: an image for a form, a document for a client, a presentation that needs to leave the building.</p><p>That means fewer controls, better explanations, and no invented confidence. The interface can be ready before every processor is; the status should still be unmistakable.</p><p className="font-semibold text-[hsl(var(--foreground))]">Useful first. Honest always.</p></div></section></Shell>;
}

function Contact() {
  const [sent, setSent] = useState(false);
  return <Shell><PageIntro eyebrow="Contact" title="Tell us where the file tools get in your way." body="Questions, format requests, or a sharp observation are all welcome. We read every note." /><section className="container-narrow grid gap-14 py-20 lg:grid-cols-[.75fr_1.25fr] lg:py-28"><div><div className="flex items-start gap-3"><Mail size={20} className="mt-1 text-[hsl(var(--primary))]" /><div><h2 className="font-extrabold">A human inbox</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">For now, send a note through the form. Please do not attach sensitive files—we do not need them to understand a problem.</p></div></div><div className="mt-10 flex items-start gap-3"><CircleHelp size={20} className="mt-1 text-[hsl(var(--primary))]" /><div><h2 className="font-extrabold">Looking for a format?</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Tell us what you use and what “smaller” means in your workflow.</p></div></div></div>{sent ? <div className="rounded-3xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--accent))] p-8"><Check size={25} className="text-[hsl(var(--primary))]" /><h2 className="mt-5 text-2xl font-extrabold">Message ready to send.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">This first version does not connect to a mail service yet, so nothing was sent. The form interaction is ready for that connection.</p><button type="button" onClick={() => setSent(false)} data-testid="button-contact-again" className="focus-ring mt-6 text-sm font-bold text-[hsl(var(--primary))]">Write another note</button></div> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="space-y-5 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><label className="block"><span className="mb-2 block text-xs font-bold">Your email</span><input required type="email" placeholder="you@example.com" data-testid="input-contact-email" className="focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-sm outline-none" /></label><label className="block"><span className="mb-2 block text-xs font-bold">What is on your mind?</span><textarea required rows={6} placeholder="A format request, a question, or something that felt unclear…" data-testid="input-contact-message" className="focus-ring w-full resize-y rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 text-sm outline-none" /></label><button type="submit" data-testid="button-contact-submit" className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Prepare message <ArrowRight size={16} /></button></form>}</section></Shell>;
}

function Terms() {
  return <Shell><PageIntro eyebrow="Terms" title="A few plain-language boundaries." body="These terms describe the first version of File Compactor. They are intentionally straightforward." /><section className="container-narrow max-w-3xl py-20 lg:py-28"><div className="space-y-10 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><LegalBlock title="Use the right file"><p>Only use files you have permission to modify. You are responsible for checking that a compressed result still meets the requirements of the person or service you are sending it to.</p></LegalBlock><LegalBlock title="No guarantee of a smaller result"><p>Compression depends on the source file, format, and selected goal. A processor may return a file that is not smaller, or may not be available for a format. The interface should not be read as a promise of a percentage or outcome.</p></LegalBlock><LegalBlock title="No storage promise"><p>File Compactor is not a backup service. Download results you need and keep your own original files. Browser behavior, device settings, and future changes can affect temporary page state.</p></LegalBlock><LegalBlock title="Availability"><p>Tools may be unfinished, changed, or unavailable. We will label those states rather than imply that processing occurred.</p></LegalBlock></div></section></Shell>;
}

function LegalBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div><h2 className="mb-2 text-xl font-extrabold text-[hsl(var(--foreground))]">{title}</h2>{children}</div>;
}

function NotFound() {
  return <Shell><section className="container-narrow flex min-h-[60vh] flex-col items-start justify-center py-20"><p className="eyebrow text-[hsl(var(--primary))]">404 · Not found</p><h1 className="display-font mt-5 text-6xl font-extrabold">That page wandered off.</h1><p className="mt-5 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">The file you are looking for may have moved. The useful tools are still right here.</p><Link href="/" data-testid="link-not-found-home" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Back home <ArrowRight size={16} /></Link></section></Shell>;
}

function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', description);
  }, [title, description]);
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Home} />
    <Route path="/tools" component={ToolsPage} />
    <Route path="/how-it-works" component={HowItWorks} />
    <Route path="/privacy" component={Privacy} />
    <Route path="/about" component={About} />
    <Route path="/contact" component={Contact} />
    <Route path="/terms" component={Terms} />
    <Route path="/compress-pdf"><ToolPage config={toolConfigs.pdf} processor={processors.pdf} /></Route>
    <Route path="/compress-jpg"><ToolPage config={toolConfigs.jpg} processor={processors.jpg} /></Route>
    <Route path="/compress-png"><ToolPage config={toolConfigs.png} processor={processors.png} /></Route>
    <Route path="/compress-webp"><ToolPage config={toolConfigs.webp} processor={processors.webp} /></Route>
    <Route path="/compress-docx"><ToolPage config={toolConfigs.docx} processor={processors.docx} /></Route>
    <Route path="/compress-pptx"><ToolPage config={toolConfigs.pptx} processor={processors.pptx} /></Route>
    <Route path="/compress-xlsx"><ToolPage config={toolConfigs.xlsx} processor={processors.xlsx} /></Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;