/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    // Resolve @nexus/crdt to the manual mock (WASM can't run in Node)
    "^@nexus/crdt$": "<rootDir>/__mocks__/@nexus/crdt.js",
    // Strip .js extensions so ts-jest can resolve .ts sources
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "bundler",
        },
      },
    ],
  },
};
