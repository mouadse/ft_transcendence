import { useMemo, useState } from 'react';
import { FormSelect } from './AdminExerciseLibrary';
import { authStore } from '../../stores/authStore';
import { useI18n } from '../../i18n/useI18n';
import {
  useAdminProgram,
  useAdminProgramAssignments,
  useAdminPrograms,
  useAdminUsers,
  useCreateAdminProgram,
  useCreateAdminProgramAssignment,
  useCreateAdminProgramSession,
  useCreateAdminProgramWeek,
  useDeleteAdminProgram,
  useDeleteAdminProgramAssignment,
  useDeleteAdminProgramSession,
  useDeleteAdminProgramWeek,
  useUpdateAdminProgram,
  useUpdateAdminProgramAssignment,
  useUpdateAdminProgramSession,
  useUpdateAdminProgramWeek,
} from '../../hooks/queries/useAdmin';
import {
  useCreateTemplate,
  useExercises,
  useTemplateList,
} from '../../hooks/queries/useWorkouts';

function splitExerciseField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPrimaryMuscle(exercise) {
  return splitExerciseField(exercise?.primary_muscles)[0] || exercise?.muscle_group || exercise?.primary_muscle || '';
}

function buildTemplateFromExercises(ownerId, sessionForm, selectedExercises, programDayLabel) {
  return {
    owner_id: ownerId,
    name: `${programDayLabel} ${Number(sessionForm.day_number) || 1}`,
    type: 'strength',
    notes: sessionForm.notes?.trim() || '',
    exercises: selectedExercises.map((exercise, index) => {
      const sets = Math.max(1, Number(exercise.sets) || 3);
      const reps = Math.max(0, Number(exercise.reps) || 10);
      const weight = Math.max(0, Number(exercise.weight) || 0);
      const restTime = Math.max(0, Number(exercise.rest_time) || 90);

      return {
        exercise_id: exercise.id,
        order: index + 1,
        sets,
        reps,
        weight,
        rest_time: restTime,
        notes: exercise.notes?.trim() || '',
        set_entries: Array.from({ length: sets }, (_, setIndex) => ({
          set_number: setIndex + 1,
          reps,
          weight,
          rest_seconds: restTime,
        })),
      };
    }),
  };
}

