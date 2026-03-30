# @blazefw/email

BlazeFW email renderer — maps the four semantic primitives (`Stack`, `Text`, `Action`, `Input`) to MSO-safe HTML strings. Generates table-based layouts compatible with Outlook, Gmail, Apple Mail, and all major email clients. No JSX, no React — pure TypeScript string composition.

## Installation

```bash
npm install @blazefw/email @blazefw/primitives
```

## Quick start

```ts
import { Stack, Text, Action, wrapDocument } from '@blazefw/email';

const html = wrapDocument(
  Stack({ direction: 'column', gap: 4, padding: 6, background: 'surface' }, [
    Text({ variant: 'title', weight: 'bold' }, 'Welcome to BlazeFW'),
    Text({ variant: 'body', color: 'muted' }, 'You have been invited to join the team.'),
    Action({ variant: 'primary', href: 'https://app.blazefw.dev/invite/abc123' }, 'Accept Invitation'),
    Text({ variant: 'caption', color: 'muted' }, 'This link expires in 48 hours.'),
  ]),
  { previewText: 'You have a new invitation', title: 'BlazeFW Invitation' }
);

// Send `html` with any email provider (Resend, SendGrid, SES, Nodemailer, etc.)
```

## API

### `Stack(props, children)` — Table-based layout

Generates a `<table role="presentation">` layout (CSS `flexbox` and `grid` are unsupported in Outlook).

```ts
import { Stack } from '@blazefw/email';

// Column layout (default)
const column = Stack(
  { direction: 'column', gap: 3, padding: 4, background: 'surface', radius: 'md' },
  [child1, child2, child3]
);

// Row layout — children are expected to be <td> elements
const row = Stack(
  { direction: 'row', gap: 2 },
  [cell1, cell2]
);
```

> **Layout note:** `gap` in email is implemented as `padding` on each `<td>` — CSS `gap` has no email client support.

### `Text(props, children)` — Typography

```ts
import { Text } from '@blazefw/email';

Text({ variant: 'heading', color: 'primary', align: 'center' }, 'Monthly Report')
Text({ variant: 'body' }, 'Here is a summary of activity this month.')
Text({ variant: 'caption', color: 'muted' }, 'Sent by BlazeFW notifications')
Text({ variant: 'code' }, 'npm install @blazefw/web')
```

> Children are run through `escapeHtml()` automatically — safe to pass untrusted content.

### `Action(props, children)` — Link button

Always renders as `<a>` (no `<button>` in email). Defaults to `href="#"` when no href is provided.

```ts
import { Action } from '@blazefw/email';

Action({ variant: 'primary', href: 'https://app.blazefw.dev/confirm' }, 'Confirm Email')
Action({ variant: 'ghost', href: 'https://app.blazefw.dev/unsubscribe' }, 'Unsubscribe')
```

### `Input(props)` — Static form placeholder

Renders a **visual-only** form field (label + underline + error/hint text). Email clients don't support interactive `<input>` elements — use this to show a form preview that links to a web page.

```ts
import { Input } from '@blazefw/email';

Input({
  fieldLabel: 'New password',
  placeholder: '••••••••',
  hint: 'Minimum 8 characters',
  variant: 'underline',
})
```

### `wrapDocument(body, options?)` — Full email document

Wraps your email body in a complete MSO-safe HTML document with:
- `<!DOCTYPE html>` + `<html lang="en">` boilerplate
- `<meta>` charset, viewport, and X-UA-Compatible
- MSO conditional comments for Outlook VML rendering
- Preview text hidden span
- Centering shell table for consistent rendering

```ts
import { wrapDocument } from '@blazefw/email';

const fullHtml = wrapDocument(bodyHtml, {
  previewText: 'Your invoice is ready',   // shown in inbox preview line
  title: 'Invoice #1042',                 // <title> tag
  lang: 'en',                             // <html lang="..."> (default: 'en')
  bgColor: '#f4f4f8',                     // outer background (default: #f4f4f8)
});
```

## Sending with Resend

```ts
import { Resend } from 'resend';
import { Stack, Text, Action, wrapDocument } from '@blazefw/email';

const resend = new Resend(process.env.RESEND_API_KEY);

const html = wrapDocument(
  Stack({ direction: 'column', gap: 4, padding: 6 }, [
    Text({ variant: 'title' }, 'Reset your password'),
    Action({ variant: 'primary', href: resetUrl }, 'Reset Password'),
  ]),
  { previewText: 'Reset your BlazeFW password' }
);

await resend.emails.send({
  from: 'noreply@blazefw.dev',
  to: user.email,
  subject: 'Reset your password',
  html,
});
```

## Color tokens

All `ColorToken` values resolve to hex via the built-in `DEFAULT_THEME` (no CSS variables in email clients):

| Token | Default hex |
|---|---|
| `background` | `#13131a` |
| `surface` | `#1e1e2e` |
| `primary` | `#6366f1` |
| `primary-fg` | `#ffffff` |
| `danger` | `#ef4444` |
| `muted` | `#3f3f50` |
| `muted-fg` | `#a0a0b0` |
