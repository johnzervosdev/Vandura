import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        That URL does not match anything in Vandura. Check the address or use the links below.
      </p>
      <nav className="flex flex-wrap justify-center gap-3 text-sm">
        <Link href="/" className="text-primary hover:underline">
          Home
        </Link>
        <Link href="/projects" className="text-primary hover:underline">
          Projects
        </Link>
        <Link href="/developers" className="text-primary hover:underline">
          Developers
        </Link>
        <Link href="/timesheets" className="text-primary hover:underline">
          Timesheets
        </Link>
        <Link href="/reports" className="text-primary hover:underline">
          Reports
        </Link>
      </nav>
    </div>
  );
}
