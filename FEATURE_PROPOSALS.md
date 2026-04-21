# 🚀 Feature Improvement Proposals - Warble

This document contains proposals for new features and improvements to existing functionality in the Warble application.

**Date**: 2025-03-28 (updated 2026-04-19, UI redesign completed)
**Status**: Proposed for future implementation

---

## 📊 Summary

| Category | Proposals | Priority |
|----------|-----------|----------|
| **User Experience** | 8 | High |
| **Radio Support** | 5 | Medium |
| **Data Management** | 6 | High |
| **Performance** | 4 | Low |
| **Advanced Features** | 7 | Medium |
| **Testing & Quality** | 3 | Low |

**Total**: 33 feature proposals

---

## 🎯 High Priority Features

### 1. **Undo/Redo System** ⭐⭐⭐

**Problem**: Users cannot undo accidental changes to channels or settings.

**Proposal**:
- Implement command pattern for all data mutations
- Add Ctrl+Z (undo) and Ctrl+Y (redo) keyboard shortcuts
- Show undo/redo buttons in the toolbar
- Maintain history of last 50 actions

**Implementation**:
```typescript
// src/hooks/useHistory.ts
export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const push = (newState: T) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const redo = () => {
    if (currentIndex < history.length - 1) setCurrentIndex(currentIndex + 1);
  };

  return {
    state: history[currentIndex],
    push,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
}
```

**Benefits**:
- Safer user experience
- Easy recovery from mistakes
- Professional feel

---

### 2. **Channel Templates & Presets** ⭐⭐⭐

**Problem**: Users repeatedly create similar channels (e.g., simplex channels, maritime bands, aviation).

**Proposal**:
- Add "Templates" menu with pre-configured channel sets:
  - **Maritime VHF** (channels 16, 9, 13, etc.)
  - **Aviation** (121.5 emergency, 122.750 air-to-air)
  - **Weather Radio** (NOAA frequencies)
  - **ISM/SRD Bands** (433.050-434.790 MHz)
  - **GMRS** (for US users)
  - **FRS** (Family Radio Service)
- Allow users to save custom templates
- Import/export templates as JSON

**Implementation**:
```typescript
// src/lib/templates.ts
export interface ChannelTemplate {
  id: string;
  name: string;
  description: string;
  channels: Partial<MemoryChannel>[];
  compatibleRadios?: string[];
}

export const BUILT_IN_TEMPLATES: ChannelTemplate[] = [
  {
    id: 'maritime-vhf',
    name: 'Maritime VHF',
    description: 'International marine channels',
    channels: [
      { name: 'CH16', frequency: '156.800000', mode: 'FM' },
      { name: 'CH09', frequency: '156.450000', mode: 'FM' },
      // ...
    ]
  },
  // ...
];
```

**UI**:
- Button in toolbar: "Templates" 📋
- Modal with categories and preview
- One-click insertion

---

### 3. **Advanced Search & Filter** ⭐⭐⭐

**Problem**: Finding specific channels in large lists (999 channels) is difficult.

**Proposal**:
- Add search bar above grid with filters:
  - **Text search** (by name, frequency)
  - **Frequency range** (e.g., 144-146 MHz)
  - **Tone filter** (CTCSS/DCS code)
  - **Band filter** (VHF / UHF / ALL)
  - **Mode filter** (FM / NFM)
  - **Skip status** (skipped / active)
- Highlight matching rows
- Show "X of Y channels match" counter

**Implementation**:
```typescript
// src/components/ChannelSearch.tsx
interface SearchFilters {
  text: string;
  freqMin?: number;
  freqMax?: number;
  band?: 'VHF' | 'UHF' | 'ALL';
  toneMode?: string;
  hasSkip?: boolean;
}

function filterChannels(channels: MemoryChannel[], filters: SearchFilters) {
  return channels.filter(ch => {
    if (filters.text && !ch.name.toLowerCase().includes(filters.text.toLowerCase())) {
      return false;
    }

    const freq = parseFloat(ch.frequency);
    if (filters.freqMin && freq < filters.freqMin) return false;
    if (filters.freqMax && freq > filters.freqMax) return false;

    // ... more filters

    return true;
  });
}
```

