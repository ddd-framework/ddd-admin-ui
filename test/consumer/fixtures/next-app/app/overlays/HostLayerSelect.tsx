'use client';

// T7: a package select inside a host overlay at z-index 10000. With `--layer-popover: 10001` its list is on top;
// with the default layer (50) it is below the host overlay (the negative control).
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mgamadeus/ddd-admin-ui/primitives';

export function HostLayerSelect({ raiseLayer }: { raiseLayer: boolean }) {
  const [value, setValue] = useState('');
  return (
    <>
      {raiseLayer ? <style>{':root { --layer-popover: 10001; }'}</style> : null}
      <div id="host-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgb(0 0 0 / 0.4)' }}>
        <div style={{ background: 'white', width: 320, margin: '80px auto', padding: 16 }}>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger id="host-trigger">
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alpha">Alpha</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
            </SelectContent>
          </Select>
          <output id="host-value">{value}</output>
        </div>
      </div>
    </>
  );
}
