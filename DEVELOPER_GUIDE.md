# 👨‍💻 Developer Guide

This guide explains how to use the new utilities and improvements implemented in the Warble project.

## 📚 Table of Contents

- [UI Design System](#-ui-design-system)
- [Security](#-security)
- [Custom Hooks](#-custom-hooks)
- [Tests](#-tests)
- [Code Patterns](#-code-patterns)
- [CI/CD](#-cicd)

---

## 🎨 UI Design System

### Blueprint Theme

Warble uses the **Blueprint** theme — sepia/cream tones with a red accent and sharp corners. The theme is applied via `data-theme="blueprint"` on `<html>` and managed by `src/hooks/useTheme.ts`.

All colors are semantic CSS custom properties defined in `src/index.css`. Use the Tailwind token classes (e.g., `bg-w-bg`, `text-w-fg`, `border-w-border`) instead of raw color values.

```typescript
import { useTheme } from './hooks/useTheme';

function App() {
  const { theme, isDark } = useTheme(); // theme = 'blueprint', isDark = false
  // Theme is automatically applied to document.documentElement
}
```

### Button Component

All interactive buttons must use `src/components/ui/Button.tsx`. Never use raw `<button>` elements in new code.

```typescript
import { Button } from '../components/ui/Button'

// Variants
<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="outline">Preview</Button>
<Button variant="ghost" size="sm">Clear filters</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// Full-width (e.g., modal submit buttons)
<Button variant="primary" fullWidth>Submit</Button>

// With icon
<Button variant="primary">
  <SaveIcon className="w-4 h-4" />
  Save
</Button>

// Disabled / loading
<Button variant="primary" disabled={isLoading}>
  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
</Button>
```

The component forwards all native `<button>` attributes (onClick, type, aria-*, etc.).

### Connection Drawer Pattern

The USB programming panel uses a slide-in drawer (not a modal). To show/hide:

```typescript
// In App.tsx state
const [showConnectionPanel, setShowConnectionPanel] = useState(false)

// Trigger from any tab (e.g. status bar "USB" button, or after write error)
setShowConnectionPanel(true)

// The drawer itself
<div className={`fixed right-0 top-0 h-full z-50 w-full max-w-sm ... transition-transform duration-300 ${
  showConnectionPanel ? 'translate-x-0' : 'translate-x-full'
}`}>
  <RadioProgrammer
    onDataLoaded={() => setShowConnectionPanel(false)}
    // ...
  />
</div>
```

When radio data is loaded successfully, the drawer auto-closes.

### Breadcrumb Bar

A persistent bar above the main content area shows:
- Ready status indicator (green dot when buffer loaded)
- Active radio model name
- Codeplug > filename > saved/unsaved indicator
- Connect radio button (opens the connection drawer)

### Bottom Status Bar

A persistent footer showing:
- Channel count / max capacity
- Frequency limits for the selected radio
- Save status (unsaved/saved)

### Frequency Validation UX

Invalid frequencies show a `⚠` warning icon **inside the cell** (so it persists through AG Grid row selection) plus a browser tooltip. Implementation in `MemoryGrid.tsx`:

```typescript
// cellRenderer returns an HTML string — do NOT use React components here
cellRenderer: (params: any) => {
  const val = params.value
  const isInvalid = /* ... validation check ... */
  if (isInvalid) {
    return `<span style="display:flex;align-items:center;gap:5px">
      <span style="font-size:11px;color:#f59e0b">⚠</span>${val}
    </span>`
  }
  return val
}
tooltipValueGetter: (params: any) => isInvalid ? t('grid.alerts.outOfRange') : null
// Also add enableBrowserTooltips={true} to <AgGridReact>
```

---

## 🔒 Security

### Import Utilities

```typescript
import {
  validateFileSize,
  validateImgBuffer,
  sanitizeHtml,
  sanitizeChannelName,
  escapeCsvField,
  validateFrequency,
  sleep,
  MAX_FILE_SIZE
} from './lib/security';
```

### Validate Uploaded Files

```typescript
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const result = event.target?.result;
    if (!result) return;

    const buffer = new Uint8Array(result as ArrayBuffer);

    try {
      // Validate size (throws Error if > 10MB)
      validateFileSize(buffer);

      // Validate not corrupt
      if (file.name.endsWith('.img')) {
        validateImgBuffer(buffer);
      }

      // Process file...
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  reader.readAsArrayBuffer(file);
};
```

### Sanitize Channel Names

```typescript
import { sanitizeChannelName } from './lib/security';

// When importing from CSV or user input
const safeName = sanitizeChannelName(userInput, 7); // Truncate to 7 characters

const channel: MemoryChannel = {
  name: safeName, // Safe against XSS
  // ...
};
```

### Export Safe CSV

```typescript
import { escapeCsvField } from './lib/security';

const exportToCsv = (channels: MemoryChannel[]) => {
  let csv = "Location,Name,Frequency\n";

  channels.forEach(ch => {
    // Escape each field to prevent formula injection
    csv += `${escapeCsvField(ch.index)},`;
    csv += `${escapeCsvField(ch.name)},`;
    csv += `${escapeCsvField(ch.frequency)}\n`;
  });

  // Create Blob and download...
};
```

### Validate Frequencies

```typescript
import { validateFrequency } from './lib/security';

const limits = [
  { min: 136, max: 174 }, // VHF
  { min: 400, max: 520 }  // UHF
];

const isValid = validateFrequency(145.5, limits); // true
const isInvalid = validateFrequency(300, limits); // false
```

### Async Sleep/Delay

```typescript
import { sleep } from './lib/security';

async function communicateWithRadio() {
  await serial.write(command);

  // Wait 100ms to stabilize buffer
  await sleep(100);

  const response = await serial.readBytes(8);
}
```

---

## 🎣 Custom Hooks

### useToast

Hook for displaying notifications instead of `alert()`.

```typescript
import { useToast } from './hooks/useToast';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Operation completed!');
  };

  const handleError = () => {
    toast.error('Something went wrong');
  };

  const handleLoading = async () => {
    const loadingId = toast.loading('Processing...');

    try {
      await longOperation();
      toast.dismiss(loadingId);
      toast.success('Done!');
    } catch (error) {
      toast.dismiss(loadingId);
      toast.error('Error!');
    }
  };

  // With Promise wrapper
  const handlePromise = () => {
    const operation = fetchData();

    toast.promise(operation, {
      loading: 'Loading...',
      success: 'Data loaded!',
      error: 'Error loading'
    });
  };

  return (
    <button onClick={handleSuccess}>Test Toast</button>
  );
}
```

### useFrequencyValidation

Hook for validating frequencies according to hardware limits.

```typescript
import { useFrequencyValidation } from './hooks/useFrequencyValidation';

function FrequencyInput({ limits }: { limits: { min: number; max: number }[] }) {
  const validateFreq = useFrequencyValidation(limits);

  const handleChange = (value: string) => {
    const freq = parseFloat(value);

    if (validateFreq(freq)) {
      // Valid frequency
      setError(null);
    } else {
      setError('Frequency out of allowed limits');
    }
  };

  return <input onChange={e => handleChange(e.target.value)} />;
}
```

### useFrequencyFormatter

Hook with additional formatting functions.

```typescript
import { useFrequencyFormatter } from './hooks/useFrequencyValidation';

function FrequencyEditor({ limits }: Props) {
  const { format, isValid, validate } = useFrequencyFormatter(limits);

  const handleBlur = (value: string) => {
    const formatted = format(value); // null if invalid

    if (formatted) {
      setFrequency(formatted); // "145.500000"
    } else {
      toast.error('Invalid frequency');
    }
  };

  return (
    <input
      onBlur={e => handleBlur(e.target.value)}
      className={isValid(frequency) ? 'valid' : 'invalid'}
    />
  );
}
```

---

## 🧪 Tests

### Run Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# With interactive UI
npm run test:ui

# With coverage report
npm run test:coverage
```

**Note**: Requires Node.js 20+

### Write New Tests

#### Basic Unit Test

```typescript
// src/__tests__/myFunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../lib/myModule';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction(42);
    expect(result).toBe(84);
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(-1)).toThrow();
  });
});
```

#### React Component Test

```typescript
// src/__tests__/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

---

## 📋 Code Patterns

### Error Handling with Type Guards

```typescript
// ❌ BAD
try {
  await operation();
} catch (e: any) {
  console.error(e.message); // 'any' is not safe
}

// ✅ GOOD
try {
  await operation();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
    toast.error(t('errors.operation', { msg: error.message }));
  } else {
    console.error('Unknown error:', error);
    toast.error(t('errors.unknown'));
  }
}
```

### Functions with JSDoc

```typescript
/**
 * Converts a frequency from MHz to Hz
 *
 * @param freqMhz - Frequency in MHz (example: 145.5)
 * @returns Frequency in Hz (example: 145500000)
 * @throws {RangeError} If the frequency is negative
 *
 * @example
 * mhzToHz(145.5) // returns 145500000
 * mhzToHz(446.0) // returns 446000000
 */
export function mhzToHz(freqMhz: number): number {
  if (freqMhz < 0) {
    throw new RangeError('Frequency cannot be negative');
  }
  return Math.round(freqMhz * 1_000_000);
}
```

### Constants Instead of Magic Numbers

```typescript
// ❌ BAD
for (let i = 0; i < 128; i++) {
  const offset = 0x0008 + (i * 16);
  // What does 128 mean? And 0x0008? And 16?
}

// ✅ GOOD
const UV5R_CHANNEL_COUNT = 128;        // Maximum number of channels
const CHANNEL_MEMORY_START = 0x0008;   // Initial channel offset
const CHANNEL_STRUCT_SIZE = 16;        // Bytes per channel

for (let i = 0; i < UV5R_CHANNEL_COUNT; i++) {
  const offset = CHANNEL_MEMORY_START + (i * CHANNEL_STRUCT_SIZE);
}
```

### Input Validation

```typescript
function processChannel(channel: MemoryChannel) {
  // Validate frequency
  const freq = parseFloat(channel.frequency);
  if (!validateFrequency(freq, limits)) {
    throw new Error(`Invalid frequency: ${freq}`);
  }

  // Sanitize name
  const safeName = sanitizeChannelName(channel.name);

  // Process with safe data...
}
```

---

## 🔄 CI/CD

### GitHub Actions

The project has an automatic CI/CD pipeline at `.github/workflows/ci.yml`.

#### What does the pipeline do?

1. **Lint**: Runs ESLint to detect code issues
2. **TypeScript Check**: Verifies there are no type errors
3. **Build**: Compiles the project with Vite
4. **Tests**: Runs all unit tests
5. **Security Audit**: Checks vulnerabilities with `npm audit`

#### When does it run?

- On every `push` to `main` or `develop`
- On every `pull request` to `main`

#### Matrix Testing

The pipeline tests with multiple Node.js versions:
- Node 20.x
- Node 22.x

### Run Locally

You can run the same CI checks locally:

```bash
# Lint
npm run lint

# TypeScript check
npx tsc --noEmit

# Build
npm run build

# Tests
npm test

# Security audit
npm audit
```

### Fix Issues

If CI fails, you can view the logs in GitHub Actions and fix:

```bash
# Autofix lint (some issues)
npx eslint . --fix

# View security issues
npm audit

# Fix vulnerabilities (careful with breaking changes)
npm audit fix
```

---

## 🔧 Configuration

### Environment Variables

For Docker, use `setup.sh` to generate `.env` automatically:

```bash
./setup.sh   # creates .env with random secrets
```

For local development, copy manually:

```bash
cp .env.example .env
```

Backend env (`backend/.env`):

```env
DATABASE_URL=postgres://warble:password@localhost:5432/warble
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=your_minio_user
MINIO_SECRET_KEY=your_minio_password
MINIO_BUCKET=codefiles
ADMIN_SECRET=your_admin_secret
```

Frontend env vars with `VITE_` prefix are available on the client:

```typescript
const maxSize = import.meta.env.VITE_MAX_FILE_SIZE_MB;
```

> There is no `BETTER_AUTH_SECRET` or `VITE_API_URL` — Warble-Self is auth-free and the frontend uses relative URLs routed through nginx.

---

## 📖 Resources

- [README.md](README.md) - General project documentation
- [SECURITY.md](SECURITY.md) - Security policy
- [CHANGELOG.md](CHANGELOG.md) - Change history
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Detail of applied improvements
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation summary

### External Documentation

- [React Hooks](https://react.dev/reference/react)
- [Vitest](https://vitest.dev/)
- [React Hot Toast](https://react-hot-toast.com/)
- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Serial)
- [TypeScript](https://www.typescriptlang.org/docs/)

---

**Last updated**: 2026-04-19
