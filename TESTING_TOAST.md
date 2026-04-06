# 🧪 How to Test Toast Notifications

This guide explains how to test that all toast notifications work correctly.

---

## 🚀 Start the Application

```bash
npm run dev
```

Open your browser at `http://localhost:5173`

---

## ✅ Manual Tests per Component

### 1. **App.tsx - File Import**

#### Test 1.1: Successful .img import
1. Click **"Open File"**
2. Select a valid `.img` file
3. **Expected**: Green toast "X channels imported from filename.img" ✅

#### Test 1.2: .img import with error
1. Click **"Open File"**
2. Select a corrupt or invalid `.img` file
3. **Expected**: Red toast "Error importing: [details]" ❌

#### Test 1.3: Successful CSV import
1. Click **"Open File"**
2. Select a `.csv` file with channels
3. **Expected**: Green toast "X channels imported from filename.csv" ✅

#### Test 1.4: Save .img without buffer
1. **DO NOT** load any file
2. Click **"Save Image"**
3. **Expected**: Red toast "No raw buffer. Read from Radio or Open a .img first." ❌

#### Test 1.5: Successful .img save
1. Load a `.img` first
2. Click **"Save Image"**
3. **Expected**:
   - Download of `warble_image.img`
   - Green toast "Image saved successfully!" ✅

---

### 2. **MemoryGrid.tsx - Channel Management**

#### Test 2.1: Paste data from clipboard
1. Copy tabulated data (Excel or CSV)
2. Click **"Paste"** or press `Ctrl+V`
3. **Expected**: Green toast "X channels pasted successfully" ✅

#### Test 2.2: Paste with error
1. Try to paste without granting clipboard permissions
2. **Expected**: Red toast "Please use Ctrl+V directly" ❌

#### Test 2.3: Add channel with limit exceeded
1. Add channels until reaching 999
2. Try to add one more
3. **Expected**: Red toast "Cannot add more channels, maximum limit is 999." ❌

#### Test 2.4: Add PMR446 without space
1. Add channels until having < 16 free spaces
2. Click **"PMR446"**
3. **Expected**: Red toast "Insufficient space (X free). 16 slots needed for PMR446." ❌

#### Test 2.5: Successful PMR446 addition
1. Ensure there is space
2. Click **"PMR446"**
3. **Expected**: 16 PMR channels added (no toast, normal behavior)

#### Test 2.6: RepeaterBook - No repeaters found
1. Click **"RepeaterBook"** (globe icon)
2. Select country/region without repeaters
3. Click **"Search and Import"**
4. **Expected**: Red toast "No repeaters found for this region..." ❌

#### Test 2.7: RepeaterBook - Successful import
1. Click **"RepeaterBook"**
2. Select "Spain" > "Catalonia" > "ALL"
3. Click **"Search and Import"**
4. **Expected**: Green toast "X repeaters added successfully." ✅

#### Test 2.8: RepeaterBook - Limit exceeded
1. Already have many channels (>900)
2. Import repeaters that exceed 999
3. **Expected**: Red toast "Warning: X repeaters imported but 999 channel limit exceeded." ❌

#### Test 2.9: RepeaterBook - Integration error
1. Disconnect internet
2. Try to import repeaters
3. **Expected**: Red toast "Integration failed: [error]" ❌

#### Test 2.10: Edit invalid frequency
1. Edit a frequency cell
2. Type "999.999999" (out of range)
3. Press Enter
4. **Expected**: Red toast "Invalid frequency" ❌

#### Test 2.11: Write to radio with errors
1. Edit an invalid frequency (will be marked red)
2. Click **"Write to Radio"** (upload icon)
3. **Expected**: Red toast "Grid contains invalid frequencies marked in red..." ❌

#### Test 2.12: Geolocation - Permission error
1. Inside RepeaterBook modal
2. Click **"Locate me"**
3. Deny location permissions
4. **Expected**: Red toast "Could not obtain location. Check permissions." ❌

---

### 3. **RadioProgrammer.tsx - Radio Communication**

#### Test 3.1: Successful connection
1. Click **"USB Connection"** tab
2. Connect radio via USB
3. Click **"Connect"**
4. Select serial port
5. **Expected**: Green toast "Connected successfully!" ✅

#### Test 3.2: Connection with error
1. Click **"Connect"**
2. Cancel port selection
3. **Expected**: No toast (expected behavior)

#### Test 3.3: Successful radio read
1. Connect first
2. Put radio in Clone mode (follow README instructions)
3. Click **"Read from Radio"**
4. Wait for completion
5. **Expected**:
   - Progress bar 0-100%
   - Green toast "Data read successfully!" ✅
   - Changes in Memory tab

#### Test 3.4: Read with error
1. Connect but DO NOT put radio in Clone Mode
2. Click **"Read from Radio"**
3. **Expected**: Red toast "Error reading: [timeout or handshake failed]" ❌

#### Test 3.5: Write without buffer
1. Connect
2. DO NOT load any file or read from radio
3. Click **"Write to Radio"**
4. **Expected**: Red toast with memory error message ❌

#### Test 3.6: Successful radio write
1. Connect
2. Load a `.img` or read from radio
3. Put radio in Clone Mode
4. Click **"Write to Radio"**
5. Wait for completion
6. **Expected**:
   - Progress bar 0-100%
   - Green toast "Data written successfully!" ✅

#### Test 3.7: Write with error
1. Connect and load data
2. DO NOT put radio in Clone Mode
3. Click **"Write to Radio"**
4. **Expected**: Red toast "Error writing: [details]" ❌

---

## 🎨 Visual Check

### Expected Colors

**Success Toasts (Green)**:
- Background: `#10b981` (emerald-500)
- Text: White
- Duration: 4 seconds

**Error Toasts (Red)**:
- Background: `#ef4444` (red-500)
- Text: White
- Duration: 5 seconds

### Position
- All toasts appear at **top-center**
- Multiple toasts can stack
- Auto-close after configured duration

### Dark Mode
Toasts automatically adapt to the application's dark mode.

---

## 🐛 Incorrect Behaviors

If you see any of these, there's a problem:

❌ **Native browser alert** (blocking modal)
❌ **Red div with error** in RadioProgrammer (no longer used)
❌ **Console errors** related to toast
❌ **Toasts that don't disappear** automatically
❌ **Incorrect colors** (success red or error green)

---

## 📊 Validation Checklist

- [ ] App.tsx - 5 toasts tested
- [ ] MemoryGrid.tsx - 12 toasts tested
- [ ] RadioProgrammer.tsx - 7 toasts tested
- [ ] Correct colors (green/red)
- [ ] Correct position (top-center)
- [ ] Auto-close works
- [ ] Dark mode adapts toasts
- [ ] No native `alert()` appears
- [ ] TypeScript without errors
- [ ] Build compiles correctly

---

## 🎓 Additional Notes

### For developers

If you need to add new toasts:

```typescript
import { useToast } from './hooks/useToast';

function MyComponent() {
  const toast = useToast();

  const handleAction = () => {
    try {
      // ... logic ...
      toast.success(t('my.success.key'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t('my.error.key', { error: errorMessage }));
    }
  };
}
```

### Debugging

If toasts don't appear:
1. Check that `<Toaster />` is in `src/main.tsx`
2. Verify that `react-hot-toast` is installed
3. Check the console for errors
4. Make sure the component uses `useToast()` correctly

---

**Date**: 2025-03-28
**Last updated**: After completing the migration
