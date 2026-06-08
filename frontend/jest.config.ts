import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Stub Next.js built-ins that don't work in jsdom
    "^next/image$": "<rootDir>/src/__mocks__/next-image.tsx",
    "^next/link$": "<rootDir>/src/__mocks__/next-link.tsx",
    "^next/navigation$": "<rootDir>/src/__mocks__/next-navigation.ts",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup-after.ts"],
};

export default config;
