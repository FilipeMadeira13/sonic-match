import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MBRelease, RawRecommendation } from '@/types/album';
import type { SimilarArtist, AlbumTagContext } from './lastfm';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

function buildSystemPrompt(
  count: number,
  similarArtists: SimilarArtist[],
  albumTagContexts: AlbumTagContext[]
): string {
  let tagSection = '';
  if (albumTagContexts.length > 0) {
    const albumLines = albumTagContexts.map((ctx, i) => {
      const tagStr = ctx.tags
        .slice(0, 6)
        .map((t) => `${t.name} [${t.weight}]`)
        .join(' · ');

      const artistTagSet = new Set(ctx.artistTags.map((t) => t.toLowerCase()));
      const exclusiveTags = ctx.tags
        .filter((t) => !artistTagSet.has(t.name.toLowerCase()))
        .slice(0, 4)
        .map((t) => t.name);

      const artistLine =
        ctx.artistTags.length > 0
          ? `\n   Estilo geral do artista: ${ctx.artistTags.slice(0, 5).join(', ')}`
          : '';
      const exclusiveLine =
        exclusiveTags.length > 0
          ? `\n   ⚡ Exclusivo deste álbum: ${exclusiveTags.join(', ')}`
          : '';

      return `${i + 1}. "${ctx.album}" — ${ctx.artist}${ctx.year ? ` (${ctx.year})` : ''}
   Sonoridade: ${tagStr}${artistLine}${exclusiveLine}`;
    });

    tagSection = `
⚠️ PERFIL SONORO DOS ÁLBUNS SEED

Sonoridade REAL de cada álbum, via tags ponderadas da comunidade Last.fm.
Peso [N] = intensidade relativa da característica (100 = tag mais forte do álbum).

${albumLines.join('\n\n')}

REGRAS CRÍTICAS DE ANÁLISE:
• Tags com peso ≥ 60 definem a identidade sonora central do álbum.
• Tags ⚡ "Exclusivo deste álbum" são as mais diferenciadoras — priorize-as para encontrar álbuns realmente similares.
• NUNCA use o nome do artista como proxy da sonoridade. Cada álbum tem identidade própria.
  Exemplo: "Tattooed Millionaire" de Bruce Dickinson é AOR/hard rock, NÃO heavy metal — mesmo ele sendo vocalista do Iron Maiden.
• Tags com peso < 25 são contexto periférico, não identidade central.
`;
  }

  const similarSection =
    similarArtists.length > 0
      ? `\nArtistas similares via Last.fm (contexto secundário — use apenas se consonantes com as tags acima):
${similarArtists
  .slice(0, 15)
  .map((a) => `- ${a.name} (${a.match.toFixed(2)})`)
  .join('\n')}\n`
      : '';

  return `Você é um especialista em música com conhecimento enciclopédico de álbuns de todos os gêneros, épocas e culturas. Sua função é analisar o perfil de gosto musical de um usuário — baseado nos álbuns que ele ama — e recomendar exatamente ${count} álbuns que ele provavelmente ainda não conhece, mas vai amar.
${tagSection}${similarSection}
Regras para as recomendações:
- PRIORIDADE MÁXIMA: respeite a sonoridade real de cada álbum seed conforme o perfil de tags acima. Cada álbum tem sua identidade sonora própria — não generalize pelo artista, generalize pela sonoridade.
- Analise profundamente: estética sonora, produção, mood, influências, época, cultura de origem.
- PROIBIDO: recomendar os álbuns mais óbvios e onipresentes (ex: Dark Side of the Moon, OK Computer, Abbey Road) a não ser que as tags apontem diretamente para isso.
- Priorize: joias pouco conhecidas, clássicos underground, lançamentos de países não-anglófonos.
- Varie ao máximo: eras, países, subgêneros, popularidade.
- NUNCA recomende um álbum que o usuário já informou que ama.
- NUNCA inclua mais de 2 álbuns do mesmo artista na lista.
- Gere EXATAMENTE ${count} recomendações.

Formato de resposta OBRIGATÓRIO — responda SOMENTE com um JSON válido, sem nenhum texto adicional antes ou depois:
{"recommendations":[{"artist":"Nome exato do artista","album":"Nome exato do álbum","year":"AAAA","reason":"Uma frase concisa em português (máx 20 palavras) explicando por que combina com o perfil."}]}`;
}

function buildUserMessage(albums: MBRelease[], count: number, freeText?: string): string {
  const list = albums
    .map((a, i) => `${i + 1}. ${a.artist} — "${a.title}"${a.date ? ` (${a.date})` : ''}`)
    .join('\n');

  const extra = freeText?.trim()
    ? `\nO usuário também disse: "${freeText.trim()}"`
    : '';

  return `Estes são os álbuns que o usuário ama:\n\n${list}${extra}\n\nGere exatamente ${count} recomendações personalizadas seguindo as regras do sistema.`;
}

function extractCompleteObjects(text: string): { objects: string[]; remaining: string } {
  const objects: string[] = [];
  const startStack: number[] = [];
  let inString = false;
  let lastTopLevelEnd = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inString) {
      if (ch === '\\') i++; // skip escaped char
      else if (ch === '"') inString = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      startStack.push(i);
    } else if (ch === '}') {
      if (startStack.length > 0) {
        const start = startStack.pop()!;
        objects.push(text.slice(start, i + 1));
        if (startStack.length === 0) lastTopLevelEnd = i + 1;
      }
    }
    i++;
  }

  // Keep any unclosed object in the remaining buffer
  const remaining = startStack.length > 0
    ? text.slice(startStack[0])
    : text.slice(lastTopLevelEnd);

  return { objects, remaining };
}

export async function* streamRecommendations(
  albums: MBRelease[],
  count = 8,
  freeText?: string,
  similarArtists: SimilarArtist[] = [],
  albumTagContexts: AlbumTagContext[] = []
): AsyncGenerator<RawRecommendation> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(count, similarArtists, albumTagContexts),
    generationConfig: {
      temperature: 1.0,
      thinkingConfig: { thinkingBudget: 0 },
    } as Record<string, unknown>,
  });

  const { stream: geminiStream } = await model.generateContentStream(
    buildUserMessage(albums, count, freeText)
  );

  const profileSet = new Set(
    albums.map((a) => `${a.artist.toLowerCase()}|${a.title.toLowerCase()}`)
  );
  const yielded = new Set<string>();
  const artistCount = new Map<string, number>(); // max 2 albums per artist

  let buffer = '';
  let emitted = 0;

  for await (const chunk of geminiStream) {
    buffer += chunk.text();
    const { objects, remaining } = extractCompleteObjects(buffer);
    buffer = remaining;

    for (const objStr of objects) {
      if (emitted >= count) return;
      try {
        const rec = JSON.parse(objStr) as Record<string, unknown>;
        if (rec.recommendations) continue; // outer wrapper
        if (!rec.artist || !rec.album) continue;

        const r = rec as unknown as RawRecommendation;
        const key = `${r.artist.toLowerCase()}|${r.album.toLowerCase()}`;
        const artistKey = r.artist.toLowerCase().trim();

        if (profileSet.has(key) || yielded.has(key)) continue;
        if ((artistCount.get(artistKey) ?? 0) >= 2) continue; // max 2 per artist

        yielded.add(key);
        artistCount.set(artistKey, (artistCount.get(artistKey) ?? 0) + 1);
        yield r;
        emitted++;
      } catch {
        // Not a valid/complete JSON object, skip
      }
    }
  }
}
