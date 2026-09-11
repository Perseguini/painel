DEVCLUB STUDY PRO - VERCEL

Projeto preparado para deploy estático no Vercel.

Arquivos adicionados/ajustados:
- vercel.json: headers corretos para PWA/service worker
- sw.js: cache apenas do próprio site e limpeza de cache antigo
- manifest.json: start_url/scope prontos para domínio Vercel
- .gitignore: ignora pasta local .vercel

IMPORTANTE SOBRE SUPABASE
A chave anon/public do Supabase pode ficar no frontend. A segurança dos dados deve ser feita com RLS (Row Level Security) nas tabelas e policies no Storage.
Nunca coloque service_role key no navegador.

DEPLOY
Framework Preset: Other
Root Directory: ./
Build Command: deixar vazio
Output Directory: deixar vazio
Install Command: deixar vazio
