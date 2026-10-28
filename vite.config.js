import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' deixa os caminhos relativos: funciona no GitHub Pages
// (https://usuario.github.io/nome-do-repo/) sem precisar saber o nome do repositório.
export default defineConfig({
  plugins: [react()],
  base: './',
});
