import { inputClass } from '../../constants/formStyles';
import {
  PUBLICATION_VISIBILITY_OPTIONS,
  publicationAccessRoleLabel,
  ROLE_OPTIONS_FOR_PUBLICATION_ACCESS,
  type PublicationVisibilityValue,
} from '../../constants/publicationVisibility';

type Props = {
  visibility: PublicationVisibilityValue;
  onVisibilityChange: (v: PublicationVisibilityValue) => void;
  accessRoles: string[];
  onAccessRolesChange: (roles: string[]) => void;
  userTeamName?: string | null;
};

export default function PublicationVisibilityFields({
  visibility,
  onVisibilityChange,
  accessRoles,
  onAccessRolesChange,
  userTeamName,
}: Props) {
  const selected = PUBLICATION_VISIBILITY_OPTIONS.find((o) => o.value === visibility);

  const toggleRole = (role: string) => {
    if (accessRoles.includes(role)) {
      onAccessRolesChange(accessRoles.filter((r) => r !== role));
    } else {
      onAccessRolesChange([...accessRoles, role]);
    }
  };

  return (
    <fieldset className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <legend className="ds-card-title px-1 text-slate-900">Qui peut voir cette publication ?</legend>
      <p className="mt-1 text-xs text-slate-600">
        Les co-auteurs et le super administrateur y ont toujours accès. Vous pourrez modifier ce réglage plus tard.
      </p>
      <div className="mt-3 space-y-2">
        {PUBLICATION_VISIBILITY_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition ${
              visibility === opt.value
                ? 'border-primary bg-primary-light/60'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              className="mt-1"
              checked={visibility === opt.value}
              onChange={() => onVisibilityChange(opt.value)}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-slate-600">{opt.description}</span>
              {opt.value === 'team' && userTeamName && visibility === 'team' && (
                <span className="mt-1 block text-xs font-medium text-primary">Équipe : {userTeamName}</span>
              )}
              {opt.value === 'team_and_collaborators' && userTeamName && visibility === 'team_and_collaborators' && (
                <span className="mt-1 block text-xs font-medium text-primary">
                  Basé sur l’équipe : {userTeamName} (+ partenaires)
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {visibility === 'custom_roles' && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-medium text-slate-800">Rôles autorisés</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLE_OPTIONS_FOR_PUBLICATION_ACCESS.map((role) => (
              <label
                key={role}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  accessRoles.includes(role)
                    ? 'border-primary bg-primary-light text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={accessRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
                {publicationAccessRoleLabel(role)}
              </label>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}
