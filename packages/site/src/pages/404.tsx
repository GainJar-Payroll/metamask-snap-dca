import { Link } from 'gatsby';

const NotFound = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#070A12] px-6 text-center text-white">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-200">
        404
      </p>
      <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">
        Page not found
      </h1>
      <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-2xl bg-cyan-300 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-200"
      >
        Back to Home
      </Link>
    </main>
  );
};

export default NotFound;
