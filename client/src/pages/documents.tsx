import { useState } from "react";
import { DocumentCard } from "@/components/document-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");

  const myDocuments = [
    { id: "1", title: "RN License", description: "Florida Registered Nurse License", status: "approved" as const, uploadedDate: "Nov 1, 2024", expiryDate: "Dec 31, 2025" },
    { id: "2", title: "CPR Certification", description: "American Heart Association BLS", status: "expiring" as const, uploadedDate: "Jan 15, 2024", expiryDate: "Jan 15, 2025" },
    { id: "3", title: "Background Check", description: "Level 2 Background Screening", status: "expired" as const, uploadedDate: "Dec 1, 2023", expiryDate: "Dec 1, 2024" },
    { id: "4", title: "TB Test", description: "Annual Tuberculosis Screening", status: "submitted" as const, uploadedDate: "Dec 10, 2024" },
  ];

  const requiredDocuments = [
    { id: "5", title: "HIPAA Training", description: "Annual HIPAA compliance certification", status: "expired" as const },
    { id: "6", title: "Physical Exam", description: "Annual health screening", status: "expiring" as const, expiryDate: "Jan 5, 2025" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-documents">Documents</h1>
          <p className="text-muted-foreground">Manage your credentials and certifications</p>
        </div>
        <Button data-testid="button-upload-document">
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Documents approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Expired or expiring</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-documents"
        />
      </div>

      <Tabs defaultValue="my-documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-documents" data-testid="tab-my-documents">
            My Documents
          </TabsTrigger>
          <TabsTrigger value="required" data-testid="tab-required">
            Required
          </TabsTrigger>
          <TabsTrigger value="packs" data-testid="tab-packs">
            Document Packs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>{myDocuments.length} documents uploaded</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    {...doc}
                    onView={() => console.log(`View doc ${doc.id}`)}
                    onUpload={() => console.log(`Upload doc ${doc.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="required" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>{requiredDocuments.length} documents need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requiredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    {...doc}
                    onUpload={() => console.log(`Upload doc ${doc.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Packs</CardTitle>
              <CardDescription>Grouped document requirements</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No document packs assigned</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
