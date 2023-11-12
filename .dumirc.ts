import { defineConfig } from 'dumi';

export default defineConfig({
  themeConfig: {
    name: 'deno_nest',
    showLineNum: true,
    socialLinks: {
      github: 'https://github.com/jiawei397/deno-oak-nest',
    },
    footer: false,
    logo: '/logo.png',
  },
  favicons: ['/logo.png'],
});
