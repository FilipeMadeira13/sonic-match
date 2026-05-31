import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MBRelease, RawRecommendation } from '@/types/album';
import type { SimilarArtist, AlbumTagContext } from './lastfm';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function synthesizeTasteDNA(albums: MBRelease[]): Promise<string> {
  if (albums.length === 0) return '';

  const list = albums
    .map((a, i) => `${i + 1}. ${a.artist} — "${a.title}"${a.date ? ` (${a.date.slice(0, 4)})` : ''}`)
    .join('\n');

  const prompt = `Estes são os álbuns que uma pessoa ama:\n\n${list}\n\nAnalise profundamente o que esses álbuns revelam sobre o gosto musical desta pessoa.\nNÃO liste gêneros como resposta principal — gênero é uma etiqueta, não um gosto.\nIdentifique as qualidades subjacentes com foco em:\n\n1. TEXTURA SONORA: produção (intimista/grandiosa, analógica/digital), timbre predominante, densidade do arranjo\n2. TENSÃO EMOCIONAL: espectro buscado (catarse, melancolia, energia física, introspecção, euforia, tensão dramática)\n3. SENSIBILIDADE MELÓDICA: relação com melodia (cantabilidade, complexidade harmônica, ganchos vs. progressões longas)\n4. ESTÉTICA DE ERA: artefatos sonoros específicos da época que estão presentes\n5. POSTURA ARTÍSTICA: atitude dos artistas (virtuosismo, urgência emocional, ironia, contemplação, hedonismo)\n6. DINÂMICA NARRATIVA: como as músicas se desenvolvem (explosão imediata, construção lenta, álbum-conceito, miniatura)\n\nResponda em JSON: {"tasteDNA": "3-5 frases em português descrevendo as qualidades profundas do gosto, SEM mencionar os artistas ou álbuns. Escreva como um verbete do perfil de gosto desta pessoa."}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      } as Record<string, unknown>,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences (Gemini often wraps JSON in ```json...```)
    const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText) as { tasteDNA?: unknown };

    if (typeof parsed.tasteDNA === 'string' && parsed.tasteDNA.trim().length >= 80) {
      return parsed.tasteDNA.trim();
    }
    return '';
  } catch {
    return '';
  }
}

function buildSystemPrompt(
  count: number,
  similarArtists: SimilarArtist[],
  albumTagContexts: AlbumTagContext[],
  tasteDNA = ''
): string {
  const tasteDNASection = tasteDNA
    ? `
🎯 PERFIL DE GOSTO PROFUNDO (bússola primária)

${tasteDNA}

Use este perfil como guia principal. As recomendações devem satisfazer estas qualidades de gosto — mesmo que isso signifique álbuns de gêneros completamente diferentes dos seeds.
`
    : '';

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
📊 PERFIL SONORO DOS ÁLBUNS SEED (contexto de referência — não um limite genérico)

Sonoridade REAL de cada álbum, via tags ponderadas da comunidade Last.fm.
Peso [N] = intensidade relativa da característica (100 = tag mais forte do álbum).

${albumLines.join('\n\n')}

NOTAS DE ANÁLISE SONORA:
• Tags com peso ≥ 60 descrevem a identidade sonora central de cada álbum seed.
• Tags ⚡ "Exclusivo deste álbum" apontam o que diferencia do catálogo geral do artista.
• NUNCA use o nome do artista como proxy da sonoridade. Cada álbum tem identidade própria.
  Exemplo: "Tattooed Millionaire" de Bruce Dickinson é AOR/hard rock, NÃO heavy metal.
• Tags com peso < 25 são contexto periférico, não identidade central.
• As tags DESCREVEM os seeds — elas NÃO limitam os gêneros que você pode recomendar.
`;
  }

  const similarSection =
    similarArtists.length > 0
      ? `\nArtistas similares via Last.fm (contexto secundário — use apenas se consonantes com o perfil de gosto acima):
${similarArtists
  .slice(0, 15)
  .map((a) => `- ${a.name} (${a.match.toFixed(2)})`)
  .join('\n')}\n`
      : '';

  const crossGenreRule = tasteDNA
    ? `- DIVERSIDADE CROSS-GENRE: pelo menos ${Math.ceil(count * 0.35)} das ${count} recomendações devem vir de gêneros claramente distintos dos seeds. O Perfil de Gosto é sua bússola — busque álbuns de qualquer gênero que satisfaçam esse perfil.`
    : `- Varie ao máximo: eras, países, subgêneros, popularidade.`;

  return `Você é um especialista em música com conhecimento enciclopédico de álbuns de todos os gêneros, épocas e culturas. Sua função é recomendar exatamente ${count} álbuns que esta pessoa provavelmente ainda não conhece, mas vai amar profundamente.
${tasteDNASection}${tagSection}${similarSection}
Regras para as recomendações:
- BÚSSOLA PRIMÁRIA: o Perfil de Gosto Profundo define o que esta pessoa busca em música. Gênero é secundário — busque álbuns que satisfaçam as qualidades de gosto identificadas.
- As tags sônicas descrevem os seeds; use-as para entender o ponto de partida, não para limitar o destino.
${crossGenreRule}
- Analise profundamente: estética sonora, produção, mood, influências, época, cultura de origem.
- PROIBIDO: recomendar os álbuns mais óbvios e onipresentes (ex: Dark Side of the Moon, OK Computer, Abbey Road) a não ser que o perfil de gosto aponte diretamente para isso.
- Priorize: joias pouco conhecidas, clássicos underground, lançamentos de países não-anglófonos.
- NUNCA recomende um álbum que o usuário já informou que ama.
- NUNCA inclua mais de 2 álbuns do mesmo artista na lista.
- Gere EXATAMENTE ${count} recomendações.

Formato de resposta OBRIGATÓRIO — responda SOMENTE com um JSON válido, sem nenhum texto adicional antes ou depois:
{"recommendations":[{"artist":"Nome exato do artista","album":"Nome exato do álbum","year":"AAAA","reason":"Uma frase concisa em português (máx 20 palavras) sobre o que este álbum compartilha com o perfil de gosto — foque em emoção/estética/produção, não em gênero."}]}`;
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
  albumTagContexts: AlbumTagContext[] = [],
  tasteDNA = ''
): AsyncGenerator<RawRecommendation> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(count, similarArtists, albumTagContexts, tasteDNA),
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
