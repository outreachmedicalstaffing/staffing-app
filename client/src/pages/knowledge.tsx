import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Article = {
  id: string;
  title: string;
  description: string;
  category: "Getting Started" | "HR" | "Compliance" | "Operations";
  lastUpdated: string;
};

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");

  // Sample articles data
  const [articles] = useState<Article[]>([
    {
      id: "1",
      title: "Welcome to Outreach Medical Staffing",
      description: "Your guide to getting started with our platform",
      category: "Getting Started",
      lastUpdated: "2 days ago",
    },
    {
      id: "2",
      title: "Employee Handbook",
      description: "Complete guide for all employees",
      category: "HR",
      lastUpdated: "1 week ago",
    },
    {
      id: "3",
      title: "HIPAA Compliance Training",
      description: "Required annual training materials",
      category: "Compliance",
      lastUpdated: "3 days ago",
    },
    {
      id: "4",
      title: "Shift Protocols",
      description: "Standard operating procedures for shifts",
      category: "Operations",
      lastUpdated: "5 days ago",
    },
    {
      id: "5",
      title: "New Hire Onboarding Checklist",
      description: "Step-by-step process for new employees",
      category: "Getting Started",
      lastUpdated: "1 day ago",
    },
    {
      id: "6",
      title: "Time Off Request Policy",
      description: "How to request and manage time off",
      category: "HR",
      lastUpdated: "2 weeks ago",
    },
  ]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Getting Started":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "HR":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Compliance":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "Operations":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getIconColor = (category: string) => {
    switch (category) {
      case "Getting Started":
        return "text-blue-600";
      case "HR":
        return "text-yellow-600";
      case "Compliance":
        return "text-red-600";
      case "Operations":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const filterArticlesByCategory = (category?: string) => {
    if (!category) return articles;
    return articles.filter((article) => article.category === category);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Access policies, procedures, and training materials
          </p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700">
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
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Content
          </TabsTrigger>
          <TabsTrigger value="getting-started">
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="hr">
            HR
          </TabsTrigger>
          <TabsTrigger value="compliance">
            Compliance
          </TabsTrigger>
          <TabsTrigger value="operations">
            Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Articles & Resources</CardTitle>
              <CardDescription>{articles.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>{filterArticlesByCategory("Getting Started").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Getting Started").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HR & People</CardTitle>
              <CardDescription>{filterArticlesByCategory("HR").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("HR").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Training</CardTitle>
              <CardDescription>{filterArticlesByCategory("Compliance").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Compliance").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>{filterArticlesByCategory("Operations").length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterArticlesByCategory("Operations").map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <FileText className={`h-8 w-8 ${getIconColor(article.category)}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground">{article.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge className={getCategoryColor(article.category)}>
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated {article.lastUpdated}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
