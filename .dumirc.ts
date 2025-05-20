import { defineConfig } from 'dumi';

export default defineConfig({
  themeConfig: {
    name: 'deno_nest',
    showLineNum: true,
    socialLinks: {
      github: 'https://github.com/jiawei397/deno-nest',
      yuque: 'https://www.yuque.com/jiqingyun-begup/ewktxz',
    },
    footer: false,
    logo: '/logo.png',
    nav: {
      'zh-CN': [
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
      'en-US': [
        {
          title: 'Documentation',
          link: '/en-US/documentation',
        },
        {
          title: 'Blog',
          link: '/en-US/blog/01_koa_oak',
          activePath: '/en-US/blog/',
        },
      ],
    },
  },
  favicons: ['/logo.png'],
  locales: [
    { id: 'zh-CN', name: '中文' },
    { id: 'en-US', name: 'EN' },
  ],
});
