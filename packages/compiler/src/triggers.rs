/// Identifies what environment a module requires.
#[derive(Debug, Clone, PartialEq)]
pub enum Trigger {
    /// Requires browser APIs — must run on the client.
    Client(String),
    /// Requires server-only APIs — must run on the server.
    Server(String),
}

/// Browser globals that indicate a module is client-only.
pub const CLIENT_TRIGGERS: &[&str] = &["window", "document", "localStorage"];

/// Server-only indicators: environment access and database package imports.
pub const SERVER_ENV_TRIGGERS: &[&str] = &["process"];

/// Database/server-only package prefixes that must never run in the browser.
pub const SERVER_IMPORT_TRIGGERS: &[&str] = &[
    "pg",
    "mysql",
    "mysql2",
    "mongoose",
    "prisma",
    "@prisma/client",
    "sequelize",
    "typeorm",
    "drizzle-orm",
    "better-sqlite3",
    "knex",
    "fs",
    "path",
    "os",
    "child_process",
    "crypto",
    "net",
    "http",
    "https",
    "stream",
];
