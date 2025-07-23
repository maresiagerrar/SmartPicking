import { DatabaseZap } from 'lucide-react';

export default function Header() {
  return (
    <header className="py-6 px-4 md:px-6 bg-card border-b shadow-sm sticky top-0 z-20">
      <div className="container mx-auto flex items-center gap-4">
        <DatabaseZap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-foreground">
            Data Distillery
          </h1>
        </div>
      </div>
    </header>
  );
}
