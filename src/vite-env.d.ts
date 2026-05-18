/// <reference types="vite/client" />

// Allow importing markdown files as raw strings via ?raw
declare module '*.md?raw' {
  const content: string;
  export default content;
}
