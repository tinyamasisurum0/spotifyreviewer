'use client';

import { useState, useTransition } from 'react';
import { deleteTierList } from '../actions';

type DeleteTierListButtonProps = {
  id: string;
  name: string;
};

export default function DeleteTierListButton({ id, name }: DeleteTierListButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const handleDelete = () => {
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteTierList(id);
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete tier list.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className="inline-flex items-center rounded border border-red-500 px-2 py-1 text-xs font-semibold text-red-200 transition-colors hover:border-red-400 hover:text-red-100"
      >
        Delete
      </button>
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Delete tier list</h2>
              <p className="text-sm text-gray-400">
                Are you sure you want to delete <span className="font-medium text-gray-200">{name}</span>?
                This action cannot be undone.
              </p>
            </div>
            {error && (
              <div className="rounded border border-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="inline-flex items-center rounded border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="inline-flex items-center rounded bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-75"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
