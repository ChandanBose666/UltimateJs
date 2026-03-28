import { defineConfig } from "vite";

// TODO: Import and wire up the Nexus compiler plugin once built
// import { nexusPlugin } from "@nexus/compiler";

export default defineConfig({
  plugins: [
    // nexusPlugin() will be added here in Phase 2 (Task 2.4)
    // It will intercept .nexus component files and route them
    // through the Rust Slicer instead of Vite's default loader.
  ],
  build: {
    outDir: "dist",
    target: "esnext",
  },
});
