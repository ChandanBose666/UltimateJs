Nexus.js: Master Action Plan (Task-by-Task)
Phase 1: The "Nervous System" (Environment Setup)
[ ] Task 1.1: Initialize the Monorepo. Create the folder structure, package.json (Root), and pnpm-workspace.yaml.

[ ] Task 1.2: Initialize the Rust Compiler. Run cargo new --lib packages/compiler.

[ ] Task 1.3: Configure Cargo.toml. Add dependencies for swc_core, serde, and wasm-bindgen.

[ ] Task 1.4: Setup the Dev Pipeline. Configure Turborepo so that running pnpm dev starts the TypeScript watcher and the Rust compiler simultaneously.

Phase 2: The "Slicer" (Pillar 1: Fluid Execution)
[ ] Task 2.1: Build the "Capability Scanner." Write a Rust function (SWC Visitor) that identifies window, document, and localStorage as Client Triggers.

[ ] Task 2.2: Build the "Secret Scanner." Write a Rust function that identifies process.env and database imports as Server Triggers.

[ ] Task 2.3: Implement the "Slicing" Logic. Create the logic to take a file and output two versions to the .nexus/ directory: module.server.js and module.client.js.

[ ] Task 2.4: Create the Vite Plugin. Write the TS code that tells Vite: "If you see a Nexus component, don't use the standard loader—use our Rust Slicer."

Phase 3: The "Universal Language" (Pillar 3: Semantic UI)
[ ] Task 3.1: Define the Core Interface. Write the TypeScript types for the four main primitives: <Stack>, <Text>, <Action>, and <Input>.

[ ] Task 3.2: Build the Web Renderer. Create the component logic that turns <Stack> into a div with Tailwind/Flexbox classes.

[ ] Task 3.3: Build the Mobile Renderer. Create the logic that maps <Stack> to a React Native View.

[ ] Task 3.4: Build the Email Renderer. Write the transpiler that turns the Semantic UI into MJML/Table-based HTML.

Phase 4: The "Invisible Pipe" (Pillar 2: Zero-Fetch Sync)
[ ] Task 4.1: The Wasm Bridge. Compile the Automerge Rust library into a WebAssembly module that the browser can run.

[ ] Task 4.2: Create the useSync Hook. Write the TS hook that connects a UI component to the Wasm-powered CRDT state.

[ ] Task 4.3: Setup the Binary Socket. Build the server-side WebSocket handler (using Bun or Node) to broadcast "Deltas" to all connected clients.

[ ] Task 4.4: Implement "Optimistic Rollbacks." Write the logic that reverts the local state if the server sends a "Rejection Frame."

Phase 5: The "Sidecar" & Polish (Performance & DX)
[ ] Task 5.1: Build the Sidecar Worker. Create the Partytown-style Web Worker script that intercepts 3rd-party tracking scripts.

[ ] Task 5.2: Build the "Nexus Inspector." Create a browser-based overlay that shows which components are Server vs. Client in real-time.

[ ] Task 5.3: Create the "Snapshot" Boundary. Implement the advanced Error Boundary that allows a component to "Time Travel" back to its last working state.