import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  expertTypesApi,
  getApiError,
  onboardingAssistantsApi,
  partnersApi,
  type CreatePhleboExistingPartner,
  type ExpertTypeItem,
  type PartnerListItem,
} from "../../lib/api";
import { Modal } from "../../shared/ui/Modal";

export type AddAssistantKind = "phlebo" | "expert";

type AddAssistantByPhoneModalProps = {
  open: boolean;
  onClose: () => void;
  engagementId: number;
  kind: AddAssistantKind;
  assignedPartnerIds: Set<number>;
  onSuccess: () => void | Promise<void>;
};

const MIN_PHONE_LEN = 8;

function getPartnerLabel(p: PartnerListItem): string {
  const name = (p.name ?? "").trim() || `Partner #${p.partner_id}`;
  return p.phone ? `${name} · ${p.phone}` : name;
}

export function AddAssistantByPhoneModal({
  open,
  onClose,
  engagementId,
  kind,
  assignedPartnerIds,
  onSuccess,
}: AddAssistantByPhoneModalProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [expertType, setExpertType] = useState("");
  const [expertTypes, setExpertTypes] = useState<ExpertTypeItem[]>([]);
  const [expertTypesLoading, setExpertTypesLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<PartnerListItem[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [showCreateFields, setShowCreateFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPartner, setPendingPartner] = useState<CreatePhleboExistingPartner | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const title = kind === "phlebo" ? "Add phlebo" : "Add expert";
  const role = kind;

  const resetForm = useCallback(() => {
    setPhone("");
    setName("");
    setSpecialization("");
    setExpertType("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    setShowCreateFields(false);
    setSubmitting(false);
    setError(null);
    setPendingPartner(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    if (kind !== "expert") return;
    let cancelled = false;
    setExpertTypesLoading(true);
    void expertTypesApi
      .list()
      .then((res) => {
        if (cancelled) return;
        const types = res.data.data;
        setExpertTypes(types);
        if (types.length > 0) {
          setExpertType((prev) => prev || types[0].type_key);
        }
      })
      .catch(() => {
        if (!cancelled) setExpertTypes([]);
      })
      .finally(() => {
        if (!cancelled) setExpertTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, resetForm]);

  useEffect(() => {
    if (!open) return;
    const trimmed = phone.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void (async () => {
        setSearching(true);
        setError(null);
        try {
          const res = await partnersApi.list({
            page: 1,
            limit: 10,
            status: "active",
            role,
            search: trimmed,
            sort_by: "name",
            sort_dir: "asc",
          });
          setSuggestions(res.data.data);
          setSuggestionsOpen(true);
        } catch (err) {
          setSuggestions([]);
          setError(getApiError(err));
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [open, phone, role]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const phoneTrimmed = phone.trim();
  const normalizedPhone = phoneTrimmed.replace(/\s+/g, "");
  const exactMatch = suggestions.find(
    (p) => (p.phone ?? "").replace(/\s+/g, "") === normalizedPhone,
  );

  useEffect(() => {
    if (!open || pendingPartner) return;
    if (exactMatch) {
      setShowCreateFields(false);
      return;
    }
    if (phoneTrimmed.length >= MIN_PHONE_LEN && !searching) {
      setShowCreateFields(true);
    }
  }, [open, exactMatch, phoneTrimmed.length, searching, pendingPartner]);

  const assignPartner = async (partnerId: number) => {
    if (assignedPartnerIds.has(partnerId)) {
      setError("This person is already assigned to this engagement.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onboardingAssistantsApi.assign(engagementId, { partner_ids: [partnerId] });
      await onSuccess();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectSuggestion = (partner: PartnerListItem) => {
    setPhone(partner.phone ?? phone);
    setSuggestionsOpen(false);
    setShowCreateFields(false);
    void assignPartner(partner.partner_id);
  };

  const submitCreate = async (confirmExisting: boolean) => {
    const trimmedName = name.trim();
    const trimmedPhone = phoneTrimmed;
    if (!trimmedPhone) {
      setError("Phone is required.");
      return;
    }
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (kind === "expert") {
      if (!specialization.trim()) {
        setError("Specialization is required.");
        return;
      }
      if (!expertType.trim()) {
        setError("Expert type is required.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const res =
        kind === "phlebo"
          ? await onboardingAssistantsApi.createPhlebo(engagementId, {
              name: trimmedName,
              phone: trimmedPhone,
              confirm_existing: confirmExisting,
            })
          : await onboardingAssistantsApi.createExpert(engagementId, {
              name: trimmedName,
              phone: trimmedPhone,
              specialization: specialization.trim(),
              expert_type: expertType,
              confirm_existing: confirmExisting,
            });
      const data = res.data.data;

      if (data.status === "confirmation_required") {
        setPendingPartner(data.existing_partner);
        return;
      }

      await onSuccess();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmExisting = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (kind === "phlebo") {
        await onboardingAssistantsApi.createPhlebo(engagementId, {
          name: name.trim(),
          phone: phoneTrimmed,
          confirm_existing: true,
        });
      } else {
        await onboardingAssistantsApi.createExpert(engagementId, {
          name: name.trim(),
          phone: phoneTrimmed,
          specialization: specialization.trim(),
          expert_type: expertType,
          confirm_existing: true,
        });
      }
      await onSuccess();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmitCreate =
    phoneTrimmed.length >= MIN_PHONE_LEN &&
    name.trim().length > 0 &&
    (kind === "phlebo" || (specialization.trim().length > 0 && expertType.trim().length > 0));

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClassName="max-w-md" zIndexClassName="z-[60]">
      <div className="space-y-4" ref={rootRef}>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {pendingPartner ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              A partner with this phone already exists. Add them to this engagement?
            </p>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-2">
              <p className="text-sm font-medium text-zinc-900">{pendingPartner.name}</p>
              <p className="text-sm text-zinc-600">{pendingPartner.phone ?? "—"}</p>
              {pendingPartner.role && <p className="text-xs text-zinc-500">Role: {pendingPartner.role}</p>}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void handleConfirmExisting()}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add to engagement"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingPartner(null);
                  setError(null);
                }}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (exactMatch && !showCreateFields) {
                void assignPartner(exactMatch.partner_id);
              } else {
                void submitCreate(false);
              }
            }}
          >
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-700 mb-1" htmlFor="assistant-phone">
                Phone *
              </label>
              <input
                id="assistant-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                placeholder="+91 9999999999"
                autoComplete="tel"
                required
              />
              {suggestionsOpen && (suggestions.length > 0 || searching) ? (
                <ul
                  className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100"
                  role="listbox"
                >
                  {searching ? (
                    <li className="px-3 py-2 text-sm text-zinc-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching…
                    </li>
                  ) : (
                    suggestions.map((p) => {
                      const already = assignedPartnerIds.has(p.partner_id);
                      return (
                        <li key={p.partner_id}>
                          <button
                            type="button"
                            disabled={submitting || already}
                            onClick={() => handleSelectSuggestion(p)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="font-medium text-zinc-900">{getPartnerLabel(p)}</span>
                            {already ? (
                              <span className="block text-xs text-zinc-500">Already assigned</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </div>

            {showCreateFields && !exactMatch ? (
              <>
                <p className="text-xs text-zinc-500">No matching {kind} found. Enter details to create and add.</p>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1" htmlFor="assistant-name">
                    Name *
                  </label>
                  <input
                    id="assistant-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    placeholder="Full name"
                    required
                  />
                </div>
                {kind === "expert" ? (
                  <>
                    <div>
                      <label
                        className="block text-sm font-medium text-zinc-700 mb-1"
                        htmlFor="assistant-specialization"
                      >
                        Specialization *
                      </label>
                      <input
                        id="assistant-specialization"
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        placeholder="e.g. General medicine"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1" htmlFor="assistant-expert-type">
                        Expert type *
                      </label>
                      {expertTypesLoading ? (
                        <p className="text-sm text-zinc-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading types…
                        </p>
                      ) : (
                        <select
                          id="assistant-expert-type"
                          value={expertType}
                          onChange={(e) => setExpertType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                          required
                        >
                          {expertTypes.length === 0 ? (
                            <option value="">No expert types configured</option>
                          ) : (
                            expertTypes.map((t) => (
                              <option key={t.id} value={t.type_key}>
                                {t.type}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>
                  </>
                ) : null}
              </>
            ) : exactMatch ? (
              <p className="text-xs text-zinc-500">
                Matching {kind} found. Select from the list or submit to assign{" "}
                <span className="font-medium">{getPartnerLabel(exactMatch)}</span>.
              </p>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                disabled={
                  submitting ||
                  (exactMatch ? assignedPartnerIds.has(exactMatch.partner_id) : !canSubmitCreate)
                }
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Saving…" : exactMatch ? "Assign" : "Create and add"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}