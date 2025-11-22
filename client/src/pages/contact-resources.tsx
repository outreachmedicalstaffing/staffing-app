import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Plus, MapPin, Clock, Trash2, Edit, Building2, User as UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type KeyContact = {
  name: string;
  title: string;
  phone: string;
};

type ContactResource = {
  id: string;
  programName: string;
  mainPhone: string | null;
  afterHoursPhone: string | null;
  contacts: KeyContact[] | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function ContactResources() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<ContactResource | null>(null);
  const [deleteConfirmResource, setDeleteConfirmResource] = useState<ContactResource | null>(null);

  // Form fields for Create
  const [newProgramName, setNewProgramName] = useState("");
  const [newMainPhone, setNewMainPhone] = useState("");
  const [newAfterHoursPhone, setNewAfterHoursPhone] = useState("");
  const [newContacts, setNewContacts] = useState<KeyContact[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Form fields for Edit
  const [editProgramName, setEditProgramName] = useState("");
  const [editMainPhone, setEditMainPhone] = useState("");
  const [editAfterHoursPhone, setEditAfterHoursPhone] = useState("");
  const [editContacts, setEditContacts] = useState<KeyContact[]>([]);
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Get current user to check role
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = currentUser?.role?.toLowerCase() === "owner" || currentUser?.role?.toLowerCase() === "admin";

  // Fetch contact resources
  const { data: resources = [], isLoading } = useQuery<ContactResource[]>({
    queryKey: ["/api/contact-resources"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/contact-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create contact resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-resources"] });
      toast({ title: "Contact resource created successfully" });
      resetCreateForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create contact resource", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/contact-resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update contact resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-resources"] });
      toast({ title: "Contact resource updated successfully" });
      resetEditForm();
      setShowEditDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to update contact resource", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contact-resources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete contact resource");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-resources"] });
      toast({ title: "Contact resource deleted successfully" });
      setDeleteConfirmResource(null);
    },
    onError: () => {
      toast({ title: "Failed to delete contact resource", variant: "destructive" });
    },
  });

  const handleDeleteResource = () => {
    if (deleteConfirmResource) {
      deleteMutation.mutate(deleteConfirmResource.id);
    }
  };

  const handleSaveResource = () => {
    if (!newProgramName.trim()) {
      toast({ title: "Please enter a program name", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      programName: newProgramName,
      mainPhone: newMainPhone || null,
      afterHoursPhone: newAfterHoursPhone || null,
      contacts: newContacts.length > 0 ? newContacts : null,
      address: newAddress || null,
      notes: newNotes || null,
    });
  };

  const handleEditResource = (resource: ContactResource) => {
    setEditingResource(resource);
    setEditProgramName(resource.programName);
    setEditMainPhone(resource.mainPhone || "");
    setEditAfterHoursPhone(resource.afterHoursPhone || "");
    setEditContacts(resource.contacts || []);
    setEditAddress(resource.address || "");
    setEditNotes(resource.notes || "");
    setShowEditDialog(true);
  };

  const handleUpdateResource = () => {
    if (!editProgramName.trim()) {
      toast({ title: "Please enter a program name", variant: "destructive" });
      return;
    }

    if (!editingResource) return;

    updateMutation.mutate({
      id: editingResource.id,
      data: {
        programName: editProgramName,
        mainPhone: editMainPhone || null,
        afterHoursPhone: editAfterHoursPhone || null,
        contacts: editContacts.length > 0 ? editContacts : null,
        address: editAddress || null,
        notes: editNotes || null,
      },
    });
  };

  const resetCreateForm = () => {
    setNewProgramName("");
    setNewMainPhone("");
    setNewAfterHoursPhone("");
    setNewContacts([]);
    setNewAddress("");
    setNewNotes("");
  };

  const resetEditForm = () => {
    setEditingResource(null);
    setEditProgramName("");
    setEditMainPhone("");
    setEditAfterHoursPhone("");
    setEditContacts([]);
    setEditAddress("");
    setEditNotes("");
  };

  // Filter resources based on search query
  const filteredResources = resources.filter((resource) => {
    const query = searchQuery.toLowerCase();
    return (
      resource.programName.toLowerCase().includes(query) ||
      resource.mainPhone?.toLowerCase().includes(query) ||
      resource.address?.toLowerCase().includes(query) ||
      resource.contacts?.some(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.title.toLowerCase().includes(query) ||
          contact.phone.toLowerCase().includes(query)
      )
    );
  });

  // Helper functions for managing contacts
  const addNewContact = (isEdit: boolean) => {
    const newContact: KeyContact = { name: "", title: "", phone: "" };
    if (isEdit) {
      setEditContacts([...editContacts, newContact]);
    } else {
      setNewContacts([...newContacts, newContact]);
    }
  };

  const updateContact = (index: number, field: keyof KeyContact, value: string, isEdit: boolean) => {
    if (isEdit) {
      const updated = [...editContacts];
      updated[index] = { ...updated[index], [field]: value };
      setEditContacts(updated);
    } else {
      const updated = [...newContacts];
      updated[index] = { ...updated[index], [field]: value };
      setNewContacts(updated);
    }
  };

  const removeContact = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditContacts(editContacts.filter((_, i) => i !== index));
    } else {
      setNewContacts(newContacts.filter((_, i) => i !== index));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading contact resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="heading-contact-resources">
            Contact Resources
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Important contact information for programs and facilities
          </p>
        </div>
        {isAdmin && (
          <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search programs, contacts, or phone numbers..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-contact-resources"
        />
      </div>

      {/* Resource Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredResources.length} of {resources.length} contact resources
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{resource.programName}</CardTitle>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditResource(resource)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmResource(resource)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Main Phone */}
              {resource.mainPhone && (
                <a
                  href={`tel:${resource.mainPhone}`}
                  className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors group"
                >
                  <Phone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Main</div>
                    <div className="font-medium group-hover:underline">{resource.mainPhone}</div>
                  </div>
                </a>
              )}

              {/* After Hours Phone */}
              {resource.afterHoursPhone && (
                <a
                  href={`tel:${resource.afterHoursPhone}`}
                  className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors group"
                >
                  <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">After Hours</div>
                    <div className="font-medium group-hover:underline">{resource.afterHoursPhone}</div>
                  </div>
                </a>
              )}

              {/* Key Contacts */}
              {resource.contacts && resource.contacts.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Key Contacts</div>
                  <div className="space-y-2">
                    {resource.contacts.map((contact, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-start gap-2">
                          <UserIcon className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{contact.name}</div>
                            {contact.title && <div className="text-xs text-muted-foreground truncate">{contact.title}</div>}
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Address */}
              {resource.address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground border-t pt-3 mt-3">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">{resource.address}</div>
                </div>
              )}

              {/* Notes */}
              {resource.notes && (
                <div className="text-xs text-muted-foreground border-t pt-3 mt-3">
                  <div className="font-semibold mb-1">Notes</div>
                  <div className="whitespace-pre-wrap">{resource.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No contact resources found matching your search."
              : "No contact resources available."}
          </p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contact Resource</DialogTitle>
            <DialogDescription>Add important contact information for a program or facility</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-program-name">
                Program/Facility Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="new-program-name"
                placeholder="e.g., Vitas Central Florida, AdventHealth"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-main-phone">Main Phone</Label>
                <Input
                  id="new-main-phone"
                  placeholder="(407) 555-1234"
                  value={newMainPhone}
                  onChange={(e) => setNewMainPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-after-hours-phone">After Hours Phone</Label>
                <Input
                  id="new-after-hours-phone"
                  placeholder="(407) 555-5678"
                  value={newAfterHoursPhone}
                  onChange={(e) => setNewAfterHoursPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-address">Address</Label>
              <Input
                id="new-address"
                placeholder="123 Medical Blvd, Orlando, FL 32801"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
            </div>

            {/* Key Contacts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Key Contacts</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addNewContact(false)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {newContacts.map((contact, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Contact {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index, false)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) => updateContact(index, "name", e.target.value, false)}
                      />
                      <Input
                        placeholder="Title"
                        value={contact.title}
                        onChange={(e) => updateContact(index, "title", e.target.value, false)}
                      />
                      <Input
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, "phone", e.target.value, false)}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-notes">Notes</Label>
              <Textarea
                id="new-notes"
                placeholder="Additional instructions or information..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { resetCreateForm(); setShowCreateDialog(false); }}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveResource}>
              Save Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact Resource</DialogTitle>
            <DialogDescription>Update contact information for this program or facility</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-program-name">
                Program/Facility Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="edit-program-name"
                placeholder="e.g., Vitas Central Florida, AdventHealth"
                value={editProgramName}
                onChange={(e) => setEditProgramName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-main-phone">Main Phone</Label>
                <Input
                  id="edit-main-phone"
                  placeholder="(407) 555-1234"
                  value={editMainPhone}
                  onChange={(e) => setEditMainPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-after-hours-phone">After Hours Phone</Label>
                <Input
                  id="edit-after-hours-phone"
                  placeholder="(407) 555-5678"
                  value={editAfterHoursPhone}
                  onChange={(e) => setEditAfterHoursPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="123 Medical Blvd, Orlando, FL 32801"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>

            {/* Key Contacts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Key Contacts</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addNewContact(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {editContacts.map((contact, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Contact {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index, true)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) => updateContact(index, "name", e.target.value, true)}
                      />
                      <Input
                        placeholder="Title"
                        value={contact.title}
                        onChange={(e) => updateContact(index, "title", e.target.value, true)}
                      />
                      <Input
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, "phone", e.target.value, true)}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional instructions or information..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { resetEditForm(); setShowEditDialog(false); }}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleUpdateResource}>
              Update Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmResource} onOpenChange={() => setDeleteConfirmResource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmResource?.programName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResource} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
