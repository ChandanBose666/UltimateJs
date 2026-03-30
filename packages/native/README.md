# @blazefw/native

BlazeFW native renderer — maps the four semantic primitives (`Stack`, `Text`, `Action`, `Input`) to React Native components. Write your UI once with BlazeFW primitives and render it on iOS, Android, and the web without any platform-specific code.

## Installation

```bash
npm install @blazefw/native @blazefw/primitives
# peer dependencies
npm install react react-native
```

## Quick start

```tsx
import { Stack, Text, Action, Input } from '@blazefw/native';

function ProfileCard({ user }) {
  return (
    <Stack direction="column" gap={3} padding={4} background="surface" radius="md">
      <Text variant="title" weight="semibold">{user.name}</Text>
      <Text variant="caption" color="muted">{user.email}</Text>
      <Action variant="primary" onPress={() => editProfile(user.id)}>
        Edit Profile
      </Action>
    </Stack>
  );
}
```

## Components

### `<Stack>` — View-based layout

Renders as a React Native `View` with `flexDirection`, `alignItems`, `justifyContent`, and `gap` applied as StyleSheet props.

```tsx
<Stack
  direction="column"     // 'row' | 'column' | 'row-reverse' | 'column-reverse'
  align="center"         // 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify="start"        // 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  gap={2}                // dp units (2 = 8dp)
  padding={4}            // inner padding (also paddingX, paddingY, etc.)
  background="surface"   // ColorToken resolved to hex via DEFAULT_THEME
  radius="lg"            // 'none' | 'sm' | 'md' | 'lg' | 'full'
  wrap
>
  {children}
</Stack>
```

### `<Text>` — Native typography

Renders as a React Native `Text` component.

```tsx
<Text variant="heading" weight="bold" color="primary">
  Hello from native
</Text>
```

| Variant | Approximate size |
|---|---|
| `display` | 36sp |
| `title` | 20sp |
| `heading` | 24sp |
| `body` | 16sp |
| `label` | 14sp |
| `caption` | 12sp |
| `code` | 14sp monospace |
| `overline` | 12sp uppercase |

### `<Action>` — Pressable button

Renders as `Pressable` (with `ActivityIndicator` for loading state). All URLs open via `Linking.openURL()`.

```tsx
// Button
<Action variant="primary" onPress={handleSubmit} loading={isLoading}>
  Save changes
</Action>

// External link (opens in browser via Linking)
<Action variant="link" href="https://blazefw.dev">
  Documentation
</Action>
```

> **Note:** `external` and `as` props are web-only and are silently ignored in native.

### `<Input>` — TextInput field

Renders as `TextInput` with ARIA accessibility attributes for new-arch React Native.

```tsx
<Input
  type="password"
  variant="outline"
  fieldLabel="Password"
  placeholder="Enter password"
  error={errors.password}
  required
  onChange={(value) => setPassword(value)}
  onSubmit={(value) => handleLogin(value)}
/>
```

## Theming

Native uses a plain `DEFAULT_THEME` object (no CSS variables). Import and read it directly:

```ts
import { DEFAULT_THEME } from '@blazefw/native';

// DEFAULT_THEME is Record<ColorToken, string> (hex colors)
console.log(DEFAULT_THEME.primary);    // '#6366f1'
console.log(DEFAULT_THEME.surface);    // '#1e1e2e'
console.log(DEFAULT_THEME.danger);     // '#ef4444'
```

Override by wrapping with a custom theme provider (planned for v0.2).

## Spacing

All `SpaceValue` integers map to `n × 4dp` (density-independent pixels):

| Token | dp |
|---|---|
| `1` | 4dp |
| `2` | 8dp |
| `4` | 16dp |
| `6` | 24dp |
| `8` | 32dp |
