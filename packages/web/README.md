# @blazefw/web

BlazeFW web renderer — maps the four semantic primitives (`Stack`, `Text`, `Action`, `Input`) to React components with inline styles and CSS custom property theming. No Tailwind, no CSS-in-JS runtime, no configuration required.

## Installation

```bash
npm install @blazefw/web @blazefw/primitives
# peer dependency
npm install react
```

## Quick start

```tsx
import { Stack, Text, Action, Input } from '@blazefw/web';
import { injectTheme } from '@blazefw/web';

// Inject CSS custom properties at your app root (once)
injectTheme();

function LoginForm() {
  return (
    <Stack direction="column" gap={4} padding={6} background="surface" radius="md">
      <Text variant="title">Sign in</Text>
      <Input
        type="email"
        fieldLabel="Email"
        placeholder="you@example.com"
        onChange={setEmail}
      />
      <Input
        type="password"
        fieldLabel="Password"
        onChange={setPassword}
      />
      <Action variant="primary" fullWidth onPress={handleSubmit} loading={isSubmitting}>
        Sign in
      </Action>
      <Action variant="link" href="/forgot-password">
        Forgot password?
      </Action>
    </Stack>
  );
}
```

## Components

### `<Stack>` — Flexbox layout

```tsx
<Stack
  direction="row"           // 'row' | 'column' | 'row-reverse' | 'column-reverse'
  align="center"            // cross-axis: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify="between"         // main-axis: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  gap={4}                   // space between children (4 = 16px)
  padding={6}               // inner padding (also paddingX, paddingY, paddingTop, paddingBottom, paddingLeft, paddingRight)
  background="surface"      // ColorToken or raw hex/rgb
  radius="md"               // 'none' | 'sm' | 'md' | 'lg' | 'full'
  wrap                      // enable flex-wrap
  flex={1}                  // flex-grow
  as="section"              // override HTML element (default: 'div')
>
  {children}
</Stack>
```

### `<Text>` — Typography

```tsx
<Text
  variant="heading"   // 'body' | 'caption' | 'label' | 'heading' | 'title' | 'display' | 'code' | 'overline'
  as="h1"             // override HTML element
  weight="bold"       // 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  color="primary"     // ColorToken or raw color
  align="center"      // 'left' | 'center' | 'right'
  maxLines={2}        // clamp to N lines with ellipsis
  underline
>
  Welcome to BlazeFW
</Text>
```

**Variant defaults:**

| Variant | Default tag | Size |
|---|---|---|
| `body` | `<p>` | 16px |
| `caption` | `<span>` | 12px |
| `label` | `<span>` | 14px |
| `heading` | `<h2>` | 24px |
| `title` | `<h1>` | 20px |
| `display` | `<h1>` | 36px |
| `code` | `<code>` | 14px monospace |
| `overline` | `<span>` | 12px uppercase |

### `<Action>` — Buttons and links

```tsx
// Button
<Action variant="primary" size="md" onPress={handleClick} loading={isPending}>
  Submit
</Action>

// Link
<Action variant="link" href="https://blazefw.dev" external>
  Learn more →
</Action>

// Danger
<Action variant="danger" onPress={handleDelete} disabled={!canDelete}>
  Delete account
</Action>
```

**Variants:** `primary` · `secondary` · `ghost` · `danger` · `link`
**Sizes:** `xs` · `sm` · `md` · `lg`

### `<Input>` — Form fields

```tsx
<Input
  type="email"                      // 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  variant="outline"                 // 'outline' | 'filled' | 'underline'
  fieldLabel="Email address"
  placeholder="you@example.com"
  hint="We'll never share your email."
  error={errors.email}              // shows red error state + message
  leadingIcon="✉"
  trailingIcon="✓"
  required
  onChange={(value) => setEmail(value)}
  onSubmit={(value) => handleSubmit(value)}
/>

// Multiline textarea
<Input
  type="text"
  multiline
  rows={4}
  fieldLabel="Bio"
  onChange={setBio}
/>
```

## Theming

Colors use CSS custom properties. Override any token on `:root`:

```css
:root {
  --blazefw-primary: #6366f1;
  --blazefw-primary-fg: #ffffff;
  --blazefw-surface: #1e1e2e;
  --blazefw-background: #13131a;
  --blazefw-border: #2e2e3e;
  --blazefw-danger: #ef4444;
  --blazefw-success: #22c55e;
  --blazefw-muted: #3f3f50;
  --blazefw-muted-fg: #a0a0b0;
}
```

Or use `injectTheme(customTokens?)` to set tokens programmatically:

```ts
import { injectTheme } from '@blazefw/web';

injectTheme({
  primary: '#6366f1',
  surface: '#1e1e2e',
});
```

## Spacing scale

All `SpaceValue` integers map to `n × 4px`:

| Token | px |
|---|---|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `6` | 24px |
| `8` | 32px |
| `12` | 48px |
| `16` | 64px |