---

### 4. **Bulk Edit Operations** ⭐⭐⭐

**Problem**: Changing tone/power/mode for many channels requires individual edits.

**Proposal**:
- Select multiple rows (Shift+Click, Ctrl+Click)
- Right-click menu with "Bulk Edit":
  - Set tone mode for all selected
  - Set power level for all selected
  - Set duplex/offset for all selected
  - Increment/decrement frequency by step
- Show confirmation dialog with preview

**Implementation**:
```typescript
// src/components/BulkEditModal.tsx
interface BulkEditProps {
  selectedChannels: MemoryChannel[];
  onApply: (changes: Partial<MemoryChannel>) => void;
}

function BulkEditModal({ selectedChannels, onApply }: BulkEditProps) {
  const [changes, setChanges] = useState<Partial<MemoryChannel>>({});

  return (
    <dialog>
      <h2>Bulk Edit {selectedChannels.length} channels</h2>

      <label>Tone Mode:
        <select onChange={e => setChanges({...changes, toneMode: e.target.value})}>
          <option value="">No change</option>
          <option value="Tone">CTCSS</option>
          <option value="TSQL">CTCSS+SQL</option>
        </select>
      </label>

      {/* More fields... */}

      <button onClick={() => onApply(changes)}>Apply to All</button>
    </dialog>
  );
}
```

---

### 5. **Channel Notes & Comments** ⭐⭐⭐

**Problem**: Users can't add notes about repeater access, nets, or special instructions.

**Proposal**:
- Add `comment` field to `MemoryChannel` type
- Display in grid as tooltip on row hover
- Show full comment in dedicated column (collapsible)
- Export/import comments in CSV
- Store comments in `.img` metadata if possible

**Implementation**:
```typescript
// Update src/lib/types.ts
export interface MemoryChannel {
  // ... existing fields
  comment?: string; // NEW: Optional comment field
}

// In MemoryGrid.tsx column definitions:
{
  field: 'comment',
  headerName: 'Comment',
  width: 200,
  editable: true,
  cellRenderer: (params: any) => {
    return (
      <div
        title={params.value}
        className="truncate"
      >
        {params.value || ''}
      </div>
    );
  }
}
```

---

### 6. **Frequency Calculator** ⭐⭐

**Problem**: Users need to calculate repeater offsets, sub-audible tones, or CTCSS frequencies.

**Proposal**:
- Add "Tools" → "Frequency Calculator" menu
- Features:
  - **Offset calculator**: Input RX freq → auto-calculate TX with standard offset
  - **CTCSS tone finder**: List all standard tones with notes
  - **Band plan reference**: Show amateur radio band allocations
  - **Wavelength converter**: MHz ↔ wavelength in meters

**Implementation**:
```typescript
// src/components/FrequencyCalculator.tsx
export function FrequencyCalculator() {
  const [rxFreq, setRxFreq] = useState('');
  const [offset, setOffset] = useState(0.6); // Default VHF offset

  const txFreq = useMemo(() => {
    const rx = parseFloat(rxFreq);
    if (isNaN(rx)) return '';
    return (rx + offset).toFixed(6);
  }, [rxFreq, offset]);

  return (
    <div className="calculator">
      <h3>Repeater Offset Calculator</h3>
      <input
        type="number"
        placeholder="RX Frequency (MHz)"
        value={rxFreq}
        onChange={e => setRxFreq(e.target.value)}
      />
      <select value={offset} onChange={e => setOffset(parseFloat(e.target.value))}>
        <option value="0.6">+0.6 MHz (VHF standard)</option>
        <option value="-0.6">-0.6 MHz (VHF reverse)</option>
        <option value="5">+5 MHz (UHF standard)</option>
        <option value="-5">-5 MHz (UHF reverse)</option>
      </select>
      <p>TX Frequency: <strong>{txFreq}</strong> MHz</p>
    </div>
  );
}
```

---

## 🔧 Medium Priority Features

### 7. **Multi-radio Profile Management** ⭐⭐

**Problem**: Users with multiple radios must re-select the radio model every time.

**Proposal**:
- Add "Profiles" feature to save configurations per radio
- Each profile stores:
  - Radio model
  - Last loaded `.img` file
  - Custom zones
  - Preferred settings
