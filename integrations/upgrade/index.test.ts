import { expect } from 'vitest'
import { css, html, js, json, test } from '../utils'

test(
  `upgrades a v3 project to v4`,
  {
    fs: {
      'package.json': json`
        {
          "dependencies": {
            "@tailwindcss/upgrade": "workspace:^"
          }
        }
      `,
      'tailwind.config.js': js`
        /** @type {import('tailwindcss').Config} */
        module.exports = {
          content: ['./src/**/*.{html,js}'],
        }
      `,
      'src/index.html': html`
        <h1>🤠👋</h1>
        <div class="!flex sm:!block bg-gradient-to-t"></div>
      `,
      'src/input.css': css`
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
      `,
    },
  },
  async ({ exec, fs }) => {
    await exec('npx @tailwindcss/upgrade -c tailwind.config.js')

    await fs.expectFileToContain(
      'src/index.html',
      html`
        <h1>🤠👋</h1>
        <div class="flex! sm:block! bg-linear-to-t"></div>
      `,
    )

    await fs.expectFileToContain('src/input.css', css`@import 'tailwindcss';`)
  },
)

test(
  'migrate @apply',
  {
    fs: {
      'package.json': json`
        {
          "dependencies": {
            "tailwindcss": "workspace:^",
            "@tailwindcss/upgrade": "workspace:^"
          }
        }
      `,
      'src/index.css': css`
        @import 'tailwindcss';

        .a {
          @apply flex;
        }

        .b {
          @apply !flex;
        }

        .c {
          @apply !flex flex-col! items-center !important;
        }
      `,
    },
  },
  async ({ fs, exec }) => {
    await exec('npx @tailwindcss/upgrade')

    await fs.expectFileToContain(
      'src/index.css',
      css`
        .a {
          @apply flex;
        }

        .b {
          @apply flex!;
        }

        .c {
          @apply flex! flex-col! items-center!;
        }
      `,
    )
  },
)

test(
  'migrate `@tailwind` directives',
  {
    fs: {
      'package.json': json`
        {
          "dependencies": {
            "tailwindcss": "workspace:^",
            "@tailwindcss/upgrade": "workspace:^"
          }
        }
      `,
      'src/index.css': css`
        @tailwind base;

        html {
          color: #333;
        }

        @tailwind components;

        .btn {
          color: red;
        }

        @tailwind utilities;
      `,
    },
  },
  async ({ fs, exec }) => {
    await exec('npx @tailwindcss/upgrade')

    await fs.expectFileToContain('src/index.css', css`@import 'tailwindcss';`)
    await fs.expectFileToContain(
      'src/index.css',
      css`
        @layer base {
          html {
            color: #333;
          }
        }
      `,
    )
    await fs.expectFileToContain(
      'src/index.css',
      css`
        @layer components {
          .btn {
            color: red;
          }
        }
      `,
    )
  },
)

test(
  'migrate `@layer utilities` and `@layer components`',
  {
    fs: {
      'package.json': json`
        {
          "dependencies": {
            "tailwindcss": "workspace:^",
            "@tailwindcss/upgrade": "workspace:^"
          }
        }
      `,
      'src/index.css': css`
        @import 'tailwindcss';

        @layer components {
          .btn {
            @apply rounded-md px-2 py-1 bg-blue-500 text-white;
          }
        }

        @layer utilities {
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }

          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
      `,
    },
  },
  async ({ fs, exec }) => {
    await exec('npx @tailwindcss/upgrade')

    await fs.expectFileToContain(
      'src/index.css',
      css`
        @utility btn {
          @apply rounded-md px-2 py-1 bg-blue-500 text-white;
        }

        @utility no-scrollbar {
          &::-webkit-scrollbar {
            display: none;
          }
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
    )
  },
)

test(
  'migrate utilities in an imported file',
  {
    fs: {
      'package.json': json`
        {
          "dependencies": {
            "tailwindcss": "workspace:^",
            "@tailwindcss/upgrade": "workspace:^"
          }
        }
      `,
      'src/index.css': css`
        @import 'tailwindcss';
        @import './utilities.css' layer(utilities);
      `,
      'src/utilities.css': css`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
    },
  },
  async ({ fs, exec }) => {
    await exec('npx @tailwindcss/upgrade')

    await fs.expectFileToContain(
      'src/index.css',
      css`
        @import 'tailwindcss';
        @import './utilities.css' layer(utilities);
        @import './utilities.twupgrade.css';
      `,
    )

    await fs.expectFileNotToContain(
      'src/utilities.css',
      css`
        @utility no-scrollbar {
          &::-webkit-scrollbar {
            display: none;
          }
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
    )

    await fs.expectFileNotToContain(
      'src/utilities.twupgrade.css',
      css`
        @utility no-scrollbar {
          &::-webkit-scrollbar {
            display: none;
          }
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
    )
  },
)

test.debug(
  'wip it',
  {
    fs: {
      'package.json': json`
        {
          "dependencies": {
            "tailwindcss": "workspace:^",
            "@tailwindcss/cli": "workspace:^",
            "@tailwindcss/upgrade": "workspace:^"
          }
        }
      `,
      'src/index.html': html`
        <div class="hover:thing"></div>
      `,
      'src/index.css': css`
        @import 'tailwindcss/utilities';
        @import './a.css' layer(utilities);
        @import './b.css' layer(components);
      `,
      'src/a.css': css`
        @import './utilities.css';

        .foo-from-a {
          color: red;
        }
      `,
      'src/utilities.css': css`
        #foo {
          --keep: me;
        }

        .foo-from-import {
          color: blue;
        }
      `,
      'src/b.css': css`
        @import './components.css';

        .bar-from-b {
          color: red;
        }
      `,
      'src/components.css': css`
        .bar-from-import {
          color: blue;
        }
      `,
    },
  },
  async ({ fs, exec }) => {
    await exec('npx @tailwindcss/upgrade --force')

    expect(await fs.read('src/index.css')).toMatchInlineSnapshot(`
      "@import 'tailwindcss/utilities' layer(utilities);
      @import './a.css' layer(utilities);
      @import './a.utilities.css';
      @import './b.css';"
    `)
    expect(await fs.read('src/a.css')).toMatchInlineSnapshot(`"@import './utilities.css'"`)
    expect(await fs.read('src/utilities.css')).toMatchInlineSnapshot(`
      "#foo {
        --keep: me;
      }"
    `)
    expect(await fs.read('src/a.utilities.css')).toMatchInlineSnapshot(`
      "

      @utility foo-from-import {
        color: blue;
      }

      @utility foo-from-a {
        color: red;
      }"
    `)
    expect(await fs.read('src/b.css')).toMatchInlineSnapshot(`
      "@utility bar-from-import {
        color: blue;
      }

      @utility bar-from-b {
        color: red;
      }"
    `)

    // await exec('npx @tailwindcss/cli -i src/index.css -o out.css')

    // expect(await fs.read('out.css')).toMatchInlineSnapshot()
  },
)
