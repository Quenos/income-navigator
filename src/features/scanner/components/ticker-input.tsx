'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TickerInput({ onAdd }: { onAdd: (symbol: string) => void }) {
  const [value, setValue] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (symbol) onAdd(symbol);
    setValue('');
  }

  return (
    <form className="flex gap-3" onSubmit={submit}>
      <Input
        aria-label="Ticker symbol"
        placeholder="SPY"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit">Add ticker</Button>
    </form>
  );
}
