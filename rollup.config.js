import resolve from 'rollup-plugin-node-resolve';
import builtins from 'builtin-modules';
import json from 'rollup-plugin-json';
//import { terser } from 'rollup-plugin-terser';

export default [
    {
        input: 'queue.js',
        external: builtins,
        plugins: [
            resolve({
                preferBuiltins: true
            }),
            json()
        ]
    }
];
