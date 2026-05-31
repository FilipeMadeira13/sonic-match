import { getTranslations } from 'next-intl/server';
import TasteProfileForm from '@/components/TasteProfileForm';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-50 mb-3">
            {t('title')}
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </header>

        <TasteProfileForm />
      </div>
    </main>
  );
}
