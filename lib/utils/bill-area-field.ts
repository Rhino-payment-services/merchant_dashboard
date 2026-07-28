/**
 * Provider-aware Area / school-code field config for merchant bill payments.
 * Matches Pegasus NWSC area list and avoids inventing invalid defaults in the UI.
 */

export const NWSC_AREAS = [
  'Kampala',
  'Entebbe',
  'Jinja',
  'Mukono',
  'Iganga',
  'Lugazi',
  'Kawuku',
  'Kajjansi',
  'Others',
] as const;

export type NwscArea = (typeof NWSC_AREAS)[number];

export type BillAreaFieldMode = 'select' | 'text';

export type BillAreaFieldConfig = {
  visible: boolean;
  required: boolean;
  label: string;
  placeholder: string;
  mode: BillAreaFieldMode;
  options?: readonly string[];
  helpText: string;
  /** Short hint under the field (optional). */
  helperLine?: string;
};

const HIDDEN: BillAreaFieldConfig = {
  visible: false,
  required: false,
  label: '',
  placeholder: '',
  mode: 'text',
  helpText: '',
};

function normalizeProvider(utilityProvider?: string | null): string {
  return (utilityProvider ?? '').trim().toUpperCase().replace(/_/g, '-');
}

export function isNwscArea(value: string | undefined | null): value is NwscArea {
  return !!value && (NWSC_AREAS as readonly string[]).includes(value);
}

export function getAreaFieldConfig(
  utilityProvider?: string | null,
): BillAreaFieldConfig {
  const provider = normalizeProvider(utilityProvider);

  if (!provider || provider === 'AIRTIME' || provider === 'DATA-BUNDLES') {
    return HIDDEN;
  }

  if (provider === 'URA') {
    return HIDDEN;
  }

  if (provider === 'NWSC') {
    return {
      visible: true,
      required: true,
      label: 'Service area',
      placeholder: 'Select NWSC area',
      mode: 'select',
      options: NWSC_AREAS,
      helpText:
        'NWSC needs the water service area that matches this account. Choose from the list — leaving it blank or typing a city that is not listed usually causes “Area is Invalid”.',
      helperLine: 'Required for NWSC water bills.',
    };
  }

  if (provider === 'SCHOOL-FEES' || provider === 'SCHOOLFEES' || provider === 'FLEXIPAY') {
    return {
      visible: true,
      required: false,
      label: 'School code',
      placeholder: 'e.g., 001',
      mode: 'text',
      helpText:
        'School identifier used for FlexiPay / school fees. If you are unsure, leave blank — the system may use the default school code.',
      helperLine: 'Optional. Leave blank if you do not have a school code.',
    };
  }

  if (provider === 'DSTV' || provider === 'GOTV') {
    return {
      visible: true,
      required: false,
      label: 'Package / bouquet code',
      placeholder: 'Usually leave blank',
      mode: 'text',
      helpText:
        'This is not a city. Leave blank unless support asks you for a TV package or bouquet code.',
      helperLine: 'Optional — leave blank unless advised.',
    };
  }

  if (provider === 'UMEME' || provider === 'YAKALAST') {
    return {
      visible: true,
      required: false,
      label: 'Area / region',
      placeholder: 'Usually leave blank',
      mode: 'text',
      helpText:
        'Usually leave blank unless your bill or account specifies a region. Do not invent area codes — wrong values can cause “Area is Invalid”.',
      helperLine: 'Optional — leave blank unless your bill shows a region.',
    };
  }

  return {
    visible: true,
    required: false,
    label: 'Area / region',
    placeholder: 'Usually leave blank',
    mode: 'text',
    helpText:
      'Only fill this if your biller or support asks for an area or region. Leaving it blank is fine for most billers.',
    helperLine: 'Optional for this biller.',
  };
}

/** Client-side error message when Area is required but missing/invalid. */
export function validateBillArea(
  utilityProvider?: string | null,
  area?: string | null,
): string | null {
  const config = getAreaFieldConfig(utilityProvider);
  if (!config.visible || !config.required) return null;
  const trimmed = (area ?? '').trim();
  if (!trimmed) {
    return `Select a ${config.label.toLowerCase()} before continuing.`;
  }
  if (config.mode === 'select' && config.options && !config.options.includes(trimmed)) {
    return `Choose a valid ${config.label.toLowerCase()} from the list.`;
  }
  return null;
}
