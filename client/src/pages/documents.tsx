import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Clock, AlertTriangle, Search, FileText, Eye, Upload } from "lucide-react";

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage your credentials and certifications
          </p>
        </div>
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={() => {
            console.log("Create Document clicked");
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approved Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">1</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents approved
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Review Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">0</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Awaiting approval
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Action Required Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">1</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Expired or expiring
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-documents">
          <TabsList>
            <TabsTrigger value="my-documents">My Documents</TabsTrigger>
            <TabsTrigger value="required">Required</TabsTrigger>
            <TabsTrigger value="document-packs">Document Packs</TabsTrigger>
          </TabsList>

          <TabsContent value="my-documents" className="mt-4">
            <div className="space-y-4">
              {/* Section Header */}
              <div>
                <h2 className="text-xl font-semibold">Your Documents</h2>
                <p className="text-sm text-muted-foreground">2 documents uploaded</p>
              </div>

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: RN License */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <FileText className="h-8 w-8 text-blue-600 mt-1" />
                          <div>
                            <h3 className="font-semibold">RN License</h3>
                            <p className="text-sm text-muted-foreground">
                              Florida Registered Nurse License
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Approved
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Uploaded: Oct 31, 2024</p>
                        <p>Expires: Dec 30, 2025</p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: CPR Certification */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <FileText className="h-8 w-8 text-blue-600 mt-1" />
                          <div>
                            <h3 className="font-semibold">CPR Certification</h3>
                            <p className="text-sm text-muted-foreground">
                              American Heart Association BLS
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          Expired
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">Uploaded: Jan 14, 2024</p>
                        <p className="text-red-600 font-medium">Expires: Jan 14, 2025</p>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800">
                          This document has expired and needs renewal
                        </p>
                      </div>

                      <Button className="w-full bg-red-600 hover:bg-red-700">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="required" className="mt-4">
            <div className="text-muted-foreground">
              Required documents content will go here
            </div>
          </TabsContent>

          <TabsContent value="document-packs" className="mt-4">
            <div className="text-muted-foreground">
              Document Packs content will go here
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
