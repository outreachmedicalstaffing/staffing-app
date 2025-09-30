import { KnowledgeItem } from '../knowledge-item'

export default function KnowledgeItemExample() {
  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      <KnowledgeItem
        id="1"
        title="Employee Handbook"
        type="page"
        description="Complete guide for all OutreachOps employees covering policies and procedures"
        category="HR"
        lastUpdated="2 days ago"
        publishStatus="published"
        onView={() => console.log('View item 1')}
        onEdit={() => console.log('Edit item 1')}
      />
      <KnowledgeItem
        id="2"
        title="HIPAA Compliance Training"
        type="pdf"
        description="Required annual training materials"
        category="Compliance"
        lastUpdated="1 week ago"
        publishStatus="published"
        onView={() => console.log('View item 2')}
      />
      <KnowledgeItem
        id="3"
        title="Shift Protocols"
        type="folder"
        description="Standard operating procedures for different shift types"
        category="Operations"
        lastUpdated="3 weeks ago"
        publishStatus="published"
        onView={() => console.log('View item 3')}
        onEdit={() => console.log('Edit item 3')}
      />
      <KnowledgeItem
        id="4"
        title="New Hire Checklist"
        type="page"
        description="Step-by-step onboarding process"
        category="HR"
        lastUpdated="1 day ago"
        publishStatus="draft"
        onView={() => console.log('View item 4')}
        onEdit={() => console.log('Edit item 4')}
      />
    </div>
  )
}
