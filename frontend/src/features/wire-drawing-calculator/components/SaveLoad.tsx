import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2, Database } from 'lucide-react';
import type { DieSchedule } from '../types';
import { useToast } from '../../../contexts';

interface SaveLoadProps {
  dies: number[];
  onLoad: (dies: number[]) => void;
}

const STORAGE_KEY = 'wire-draw-schedules';

function getSchedules(): DieSchedule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSchedules(s: DieSchedule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export default function SaveLoad({ dies, onLoad }: SaveLoadProps) {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<DieSchedule[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSchedules(getSchedules());
    setLoading(false);
  }, []);

  const handleSave = () => {
    if (dies.length === 0) return;
    const n = name.trim() || 'Schedule ' + new Date().toLocaleDateString();
    const s: DieSchedule = {
      id: Date.now().toString(),
      name: n,
      dies: [...dies],
      timestamp: Date.now(),
    };

    const updated = [...schedules, s];
    setSchedules(updated);
    saveSchedules(updated);
    setName('');
    showToast('Saved "' + n + '"', 'success');
  };

  const handleDelete = (id: string) => {
    const updated = schedules.filter((s) => s.id !== id);
    setSchedules(updated);
    saveSchedules(updated);
    showToast('Deleted schedule', 'success');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="wdc-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-[var(--color-text)] m-0">Saved Schedules</h3>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--color-border-visible)] bg-[var(--wdc-steel)] text-[var(--color-text-secondary)] flex items-center gap-1"
          title="Backed by local storage"
        >
          <Database className="w-2.5 h-2.5 text-blue-500" aria-hidden="true" />
          Local
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Schedule name..."
          aria-label="New schedule name"
          className="wdc-input flex-1 text-[13px]"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={dies.length === 0}
          className="wdc-btn wdc-btn-primary text-xs cursor-pointer"
          aria-label="Save current die schedule"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" /> Save
        </button>
      </div>

      {loading ? (
        <p className="text-[12px] text-[var(--color-text-secondary)] text-center py-4 font-mono">Loading schedules...</p>
      ) : schedules.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-secondary)] text-center py-4 font-mono">No saved schedules</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 bg-[var(--wdc-steel)] rounded border border-[var(--color-border)] hover:border-[var(--color-border-visible)] transition-all group"
            >
              <div
                className="cursor-pointer flex-1 min-w-0"
                onClick={() => {
                  onLoad(s.dies);
                  showToast('Loaded "' + s.name + '"', 'success');
                }}
              >
                <div className="text-[12px] font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] transition-colors truncate">
                  {s.name}
                </div>
                <div className="text-[10px] text-[var(--color-text-secondary)] font-mono tabular-nums">
                  {s.dies.length} dies · {s.dies[0]} → {s.dies[s.dies.length - 1]} mm
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="wdc-btn wdc-btn-danger text-xs px-2 py-1 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer hover:bg-rose-500/20 text-rose-400"
                title="Delete schedule"
                aria-label={`Delete saved schedule ${s.name}`}
              >
                <Trash2 className="w-3 h-3 text-red-400" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
