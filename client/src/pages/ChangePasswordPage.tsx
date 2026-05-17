import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { inputClass } from '../constants/formStyles';

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!user) {
    return null;
  }
  if (!user.isFirstLogin) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (newPassword.length < 8) {
      const msg = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      setFormError(msg);
      toast(msg, 'warning');
      return;
    }
    if (newPassword !== confirm) {
      const msg = 'La confirmation ne correspond pas au nouveau mot de passe.';
      setFormError(msg);
      toast(msg, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast('Mot de passe mis à jour.', 'success');
      void navigate('/dashboard', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        const msg = err.response.data.error;
        const s = typeof msg === 'string' ? msg : JSON.stringify(msg);
        setFormError(s);
        toast(s, 'error');
      } else {
        setFormError('Impossible de mettre à jour le mot de passe.');
        toast('Impossible de mettre à jour le mot de passe.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="ds-card w-full max-w-md text-left">
      <h1 className="ds-title-page">Définir votre mot de passe</h1>
      <p className="ds-body mt-2">
        Pour des raisons de sécurité, vous devez changer le mot de passe initial avant d&apos;accéder au
        laboratoire.
      </p>

      {formError && <p className="mt-4 text-sm font-medium text-error">{formError}</p>}

      <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          <span>Mot de passe actuel</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          <span>Nouveau mot de passe</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          <span>Confirmer le nouveau mot de passe</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="submit" disabled={submitting} className="ds-btn-primary disabled:opacity-60">
            {submitting ? 'Enregistrement…' : 'Enregistrer et continuer'}
          </button>
          <button
            type="button"
            onClick={() => {
              void logout();
              void navigate('/login', { replace: true });
            }}
            className="ds-btn-secondary sm:ml-2"
          >
            Se déconnecter
          </button>
        </div>
      </form>
    </main>
  );
}
