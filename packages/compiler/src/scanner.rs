use swc_core::ecma::ast::{Expr, Ident, MemberExpr};
use swc_core::ecma::visit::{Visit, VisitWith};
use crate::triggers::{Trigger, CLIENT_TRIGGERS};

/// Walks the AST of a module and collects all detected triggers.
pub struct CapabilityScanner {
    pub triggers: Vec<Trigger>,
}

impl CapabilityScanner {
    pub fn new() -> Self {
        Self { triggers: vec![] }
    }

    /// Returns true if any client triggers were detected.
    pub fn is_client(&self) -> bool {
        self.triggers
            .iter()
            .any(|t| matches!(t, Trigger::Client(_)))
    }
}

impl Visit for CapabilityScanner {
    /// Called for every identifier in the AST.
    fn visit_ident(&mut self, ident: &Ident) {
        let name = ident.sym.as_ref();
        if CLIENT_TRIGGERS.contains(&name) {
            self.triggers.push(Trigger::Client(name.to_string()));
        }
    }

    /// Called for member expressions like `window.location` or `document.getElementById`.
    fn visit_member_expr(&mut self, expr: &MemberExpr) {
        if let Expr::Ident(obj) = expr.obj.as_ref() {
            let name = obj.sym.as_ref();
            if CLIENT_TRIGGERS.contains(&name) {
                self.triggers.push(Trigger::Client(name.to_string()));
            }
        }
        // Continue walking into nested expressions
        expr.visit_children_with(self);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use swc_core::common::{FileName, SourceMap, sync::Lrc};
    use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax};

    fn scan(src: &str) -> CapabilityScanner {
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

        let mut scanner = CapabilityScanner::new();
        scanner.visit_module(&module);
        scanner
    }

    #[test]
    fn detects_window() {
        let scanner = scan("const w = window.location.href;");
        assert!(scanner.is_client());
        assert!(scanner.triggers.iter().any(|t| t == &Trigger::Client("window".into())));
    }

    #[test]
    fn detects_document() {
        let scanner = scan("document.getElementById('app');");
        assert!(scanner.is_client());
    }

    #[test]
    fn detects_local_storage() {
        let scanner = scan("localStorage.setItem('key', 'value');");
        assert!(scanner.is_client());
    }

    #[test]
    fn clean_module_has_no_triggers() {
        let scanner = scan("const x = 1 + 2;");
        assert!(!scanner.is_client());
        assert!(scanner.triggers.is_empty());
    }
}
