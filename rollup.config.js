import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel';
var handlebars = require('rollup-plugin-handlebars-plus')
var rootImport = require('rollup-plugin-root-import')

var partialRoots = [`./src/views/`]

const production = !process.env.ROLLUP_WATCH

export default {
    input: 'src/main.js',
    external: ['jquery'],
    output: {
        sourcemap: true,
        format: 'iife',
        file: 'public/content-script.js',
        globals: {
            jquery: '$',
        },
    },
    plugins: [
        // If you have external dependencies installed from
        // npm, you'll most likely need these plugins. In
        // some cases you'll need additional configuration -
        // consult the documentation for details:
        // https://github.com/rollup/plugins/tree/master/packages/commonjs
        resolve({
            browser: true,
            dedupe: ['svelte'],
        }),
        babel({
            exclude: 'node_modules/**'
          }),
        commonjs(),

        rootImport({
            root: partialRoots,
        }),

        handlebars({
            partialRoot: partialRoots,
            jquery: 'jquery',
        }),

        // In dev mode, we need to run webExt after
        // the bundle has been generated
        !production && serve(),

        // If we're building for production (npm run build
        // instead of npm run dev), minify
        production && terser(),
    ],
    watch: {
        clearScreen: false,
    },
}

function serve() {
    let started = false

    return {
        writeBundle() {
            if (!started) {
                started = true

                require('child_process').spawn('web-ext', ['run'], {
                    stdio: ['ignore', 'inherit', 'inherit'],
                    shell: true,
                })
            }
        },
    }
}
