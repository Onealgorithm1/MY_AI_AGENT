import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function TasksSection() {
  const queryClient = useQueryClient();
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/planka/cards`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      return data.cards || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData) => {
      const response = await fetch(`${API_URL}/planka/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(taskData),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setNewTaskName('');
      setNewTaskDescription('');
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ cardId, updates }) => {
      const response = await fetch(`${API_URL}/planka/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setEditingCardId(null);
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (cardId) => {
      const response = await fetch(`${API_URL}/planka/cards/${cardId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      toast.error('Task name is required');
      return;
    }
    createTask.mutate({
      name: newTaskName.trim(),
      description: newTaskDescription.trim() || undefined,
    });
  };

  const handleUpdateTask = (cardId) => {
    if (!editingName.trim()) {
      toast.error('Task name is required');
      return;
    }
    updateTask.mutate({
      cardId,
      updates: {
        name: editingName.trim(),
        description: editingDescription.trim() || undefined,
      },
    });
  };

  const startEditing = (task) => {
    setEditingCardId(task.id);
    setEditingName(task.name);
    setEditingDescription(task.description || '');
  };

  const cancelEditing = () => {
    setEditingCardId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const moveTask = (cardId, listName) => {
    updateTask.mutate({
      cardId,
      updates: { listName },
    });
  };

  const groupTasksByList = (tasks) => {
    const groups = {
      'To Do': [],
      'In Progress': [],
      'Done': [],
    };
    
    tasks?.forEach((task) => {
      const listName = task.list_name || 'To Do';
      if (groups[listName]) {
        groups[listName].push(task);
      }
    });
    
    return groups;
  };

  const tasksByList = groupTasksByList(tasks);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreateTask} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Task
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Task name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
          <textarea
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Task description (optional)"
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
          <button
            type="submit"
            disabled={createTask.isPending}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
          >
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(tasksByList).map(([listName, listTasks]) => (
          <div key={listName} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              {listName}
              <span className="text-sm text-gray-500 dark:text-gray-400">({listTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {listTasks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No tasks
                </p>
              ) : (
                listTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {editingCardId === task.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          rows="2"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateTask(task.id)}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {task.name}
                          </h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditing(task)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteTask.mutate(task.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            {task.description}
                          </p>
                        )}
                        {listName !== 'In Progress' && listName !== 'Done' && (
                          <button
                            onClick={() => moveTask(task.id, 'In Progress')}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Start Task
                          </button>
                        )}
                        {listName === 'In Progress' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveTask(task.id, 'To Do')}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                            >
                              Move to To Do
                            </button>
                            <button
                              onClick={() => moveTask(task.id, 'Done')}
                              className="text-xs text-green-600 dark:text-green-400 hover:underline"
                            >
                              Mark Done
                            </button>
                          </div>
                        )}
                        {listName === 'Done' && (
                          <button
                            onClick={() => moveTask(task.id, 'To Do')}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                          >
                            Reopen
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
