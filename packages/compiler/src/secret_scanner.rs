use swc_core::ecma::ast::{CallExpr, Callee, Expr, Ident, ImportDecl, Lit, MemberExpr};
use swc_core::ecma::visit::{Visit, VisitWith};
use crate::triggers::{Trigger, SERVER_ENV_TRIGGERS, SERVER_IMPORT_TRIGGERS};

/// Walks the AST and collects server-only triggers:
/// - `process.env` access
/// - imports from known server/database packages
pub struct SecretScanner {
    pub triggers: Vec<Trigger>,
}

impl SecretScanner {
    pub fn new() -> Self {
        Self { triggers: vec![] }
    }

    /// Returns true if any server triggers were detected.
    pub fn is_server_only(&self) -> bool {
        !self.triggers.is_empty()
    }

    fn check_import(&mut self, src: &str) {
        // Match exact names and prefix-based names (e.g. "node:fs" matches "fs")
        let normalized = src.strip_prefix("node:").unwrap_or(src);
        if SERVER_IMPORT_TRIGGERS
            .iter()
            .any(|&t| t == normalized || normalized.starts_with(t))
        {
            self.triggers.push(Trigger::Server(src.to_string()));
        }
    }
}

impl Visit for SecretScanner {
    /// Catches: import pg from 'pg'  /  import { PrismaClient } from '@prisma/client'
    fn visit_import_decl(&mut self, decl: &ImportDecl) {
        // `value` is Wtf8Atom (no AsRef<str>); `raw` is Option<Atom> which does have AsRef<str>.
        // raw contains the original source token including quotes, e.g. `"pg"` or `'fs'`.
        if let Some(raw) = decl.src.raw.as_ref() {
            let src = raw.as_ref().trim_matches(|c: char| c == '"' || c == '\'');
            self.check_import(src);
        }
    }

    /// Catches: require('pg') / require('fs')
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Callee::Expr(callee_expr) = &call.callee {
            if let Expr::Ident(Ident { sym, .. }) = callee_expr.as_ref() {
                if sym.as_ref() == "require" {
                    if let Some(first_arg) = call.args.first() {
                        if let Expr::Lit(Lit::Str(s)) = first_arg.expr.as_ref() {
                            if let Some(raw) = s.raw.as_ref() {
                                let src = raw.as_ref().trim_matches(|c: char| c == '"' || c == '\'');
                                self.check_import(src);
                            }
                        }
                    }
                }
            }
        }
        call.visit_children_with(self);
    }

    /// Catches: process.env.DATABASE_URL / process.env['SECRET']
    fn visit_member_expr(&mut self, expr: &MemberExpr) {
        if let Expr::Ident(obj) = expr.obj.as_ref() {
            if SERVER_ENV_TRIGGERS.contains(&obj.sym.as_ref()) {
                self.triggers
                    .push(Trigger::Server(obj.sym.as_ref().to_string()));
            }
        }
        expr.visit_children_with(self);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use swc_core::common::{FileName, SourceMap, sync::Lrc};
    use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax};

    fn scan(src: &str) -> SecretScanner {
        let cm: Lrc<SourceMap> = Default::default();
        let fm = cm.new_source_file(FileName::Anon.into(), src.to_string());
        let lexer = Lexer::new(
            Syntax::Es(Default::default()),
            Default::default(),
            StringInput::from(&*fm),
            None,
        );
        let mut parser = Parser::new_from(lexer);
        let module = parser.parse_module().expect("failed to parse");

        let mut scanner = SecretScanner::new();
        scanner.visit_module(&module);
        scanner
    }

    #[test]
    fn detects_process_env() {
        let s = scan("const url = process.env.DATABASE_URL;");
        assert!(s.is_server_only());
        assert!(s.triggers.iter().any(|t| t == &Trigger::Server("process".into())));
    }

    #[test]
    fn detects_pg_import() {
        let s = scan("import pg from 'pg';");
        assert!(s.is_server_only());
        assert!(s.triggers.iter().any(|t| t == &Trigger::Server("pg".into())));
    }

    #[test]
    fn detects_prisma_import() {
        let s = scan("import { PrismaClient } from '@prisma/client';");
        assert!(s.is_server_only());
        assert!(s.triggers.iter().any(|t| t == &Trigger::Server("@prisma/client".into())));
    }

    #[test]
    fn detects_require_fs() {
        let s = scan("const fs = require('fs');");
        assert!(s.is_server_only());
        assert!(s.triggers.iter().any(|t| t == &Trigger::Server("fs".into())));
    }

    #[test]
    fn detects_node_protocol_import() {
        let s = scan("import { readFile } from 'node:fs';");
        assert!(s.is_server_only());
    }

    #[test]
    fn clean_client_module_has_no_server_triggers() {
        let s = scan("const x = document.title;");
        assert!(!s.is_server_only());
        assert!(s.triggers.is_empty());
    }
}
