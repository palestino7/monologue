# Monologue

Um espaço privado para registrar pensamentos com a fluidez de uma conversa. O aplicativo funciona offline, não exige conta e mantém conversas e anexos no dispositivo.

## Desenvolvimento

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Verificações disponíveis:

```bash
npm run build
npm run lint
```

## Estrutura

- `src/components`: interface e interações visuais.
- `src/hooks`: estado de conversas, tema e gravação de áudio.
- `src/context`: inicialização da chave de criptografia local.
- `src/db`: esquema e migrações do IndexedDB.
- `src/crypto`: primitivas criptográficas.
- `src/services`: fluxos de aplicação, como backup e restauração.
- `src/styles/theme.css`: sistema visual e estilos globais.

## Dados e backup

Mensagens e anexos são criptografados antes de serem gravados no IndexedDB. Backups `.monologue` incluem conversas, mensagens e anexos e são protegidos por uma senha definida no momento da exportação.
