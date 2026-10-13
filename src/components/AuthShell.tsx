import { Logo } from "./Logo";
import { BinScene } from "./BinScene";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-forest-900 p-10 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="my-auto">
          <BinScene level={0.35} truck className="max-w-md" />
          <p className="mt-8 max-w-sm font-display text-3xl font-bold leading-tight">
            A cleaner compound starts with one tap.
          </p>
          <p className="mt-3 max-w-sm text-white/70">
            Crews across your area are alerted the moment your bin is full.
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-2.5 bg-hazard" aria-hidden />
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="mt-2 text-moss">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
