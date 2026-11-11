"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function PreviewPage() {
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <main className="min-h-screen bg-bg-base text-text-primary p-10">
      <div className="mx-auto max-w-5xl space-y-12">
        <header>
          <h1 className="font-display text-3xl font-bold">ZORVI Design System</h1>
          <p className="mt-2 text-text-secondary">
            Live preview of the reusable components. Every screen in ZORVI
            will use these — no more one-off styling.
          </p>
        </header>

        {/* ---------- BUTTONS ---------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Button</h2>
          <Card padding="lg">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="icon" aria-label="Settings">⚙</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>Disabled</Button>
                <Button
                  loading={loadingBtn}
                  onClick={() => {
                    setLoadingBtn(true);
                    setTimeout(() => setLoadingBtn(false), 2000);
                  }}
                >
                  {loadingBtn ? "Loading..." : "Click to load (2s)"}
                </Button>
                <Button leftIcon={<span>→</span>}>Left icon</Button>
                <Button rightIcon={<span>→</span>}>Right icon</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ---------- CARDS ---------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Card</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <h3 className="font-display font-bold">Static card</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Default padding, no hover effect.
              </p>
            </Card>
            <Card hoverable>
              <h3 className="font-display font-bold">Hoverable card</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Lift and highlight on hover.
              </p>
            </Card>
            <Card padding="lg">
              <h3 className="font-display font-bold">Large padding</h3>
              <p className="mt-2 text-sm text-text-secondary">
                For hero sections and featured content.
              </p>
            </Card>
          </div>
        </section>

        {/* ---------- INPUTS ---------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Input</h2>
          <Card padding="lg">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Email" placeholder="you@example.com" type="email" />
              <Input
                label="Password"
                placeholder="••••••••"
                type="password"
                hint="Min 8 chars, 1 letter, 1 digit"
              />
              <Input
                label="With error"
                defaultValue="not-an-email"
                error="This is not a valid email address"
              />
              <Input
                label="With icons"
                placeholder="Search products..."
                leftIcon={<span>🔍</span>}
              />
            </div>
          </Card>
        </section>

        {/* ---------- BADGES ---------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">Badge</h2>
          <Card padding="lg">
            <div className="flex flex-wrap gap-3">
              <Badge>Neutral</Badge>
              <Badge tone="brand">Brand</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Pending</Badge>
              <Badge tone="danger">Refunded</Badge>
              <Badge tone="info">Info</Badge>
            </div>
            <div className="mt-6 space-y-2">
              <div className="text-xs text-text-muted">Order status badges:</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="warning">Pending</Badge>
                <Badge tone="info">Awaiting verification</Badge>
                <Badge tone="success">Paid</Badge>
                <Badge>Cancelled</Badge>
                <Badge tone="danger">Refunded</Badge>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="text-xs text-text-muted">Difficulty badges:</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">Beginner</Badge>
                <Badge tone="info">Intermediate</Badge>
                <Badge tone="warning">Advanced</Badge>
                <Badge tone="danger">Expert</Badge>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
