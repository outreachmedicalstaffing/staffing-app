import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, X, ChevronDown } from "lucide-react";

interface CustomFields {
  birthday?: string;
  shiftPreference?: string;
  facility?: string;
  allergies?: string | string[];
  address?: string;
  apartmentUnit?: string;
}

export default function Profile() {
  const { toast } = useToast();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthday, setBirthday] = useState("");
  const [shiftPreference, setShiftPreference] = useState("");
  const [facility, setFacility] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [apartmentUnit, setApartmentUnit] = useState("");

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      formatted: string;
      lat: number;
      lon: number;
    }>
  >([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Initialize form with user data
  useEffect(() => {
    if (currentUser) {
      // Split fullName into first and last name
      const nameParts = currentUser.fullName.trim().split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");

      setEmail(currentUser.email || "");
      setUsername(currentUser.username || "");
      setPhoneNumber(currentUser.phoneNumber || "");

      // Parse customFields if it exists
      const customFields = (currentUser.customFields as CustomFields) || {};
      setBirthday(customFields.birthday || "");
      setShiftPreference(customFields.shiftPreference || "");
      setFacility(customFields.facility || "");

      // Handle allergies - migrate from string to array if needed
      if (Array.isArray(customFields.allergies)) {
        setAllergies(customFields.allergies);
      } else if (customFields.allergies) {
        // Migrate old string data - split by comma if present, otherwise keep as single item
        const allergiesArray = customFields.allergies
          .split(',')
          .map(a => a.trim())
          .filter(a => a.length > 0);
        setAllergies(allergiesArray);
      } else {
        setAllergies([]);
      }

      setAddress(customFields.address || "");
      setApartmentUnit(customFields.apartmentUnit || "");
    }
  }, [currentUser]);

  // Allergy options for multi-select
  const allergyOptions = ["Cat", "Dog", "Smoke", "Other"];

  // Handle allergy selection toggle
  const toggleAllergy = (allergy: string) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  // Remove individual allergy badge
  const removeAllergy = (allergy: string) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  // Helper function to remove "United States of America" from addresses
  const stripCountryFromAddress = (address: string): string => {
    return address.replace(/, United States of America$/, '');
  };

  // Address autocomplete with Geoapify
  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
      if (!apiKey) {
        console.warn("Geoapify API key not configured");
        return;
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${apiKey}&limit=5`,
      );

      if (response.ok) {
        const data = await response.json();
        const suggestions =
          data.features?.map((feature: any) => ({
            formatted: feature.properties.formatted,
            lat: feature.properties.lat,
            lon: feature.properties.lon,
          })) || [];
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300);
  };

  const selectAddress = (selectedAddress: string) => {
    // Strip ", United States of America" from the address before storing
    const cleanedAddress = stripCountryFromAddress(selectedAddress);
    setAddress(cleanedAddress);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!fullName || !email || !username) {
      toast({
        title: "Validation Error",
        description: "First name, last name, email, and username are required",
        variant: "destructive",
      });
      return;
    }

    const customFields: CustomFields = {
      birthday,
      shiftPreference,
      facility,
      allergies,
      address,
      apartmentUnit,
    };

    updateProfileMutation.mutate({
      fullName,
      email,
      username,
      phoneNumber,
      customFields,
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "All password fields are required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-profile">
          Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your personal information and settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phoneNumber">Mobile Phone</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                data-testid="input-phone-number"
              />
            </div>
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                data-testid="input-birthday"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Textarea
                  ref={addressInputRef}
                  id="address"
                  className="pl-9"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) {
                      setShowAddressSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowAddressSuggestions(false), 200);
                  }}
                  data-testid="input-address"
                  rows={3}
                  placeholder="Enter address"
                  autoComplete="off"
                />
              </div>

              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover-elevate cursor-pointer text-sm"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectAddress(suggestion.formatted);
                      }}
                      data-testid={`address-suggestion-${index}`}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>{stripCountryFromAddress(suggestion.formatted)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="apartmentUnit">Apt/Unit (Optional)</Label>
            <Input
              id="apartmentUnit"
              value={apartmentUnit}
              onChange={(e) => setApartmentUnit(e.target.value)}
              placeholder="e.g., Apt 101, Unit B"
              data-testid="input-apartment-unit"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Information</CardTitle>
          <CardDescription>
            Update your work-related details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facility">Facility/Home Preference</Label>
              <Select value={facility} onValueChange={setFacility}>
                <SelectTrigger id="facility" data-testid="select-facility">
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Facility">Facility</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shiftPreference">Shift Preference</Label>
              <Select value={shiftPreference} onValueChange={setShiftPreference}>
                <SelectTrigger id="shiftPreference" data-testid="select-shift-preference">
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                  <SelectItem value="Either">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
          <CardDescription>
            Provide any relevant medical information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Allergies</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="button-allergies-select"
                >
                  <span className="text-muted-foreground">
                    {allergies.length === 0 ? "Select allergies" : `${allergies.length} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-3" align="start">
                <div className="space-y-2">
                  {allergyOptions.map((option) => (
                    <div
                      key={option}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`allergy-${option}`}
                        checked={allergies.includes(option)}
                        onCheckedChange={() => toggleAllergy(option)}
                        data-testid={`checkbox-allergy-${option.toLowerCase()}`}
                      />
                      <label
                        htmlFor={`allergy-${option}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Display selected allergies as badges */}
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant="secondary"
                    className="pl-2 pr-1 py-1"
                    data-testid={`badge-allergy-${allergy.toLowerCase()}`}
                  >
                    {allergy}
                    <button
                      type="button"
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      onClick={() => removeAllergy(allergy)}
                      data-testid={`remove-allergy-${allergy.toLowerCase()}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setChangePasswordOpen(true)}
            data-testid="button-change-password"
          >
            Change Password
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSaveChanges}
          disabled={updateProfileMutation.isPending}
          data-testid="button-save-changes"
        >
          {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              data-testid="button-cancel-change-password"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              data-testid="button-submit-change-password"
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