- Quick-switch dropdown in header

**Implementation**:
```typescript
// src/lib/profiles.ts
export interface RadioProfile {
  id: string;
  name: string;
  radioModel: string;
  lastImgFile?: string;
  zones: { name: string; channelIndexes: number[] }[];
  createdAt: Date;
}

// Store in localStorage
export function saveProfile(profile: RadioProfile) {
  const profiles = getProfiles();
  profiles.push(profile);
  localStorage.setItem('warble_profiles', JSON.stringify(profiles));
}
```

---

### 8. **Channel Duplication & Copy** ⭐⭐

**Problem**: Creating similar channels requires manual re-entry of all fields.

**Proposal**:
- Right-click menu: "Duplicate Channel"
- Keyboard shortcut: Ctrl+D
- Automatically increment channel number
- Option to "Duplicate with Offset" (create TX channel from RX)

**Implementation**:
```typescript
function duplicateChannel(channel: MemoryChannel): MemoryChannel {
  return {
    ...channel,
    index: getNextAvailableIndex(),
    name: `${channel.name} (copy)`
  };
}

function duplicateWithOffset(channel: MemoryChannel, offset: number): MemoryChannel {
  const freq = parseFloat(channel.frequency);
  return {
    ...channel,
    index: getNextAvailableIndex(),
    frequency: (freq + offset).toFixed(6),
    name: `${channel.name} TX`,
    duplex: offset > 0 ? '+' : '-'
  };
}
```

---

### 9. **RepeaterBook Enhanced Filters** ⭐⭐

**Problem**: RepeaterBook import doesn't filter by output power, sponsorship, or operational status.

**Proposal**:
- Add more filters in RepeaterBook modal:
  - ✅ Operational status (open / closed / private)
  - ✅ Minimum output power (e.g., > 10W)
  - ✅ Has IRLP/Echolink/DMR
  - ✅ Requires CTCSS (filter out open repeaters)
- Show repeater metadata in import preview table

---

### 10. **Export to Multiple Formats** ⭐⭐

**Problem**: Users can only export to CSV and .img.

**Proposal**:
- Add export options:
  - **JSON** (full fidelity, includes comments)
  - **Excel (.xlsx)** (with formatting and validation)
  - **ADIF** (for logging software)
  - **KML/GPX** (for mapping software with GPS coords)
  - **Printable PDF** (channel reference card)

**Implementation**:
```typescript
// src/lib/exporters/json.ts
export function exportToJson(channels: MemoryChannel[]): string {
  return JSON.stringify({
    version: '1.0',
    exported: new Date().toISOString(),
    channels
  }, null, 2);
}

// src/lib/exporters/excel.ts (using xlsx library)
import * as XLSX from 'xlsx';

export function exportToExcel(channels: MemoryChannel[]): Blob {
  const worksheet = XLSX.utils.json_to_sheet(channels);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Channels');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

---

### 11. **Drag-and-Drop Reordering** ⭐⭐

**Problem**: Reordering channels requires changing index numbers manually.

**Proposal**:
- Enable drag-and-drop rows in AG Grid
- Automatically renumber channels on drop
- Show visual indicator during drag
- Option to lock channel order (prevent accidental reorder)

**Implementation**:
```typescript
// In MemoryGrid.tsx
const gridOptions = {
  rowDragManaged: true,
  animateRows: true,
  onRowDragEnd: (event: any) => {
    const newOrder = [];
    event.api.forEachNode((node: any) => {
      newOrder.push(node.data);
    });

    // Renumber channels
    const renumbered = newOrder.map((ch, idx) => ({
      ...ch,
      index: idx + 1
    }));

    setRowData(renumbered);
  }
};
```

---

### 12. **Tone Scanner Feature** ⭐

**Problem**: Users don't know which CTCSS/DCS tone a repeater uses.

**Proposal**:
- Add "Scan Tones" feature in RadioProgrammer tab
- Cycles through all standard CTCSS tones on current frequency
- Listens for 2 seconds per tone
- Shows audio level indicator
- Highlights detected tone

**Note**: Requires radio hardware support for tone detection (not all models support this).

---

## 💡 Advanced Features

### 13. **Memory Bank / Zone Management** ⭐⭐

**Problem**: Current zones are basic (fixed 32 channels per zone).

**Proposal**:
- Allow custom zone sizes
- Name zones (e.g., "Local Repeaters", "Simplex", "Emergency")
- Assign channels to multiple zones
- Import/export zone configurations

**Implementation**:
```typescript
// src/lib/types.ts
export interface Zone {
  id: string;
  name: string;
  channelIds: number[]; // References to channel indexes
  color?: string; // For visual distinction
}

