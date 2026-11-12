import { useCallback, useEffect, useState } from "react";
import {
  notificationsCatalogApi,
  type WhatsappTemplateMeta,
  getApiError,
} from "../../lib/api";
import { canonicalTemplateNameForLookup } from "./whatsappTemplatePreviewUtils";

type Options = {
  auto?: boolean;
};

export function useWhatsappTemplateLookup(
  templateName: string,
  options?: Options
) {
  const [meta, setMeta] = useState<WhatsappTemplateMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(
    async (nameOverride?: string, showErrors = true) => {
      const raw = (nameOverride ?? templateName).trim();
      const canonical = canonicalTemplateNameForLookup(raw);
      if (!canonical) {
        setMeta(null);
        return null;
      }
      setLoading(true);
      if (showErrors) setError(null);
      try {
        const res = await notificationsCatalogApi.getWhatsappTemplate(canonical);
        const data = res.data.data;
        setMeta(data);
        return data;
      } catch (err) {
        if (showErrors) setError(getApiError(err));
        setMeta(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [templateName]
  );

  useEffect(() => {
    if (!options?.auto) return;
    const canonical = canonicalTemplateNameForLookup(templateName);
    if (!canonical) {
      setMeta(null);
      return;
    }
    void lookup(templateName, false);
  }, [templateName, options?.auto, lookup]);

  return { meta, loading, error, lookup, setMeta, setError };
}
