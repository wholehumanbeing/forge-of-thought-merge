module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass|svg|jpg|png)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