export interface ZoneConfig {
  zones: Zone[];
  activeZone: string;
}
```

---

### 14. **Frequency Conflict Detector** ⭐⭐

**Problem**: Users accidentally create duplicate channels or conflicting TX/RX pairs.

**Proposal**:
- Automatic detection of:
  - Duplicate frequencies
  - Overlapping simplex and repeater channels
  - Invalid duplex pairs
- Show warnings in grid (yellow highlight)
- "Conflict Report" dialog with resolution suggestions

**Implementation**:
```typescript
// src/lib/validators/conflicts.ts
export function detectConflicts(channels: MemoryChannel[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < channels.length; i++) {
    for (let j = i + 1; j < channels.length; j++) {
      if (channels[i].frequency === channels[j].frequency) {
        conflicts.push({
          type: 'DUPLICATE_FREQUENCY',
          channels: [channels[i], channels[j]],
          severity: 'warning',
          message: `Channels ${i+1} and ${j+1} have the same frequency`
        });
      }
    }
  }

  return conflicts;
}
```

---

### 15. **Live Radio Status Monitor** ⭐

**Problem**: Users don't know if the radio is still connected or responding.

**Proposal**:
- Real-time status indicator in RadioProgrammer tab:
  - 🟢 Connected and responsive
  - 🟡 Connected but slow
  - 🔴 Disconnected or timeout
- Show battery level (if supported by radio)
- Show current VFO frequency
- Periodic ping to check connectivity

---

### 16. **Dark Theme Customization** ⭐

**Problem**: Only 2 themes available (light/dark).

**Proposal**:
- Add theme selector with presets:
  - 🌞 Light
  - 🌙 Dark
  - 🌆 Blue Dark (current)
  - 🌲 Forest (green accent)
  - 🔥 Fire (orange/red accent)
  - 🎨 Custom (color picker)
- Save theme preference in localStorage
- Apply theme to AG Grid, buttons, and toast notifications

---

### 17. **Channel Activity Logger** ⭐

**Problem**: No way to track when channels were last used or tested.

**Proposal**:
- Add `lastUsed` timestamp to channels
- Track usage via:
  - Manual "Mark as Used" button
  - Automatic logging when writing to radio
- Filter by "Recently Used" or "Never Used"
- Export usage report

---

### 18. **Integration with Online Services** ⭐⭐

**Problem**: Limited to RepeaterBook only.

**Proposal**:
- Add integrations with:
  - **RadioReference** (premium database)
  - **RFinder** (worldwide repeater directory)
  - **OpenRepeater.net** (community database)
  - **ARRL Repeater Directory** (US/Canada)
- Unified search across all sources
- Automatic deduplication

---

### 19. **PWA (Progressive Web App)** ⭐⭐⭐

**Problem**: Users must open browser every time; no offline mode.

**Proposal**:
- Convert to PWA with:
  - Install prompt ("Add to Home Screen")
  - Offline mode with service worker
  - Cache channel data locally
  - Background sync for RepeaterBook updates
- Works like a native app on desktop and mobile

**Implementation**:
```javascript
// public/sw.js (Service Worker)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Warble',
        short_name: 'Warble',
        icons: [
          { src: '/warble-logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/warble-logo-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
```

---

## 📡 Radio Support Expansion

### 20. **Support for More Radio Models** ⭐⭐⭐

**Currently supported**:
- Baofeng UV-5R (FM analog, 128 CH)
- Baofeng UV-5R MINI (FM analog, 999 CH)
- ✅ **Radtel RT-4D** (FM + DMR, 3072 CH) — *added 2026-04-02*
  - ⏳ Pending: open `.ddmr` directly in the main editor grid (same UX as `.img`)

**Proposed additions**:
- **Baofeng**: UV-82, BF-F8HP, UV-9R Plus
- **AnyTone**: AT-D878UV, AT-D578UV
- **TYT**: MD-UV380, MD-UV390
- **Radioddity**: GD-77, DB25-D
- **Quansheng**: UV-K5, UV-K6

**Implementation**:
Each new radio requires:
1. Reverse-engineer radio protocol (from open-source drivers or USB captures)
2. Implement `IRadioDriver` interface
3. Add to `SUPPORTED_RADIOS` registry
4. Document frequency limits and capabilities

---

### 21. **Auto-Detect Radio Model** ⭐⭐

**Problem**: Users must manually select radio model.

**Proposal**:
- When reading from radio, detect model from identification string
- Show confirmation: "Detected Baofeng UV-5R MINI. Use this driver?"
- Fallback to manual selection if detection fails

**Implementation**:
```typescript
// src/lib/drivers/detector.ts
export async function detectRadioModel(port: SerialPort): Promise<string | null> {
  for (const radio of SUPPORTED_RADIOS) {
    const driver = new radio.driverClass(port);
    try {
      await driver.connect();
      const ident = await driver.identify(); // New method
      if (ident.includes(radio.id)) {
        return radio.id;
      }
    } catch {
      continue;
    }
  }
  return null;
}
```

---

### 22. **Firmware Version Check** ⭐

**Problem**: Some radios have firmware variations with different protocols.

**Proposal**:
- Read firmware version from radio
- Show in RadioProgrammer tab
- Warn if firmware is incompatible
- Link to firmware update instructions

---

### 23. **Clone Multiple Radios** ⭐

**Problem**: Users with multiple identical radios must program each individually.

**Proposal**:
- "Batch Write" feature:
  - Load .img once
  - Write to Radio 1 → disconnect → connect Radio 2 → write again
  - Track progress across multiple devices

---

### 24. **Radio Alignment Tool** ⭐ (Advanced)

**Problem**: Radio transmit power, frequency calibration drift over time.

**Proposal**:
- Add "Advanced Tools" → "Radio Alignment"
- Features (if supported by radio hardware):
  - Frequency offset calibration
  - Power output adjustment
  - Deviation alignment
  - Squelch threshold tuning

**Note**: Requires deep hardware knowledge and careful implementation to avoid damage.

---

## 🚀 Performance Optimizations

### 25. **Virtual Scrolling for Large Lists** ⭐

**Problem**: AG Grid with 999 channels can be slow on low-end devices.

**Proposal**:
- Enable AG Grid row virtualization
- Lazy load channel data
- Optimize re-renders with React.memo
- Debounce search/filter operations

**Implementation**:
```typescript
// AG Grid already supports this via:
const gridOptions = {
  rowModelType: 'clientSide',
  rowBuffer: 10, // Render 10 extra rows
  suppressRowVirtualisation: false // Enable virtual scrolling
};
```

---

### 26. **WebWorker for Heavy Operations** ⭐

**Problem**: Large .img decoding blocks UI thread.

**Proposal**:
- Move channel decoding/encoding to WebWorker
- Show loading spinner while processing
- Keep UI responsive

**Implementation**:
```typescript
// src/workers/decoder.worker.ts
import { IRadioDriver } from '../lib/drivers';

self.addEventListener('message', (e) => {
  const { buffer, driverId } = e.data;

  const driver = getDriverInstance(driverId);
  const channels = driver.decodeChannels(buffer);

  self.postMessage({ channels });
});

// In App.tsx
const worker = new Worker(new URL('./workers/decoder.worker.ts', import.meta.url));
worker.postMessage({ buffer, driverId: selectedDriverId });
worker.onmessage = (e) => {
  setChannels(e.data.channels);
};
```

---

### 27. **IndexedDB for Large Data Storage** ⭐

**Problem**: localStorage limited to ~5-10MB.

**Proposal**:
- Use IndexedDB for storing:
  - Channel history
  - Imported .img files
  - Cached RepeaterBook data
- Allows storing 50+ MB of data
- Faster retrieval than localStorage

---

### 28. **Lazy Load Components** ⭐

**Problem**: Initial bundle size is large (1.5MB).

**Proposal**:
- Code-split heavy components:
  - `React.lazy(() => import('./components/GlobalSettings'))`
  - Lazy load radio drivers only when selected
  - Defer loading AG Grid until Memory tab is opened
- Reduce initial load time by 40%

---

## 🧪 Testing & Quality

### 29. **E2E Tests with Playwright** ⭐

**Problem**: Only unit tests exist; no integration testing.

**Proposal**:
- Add Playwright tests for:
  - Complete workflow: Import .img → Edit → Export CSV
  - RepeaterBook integration
  - Dark mode toggle
  - File upload validation
- Run in CI/CD

**Implementation**:
```bash
npm install -D @playwright/test

# tests/e2e/import-export.spec.ts
import { test, expect } from '@playwright/test';

test('import .img file and export CSV', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.locator('[data-testid="open-file"]').click();
  await page.setInputFiles('input[type="file"]', 'fixtures/test.img');

  await expect(page.locator('.ag-grid-row')).toHaveCount(128);

  await page.locator('[data-testid="export-csv"]').click();
  // ... verify download
});
```

---

### 30. **Storybook for Component Library** ⭐

**Problem**: No visual documentation of UI components.

**Proposal**:
- Add Storybook for:
  - MemoryGrid variations
  - Toast notification examples
  - Form components
  - Button styles
- Interactive playground for designers/developers

---

### 31. **Accessibility Audit** ⭐⭐

**Problem**: No ARIA labels, keyboard navigation limited.

**Proposal**:
- Full accessibility pass:
  - Add aria-labels to all buttons
  - Keyboard navigation for grid (arrow keys, Tab)
  - Screen reader announcements for toasts
  - Focus indicators
  - Color contrast check (WCAG AA)
- Run `axe-core` in CI

---

## 📈 Analytics & Telemetry (Optional)

### 32. **Anonymous Usage Metrics** ⭐ (Privacy-focused)

**Problem**: Developers don't know which features are used most.

**Proposal**:
- Optional, privacy-respecting analytics:
  - Track feature usage (not personal data)
  - Popular radio models
  - Average channel count
  - Error frequency
- User can opt-out in settings
- Use privacy-first analytics (e.g., Plausible, Umami)

---

### 33. **Error Reporting** ⭐

**Problem**: Users encounter errors but developers don't know about them.

**Proposal**:
- Integrate Sentry or similar:
  - Automatic error capture with stack traces
  - User can submit feedback with error
  - Developers get notified of critical bugs
- Respect user privacy (no PII)

---

## 🎯 Implementation Roadmap

### Completed (2026-04-19)
- ✅ Bulk edit operations (power, mode, tone, duplex dropdowns in toolbar)
- ✅ Theme system (Blueprint theme with semantic CSS tokens)
- ✅ RepeaterBook enhanced filters (interactive map, radius slider, distance/freq sort)
- ✅ Channel inline editing (tabbed detail panel with double-click)
- ✅ Homepage with radio showcase (rotating model names, action cards)
- ✅ Auto-detect radio model from `.img` footer

### Phase 1: Quick Wins (next)
1. Undo/Redo system
2. Channel templates (Maritime VHF, Aviation, Weather, PMR, GMRS, FRS)
3. Advanced search & filter
4. PWA conversion

### Phase 2: Radio Support
5. Add 3-5 new radio models (Quansheng UV-K5, AnyTone, Retevis)
6. Firmware version check

### Phase 3: Data Management
7. Multi-format export (JSON, Excel, ADIF)
8. Channel notes/comments
9. Drag-and-drop reordering

### Phase 4: Advanced Features
10. Zone management UI
11. Conflict detector
12. E2E tests (Playwright)
13. Accessibility audit (WCAG AA)

---

## 📝 Contributing

If you want to implement any of these features:

1. Open an issue on GitHub referencing this document
2. Discuss the approach with maintainers
3. Fork the repo and create a feature branch
4. Implement with tests
5. Submit PR with reference to proposal number

---

## 🎓 Conclusion

This document proposes **33 feature enhancements** across 6 categories. Implementing even 30% of these would significantly improve Warble's usability and feature coverage.

**Priority Matrix**:
- **Must-have**: Undo/Redo, Templates, Search, Bulk Edit, PWA
- **Should-have**: More radios, Multi-format export, Zone management
- **Nice-to-have**: Themes, Analytics, Advanced tools

**Estimated effort**: 6-12 months for full implementation by a small team.

---

---

## 🎨 UI Design System Improvements ✅ *Completed 2026-04-03*

> **Status**: Problems 1–8 from the UI analysis implemented.

A systematic audit of the interface identified 11 issues split into aesthetic (1–4) and functional (5–11).

### Problems resolved

| # | Problem | Solution | Files |
|---|---------|----------|-------|
| 1 | Inconsistent buttons across the app | Unified `Button` component with variants (primary/secondary/outline/ghost/destructive) and sizes (sm/md/lg) | `src/components/ui/Button.tsx` |
| 2 | Missing depth in dark mode cards and modals | Shadow color tokens (`shadow-slate-100/80`, `dark:shadow-slate-950/40`) | `GlobalSettings.tsx`, modals |
| 3 | Sidebar hierarchy unclear (actions mixed with nav) | Section label (`text-[10px] uppercase`) + reduced action icon size (`w-3.5 h-3.5`) | `Sidebar.tsx` |
| 4 | Toast notifications missing | `<Toaster>` added to `App.tsx`; CSS variables `--toast-bg`/`--toast-text` for dark mode | `App.tsx`, `index.css`, `useToast.ts` |
| 5 | USB tab wasted space, hidden when not needed | Replaced dedicated "USB" tab with a **slide-in connection drawer** (right side, 300px) | `App.tsx` |
| 6 | Radio model/state not visible outside USB panel | **Persistent radio status bar** (model name + file-loaded badge + unsaved-changes badge) above content area | `App.tsx` |
| 7 | (merged into 5) | — | — |
| 8 | Frequency out-of-range cells not obvious | `⚠` prefix rendered inside cell + browser tooltip via `tooltipValueGetter` + `enableBrowserTooltips` | `MemoryGrid.tsx` |

### Pending (lower priority, next session)

| # | Problem | Notes |
|---|---------|-------|
| 9 | Repository section feels like a primary tab | Move to secondary nav or separate area |
| 10 | Sidebar not collapsible on mobile | Needs responsive breakpoints |
| 11 | Channel grid doesn't have a minimum column width | Overflows on narrow viewports |

---

## 🐳 Docker Support ⏳ *Proposed 2026-04-03*

**Goal**: allow self-hosted deployments and provide a reproducible development environment.

### Context

Warble-Self is a **single-user, auth-free** application — no Supabase or external backend required. The deployment surface is minimal:

| Component | What it is | How it deploys |
|-----------|-----------|----------------|
| **Frontend** | Static SPA (`npm run build` → `dist/`) | Any static file server or CDN |
| **RepeaterBook proxy** | Single Fastify endpoint (adds `User-Agent` header) | Docker container |

The frontend alone is sufficient for all core features (USB programming, local file open/save, channel editing). The proxy is only needed if RepeaterBook import is required in production (the browser cannot set the required `User-Agent` header directly).

This architecture is **platform-agnostic**: it works equally on Dokploy, Coolify, Caprover, Railway, Render, a bare VPS, or any other container host — no platform-specific primitives required.

### Proposed images

**`Dockerfile`** — production frontend (multi-stage, nginx):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`Dockerfile.dev`** — development with hot reload:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

**`docker-compose.yml`**:

```yaml
services:
  warble:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    env_file: .env
```

**`nginx.conf`** (required for SPA client-side routing):

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Self-hosting requirements

Warble-Self has no mandatory backend. The only optional environment variable is:

```env
# Only needed if you run the RepeaterBook proxy sidecar
VITE_API_URL=https://your-proxy-host.example.com
```

No database, no auth service, no third-party account required.

### Priority

**Medium** — primary use case is ham radio clubs or operators who want a self-contained instance on their own server. No functional changes to the app required.

---

**Document Version**: 1.2
**Last Updated**: 2026-04-03
**Author**: Claude (Anthropic)
