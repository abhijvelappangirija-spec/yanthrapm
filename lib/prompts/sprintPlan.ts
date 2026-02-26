/**
 * Prompt generator for Sprint Plan creation with BRD and Technical Context
 */

export interface TeamResource {
  name: string
  role: string // 'Developer', 'QA', 'PM', 'Architect', etc.
  tech_stack?: string
  capacity: number // hours per week
}

export interface SprintPlanPromptParams {
  brd: string
  technicalContext: string
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  velocity?: number
  resources?: TeamResource[]
}

/**
 * Generate sprint plan prompt with BRD and Technical Context
 */
export function generateSprintPlanPrompt(
  brd: string,
  technicalContext: string,
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number,
  resources?: TeamResource[]
): string {
  // Extract text content from HTML BRD
  const textContent = brd.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  
  // Calculate role-based capacities
  const roleBasedCapacity: Record<string, { count: number; totalCapacity: number }> = {}
  let developerCapacity = 0
  let qaCapacity = 0
  let pmCapacity = 0
  let architectCapacity = 0

  if (resources && resources.length > 0) {
    resources.forEach((resource) => {
      const role = resource.role.toLowerCase()
      const capacity = resource.capacity * sprintDuration
      
      if (role.includes('qa') || role.includes('test') || role.includes('quality')) {
        qaCapacity += capacity
        roleBasedCapacity['QA'] = {
          count: (roleBasedCapacity['QA']?.count || 0) + 1,
          totalCapacity: (roleBasedCapacity['QA']?.totalCapacity || 0) + capacity,
        }
      } else if (role.includes('pm') || role.includes('project manager') || role.includes('manager')) {
        pmCapacity += capacity
        roleBasedCapacity['PM'] = {
          count: (roleBasedCapacity['PM']?.count || 0) + 1,
          totalCapacity: (roleBasedCapacity['PM']?.totalCapacity || 0) + capacity,
        }
      } else if (role.includes('architect') || role.includes('architecture')) {
        architectCapacity += capacity
        roleBasedCapacity['Architect'] = {
          count: (roleBasedCapacity['Architect']?.count || 0) + 1,
          totalCapacity: (roleBasedCapacity['Architect']?.totalCapacity || 0) + capacity,
        }
      } else {
        // Default to developer
        developerCapacity += capacity
        roleBasedCapacity['Developer'] = {
          count: (roleBasedCapacity['Developer']?.count || 0) + 1,
          totalCapacity: (roleBasedCapacity['Developer']?.totalCapacity || 0) + capacity,
        }
      }
    })
  } else {
    // Fallback to all developers if no resources specified
    developerCapacity = teamMembers * capacityPerMember * sprintDuration
  }

  const totalCapacity = developerCapacity + qaCapacity + pmCapacity + architectCapacity
  const calculatedVelocity = velocity || Math.floor(developerCapacity / 8) // Only use developer capacity for velocity

  // Build team configuration text
  let teamConfigText = `**Team Configuration:**
- Total Team Members: ${teamMembers}
- Sprint Duration: ${sprintDuration} weeks
- Development Velocity: ${calculatedVelocity} story points per sprint (based on developer capacity only)

**Role-Based Capacity (hours per sprint):**`
  
  if (resources && resources.length > 0) {
    teamConfigText += `\n- Developers: ${developerCapacity} hours (${roleBasedCapacity['Developer']?.count || 0} members) - Use ONLY for development work`
    if (qaCapacity > 0) {
      teamConfigText += `\n- QA/Testing: ${qaCapacity} hours (${roleBasedCapacity['QA']?.count || 0} members) - Use ONLY for QA/testing tasks`
    }
    if (pmCapacity > 0) {
      teamConfigText += `\n- Project Management: ${pmCapacity} hours (${roleBasedCapacity['PM']?.count || 0} members) - Use ONLY for PM tasks`
    }
    if (architectCapacity > 0) {
      teamConfigText += `\n- Architecture: ${architectCapacity} hours (${roleBasedCapacity['Architect']?.count || 0} members) - Use ONLY for architecture tasks`
    }
  } else {
    teamConfigText += `\n- Developers: ${developerCapacity} hours (${teamMembers} members)`
  }

  const resourcesList = resources && resources.length > 0
    ? resources.map((r) => `  - ${r.name}: ${r.role} (${r.capacity}h/week, Tech: ${r.tech_stack || 'N/A'})`).join('\n')
    : '  - No specific resources defined'

  return `You are an expert AI solution architect and Agile practitioner.

### Inputs
**BRD:**  
${textContent.substring(0, 8000)}

**Technical Context (Existing System Overview):**  
${technicalContext || 'No specific technical context provided. Use standard best practices.'}

${teamConfigText}

**Team Resources:**
${resourcesList}

### Critical Instructions for Role-Based Planning

**IMPORTANT - Capacity Allocation Rules:**
1. **Developer Capacity**: Use ONLY developer capacity (${developerCapacity} hours) for calculating development story points and velocity
2. **QA Tasks**: If QA team members exist (${qaCapacity} hours), create separate QA/testing tasks for each sprint. These tasks should include:
   - Test case creation and review
   - Test execution (manual and automated)
   - Bug verification and regression testing
   - Test data preparation
   - QA sign-off activities
3. **PM Tasks**: If PM team members exist (${pmCapacity} hours), create separate PM tasks for each sprint. These tasks should include:
   - Sprint planning and coordination
   - Stakeholder communication
   - Risk management and mitigation
   - Progress tracking and reporting
   - Dependency management
   - Resource coordination
4. **Architect Tasks**: If Architects exist (${architectCapacity} hours), create separate architecture tasks for each sprint. These tasks should include:
   - Architecture design and review
   - Technical decision documentation
   - Code review and technical guidance
   - System design validation
   - Integration planning
5. **Capacity Separation**: 
   - DO NOT use QA/PM/Architect capacity for development story points
   - DO NOT use developer capacity for QA/PM/Architect tasks
   - Each role's capacity is dedicated ONLY to their specific tasks

### Task Creation Guidelines

**Development Stories:**
- Break down BRD into epics and user stories
- Assign story points using Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
- Use ONLY developer capacity for velocity calculation
- Distribute development stories across sprints based on developer velocity: ${calculatedVelocity} story points per sprint

**QA Tasks (if QA team exists):**
- Create QA tasks for each sprint that align with development stories
- QA tasks should cover testing activities for stories in that sprint
- Estimate QA tasks in hours (not story points)
- Ensure QA capacity (${qaCapacity} hours) is not exceeded per sprint

**PM Tasks (if PM exists):**
- Create PM tasks for sprint management activities
- PM tasks are ongoing and should be included in each sprint
- Estimate PM tasks in hours (not story points)
- Ensure PM capacity (${pmCapacity} hours) is not exceeded per sprint

**Architect Tasks (if Architects exist):**
- Create architecture tasks for design and technical guidance
- Architect tasks should align with development epics
- Estimate architect tasks in hours (not story points)
- Ensure Architect capacity (${architectCapacity} hours) is not exceeded per sprint

### Output Format
{
  "storyGroups": [
    {
      "epic": "Epic Name",
      "stories": ["Story 1", "Story 2", ...],
      "storyPoints": number
    }
  ],
  "storiesCount": number,
  "suggestedStoryPoints": number,
  "sprintBreakdown": [
    {
      "sprint": number,
      "stories": ["Story 1", "Story 2", ...],
      "totalStoryPoints": number,
      "capacity": number,
      "qaTasks": ["QA Task 1", "QA Task 2", ...],
      "qaHours": number,
      "pmTasks": ["PM Task 1", "PM Task 2", ...],
      "pmHours": number,
      "architectTasks": ["Architect Task 1", "Architect Task 2", ...],
      "architectHours": number
    }
  ]
}

Return ONLY valid JSON, no additional text.`
}

