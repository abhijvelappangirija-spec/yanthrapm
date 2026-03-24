'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import RequireAppAccess from '@/components/auth/RequireAppAccess'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface Resource {
  id: string
  name: string
  tech_stack: string
  capacity: number
}

interface Project {
  id: string
  name: string
  description?: string
  team_members: number
  capacity_per_member: number
  sprint_duration: number
  tech_stack?: string
  roles?: string[]
  resources?: Resource[]
  created_at: string
  updated_at: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_members: 5,
    capacity_per_member: 8,
    sprint_duration: 2,
    tech_stack: '',
    roles: '',
  })
  const [resources, setResources] = useState<Resource[]>([])

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithAuth('/api/projects')
      if (!response.ok) {
        throw new Error('Failed to load projects')
      }
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    try {
      // Validate resources if provided
      if (resources.length > 0) {
        const invalidResources = resources.filter(
          (r) => !r.name.trim() || !r.tech_stack.trim() || r.capacity <= 0
        )
        if (invalidResources.length > 0) {
          setError('Please fill in all required fields for all resources (name, tech stack, and capacity)')
          return
        }
      }

      const rolesArray = formData.roles
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0)

      // Calculate team_members and capacity_per_member from resources if provided
      const teamMembers = resources.length > 0 ? resources.length : formData.team_members
      const avgCapacity = resources.length > 0
        ? Math.round(resources.reduce((sum, r) => sum + r.capacity, 0) / resources.length)
        : formData.capacity_per_member

      const response = await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          team_members: teamMembers,
          capacity_per_member: avgCapacity,
          roles: rolesArray,
          resources: resources.length > 0 ? resources : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }

      setShowCreateModal(false)
      resetForm()
      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  const handleUpdateProject = async () => {
    if (!editingProject) return

    try {
      // Validate resources if provided
      if (resources.length > 0) {
        const invalidResources = resources.filter(
          (r) => !r.name.trim() || !r.tech_stack.trim() || r.capacity <= 0
        )
        if (invalidResources.length > 0) {
          setError('Please fill in all required fields for all resources (name, tech stack, and capacity)')
          return
        }
      }

      const rolesArray = formData.roles
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0)

      // Calculate team_members and capacity_per_member from resources if provided
      const teamMembers = resources.length > 0 ? resources.length : formData.team_members
      const avgCapacity = resources.length > 0
        ? Math.round(resources.reduce((sum, r) => sum + r.capacity, 0) / resources.length)
        : formData.capacity_per_member

      const response = await fetchWithAuth(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          team_members: teamMembers,
          capacity_per_member: avgCapacity,
          roles: rolesArray,
          resources: resources.length > 0 ? resources : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update project')
      }

      setEditingProject(null)
      resetForm()
      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetchWithAuth(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      team_members: 5,
      capacity_per_member: 8,
      sprint_duration: 2,
      tech_stack: '',
      roles: '',
    })
    setResources([])
  }

  const addResource = () => {
    const newResource: Resource = {
      id: Date.now().toString(),
      name: '',
      tech_stack: '',
      capacity: 8,
    }
    setResources([...resources, newResource])
  }

  const removeResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id))
  }

  const updateResource = (id: string, field: keyof Resource, value: string | number) => {
    setResources(
      resources.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      team_members: project.team_members,
      capacity_per_member: project.capacity_per_member,
      sprint_duration: project.sprint_duration,
      tech_stack: project.tech_stack || '',
      roles: project.roles?.join(', ') || '',
    })
    setResources(project.resources || [])
    setShowCreateModal(true)
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingProject(null)
    setError(null)
    resetForm()
  }

  return (
    <RequireAppAccess>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </Link>
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No projects found. Create your first project to get started.</p>
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(project)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team Members:</span>
                    <span className="font-medium">{project.team_members}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity/Member:</span>
                    <span className="font-medium">{project.capacity_per_member} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sprint Duration:</span>
                    <span className="font-medium">{project.sprint_duration} weeks</span>
                  </div>
                  {project.tech_stack && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Tech Stack:</span>
                      <p className="text-gray-800 font-medium mt-1">{project.tech_stack}</p>
                    </div>
                  )}
                  {project.roles && project.roles.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Roles:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.roles.map((role, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.resources && project.resources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Resources ({project.resources.length}):</span>
                      <div className="mt-1 space-y-1">
                        {project.resources.slice(0, 3).map((resource, idx) => (
                          <div key={idx} className="text-xs text-gray-700">
                            <span className="font-medium">{resource.name}</span>
                            {' - '}
                            <span className="text-gray-600">{resource.tech_stack}</span>
                            {' ('}
                            <span className="text-gray-600">{resource.capacity}h/week</span>
                            {')'}
                          </div>
                        ))}
                        {project.resources.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{project.resources.length - 3} more resources
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href={`/brd-generator?projectId=${project.id}`}
                    className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Use for BRD Generation
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., E-commerce Platform"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Brief description of the project"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Members *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.team_members}
                      onChange={(e) =>
                        setFormData({ ...formData, team_members: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity/Member (hrs) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity_per_member}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity_per_member: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sprint Duration (weeks) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.sprint_duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sprint_duration: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tech Stack
                  </label>
                  <input
                    type="text"
                    value={formData.tech_stack}
                    onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Next.js 15, React, PostgreSQL, Prisma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.roles}
                    onChange={(e) => setFormData({ ...formData, roles: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Frontend Developer, Backend Developer, QA Engineer"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate multiple roles with commas
                  </p>
                </div>
              </div>

              {/* Resources Section */}
              <div className="border-t pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Resources</h3>
                    <p className="text-sm text-gray-600">
                      Add individual team members with their tech stack and capacity
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addResource}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    + Add Resource
                  </button>
                </div>

                {resources.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 text-sm mb-2">No resources added yet</p>
                    <p className="text-gray-400 text-xs">
                      Click &quot;Add Resource&quot; to add team members with individual details
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resources.map((resource, index) => (
                      <div
                        key={resource.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Resource {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeResource(resource.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Name *
                            </label>
                            <input
                              type="text"
                              value={resource.name}
                              onChange={(e) =>
                                updateResource(resource.id, 'name', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="e.g., John Doe"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Tech Stack *
                            </label>
                            <input
                              type="text"
                              value={resource.tech_stack}
                              onChange={(e) =>
                                updateResource(resource.id, 'tech_stack', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="e.g., React, Node.js"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Capacity (hours/week) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="40"
                              value={resource.capacity}
                              onChange={(e) =>
                                updateResource(
                                  resource.id,
                                  'capacity',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> Team members count and average capacity will be
                        calculated automatically from the resources above.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProject ? handleUpdateProject : handleCreateProject}
                  disabled={!formData.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </RequireAppAccess>
  )
}
