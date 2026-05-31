# Sonic Match

App de recomendação de álbuns musicais via IA. Informe álbuns que você ama e receba sugestões personalizadas geradas por inteligência artificial, exibidas como cards visuais com capa, artista, nome e justificativa da recomendação.

## Funcionalidades

- Busca e seleção de álbuns favoritos para montar seu perfil de gosto
- Recomendações geradas por IA com base no seu perfil — além do gênero, considera estética, mood, época e produção
- Cards visuais com capa do álbum extraída via Cover Art Archive
- Paleta de cores da interface gerada dinamicamente a partir das capas
- Interface em PT-BR e EN (i18n com next-intl)
- Layout responsivo — desktop e mobile

## Stack

- **Next.js 15+** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Google Gemini AI** — geração das recomendações
- **MusicBrainz + Cover Art Archive** — metadados e capas dos álbuns
- **Last.fm** — dados complementares de artistas
- **next-intl** — internacionalização (PT-BR / EN)

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- npm

### Setup

1. Clone o repositório:
   ```bash
   git clone https://github.com/FilipeMadeira13/sonic-match.git
   cd sonic-match
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env.local` na raiz do projeto:
   ```env
   GOOGLE_AI_API_KEY=sua_chave_aqui
   LASTFM_API_KEY=sua_chave_aqui
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

## Variáveis de Ambiente

| Variável | Obrigatória | Como obter |
|---|---|---|
| `GOOGLE_AI_API_KEY` | Sim | [Google AI Studio](https://aistudio.google.com/apikey) |
| `LASTFM_API_KEY` | Sim | [Last.fm API](https://www.last.fm/api/account/create) |

## Deploy

O projeto está configurado para deploy na Vercel. Basta importar o repositório e configurar as variáveis de ambiente acima no painel da Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FilipeMadeira13/sonic-match)
