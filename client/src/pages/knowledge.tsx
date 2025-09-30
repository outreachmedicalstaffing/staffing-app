import { useState } from "react";
import { KnowledgeItem } from "@/components/knowledge-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");

  const hrDocuments = [
    { id: "1", title: "Employee Handbook", type: "page" as const, description: "Complete guide for all employees", category: "HR", lastUpdated: "2 days ago", publishStatus: "published" as const },
    { id: "2", title: "New Hire Checklist", type: "page" as const, description: "Step-by-step onboarding process", category: "HR", lastUpdated: "1 day ago", publishStatus: "draft" as const },
  ];

  const complianceDocuments = [
    { id: "3", title: "HIPAA Compliance Training", type: "pdf" as const, description: "Required annual training materials", category: "Compliance", lastUpdated: "1 week ago", publishStatus: "published" as const },
    { id: "4", title: "Safety Protocols", type: "folder" as const, description: "Workplace safety guidelines", category: "Compliance", lastUpdated: "2 weeks ago", publishStatus: "published" as const },
  ];

  const operationsDocuments = [
    { id: "5", title: "Shift Protocols", type: "folder" as const, description: "Standard operating procedures", category: "Operations", lastUpdated: "3 weeks ago", publishStatus: "published" as const },
    { id: "6", title: "Emergency Procedures", type: "page" as const, description: "Critical response guidelines", category: "Operations", lastUpdated: "5 days ago", publishStatus: "published" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-knowledge">Knowledge Base</h1>
          <p className="text-muted-foreground">Access policies, procedures, and training materials</p>
        </div>
        <Button data-testid="button-create-article">
          <Plus className="h-4 w-4 mr-2" />
          Create Article
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-knowledge"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All Content
          </TabsTrigger>
          <TabsTrigger value="hr" data-testid="tab-hr">
            <FolderOpen className="h-4 w-4 mr-2" />
            HR
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            Compliance
          </TabsTrigger>
          <TabsTrigger value="operations" data-testid="tab-operations">
            Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Articles & Resources</CardTitle>
              <CardDescription>{hrDocuments.length + complianceDocuments.length + operationsDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...hrDocuments, ...complianceDocuments, ...operationsDocuments].map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => console.log(`View ${item.id}`)}
                    onEdit={() => console.log(`Edit ${item.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HR & People</CardTitle>
              <CardDescription>{hrDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hrDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => console.log(`View ${item.id}`)}
                    onEdit={() => console.log(`Edit ${item.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Training</CardTitle>
              <CardDescription>{complianceDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {complianceDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => console.log(`View ${item.id}`)}
                    onEdit={() => console.log(`Edit ${item.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>{operationsDocuments.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {operationsDocuments.map((item) => (
                  <KnowledgeItem
                    key={item.id}
                    {...item}
                    onView={() => console.log(`View ${item.id}`)}
                    onEdit={() => console.log(`Edit ${item.id}`)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
