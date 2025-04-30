import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type TimeRange = '1h' | '24h' | '7d' | '30d';

const timeRanges = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

interface TimeRangeSelectorProps {
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ onChange }: TimeRangeSelectorProps) {
  return (
    <Select onValueChange={onChange as any} defaultValue="24h">
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {timeRanges.map(range => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}