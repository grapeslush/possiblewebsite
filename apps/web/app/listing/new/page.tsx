'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';

import { TackleCategory, TackleCondition, WaterType } from '@possiblewebsite/db';

import { Button } from '@/components/ui/button';

interface VisionSummary {
  description: string;
  tags: string[];
  confidence?: number;
  provider?: string;
}

interface PricingSummary {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  rationale?: string;
}

interface FormState {
  sellerId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: string;
  currency: string;
  brand: string;
  modelName: string;
  tackleCategory: TackleCategory | '';
  condition: TackleCondition;
  waterType: WaterType | '';
  lureStyle: string;
  targetSpecies: string;
  techniqueTags: string;
  seasonalUse: string;
  lineRatingLbMin: string;
  lineRatingLbMax: string;
  rodPower: string;
  rodAction: string;
  gearRatio: string;
  bearingCount: string;
  maxDragLb: string;
  weightOz: string;
  lengthIn: string;
  customNotes: string;
  autoAcceptOfferCents: string;
  minimumOfferCents: string;
  shippingProfileId: string;
  shippingWeightOz: string;
  shippingLengthIn: string;
  shippingWidthIn: string;
  shippingHeightIn: string;
  handlingTimeDays: string;
  featuredPhotoUrl: string;
  compliancePolicyId: string;
  seoKeywords: string;
}

const tackleConditions = Object.values(TackleCondition);
const tackleCategories = Object.values(TackleCategory);
const waterTypes = Object.values(WaterType);

const defaultTargetSpecies = 'Largemouth Bass, Smallmouth Bass';

const formatEnumLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseCsv = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const parseFloatOrUndefined = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseIntOrUndefined = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const demoSellerId =
  process.env.NEXT_PUBLIC_DEMO_SELLER_ID ?? '11111111-1111-1111-1111-111111111111';

const steps = ['Upload photo', 'AI description', 'Price guidance', 'Preview', 'Publish'];

