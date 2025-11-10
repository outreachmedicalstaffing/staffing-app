import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Documents() {
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
    </div>
  );
}
