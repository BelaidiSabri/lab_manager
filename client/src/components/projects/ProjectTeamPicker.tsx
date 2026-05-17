import { useEffect, useMemo, useState } from 'react';
import { fetchTeamCollaborations } from '../../services/labApi';

export type TeamOption = { _id: string; name: string };

type Props = {
  teams: TeamOption[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  disabled?: boolean;
};

export default function ProjectTeamPicker({
  teams,
  selectedIds,
  onSelectedChange,
  disabled = false,
}: Props) {
  const [partnerIds, setPartnerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedIds.length === 0) {
      setPartnerIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const results = await Promise.all(selectedIds.map((id) => fetchTeamCollaborations(id)));
        if (cancelled) return;
        const partners = new Set<string>();
        for (const collabs of results) {
          for (const c of collabs) {
            const pid = c.partnerTeam?._id;
            if (pid) partners.add(String(pid));
          }
        }
        setPartnerIds(partners);
      } catch {
        if (!cancelled) setPartnerIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIds]);

  const selectableIds = useMemo(() => {
    if (selectedIds.length === 0) return new Set(teams.map((t) => t._id));
    const allowed = new Set([...selectedIds, ...partnerIds]);
    return allowed;
  }, [teams, selectedIds, partnerIds]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (selectedIds.length > 0 && !selectableIds.has(id)) return;
    onSelectedChange([...selectedIds, id]);
  };

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-800">Équipes associées</legend>
      <p className="text-xs text-slate-500">
        Un projet peut concerner une ou plusieurs équipes. Pour un projet inter-équipes, sélectionnez uniquement des
        équipes en collaboration active.
      </p>
      {teams.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune équipe disponible.</p>
      ) : (
        <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
          {teams.map((t) => {
            const checked = selectedIds.includes(t._id);
            const canSelect = selectedIds.length === 0 || selectableIds.has(t._id);
            return (
              <li key={t._id}>
                <label
                  className={`flex cursor-pointer items-center gap-2 text-sm ${
                    !canSelect && !checked ? 'cursor-not-allowed text-slate-400' : 'text-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={checked}
                    disabled={!canSelect && !checked}
                    onChange={() => toggle(t._id)}
                  />
                  <span>{t.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {selectedIds.length > 0 && (
        <p className="text-xs text-slate-500">
          {selectedIds.length} équipe{selectedIds.length > 1 ? 's' : ''} sélectionnée
          {selectedIds.length > 1 ? 's' : ''}.
        </p>
      )}
    </fieldset>
  );
}
