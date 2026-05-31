# Projeto: App de Recomendação de Álbuns Musicais

> Documento de definição do projeto. Atualizar conforme decisões evoluírem.

---

## Visão Geral

Aplicação web responsiva que recomenda álbuns de música com base no perfil de gosto do usuário. O usuário informa álbuns que ama e recebe sugestões personalizadas geradas por LLM, exibidas como cards visuais com capas dos álbuns.

---

## Problema que resolve

Descobrir música nova de qualidade é difícil. Algoritmos de streaming priorizam novidades e popularidade. Este app usa IA para entender o *gosto profundo* do usuário — além de gênero, considerando estética, época, mood, produção — e faz recomendações com curadoria inteligente.

---

## Público-alvo

Ouvintes apaixonados por música que buscam descobrir álbuns relevantes para seu gosto específico, não apenas o que está em alta.

---

## Fluxo Principal do Usuário

1. Usuário acessa o app (sem login obrigatório)
2. Preenche um **perfil de gosto**: informa vários álbuns que ama
3. O app envia o perfil para um **LLM** (Claude ou GPT)
4. Retorna uma lista de **recomendações personalizadas**
5. Cada recomendação é exibida como **card visual** com capa, artista, nome do álbum e justificativa
6. Usuário pode explorar, marcar como ouvido/favorito (com conta) ou refinar com feedback

---

## Funcionalidades

### MVP (primeira entrega)

- [ ] Formulário de perfil de gosto: busca e seleção de múltiplos álbuns
- [ ] Geração de recomendações via LLM com base no perfil informado
- [ ] Exibição em cards visuais: capa do álbum + artista + nome + justificativa curta
- [ ] Busca de metadados e capas via API externa (ex: MusicBrainz / Cover Art Archive)
- [ ] Layout totalmente responsivo (desktop e mobile)
- [ ] Interface em PT-BR (estrutura preparada para i18n)

### Pós-MVP (com login)

- [ ] Autenticação opcional (criar conta para desbloquear recursos extras)
- [ ] Marcar álbuns como **ouvido** ou **favorito**
- [ ] Refinar recomendações com feedback **gostei / não gostei**
- [ ] Histórico de sessões de recomendação

---

## Stack Recomendada

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/SSG, SEO, roteamento, API routes nativas, ótimo para responsividade |
| Linguagem | **TypeScript** | Segurança de tipos em todo o projeto |
| Estilo | **Tailwind CSS** | Responsividade rápida, paleta dinâmica via variáveis |
| LLM | **Claude API (Anthropic)** | Recomendações de alta qualidade com contexto musical rico |
| Metadados musicais | **MusicBrainz API + Cover Art Archive** | Gratuito, open-source, cobertura ampla |
| Autenticação | **NextAuth.js** | Integra nativamente com Next.js, suporta OAuth e credenciais |
| Banco de dados | **PostgreSQL + Prisma** | Para persistência de dados de usuário (pós-MVP) |
| Deploy | **Vercel** | Zero-config para Next.js, CDN global, free tier generoso |

---

## Estética e Design

- **Tema**: Colorido e expressivo — as **capas dos álbuns ditam o visual**
- A paleta de cores da interface se adapta dinamicamente às cores predominantes das capas exibidas
- Inspiração: estética de colecionador de discos, rico em imagem, menos em texto
- Suporte a dark/light mode (dark como padrão, alinhado ao ambiente musical)
- Tipografia forte e legível em telas pequenas

---

## Internacionalização

- **Idioma padrão**: Português (PT-BR)
- **Idioma secundário**: Inglês (EN)
- Estrutura de i18n implementada desde o início (ex: `next-intl`) para facilitar adição futura de idiomas

---

## Monetização

Nenhuma. Projeto pessoal / portfólio. Sem planos de cobrança ou planos pagos.

---

## Restrições e Decisões Técnicas

- Recomendações geradas exclusivamente por LLM (não por algoritmo colaborativo)
- Capas e metadados buscados via API externa — não armazenados localmente no MVP
- Login é opcional: o app funciona completamente sem conta
- Nenhuma integração com plataformas de streaming (Spotify, Apple Music) no MVP
- App deve funcionar em qualquer tamanho de tela sem degradação de experiência

---

## Nome

A definir. Sugestões para considerar:

- **Cratedigger** — referência ao "crate digging" (garimpar discos físicos)
- **Spinrec** — curto, memorável, ligado a girar discos
- **Sidewave** — lado B + onda sonora
- **Groovemap** — mapa do seu gosto musical

---

## Status

- **Fase atual**: Definição de projeto
- **Próximo passo**: Escolher nome e iniciar prototipação do MVP

---

*Criado em: 2026-05-28*
