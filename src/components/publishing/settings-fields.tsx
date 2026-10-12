"use client";

import { Lock } from "lucide-react";

import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_SCHEMAS,
  type PlatformSettingsMap,
  type SettingField,
  type SettingValue,
} from "@/lib/platform-settings-schema";

type SettingsFieldsProps = {
  values: PlatformSettingsMap;
  /** When provided, fields may be left unset and fall back to these values. */
  inherited?: PlatformSettingsMap;
  idPrefix: string;
  onChange: (platform: string, key: string, value: SettingValue | undefined) => void;
};

const INHERIT = "__inherit__";

function display(value: SettingValue | undefined) {
  return typeof value === "boolean" ? (value ? "on" : "off") : value || "empty";
}

function FieldControl({
  field,
  id,
  value,
  inheritedValue,
  allowInherit,
  onChange,
}: {
  field: SettingField;
  id: string;
  value: SettingValue | undefined;
  inheritedValue: SettingValue | undefined;
  allowInherit: boolean;
  onChange: (value: SettingValue | undefined) => void;
}) {
  if (field.kind === "select" && field.locked) {
    return (
      <div id={id} className="flex h-10 items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-300">
        <Lock className="h-3.5 w-3.5" /> {field.defaultValue}
      </div>
    );
  }

  if (field.kind === "text") {
    return (
      <Input
        id={id}
        value={typeof value === "string" ? value : ""}
        placeholder={allowInherit ? `Inherit (${display(inheritedValue)})` : ""}
        onChange={(event) => onChange(event.target.value === "" && allowInherit ? undefined : event.target.value)}
      />
    );
  }

  const options = field.kind === "boolean" ? ["true", "false"] : field.options;
  const current = value === undefined ? INHERIT : String(value);

  return (
    <Select
      id={id}
      value={current}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === INHERIT) {
          onChange(undefined);
        } else {
          onChange(field.kind === "boolean" ? raw === "true" : raw);
        }
      }}
    >
      {allowInherit ? <option value={INHERIT}>Inherit ({display(inheritedValue)})</option> : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {field.kind === "boolean" ? (option === "true" ? "on" : "off") : option}
        </option>
      ))}
    </Select>
  );
}

/**
 * Renders every platform's settings fields from the shared schema.
 */
export function SettingsFields({ values, inherited, idPrefix, onChange }: SettingsFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {PLATFORM_SCHEMAS.map((schema) => (
        <fieldset key={schema.platform} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-200">{schema.label}</legend>
          {schema.fields.map((field) => {
            const id = `${idPrefix}-${schema.platform}-${field.key}`;
            return (
              <div key={field.key} className="space-y-1">
                <label htmlFor={id} className="text-xs text-slate-400">
                  {field.label}
                </label>
                <FieldControl
                  field={field}
                  id={id}
                  value={values[schema.platform]?.[field.key]}
                  inheritedValue={inherited?.[schema.platform]?.[field.key]}
                  allowInherit={Boolean(inherited)}
                  onChange={(value) => onChange(schema.platform, field.key, value)}
                />
                {field.help ? <p className="text-xs text-slate-500">{field.help}</p> : null}
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

/**
 * Immutably sets or clears one field in a settings map.
 */
export function setSetting(
  map: PlatformSettingsMap,
  platform: string,
  key: string,
  value: SettingValue | undefined,
): PlatformSettingsMap {
  const nextPlatform = { ...(map[platform] ?? {}) };
  if (value === undefined) {
    delete nextPlatform[key];
  } else {
    nextPlatform[key] = value;
  }
  const next = { ...map, [platform]: nextPlatform };
  if (!Object.keys(nextPlatform).length) {
    delete next[platform];
  }
  return next;
}
