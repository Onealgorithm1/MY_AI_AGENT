import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  Calendar,
  FileText,
  Plus,
  X,
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  Folder,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  CalendarPlus,
} from 'lucide-react';
import collaboration from '../services/collaboration';
import { addToGoogleCalendar } from '../utils/integrations';

const ProposalWorkspacePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const opportunityId = searchParams.get('opportunityId');

  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, checklist, team, deadlines

  // Create workspace form state
  const [newWorkspace, setNewWorkspace] = useState({
    workspaceName: '',
    opportunityId: opportunityId || '',
    rfpTitle: '',
    agencyName: '',
    solicitationNumber: '',
    responseDeadline: '',
  });

  // Checklist state
  const [checklists, setChecklists] = useState([]);
  const [showAddChecklistItem, setShowAddChecklistItem] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState({
    taskName: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (opportunityId && !showCreateDialog) {
      setShowCreateDialog(true);
    }
  }, [opportunityId]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceDetails(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await collaboration.getWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceDetails = async (workspaceId) => {
    try {
      const [workspace, checklistData] = await Promise.all([
        collaboration.getWorkspace(workspaceId),
        collaboration.getChecklists(workspaceId).catch(() => ({ checklists: [] })),
      ]);

      setSelectedWorkspace(workspace);
      setChecklists(checklistData.checklists || []);
    } catch (error) {
      console.error('Failed to load workspace details:', error);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspace.workspaceName.trim()) {
      alert('Workspace name is required');
      return;
    }

    try {
      const workspace = await collaboration.createWorkspace(newWorkspace);
      setWorkspaces([workspace, ...workspaces]);
      setShowCreateDialog(false);
      setSelectedWorkspace(workspace);
      setNewWorkspace({
        workspaceName: '',
        opportunityId: '',
        rfpTitle: '',
        agencyName: '',
        solicitationNumber: '',
        responseDeadline: '',
      });
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace. Please try again.');
    }
  };

  const addChecklistItem = async () => {
    if (!newChecklistItem.taskName.trim()) {
      alert('Task name is required');
      return;
    }

    try {
      const item = await collaboration.createChecklistItem(selectedWorkspace.id, newChecklistItem);
      // Reload checklists
      const checklistData = await collaboration.getChecklists(selectedWorkspace.id);
      setChecklists(checklistData.checklists || []);
      setShowAddChecklistItem(false);
      setNewChecklistItem({
        taskName: '',
        description: '',
        dueDate: '',
        priority: 'medium',
      });
    } catch (error) {
      console.error('Failed to add checklist item:', error);
      alert('Failed to add checklist item. Please try again.');
    }
  };

  const toggleChecklistItem = async (itemId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await collaboration.updateChecklistItem(itemId, { status: newStatus });
      // Reload checklists
      const checklistData = await collaboration.getChecklists(selectedWorkspace.id);
      setChecklists(checklistData.checklists || []);
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'archived':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Chat</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Proposal Workspaces</h1>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Workspace</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full p-4">
          <div className="flex gap-4 h-full">
            {/* Workspace List Sidebar */}
            <div className="w-80 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  My Workspaces
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {workspaces.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">No workspaces yet</p>
                    <p className="text-xs text-gray-500 mt-1">Create one to start collaborating</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workspaces.map((workspace) => (
                      <div
                        key={workspace.id}
                        onClick={() => setSelectedWorkspace(workspace)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedWorkspace?.id === workspace.id
                            ? 'bg-blue-50 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {workspace.workspace_name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                              workspace.status
                            )}`}
                          >
                            {workspace.status}
                          </span>
                        </div>
                        {workspace.agency_name && (
                          <p className="text-xs text-gray-600 mb-1 truncate">{workspace.agency_name}</p>
                        )}
                        {workspace.response_deadline && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Due: {new Date(workspace.response_deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
              {selectedWorkspace ? (
                <>
                  {/* Workspace Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {selectedWorkspace.workspace_name}
                        </h2>
                        {selectedWorkspace.rfp_title && (
                          <p className="text-sm text-gray-600 mb-2">{selectedWorkspace.rfp_title}</p>
                        )}
                        {selectedWorkspace.solicitation_number && (
                          <p className="text-xs text-gray-500">
                            Solicitation: {selectedWorkspace.solicitation_number}
                          </p>
                        )}
                      </div>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Workspace Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      {selectedWorkspace.response_deadline && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-medium text-orange-900">Deadline</span>
                            </div>
                            <button
                              onClick={() => {
                                addToGoogleCalendar({
                                  title: `Proposal Due: ${selectedWorkspace.workspace_name}`,
                                  description: `Response deadline for ${selectedWorkspace.rfp_title || selectedWorkspace.workspace_name}\n\nAgency: ${selectedWorkspace.agency_name || 'N/A'}\nSolicitation: ${selectedWorkspace.solicitation_number || 'N/A'}`,
                                  startDate: selectedWorkspace.response_deadline,
                                  location: selectedWorkspace.agency_name || '',
                                });
                              }}
                              className="p-1 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                              title="Add to Google Calendar"
                            >
                              <CalendarPlus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-orange-900">
                            {new Date(selectedWorkspace.response_deadline).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-900">Team</span>
                        </div>
                        <p className="text-sm font-bold text-blue-900">
                          {selectedWorkspace.team_member_count || 1} members
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-green-900">Progress</span>
                        </div>
                        <p className="text-sm font-bold text-green-900">
                          {checklists.filter((c) => c.status === 'completed').length}/
                          {checklists.length} tasks
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 px-6">
                    <div className="flex gap-1">
                      {[
                        { id: 'overview', label: 'Overview', icon: FileText },
                        { id: 'checklist', label: 'Compliance Checklist', icon: CheckSquare },
                        { id: 'team', label: 'Team', icon: Users },
                        { id: 'deadlines', label: 'Deadlines', icon: Calendar },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Workspace Details</h3>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            {selectedWorkspace.agency_name && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Agency:</span>
                                <p className="text-sm text-gray-900">{selectedWorkspace.agency_name}</p>
                              </div>
                            )}
                            {selectedWorkspace.workspace_code && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Workspace Code:</span>
                                <p className="text-sm text-gray-900">{selectedWorkspace.workspace_code}</p>
                              </div>
                            )}
                            {selectedWorkspace.created_at && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Created:</span>
                                <p className="text-sm text-gray-900">
                                  {new Date(selectedWorkspace.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setActiveTab('checklist')}
                              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            >
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-blue-900">Manage Checklist</p>
                                <p className="text-xs text-blue-700">
                                  {checklists.length} total tasks
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={() => setActiveTab('team')}
                              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                            >
                              <Users className="w-5 h-5 text-purple-600" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-purple-900">Manage Team</p>
                                <p className="text-xs text-purple-700">
                                  {selectedWorkspace.team_member_count || 1} members
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'checklist' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Compliance Checklist</h3>
                          <button
                            onClick={() => setShowAddChecklistItem(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add Task
                          </button>
                        </div>

                        {checklists.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 font-medium">No checklist items yet</p>
                            <p className="text-xs text-gray-500 mt-1">Add tasks to track compliance</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {checklists.map((item) => (
                              <div
                                key={item.id}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                  item.status === 'completed'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => toggleChecklistItem(item.id, item.status)}
                                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      item.status === 'completed'
                                        ? 'bg-green-600 border-green-600'
                                        : 'border-gray-300 hover:border-blue-500'
                                    }`}
                                  >
                                    {item.status === 'completed' && (
                                      <CheckCircle className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <h4
                                        className={`text-sm font-semibold ${
                                          item.status === 'completed'
                                            ? 'text-gray-500 line-through'
                                            : 'text-gray-900'
                                        }`}
                                      >
                                        {item.task_name}
                                      </h4>
                                      <span
                                        className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(
                                          item.priority
                                        )}`}
                                      >
                                        {item.priority}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      {item.due_date && (
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                              Due: {new Date(item.due_date).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              addToGoogleCalendar({
                                                title: `Task: ${item.task_name}`,
                                                description: `${item.description || ''}\n\nWorkspace: ${selectedWorkspace.workspace_name}\nPriority: ${item.priority}`,
                                                startDate: item.due_date,
                                                location: selectedWorkspace.workspace_name || '',
                                              });
                                            }}
                                            className="p-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Add to Google Calendar"
                                          >
                                            <CalendarPlus className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      {item.completed_at && (
                                        <div className="flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3 text-green-600" />
                                          <span>
                                            Completed: {new Date(item.completed_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'team' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                            <UserPlus className="w-4 h-4" />
                            Add Member
                          </button>
                        </div>
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 font-medium">Team management coming soon</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'deadlines' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Key Deadlines</h3>
                          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                            <Plus className="w-4 h-4" />
                            Add Deadline
                          </button>
                        </div>
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 font-medium">Deadline tracking coming soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-4">
                    <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select a workspace
                    </h3>
                    <p className="text-sm text-gray-600">
                      Choose a workspace from the sidebar or create a new one
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Workspace Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Create Proposal Workspace</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWorkspace.workspaceName}
                  onChange={(e) =>
                    setNewWorkspace({ ...newWorkspace, workspaceName: e.target.value })
                  }
                  placeholder="e.g., Navy IT Services Proposal 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RFP Title</label>
                <input
                  type="text"
                  value={newWorkspace.rfpTitle}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, rfpTitle: e.target.value })}
                  placeholder="Enter RFP title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agency Name</label>
                  <input
                    type="text"
                    value={newWorkspace.agencyName}
                    onChange={(e) =>
                      setNewWorkspace({ ...newWorkspace, agencyName: e.target.value })
                    }
                    placeholder="e.g., Department of Defense"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Solicitation Number
                  </label>
                  <input
                    type="text"
                    value={newWorkspace.solicitationNumber}
                    onChange={(e) =>
                      setNewWorkspace({ ...newWorkspace, solicitationNumber: e.target.value })
                    }
                    placeholder="e.g., N00178-24-R-1234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Deadline
                </label>
                <input
                  type="date"
                  value={newWorkspace.responseDeadline}
                  onChange={(e) =>
                    setNewWorkspace({ ...newWorkspace, responseDeadline: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createWorkspace}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Checklist Item Dialog */}
      {showAddChecklistItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Checklist Task</h2>
              <button
                onClick={() => setShowAddChecklistItem(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChecklistItem.taskName}
                  onChange={(e) =>
                    setNewChecklistItem({ ...newChecklistItem, taskName: e.target.value })
                  }
                  placeholder="e.g., Complete SF-330 Form"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newChecklistItem.description}
                  onChange={(e) =>
                    setNewChecklistItem({ ...newChecklistItem, description: e.target.value })
                  }
                  placeholder="Add task details..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newChecklistItem.dueDate}
                    onChange={(e) =>
                      setNewChecklistItem({ ...newChecklistItem, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newChecklistItem.priority}
                    onChange={(e) =>
                      setNewChecklistItem({ ...newChecklistItem, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddChecklistItem(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addChecklistItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalWorkspacePage;
