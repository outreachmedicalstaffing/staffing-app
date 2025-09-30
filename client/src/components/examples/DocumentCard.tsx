import { DocumentCard } from '../document-card'

export default function DocumentCardExample() {
  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      <DocumentCard
        id="1"
        title="RN License"
        description="Florida Registered Nurse License"
        status="approved"
        uploadedDate="Nov 1, 2024"
        expiryDate="Dec 31, 2025"
        onView={() => console.log('View doc 1')}
        onUpload={() => console.log('Update doc 1')}
      />
      <DocumentCard
        id="2"
        title="CPR Certification"
        description="American Heart Association BLS"
        status="expiring"
        uploadedDate="Jan 15, 2024"
        expiryDate="Jan 15, 2025"
        onView={() => console.log('View doc 2')}
        onUpload={() => console.log('Update doc 2')}
      />
      <DocumentCard
        id="3"
        title="Background Check"
        description="Level 2 Background Screening"
        status="expired"
        uploadedDate="Dec 1, 2023"
        expiryDate="Dec 1, 2024"
        onUpload={() => console.log('Upload doc 3')}
      />
      <DocumentCard
        id="4"
        title="TB Test"
        description="Annual Tuberculosis Screening"
        status="submitted"
        uploadedDate="Dec 10, 2024"
        onView={() => console.log('View doc 4')}
      />
    </div>
  )
}
