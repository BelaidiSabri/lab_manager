import { useMemo, useState } from 'react';
import { inputClass } from '../../constants/formStyles';
import { ROLE_LABELS } from '../../constants/roles';

export type MemberOption = { id: string; name: string; role?: string };

type Props = {
  options: MemberOption[];
  selected: MemberOption[];
  onSelectedChange: (members: MemberOption[]) => void;
  excludeIds?: string[];
  label?: string;
  hint?: string;
};

export default function ProjectMemberPicker({
  options,
  selected,
  onSelectedChange,
  excludeIds = [],
  label = 'Membres initiaux (hors chef de projet)',
  hint = 'Recherchez un membre, ajoutez-le à la liste. Vous pouvez laisser vide.',
}: Props) {
  const [search, setSearch] = useState('');
  const [pickId, setPickId] = useState('');

  const excluded = useMemo(() => new Set([...excludeIds, ...selected.map((m) => m.id)]), [excludeIds, selected]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return options.filter((m) => {
      if (excluded.has(m.id)) return false;
      if (!q) return true;
      const roleLabel = m.role ? (ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role) : '';
      return `${m.name} ${roleLabel}`.toLowerCase().includes(q);
    });
  }, [options, excluded, search]);

  const addPicked = () => {
    if (!pickId) return;
    const person = options.find((m) => m.id === pickId);
    if (!person || excluded.has(person.id)) return;
    onSelectedChange([...selected, person]);
    setPickId('');
    setSearch('');
  };

  const remove = (id: string) => {
    onSelectedChange(selected.filter((m) => m.id !== id));
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          className={inputClass}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou rôle…"
        />
        <select
          className={inputClass}
          value={pickId}
          onChange={(e) => setPickId(e.target.value)}
          disabled={filteredOptions.length === 0}
        >
          <option value="">
            {filteredOptions.length === 0 ? 'Aucun résultat' : 'Choisir un membre…'}
          </option>
          {filteredOptions.slice(0, 100).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.role ? ` (${ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ds-btn-secondary shrink-0"
          disabled={!pickId}
          onClick={addPicked}
        >
          Ajouter
        </button>
      </div>
      {search.trim() && filteredOptions.length > 100 && (
        <p className="mt-1 text-xs text-slate-500">Affichage limité à 100 résultats — affinez la recherche.</p>
      )}
      <div className="mt-3">
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Aucun membre ajouté pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-1">
            {selected.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <span className="text-slate-800">
                  {m.name}
                  {m.role && (
                    <span className="ml-1 text-xs text-slate-500">
                      ({ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:underline"
                  onClick={() => remove(m.id)}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
