import type { Recommendation } from '@/types/album';
import RecommendationCard from './RecommendationCard';

interface RecommendationGridProps {
  recommendations: Recommendation[];
}

export default function RecommendationGrid({ recommendations }: RecommendationGridProps) {
  if (recommendations.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-12">
        Nenhuma recomendação encontrada. Tente com outros álbuns.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {recommendations.map((rec, i) => (
        <RecommendationCard
          key={`${rec.artist}|${rec.album}`}
          recommendation={rec}
          index={i}
        />
      ))}
    </div>
  );
}
