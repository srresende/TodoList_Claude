// Edição do app, fixada no build (electron-vite --mode edicao-local). Ver PRD D11.
//  - 'nuvem': versão completa (login Google/e-mail e sincronização com o Supabase, nos próximos marcos).
//  - 'local': só neste PC, offline, sem autenticação e sem sincronização; nome e e-mail informados pelo usuário.
export type Edicao = 'local' | 'nuvem'

declare const __EDICAO__: Edicao

export const EDICAO: Edicao = __EDICAO__
export const EDICAO_LOCAL = EDICAO === 'local'
export const NOME_APP = EDICAO_LOCAL ? 'TodoList_C Local' : 'TodoList_C'