function ProgramModal({ initialValue, onClose, onSave, saving, t }) {
  const [form, setForm] = useState(
    initialValue || { name: '', description: '', is_active: true }
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 560 }}>
        <button className="adm-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
        <h2 className="adm-modal-title">{initialValue?.id ? t('admin.userPrograms.modal.editProgram') : t('admin.userPrograms.modal.createProgram')}</h2>

        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userPrograms.fields.programName')}</label>
          <input
            className="adm-form-input"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder={t('admin.userPrograms.fields.programNamePlaceholder')}
          />
        </div>

        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userPrograms.fields.description')}</label>
          <textarea
            className="adm-form-textarea"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder={t('admin.userPrograms.fields.descriptionPlaceholder')}
          />
        </div>

        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userPrograms.fields.status')}</label>
          <FormSelect
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(value) => setField('is_active', value === 'active')}
            options={[
              { value: 'active', label: t('admin.userPrograms.status.active') },
              { value: 'inactive', label: t('admin.userPrograms.status.inactive') },
            ]}
          />
        </div>

        <div className="adm-form-actions">
          <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
          <button
            className="adm-btn-primary"
            disabled={saving || !form.name?.trim()}
            onClick={() => onSave(form)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            {saving ? t('settings.saving') : initialValue?.id ? t('admin.userPrograms.actions.saveChanges') : t('admin.userPrograms.actions.createProgram')}
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekModal({ initialValue, onClose, onSave, saving, t }) {
  const [form, setForm] = useState(
    initialValue || { week_number: 1, name: '' }
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 520 }}>
        <button className="adm-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
        <h2 className="adm-modal-title">{initialValue?.id ? t('admin.userPrograms.modal.editWeek') : t('admin.userPrograms.modal.addWeek')}</h2>

        <div className="adm-grid-2">
          <div className="adm-form-field">
            <label className="adm-form-label">{t('admin.userPrograms.fields.weekNumber')}</label>
            <input
              className="adm-form-input"
              type="number"
              min={1}
              value={form.week_number}
              onChange={(e) => setField('week_number', Number(e.target.value || 1))}
            />
          </div>
          <div className="adm-form-field">
            <label className="adm-form-label">{t('admin.userPrograms.fields.weekNameOptional')}</label>
            <input
              className="adm-form-input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={t('admin.userPrograms.fields.weekNamePlaceholder')}
            />
          </div>
        </div>

        <div className="adm-form-actions">
          <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
          <button className="adm-btn-primary" disabled={saving} onClick={() => onSave(form)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            {saving ? t('settings.saving') : t('admin.userPrograms.actions.saveWeek')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionModal({ initialValue, onClose, onSave, saving, t }) {
  const currentUserId = authStore((state) => state.user?.id);
  const [form, setForm] = useState(
    initialValue
      ? {
          day_number: initialValue.day_number || 1,
          workout_template_id: initialValue.workout_template_id || initialValue.template?.id || '',
          notes: initialValue.notes || '',
        }
      : { day_number: 1, workout_template_id: '', notes: '' }
  );
  const [mode, setMode] = useState(form.workout_template_id ? 'template' : 'library');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);

  const { data: templatesData } = useTemplateList({ limit: 100 });
  const templateOptions = (templatesData?.templates || templatesData?.data || templatesData || []).map((template) => ({
    value: template.id,
    label: template.name || template.id,
  }));

  const { data: exerciseData, isLoading: exerciseLoading } = useExercises({
    limit: 12,
    ...(exerciseSearch ? { q: exerciseSearch } : {}),
  });
  const libraryExercises = exerciseData?.exercises || exerciseData?.data || exerciseData || [];
  const createTemplateMutation = useCreateTemplate();

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addExercise(exercise) {
    setSelectedExercises((prev) => {
      if (prev.some((item) => item.id === exercise.id)) return prev;
      return [
        ...prev,
        {
          id: exercise.id,
          name: exercise.name,
          muscle: getPrimaryMuscle(exercise),
          sets: 3,
          reps: 10,
          weight: '',
          rest_time: 90,
          notes: '',
        },
      ];
    });
  }

  function updateExercise(index, key, value) {
    setSelectedExercises((prev) => prev.map((exercise, exerciseIndex) => (
      exerciseIndex === index ? { ...exercise, [key]: value } : exercise
    )));
  }

  function removeExercise(index) {
    setSelectedExercises((prev) => prev.filter((_, exerciseIndex) => exerciseIndex !== index));
  }

  async function handleSave() {
    if (mode === 'template') {
      onSave(form);
      return;
    }

    if (selectedExercises.length === 0) {
      onSave({ ...form, workout_template_id: '' });
      return;
    }

    if (!currentUserId) return;

    try {
      const created = await createTemplateMutation.mutateAsync(
        buildTemplateFromExercises(currentUserId, form, selectedExercises, t('admin.userPrograms.session.programDay'))
      );
      const templateId = created?.id || created?.workout_template?.id || '';
      onSave({ ...form, workout_template_id: templateId });
    } catch {
      // Keep modal open so the admin can retry without losing their builder state.
    }
  }

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 760 }}>
        <button className="adm-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
        <h2 className="adm-modal-title">{initialValue?.id ? t('admin.userPrograms.modal.editSession') : t('admin.userPrograms.modal.addSession')}</h2>

        <div className="adm-grid-2">
          <div className="adm-form-field">
            <label className="adm-form-label">{t('admin.userPrograms.fields.dayNumber')}</label>
            <input
              className="adm-form-input"
              type="number"
              min={1}
              value={form.day_number}
              onChange={(e) => setField('day_number', Number(e.target.value || 1))}
            />
          </div>
          <div className="adm-form-field">
            <label className="adm-form-label">{t('admin.userPrograms.fields.buildSource')}</label>
            <FormSelect
              value={mode}
              onChange={(value) => setMode(value)}
              options={[
                { value: 'library', label: t('admin.userPrograms.session.exerciseLibrary') },
                { value: 'template', label: t('admin.userPrograms.session.existingTemplate') },
              ]}
            />
          </div>
        </div>

        {mode === 'template' ? (
          <div className="adm-form-field">
            <label className="adm-form-label">{t('admin.userPrograms.fields.workoutTemplate')}</label>
            <FormSelect
              value={form.workout_template_id}
              onChange={(value) => setField('workout_template_id', value)}
              options={[
                { value: '', label: t('admin.userPrograms.session.noTemplateSelected') },
                ...templateOptions,
              ]}
            />
          </div>
        ) : (
          <div style={{ border: '2px solid #dad4c8', borderRadius: 20, padding: 16, background: '#faf9f7', marginBottom: 14 }}>
            <div className="adm-form-field" style={{ marginBottom: 12 }}>
              <label className="adm-form-label">{t('admin.userPrograms.session.pickExercises')}</label>
              <input
                className="adm-form-input"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder={t('admin.userPrograms.search.searchExercises')}
              />
            </div>

            <div style={{ display: 'grid', gap: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
              {exerciseLoading ? (
                <div style={{ fontSize: 13, color: '#767775' }}>{t('admin.userPrograms.states.loadingExercises')}</div>
              ) : libraryExercises.length === 0 ? (
                <div style={{ fontSize: 13, color: '#767775' }}>{t('admin.userPrograms.states.noExercisesFound')}</div>
              ) : (
                libraryExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => addExercise(exercise)}
                    style={{
                      border: '2px solid #dad4c8',
                      borderRadius: 14,
                      background: '#fff',
                      padding: '12px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{exercise.name}</div>
                      <div style={{ fontSize: 12, color: '#5b5c5a' }}>
                        {getPrimaryMuscle(exercise) || t('workouts.search.fullBody')} · {exercise.equipment || t('workouts.search.bodyweight')}
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#38671a' }}>add_circle</span>
                  </button>
                ))
              )}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {selectedExercises.map((exercise, index) => (
                <div key={`${exercise.id}-${index}`} style={{ border: '2px solid #dad4c8', borderRadius: 16, padding: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{exercise.name}</div>
                      <div style={{ fontSize: 12, color: '#5b5c5a' }}>{exercise.muscle || t('workouts.search.addExercise')}</div>
                    </div>
                    <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => removeExercise(index)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>

                  <div className="adm-programs-exercise-fields">
                    <div className="adm-form-field">
                      <label className="adm-form-label">{t('workouts.history.sets')}</label>
                      <input className="adm-form-input" type="number" min={1} value={exercise.sets} onChange={(e) => updateExercise(index, 'sets', e.target.value)} />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">{t('workouts.history.reps')}</label>
                      <input className="adm-form-input" type="number" min={0} value={exercise.reps} onChange={(e) => updateExercise(index, 'reps', e.target.value)} />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">{t('workouts.history.weight')}</label>
                      <input className="adm-form-input" type="number" min={0} value={exercise.weight} onChange={(e) => updateExercise(index, 'weight', e.target.value)} />
                    </div>
                    <div className="adm-form-field">
                      <label className="adm-form-label">{t('admin.userPrograms.fields.restSeconds')}</label>
                      <input className="adm-form-input" type="number" min={0} value={exercise.rest_time} onChange={(e) => updateExercise(index, 'rest_time', e.target.value)} />
                    </div>
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">{t('admin.userPrograms.fields.exerciseNotes')}</label>
                    <textarea
                      className="adm-form-textarea"
                      value={exercise.notes}
                      onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                      placeholder={t('admin.userPrograms.fields.exerciseNotesPlaceholder')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userPrograms.fields.sessionNotes')}</label>
          <textarea
            className="adm-form-textarea"
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={t('admin.userPrograms.fields.sessionNotesPlaceholder')}
          />
        </div>

        <div className="adm-form-actions">
          <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
          <button className="adm-btn-primary" disabled={saving || createTemplateMutation.isPending} onClick={handleSave}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            {saving || createTemplateMutation.isPending ? t('settings.saving') : t('admin.userPrograms.actions.saveSession')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignmentModal({ users, onClose, onSave, saving, t }) {
  const [form, setForm] = useState({
    user_id: users[0]?.id || '',
    status: 'assigned',
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 520 }}>
        <button className="adm-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
        <h2 className="adm-modal-title">{t('admin.userPrograms.modal.assignProgram')}</h2>

        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userPrograms.fields.user')}</label>
          <FormSelect
            value={form.user_id}
            onChange={(value) => setField('user_id', value)}
            options={users.map((user) => ({
              value: user.id,
              label: `${user.name || user.full_name || user.email || user.id}`,
            }))}
          />
        </div>

        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userPrograms.fields.initialStatus')}</label>
          <FormSelect
            value={form.status}
            onChange={(value) => setField('status', value)}
            options={[
              { value: 'assigned', label: t('workouts.status.assigned') },
              { value: 'in_progress', label: t('workouts.status.inProgress') },
              { value: 'completed', label: t('workouts.status.completed') },
              { value: 'cancelled', label: t('workouts.status.cancelled') },
            ]}
          />
        </div>

        <div className="adm-form-actions">
          <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
          <button
            className="adm-btn-primary"
            disabled={saving || !form.user_id}
            onClick={() => onSave(form)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
            {saving ? t('admin.userPrograms.actions.assigning') : t('admin.userPrograms.actions.assign')}
          </button>
        </div>
      </div>
    </div>
  );
}

function statusChipClass(status) {
  if (status === 'completed') return 'adm-chip adm-chip--green';
  if (status === 'in_progress') return 'adm-chip adm-chip--purple';
  if (status === 'cancelled') return 'adm-chip adm-chip--red';
  return 'adm-chip adm-chip--oat';
}

export default function AdminUserPrograms() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [programModal, setProgramModal] = useState(null);
  const [weekModal, setWeekModal] = useState(null);
  const [sessionModal, setSessionModal] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  const { data: programsData, isLoading, isError, errorMeta } = useAdminPrograms({ limit: 100 });
  const programs = useMemo(() => {
    if (Array.isArray(programsData)) return programsData;
    if (Array.isArray(programsData?.programs)) return programsData.programs;
    if (Array.isArray(programsData?.data)) return programsData.data;
    return [];
  }, [programsData]);

  const { data: usersData } = useAdminUsers({ limit: 200 });
  const users = usersData?.users || usersData?.data || [];

  const {
    data: selectedProgramData,
    isLoading: selectedProgramLoading,
    isError: selectedProgramError,
    errorMeta: selectedProgramErrorMeta,
  } = useAdminProgram(selectedProgramId);
  const selectedProgram = selectedProgramData?.program || selectedProgramData?.data || null;

  const {
    data: assignmentsData,
    isError: assignmentsError,
    errorMeta: assignmentsErrorMeta,
  } = useAdminProgramAssignments(selectedProgramId);
  const assignments = assignmentsData?.assignments || assignmentsData?.data || [];

  const createProgramMutation = useCreateAdminProgram();
  const updateProgramMutation = useUpdateAdminProgram();
  const deleteProgramMutation = useDeleteAdminProgram();
  const createWeekMutation = useCreateAdminProgramWeek();
  const updateWeekMutation = useUpdateAdminProgramWeek();
  const deleteWeekMutation = useDeleteAdminProgramWeek();
  const createSessionMutation = useCreateAdminProgramSession();
  const updateSessionMutation = useUpdateAdminProgramSession();
  const deleteSessionMutation = useDeleteAdminProgramSession();
  const createAssignmentMutation = useCreateAdminProgramAssignment();
  const updateAssignmentMutation = useUpdateAdminProgramAssignment();
  const deleteAssignmentMutation = useDeleteAdminProgramAssignment();

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      if (activeFilter === 'active' && !program.is_active) return false;
      if (activeFilter === 'inactive' && program.is_active) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        String(program.name || '').toLowerCase().includes(q) ||
        String(program.description || '').toLowerCase().includes(q)
      );
    });
  }, [programs, activeFilter, search]);

  function handleSaveProgram(form) {
    const payload = {
      name: form.name?.trim(),
      description: form.description || '',
      is_active: !!form.is_active,
    };
    if (!payload.name) return;
    if (programModal?.id) {
      updateProgramMutation.mutate(
        { program_id: programModal.id, data: payload },
        { onSuccess: () => setProgramModal(null) }
      );
      return;
    }
    createProgramMutation.mutate(payload, { onSuccess: () => setProgramModal(null) });
  }

  function handleDeleteProgram(programId) {
    if (!programId) return;
    deleteProgramMutation.mutate(programId, {
      onSuccess: () => {
        if (selectedProgramId === programId) setSelectedProgramId(null);
      },
    });
  }

  function handleSaveWeek(form) {
    if (!selectedProgramId) return;
    const payload = {
      week_number: Number(form.week_number) || 1,
      name: form.name || '',
    };
    if (weekModal?.id) {
      updateWeekMutation.mutate(
        { week_id: weekModal.id, program_id: selectedProgramId, data: payload },
        { onSuccess: () => setWeekModal(null) }
      );
      return;
    }
    createWeekMutation.mutate(
      { program_id: selectedProgramId, data: payload },
      { onSuccess: () => setWeekModal(null) }
    );
  }

  function handleSaveSession(form) {
    if (!selectedProgramId || !sessionModal?.week_id) return;
    const templateId = String(form.workout_template_id || '').trim();
    const payload = {
      day_number: Number(form.day_number) || 1,
      notes: form.notes || '',
      ...(templateId ? { workout_template_id: templateId } : {}),
    };
    if (sessionModal?.id) {
      updateSessionMutation.mutate(
        {
          session_id: sessionModal.id,
          program_id: selectedProgramId,
          data: {
            ...payload,
            workout_template_id: templateId || null,
          },
        },
        { onSuccess: () => setSessionModal(null) }
      );
      return;
    }
    createSessionMutation.mutate(
      { week_id: sessionModal.week_id, program_id: selectedProgramId, data: payload },
      { onSuccess: () => setSessionModal(null) }
    );
  }

  function handleCreateAssignment(form) {
    if (!selectedProgramId) return;
    createAssignmentMutation.mutate(
      { program_id: selectedProgramId, data: { user_id: form.user_id, status: form.status } },
      { onSuccess: () => setAssignmentModalOpen(false) }
    );
  }

  function handleUpdateAssignmentStatus(assignment, status) {
    if (!assignment?.id || !selectedProgramId) return;
    updateAssignmentMutation.mutate({
      assignment_id: assignment.id,
      program_id: selectedProgramId,
      data: { status },
    });
  }

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <p className="adm-page-eyebrow">// WORKOUT_PROGRAMS</p>
          <h1 className="adm-page-title">
            {t('admin.userPrograms.header.titleLine1')}
            <br />
            {t('admin.userPrograms.header.titleLine2')}
          </h1>
        </div>
        <div className="adm-page-actions">
          <div className="adm-search-wrap">
            <span className="material-symbols-outlined adm-search-icon">search</span>
            <input
              className="adm-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.userPrograms.search.programsPlaceholder')}
            />
          </div>
          <button className="adm-btn-primary" onClick={() => setProgramModal({})}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
            {t('admin.userPrograms.actions.createProgram')}
          </button>
        </div>
      </div>

      {isError && errorMeta?.shouldFallback && (
        <div className="adm-chip adm-chip--red" style={{ marginBottom: 14 }}>
          {t('admin.userPrograms.errors.programServiceUnstable')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className={activeFilter === 'all' ? 'adm-btn-primary' : 'adm-btn-ghost'} onClick={() => setActiveFilter('all')}>{t('workouts.search.all')}</button>
        <button className={activeFilter === 'active' ? 'adm-btn-primary' : 'adm-btn-ghost'} onClick={() => setActiveFilter('active')}>{t('admin.userPrograms.status.active')}</button>
        <button className={activeFilter === 'inactive' ? 'adm-btn-primary' : 'adm-btn-ghost'} onClick={() => setActiveFilter('inactive')}>{t('admin.userPrograms.status.inactive')}</button>
      </div>

      <div className="adm-programs-layout">
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="adm-chip adm-chip--oat">{t('admin.userPrograms.summary.programs', { count: programs.length })}</span>
            <span className="adm-chip adm-chip--green">{t('admin.userPrograms.summary.active', { count: programs.filter((p) => p.is_active).length })}</span>
          </div>
          <div className="adm-grid-3 adm-programs-list">
            {isLoading ? (
              <div className="adm-card" style={{ padding: 20 }}>{t('admin.userPrograms.states.loadingPrograms')}</div>
            ) : filteredPrograms.length === 0 ? (
              <div className="adm-card" style={{ padding: 20 }}>{t('admin.userPrograms.states.noPrograms')}</div>
            ) : (
              filteredPrograms.map((program) => (
                <div
                  key={program.id}
                  className="adm-card"
                  style={{
                    padding: 16,
                    border: selectedProgramId === program.id ? '2px solid #38671a' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button
                      onClick={() => setSelectedProgramId(program.id)}
                      style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', flex: 1 }}
                    >
                      <h3 style={{ fontSize: 15, marginBottom: 6 }}>{program.name}</h3>
                      <p style={{ fontSize: 12, color: '#5b5c5a', marginBottom: 8 }}>{program.description || t('admin.userPrograms.labels.noDescription')}</p>
                      <span className={program.is_active ? 'adm-chip adm-chip--green' : 'adm-chip adm-chip--oat'}>
                        {program.is_active ? t('admin.userPrograms.status.active') : t('admin.userPrograms.status.inactive')}
                      </span>
                    </button>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="adm-icon-btn adm-icon-btn--edit" onClick={() => setProgramModal(program)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      </button>
                      <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => handleDeleteProgram(program.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="adm-card" style={{ padding: 18 }}>
          {!selectedProgramId ? (
            <div className="adm-empty">
              <span className="material-symbols-outlined adm-empty-icon">event_note</span>
              <p className="adm-empty-text">{t('admin.userPrograms.states.selectProgram')}</p>
            </div>
          ) : selectedProgramLoading ? (
            <div>{t('admin.userPrograms.states.loadingProgramDetails')}</div>
          ) : selectedProgramError ? (
            <div className="adm-chip adm-chip--red">
              {selectedProgramErrorMeta?.message || t('admin.userPrograms.errors.loadSelectedProgram')}
            </div>
          ) : (
            <>
              <div className="adm-programs-detail-head" style={{ marginBottom: 14 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>{selectedProgram?.name || t('admin.userPrograms.labels.program')}</h2>
                  <p style={{ fontSize: 13, color: '#5b5c5a' }}>{selectedProgram?.description || t('admin.userPrograms.labels.noDescription')}</p>
                </div>
                <button className="adm-btn-primary" onClick={() => setWeekModal({})}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  {t('admin.userPrograms.actions.addWeek')}
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 8, fontSize: 14 }}>{t('admin.userPrograms.sections.weeksAndSessions')}</h3>
                {(selectedProgram?.weeks || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: '#767775' }}>{t('admin.userPrograms.states.noWeeks')}</p>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[...(selectedProgram?.weeks || [])]
                      .sort((a, b) => (a.week_number || 0) - (b.week_number || 0))
                      .map((week) => (
                        <div key={week.id} style={{ border: '2px solid #dad4c8', borderRadius: 16, padding: 12 }}>
                          <div className="adm-programs-week-head" style={{ marginBottom: 8 }}>
                            <div>
                              <strong>{t('admin.userPrograms.labels.weekNumber', { count: week.week_number })}</strong>
                              {week.name ? <span style={{ marginLeft: 8, color: '#5b5c5a' }}>({week.name})</span> : null}
                            </div>
                            <div className="adm-programs-week-actions">
                              <button className="adm-icon-btn adm-icon-btn--edit" onClick={() => setWeekModal(week)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                              </button>
                              <button
                                className="adm-icon-btn adm-icon-btn--danger"
                                onClick={() => deleteWeekMutation.mutate({ week_id: week.id, program_id: selectedProgramId })}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                              </button>
                              <button className="adm-btn-ghost" onClick={() => setSessionModal({ week_id: week.id })}>
                                {t('admin.userPrograms.actions.addSession')}
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: 8 }}>
                            {[...(week.sessions || [])]
                              .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
                              .map((session) => (
                                <div key={session.id} style={{ border: '1px dashed #dad4c8', borderRadius: 12, padding: 10 }}>
                                  <div className="adm-programs-session-head">
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        {t('admin.userPrograms.labels.dayNumber', { count: session.day_number })}
                                        {session.template?.name ? ` - ${session.template.name}` : ''}
                                      </div>
                                      <div style={{ fontSize: 12, color: '#5b5c5a' }}>{session.notes || t('admin.userPrograms.labels.noNotes')}</div>
                                    </div>
                                    <div className="adm-programs-session-actions">
                                      <button
                                        className="adm-icon-btn adm-icon-btn--edit"
                                        onClick={() => setSessionModal({ ...session, week_id: week.id })}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                                      </button>
                                      <button
                                        className="adm-icon-btn adm-icon-btn--danger"
                                        onClick={() => deleteSessionMutation.mutate({ session_id: session.id, program_id: selectedProgramId })}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <div className="adm-programs-assignment-head" style={{ marginBottom: 8 }}>
                  <h3 style={{ fontSize: 14 }}>{t('admin.userPrograms.sections.assignments')}</h3>
                  <button className="adm-btn-primary" onClick={() => setAssignmentModalOpen(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                    {t('admin.userPrograms.actions.assignUser')}
                  </button>
                </div>

                {assignmentsError && assignmentsErrorMeta?.shouldFallback && (
                  <div className="adm-chip adm-chip--red" style={{ marginBottom: 8 }}>
                    {t('admin.userPrograms.errors.assignmentServiceIssue')}
                  </div>
                )}

                {assignments.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#767775' }}>{t('admin.userPrograms.states.noAssignments')}</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {assignments.map((assignment) => (
                      <div key={assignment.id} style={{ border: '2px solid #dad4c8', borderRadius: 12, padding: 10 }}>
                        <div className="adm-programs-assignment-row">
                          <div>
                            <div style={{ fontSize: 12, color: '#5b5c5a' }}>{t('admin.userPrograms.labels.userId')}</div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{assignment.user_id}</div>
                            <div style={{ marginTop: 6 }}>
                              <span className={statusChipClass(assignment.status)}>
                                {t(`workouts.status.${assignment.status === 'in_progress' ? 'inProgress' : assignment.status || 'assigned'}`)}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <FormSelect
                              value={assignment.status || 'assigned'}
                              onChange={(status) => handleUpdateAssignmentStatus(assignment, status)}
                              options={[
                                { value: 'assigned', label: t('workouts.status.assigned') },
                                { value: 'in_progress', label: t('workouts.status.inProgress') },
                                { value: 'completed', label: t('workouts.status.completed') },
                                { value: 'cancelled', label: t('workouts.status.cancelled') },
                              ]}
                            />
                            <button
                              className="adm-icon-btn adm-icon-btn--danger"
                              onClick={() => deleteAssignmentMutation.mutate({ assignment_id: assignment.id, program_id: selectedProgramId })}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {programModal !== null && (
        <ProgramModal
          initialValue={programModal?.id ? programModal : null}
          onClose={() => setProgramModal(null)}
          onSave={handleSaveProgram}
          saving={createProgramMutation.isPending || updateProgramMutation.isPending}
          t={t}
        />
      )}

      {weekModal !== null && (
        <WeekModal
          initialValue={weekModal?.id ? weekModal : null}
          onClose={() => setWeekModal(null)}
          onSave={handleSaveWeek}
          saving={createWeekMutation.isPending || updateWeekMutation.isPending}
          t={t}
        />
      )}

      {sessionModal !== null && (
        <SessionModal
          initialValue={sessionModal?.id ? sessionModal : null}
          onClose={() => setSessionModal(null)}
          onSave={handleSaveSession}
          saving={createSessionMutation.isPending || updateSessionMutation.isPending}
          t={t}
        />
      )}

      {assignmentModalOpen && (
        <AssignmentModal
          users={users}
          onClose={() => setAssignmentModalOpen(false)}
          onSave={handleCreateAssignment}
          saving={createAssignmentMutation.isPending}
          t={t}
        />
      )}
    </div>
  );
}
