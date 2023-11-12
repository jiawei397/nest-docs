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
    nav: [
      {
        title: '文档',
        link: '/documentation',
      },
      {
        title: '博客',
        link: '/blog/01_koa_oak',
        activePath: '/blog/',
      },
    ],
  },
  favicons: ['/logo.png'],
});