export default function ListingWizardPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [vision, setVision] = useState<VisionSummary | null>(null);
  const [pricing, setPricing] = useState<PricingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    sellerId: demoSellerId,
    title: '',
    description: '',
    category: '',
    tags: [],
    price: '',
    currency: 'USD',
    brand: '',
    modelName: '',
    tackleCategory: '',
    condition: TackleCondition.GOOD,
    waterType: '',
    lureStyle: '',
    targetSpecies: defaultTargetSpecies,
    techniqueTags: '',
    seasonalUse: '',
    lineRatingLbMin: '',
    lineRatingLbMax: '',
    rodPower: '',
    rodAction: '',
    gearRatio: '',
    bearingCount: '',
    maxDragLb: '',
    weightOz: '',
    lengthIn: '',
    customNotes: '',
    autoAcceptOfferCents: '',
    minimumOfferCents: '',
    shippingProfileId: '',
    shippingWeightOz: '',
    shippingLengthIn: '',
    shippingWidthIn: '',
    shippingHeightIn: '',
    handlingTimeDays: '',
    featuredPhotoUrl: '',
    compliancePolicyId: '',
    seoKeywords: '',
  });

  const progress = useMemo(() => ((stepIndex + 1) / steps.length) * 100, [stepIndex]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    setFile(selected ?? null);
    setError(null);
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError('Please choose a product photo to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('fileName', file.name);
      body.append('contentType', file.type);

      const response = await fetch('/api/ai/upload', {
        method: 'POST',
        body,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setImageUrl(data.url);
      setStepIndex(1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed, try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVision = async () => {
    if (!imageUrl) {
      setError('Upload a photo before requesting AI help.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          prompt: `Describe ${form.title || 'this item'} for a Tackle Exchange listing.`,
        }),
      });

      if (!response.ok) {
        throw new Error('Vision service unavailable');
      }

      const payload = await response.json();
      setVision(payload);
      setForm((current) => ({
        ...current,
        description: payload.description ?? current.description,
        tags: payload.tags?.slice(0, 8) ?? current.tags,
        title: current.title || buildTitleFromTags(payload.tags),
      }));
      setStepIndex(2);
    } catch (visionError) {
      setError(visionError instanceof Error ? visionError.message : 'Could not analyse the photo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePricing = async () => {
    if (!form.title) {
      setError('Add a working title before fetching pricing guidance.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ title: form.title });
      if (form.category) {
        params.set('category', form.category);
      }

      const response = await fetch(`/api/ai/ebay-pricing?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Unable to fetch pricing insights');
      }

      const payload = await response.json();
      setPricing(payload);
      setForm((current) => ({
        ...current,
        price: current.price || String(payload.averagePrice ?? ''),
      }));
      setStepIndex(3);
    } catch (pricingError) {
      setError(pricingError instanceof Error ? pricingError.message : 'Pricing lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title || !form.description || !form.price || !imageUrl) {
      setError('Fill in title, description, price, and upload a photo before publishing.');
      return;
    }

    if (!form.brand.trim()) {
      setError('Add the brand so bass anglers can quickly assess fit for their tackle lineup.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        sellerId: form.sellerId,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        category: form.category || undefined,
        tags: form.tags,
        brand: form.brand.trim(),
        modelName: form.modelName || undefined,
        tackleCategory: form.tackleCategory || undefined,
        condition: form.condition,
        waterType: form.waterType || undefined,
        lureStyle: form.lureStyle || undefined,
        targetSpecies: parseCsv(form.targetSpecies || defaultTargetSpecies),
        techniqueTags: parseCsv(form.techniqueTags),
        seasonalUse: parseCsv(form.seasonalUse),
        lineRatingLbMin: parseIntOrUndefined(form.lineRatingLbMin),
        lineRatingLbMax: parseIntOrUndefined(form.lineRatingLbMax),
        rodPower: form.rodPower || undefined,
        rodAction: form.rodAction || undefined,
        gearRatio: form.gearRatio || undefined,
        bearingCount: parseIntOrUndefined(form.bearingCount),
        maxDragLb: parseFloatOrUndefined(form.maxDragLb),
        weightOz: parseFloatOrUndefined(form.weightOz),
        lengthIn: parseFloatOrUndefined(form.lengthIn),
        customNotes: form.customNotes || undefined,
        autoAcceptOfferCents: parseIntOrUndefined(form.autoAcceptOfferCents),
        minimumOfferCents: parseIntOrUndefined(form.minimumOfferCents),
        shippingProfileId: form.shippingProfileId || undefined,
        shippingWeightOz: parseFloatOrUndefined(form.shippingWeightOz),
        shippingLengthIn: parseFloatOrUndefined(form.shippingLengthIn),
        shippingWidthIn: parseFloatOrUndefined(form.shippingWidthIn),
        shippingHeightIn: parseFloatOrUndefined(form.shippingHeightIn),
        handlingTimeDays: parseIntOrUndefined(form.handlingTimeDays),
        featuredPhotoUrl: form.featuredPhotoUrl || imageUrl,
        compliancePolicyId: form.compliancePolicyId || undefined,
        seoKeywords: parseCsv(form.seoKeywords),
        publish: true,
        images: [
          {
            url: imageUrl,
            altText: form.title,
            isPrimary: true,
          },
        ],
      } as const;

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Publishing failed');
      }

      const { listing } = await response.json();
      setPublishedSlug(listing.slug);
      setStepIndex(4);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Unable to publish listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-secondary">New listing</p>
        <h1 className="text-3xl font-semibold">Guided listing creation</h1>
        <p className="text-sm text-muted-foreground">
          Upload a product photo, let AI draft the story, review pricing guidance, and launch with
          confidence.
        </p>
      </header>

      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-muted/40">
        <div className="h-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
        {steps.map((label, index) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 ${
              index === stepIndex
                ? 'bg-brand-primary text-white'
                : index < stepIndex
                  ? 'bg-brand-secondary/10 text-brand-secondary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {label}
          </span>
        ))}
      </nav>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {stepIndex === 0 ? (
        <form
          onSubmit={handleUpload}
          className="space-y-4 rounded-lg border border-dashed border-brand-secondary/40 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold">1. Upload product photography</h2>
          <p className="text-sm text-muted-foreground">
            High-quality images help buyers trust your listing. JPEG or PNG recommended.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full rounded-md border border-brand-secondary/30 px-3 py-2"
            data-testid="photo-input"
          />
          {file ? <p className="text-xs text-muted-foreground">Selected: {file.name}</p> : null}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Step 1 of 5</span>
            <Button type="submit" disabled={loading} data-testid="upload-submit">
              {loading ? 'Uploading…' : 'Upload photo'}
            </Button>
          </div>
        </form>
      ) : null}

      {stepIndex === 1 && imageUrl ? (
        <section className="grid gap-6 rounded-lg border bg-white p-6 shadow-sm md:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">2. Generate story with AI vision</h2>
            <p className="text-sm text-muted-foreground">
              We send the uploaded photo to OpenAI (or fall back to our local model) to suggest a
              description and tags.
            </p>
            <Button onClick={handleVision} disabled={loading} data-testid="vision-generate">
              {loading ? 'Analysing…' : 'Generate description'}
            </Button>
            {vision ? (
              <div className="rounded-md border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm">
                <p className="font-medium text-brand-secondary">Suggested description</p>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {vision.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {vision.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs text-brand-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-center rounded-md border border-brand-secondary/30 bg-muted/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Uploaded preview"
              className="max-h-80 rounded-md object-cover"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={() => setStepIndex(2)} variant="outline" disabled={!vision || loading}>
              Use suggestions & continue
            </Button>
          </div>
        </section>
      ) : null}

      {stepIndex === 2 ? (
        <section className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">3. Fetch market pricing</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Listing title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Vintage camera, handmade decor…"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Category
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Photography, Collectibles, Apparel"
              />
            </label>
          </div>
          <Button onClick={handlePricing} disabled={loading} data-testid="pricing-fetch">
            {loading ? 'Contacting eBay…' : 'Pull comparable eBay pricing'}
          </Button>
          {pricing ? (
            <div className="rounded-md border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm">
              <p className="font-medium text-brand-secondary">Suggested price</p>
              <p className="mt-2 text-2xl font-semibold text-brand-primary">
                {pricing.currency} {pricing.averagePrice.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Range {pricing.currency} {pricing.minPrice.toFixed(2)} – {pricing.currency}{' '}
                {pricing.maxPrice.toFixed(2)}
              </p>
              {pricing.rationale ? (
                <p className="mt-2 text-xs text-muted-foreground">{pricing.rationale}</p>
              ) : null}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={() => setStepIndex(3)} variant="outline" disabled={!pricing}>
              Continue to preview
            </Button>
          </div>
        </section>
      ) : null}

      {stepIndex >= 3 ? (
        <section className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">4. Preview & edit</h2>
            {pricing ? (
              <span className="text-xs text-brand-secondary">
                AI price: {pricing.currency} {pricing.averagePrice.toFixed(2)}
              </span>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Price ({form.currency})
              <input
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({ ...current, price: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                step="0.01"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Brand
              <input
                value={form.brand}
                onChange={(event) =>
                  setForm((current) => ({ ...current, brand: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Megabass, Shimano, Daiwa"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Model name
              <input
                value={form.modelName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, modelName: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Destroyer P5, Curado 150"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={5}
              className="rounded-md border border-brand-secondary/30 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tags (comma separated)
            <input
              value={form.tags.join(', ')}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tags: event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
              className="rounded-md border border-brand-secondary/30 px-3 py-2"
              placeholder="swimbait, bass, 7ft-medium"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Condition
              <select
                value={form.condition}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    condition: event.target.value as TackleCondition,
                  }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
              >
                {tackleConditions.map((conditionOption) => (
                  <option key={conditionOption} value={conditionOption}>
                    {formatEnumLabel(conditionOption)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tackle category
              <select
                value={form.tackleCategory}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tackleCategory: event.target.value as FormState['tackleCategory'],
                  }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
              >
                <option value="">Select category</option>
                {tackleCategories.map((categoryOption) => (
                  <option key={categoryOption} value={categoryOption}>
                    {formatEnumLabel(categoryOption)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Water type
              <select
                value={form.waterType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    waterType: event.target.value as FormState['waterType'],
                  }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
              >
                <option value="">Any water</option>
                {waterTypes.map((waterOption) => (
                  <option key={waterOption} value={waterOption}>
                    {formatEnumLabel(waterOption)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Lure style or technique focus
              <input
                value={form.lureStyle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lureStyle: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Topwater walker, flipping jig"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Target bass species
              <input
                value={form.targetSpecies}
                onChange={(event) =>
                  setForm((current) => ({ ...current, targetSpecies: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Largemouth Bass, Smallmouth Bass"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Technique tags (comma separated)
              <input
                value={form.techniqueTags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, techniqueTags: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Flipping, Punching, Offshore"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Seasonal use (comma separated)
              <input
                value={form.seasonalUse}
                onChange={(event) =>
                  setForm((current) => ({ ...current, seasonalUse: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Spring, Summer"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Line rating minimum (lb)
              <input
                value={form.lineRatingLbMin}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lineRatingLbMin: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Line rating maximum (lb)
              <input
                value={form.lineRatingLbMax}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lineRatingLbMax: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Rod power
              <input
                value={form.rodPower}
                onChange={(event) =>
                  setForm((current) => ({ ...current, rodPower: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Medium Heavy"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Rod action
              <input
                value={form.rodAction}
                onChange={(event) =>
                  setForm((current) => ({ ...current, rodAction: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Fast"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Gear ratio
              <input
                value={form.gearRatio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, gearRatio: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="7.1:1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Bearing count
              <input
                value={form.bearingCount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bearingCount: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Max drag (lb)
              <input
                value={form.maxDragLb}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxDragLb: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
                step="0.1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Weight (oz)
              <input
                value={form.weightOz}
                onChange={(event) =>
                  setForm((current) => ({ ...current, weightOz: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
                step="0.1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Length (in)
              <input
                value={form.lengthIn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lengthIn: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
                step="0.1"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Custom notes (care, local success stories, accessibility info)
            <textarea
              value={form.customNotes}
              onChange={(event) =>
                setForm((current) => ({ ...current, customNotes: event.target.value }))
              }
              rows={4}
              className="rounded-md border border-brand-secondary/30 px-3 py-2"
              placeholder="Great on grass edges with a slow roll retrieve."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Auto-accept offer (cents)
              <input
                value={form.autoAcceptOfferCents}
                onChange={(event) =>
                  setForm((current) => ({ ...current, autoAcceptOfferCents: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Minimum offer (cents)
              <input
                value={form.minimumOfferCents}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minimumOfferCents: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Handling time (days)
              <input
                value={form.handlingTimeDays}
                onChange={(event) =>
                  setForm((current) => ({ ...current, handlingTimeDays: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Shipping weight (oz)
              <input
                value={form.shippingWeightOz}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shippingWeightOz: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
                step="0.1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Shipping length (in)
              <input
                value={form.shippingLengthIn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shippingLengthIn: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Shipping width (in)
              <input
                value={form.shippingWidthIn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shippingWidthIn: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Shipping height (in)
              <input
                value={form.shippingHeightIn}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shippingHeightIn: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                type="number"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Shipping profile ID
              <input
                value={form.shippingProfileId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shippingProfileId: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Optional prebuilt profile"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Compliance policy ID
              <input
                value={form.compliancePolicyId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, compliancePolicyId: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="Optional policy tracking"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              SEO keywords (comma separated)
              <input
                value={form.seoKeywords}
                onChange={(event) =>
                  setForm((current) => ({ ...current, seoKeywords: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="bass tournament, frog rod, finesse"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Featured photo URL override
              <input
                value={form.featuredPhotoUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, featuredPhotoUrl: event.target.value }))
                }
                className="rounded-md border border-brand-secondary/30 px-3 py-2"
                placeholder="https://cdn.example.com/custom-hero.jpg"
              />
            </label>
          </div>
          {imageUrl ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={form.title}
                className="max-h-72 rounded-md border object-cover"
              />
            </div>
          ) : null}
          {stepIndex === 4 && publishedSlug ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Listing published! View it on the{' '}
              <a href={`/listing/${publishedSlug}`} className="font-medium underline">
                Tackle Exchange page
              </a>
              .
            </div>
          ) : null}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {stepIndex < 4 ? (
                <Button onClick={handlePublish} disabled={loading} data-testid="publish-submit">
                  {loading ? 'Publishing…' : 'Publish listing'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => window.location.assign(`/listing/${publishedSlug}`)}
                >
                  View listing
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function buildTitleFromTags(tags: string[] | undefined) {
  if (!tags || tags.length === 0) {
    return '';
  }

  const trimmed = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((tag) => tag[0]?.toUpperCase() + tag.slice(1).toLowerCase());

  return trimmed.join(' ');
}
