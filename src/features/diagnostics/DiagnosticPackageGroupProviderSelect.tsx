import { useEffect, useMemo, useState } from "react";
import type { DiagnosticPackageBootstrapOption, DiagnosticPackageGroupListItem } from "../../lib/api";
import { catalogProductOptionLabel } from "./diagnosticPackageFormData";
import {
  filterGroupsByGender,
  findGroupAndProviderForPackageId,
  groupRowKey,
  hasExternalPackageCode,
  providersForGroup,
  resolvePackageId,
  rowForGroupKey,
} from "./diagnosticPackageGroupPicker";
import { diagnosticProviderDisplayLabel } from "./providerParameterKeys";

const selectClass =
  "w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900";

type Props = {
  groups: DiagnosticPackageGroupListItem[];
  value: number | null | undefined;
  onChange: (packageId: number | null) => void;
  bootstrapById?: Map<number, DiagnosticPackageBootstrapOption>;
  genderFilter?: "male" | "female" | null;
  disabled?: boolean;
  groupLabel?: string;
  providerLabel?: string;
  emptyGroupLabel?: string;
  emptyProviderLabel?: string;
  className?: string;
};

export function DiagnosticPackageGroupProviderSelect({
  groups,
  value,
  onChange,
  bootstrapById,
  genderFilter = null,
  disabled = false,
  groupLabel = "Product",
  providerLabel = "Provider",
  emptyGroupLabel = "Select product",
  emptyProviderLabel = "Select provider",
  className,
}: Props) {
  const filteredGroups = useMemo(
    () => filterGroupsByGender(groups, genderFilter),
    [groups, genderFilter]
  );

  const [groupKey, setGroupKey] = useState<number | "">("");
  const [providerKey, setProviderKey] = useState<string>("");

  useEffect(() => {
    const match = findGroupAndProviderForPackageId(filteredGroups, value ?? null);
    if (match) {
      setGroupKey(match.groupKey);
      setProviderKey(match.providerKey);
      return;
    }
    if (value == null || value <= 0) {
      setGroupKey("");
      setProviderKey("");
    }
  }, [value, filteredGroups]);

  const selectedRow = groupKey === "" ? undefined : rowForGroupKey(filteredGroups, groupKey);
  const providerKeys = selectedRow ? providersForGroup(selectedRow) : [];

  const handleGroupChange = (nextKey: number | "") => {
    setGroupKey(nextKey);
    setProviderKey("");
    onChange(null);
  };

  const handleProviderChange = (nextProvider: string) => {
    setProviderKey(nextProvider);
    if (!selectedRow || !nextProvider) {
      onChange(null);
      return;
    }
    const packageId = resolvePackageId(selectedRow, nextProvider);
    onChange(packageId ?? null);
  };

  const rootClass = className ? `${className} space-y-3` : "space-y-3";

  return (
    <div className={rootClass}>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">{groupLabel}</label>
        <select
          value={groupKey === "" ? "" : String(groupKey)}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            handleGroupChange(raw ? Number(raw) : "");
          }}
          className={selectClass}
        >
          <option value="">{emptyGroupLabel}</option>
          {filteredGroups.map((row) => (
            <option key={groupRowKey(row)} value={groupRowKey(row)}>
              {catalogProductOptionLabel(row)}
            </option>
          ))}
        </select>
      </div>
      {selectedRow && providerKeys.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{providerLabel}</label>
          <select
            value={providerKey}
            disabled={disabled}
            onChange={(e) => handleProviderChange(e.target.value)}
            className={selectClass}
          >
            <option value="">{emptyProviderLabel}</option>
            {providerKeys.map((key) => {
              const packageId = resolvePackageId(selectedRow, key);
              const selectable =
                packageId != null && hasExternalPackageCode(packageId, bootstrapById);
              return (
                <option key={key} value={key} disabled={!selectable}>
                  {diagnosticProviderDisplayLabel(key)}
                  {!selectable ? " (no external package code)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      ) : null}
    </div>
  );
}
