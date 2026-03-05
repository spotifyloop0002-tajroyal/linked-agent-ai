import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Linkedin, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getAllCountries, getCitiesForCountry } from "@/data/countriesAndCities";

const professions = [
  "Marketing Director", "Software Engineer", "Product Manager", "CEO / Founder",
  "Sales Manager", "Content Creator", "HR Manager", "Consultant",
  "Data Analyst", "Designer", "Business Analyst", "Freelancer", "Other",
];

interface OnboardingStep2PersonalProps {
  fullName: string;
  setFullName: (value: string) => void;
  profession: string;
  setProfession: (value: string) => void;
  background: string;
  setBackground: (value: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const OnboardingStep2Personal = ({
  fullName,
  setFullName,
  profession,
  setProfession,
  background,
  setBackground,
  linkedinUrl,
  setLinkedinUrl,
  phoneNumber,
  setPhoneNumber,
  city,
  setCity,
  country,
  setCountry,
  onBack,
  onNext,
}: OnboardingStep2PersonalProps) => {
  const [cityOther, setCityOther] = useState(false);
  const [countryOther, setCountryOther] = useState(false);
  const [professionOther, setProfessionOther] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const allCountries = useMemo(() => getAllCountries(), []);
  const citiesForCountry = useMemo(() => {
    if (!country || countryOther) return [];
    return getCitiesForCountry(country);
  }, [country, countryOther]);
  

  const isValidLinkedInUrl = (url: string) => {
    if (!url) return false;
    const pattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
    return pattern.test(url.trim());
  };

  const canProceed = 
    fullName.trim() && 
    profession.trim() && 
    background.trim() && 
    phoneNumber.trim() &&
    city.trim() &&
    country.trim() &&
    isValidLinkedInUrl(linkedinUrl);

  const handleSelectChange = (
    value: string,
    setter: (v: string) => void,
    setOther: (v: boolean) => void,
  ) => {
    if (value === "Other") {
      setOther(true);
      setter("");
    } else {
      setOther(false);
      setter(value);
    }
  };

  return (
    <motion.div
      key="step2-personal"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-xl font-semibold mb-6">Tell us about yourself</h2>

      <div className="space-y-5">
        <div>
          <Label htmlFor="fullName">Your Name *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., John Doe"
            className="mt-1.5"
            required
          />
          {!fullName.trim() && (
            <p className="text-xs text-destructive mt-1">Name is required</p>
          )}
        </div>

        {/* LinkedIn Profile URL - CRITICAL FIELD */}
        <div>
          <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            LinkedIn Profile URL *
          </Label>
          <Input
            id="linkedinUrl"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
            className="mt-1.5"
            required
          />
          {linkedinUrl && !isValidLinkedInUrl(linkedinUrl) && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)
            </p>
          )}
          {!linkedinUrl && (
            <p className="text-xs text-destructive mt-1">LinkedIn URL is required</p>
          )}
          <Alert className="mt-2 border-warning/50 bg-warning/10">
            <AlertCircle className="w-4 h-4 text-warning" />
            <AlertDescription className="text-xs text-warning">
              <strong>Important:</strong> This URL cannot be changed after setup. All posting and scraping will happen on this profile only.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 9876543210"
              className="mt-1.5"
              required
            />
            {!phoneNumber.trim() && (
              <p className="text-xs text-destructive mt-1">Phone is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            {cityOther ? (
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your city"
                  autoFocus
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => { setCityOther(false); setCity(""); }}>
                  ✕
                </Button>
              </div>
            ) : (
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full mt-1.5 justify-between font-normal">
                    {city || "Select your city"}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search city..." />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        {citiesForCountry.map((c) => (
                          <CommandItem key={c} value={c} onSelect={() => { setCity(c); setCityOpen(false); }}>
                            {c}
                          </CommandItem>
                        ))}
                        <CommandItem value="Other" onSelect={() => { setCityOther(true); setCity(""); setCityOpen(false); }}>
                          Other (type manually)
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {!city && !country && (
              <p className="text-xs text-muted-foreground mt-1">Select a country first</p>
            )}
            {!city && country && (
              <p className="text-xs text-destructive mt-1">City is required</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="country">Country *</Label>
          {countryOther ? (
            <div className="flex gap-2 mt-1.5">
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter your country"
                autoFocus
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => { setCountryOther(false); setCountry(""); setCity(""); }}>
                ✕
              </Button>
            </div>
          ) : (
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full mt-1.5 justify-between font-normal">
                  {country || "Select your country"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {allCountries.map((c) => (
                        <CommandItem key={c} value={c} onSelect={() => { setCountry(c); setCity(""); setCountryOpen(false); }}>
                          {c}
                        </CommandItem>
                      ))}
                      <CommandItem value="Other" onSelect={() => { setCountryOther(true); setCountry(""); setCity(""); setCountryOpen(false); }}>
                        Other (type manually)
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          {!country && (
            <p className="text-xs text-destructive mt-1">Country is required</p>
          )}
        </div>

        <div>
          <Label htmlFor="profession">Your Role/Profession *</Label>
          {professionOther ? (
            <div className="flex gap-2 mt-1.5">
              <Input
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Enter your role/profession"
                autoFocus
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => { setProfessionOther(false); setProfession(""); }}>
                ✕
              </Button>
            </div>
          ) : (
            <Select value={profession} onValueChange={(v) => handleSelectChange(v, setProfession, setProfessionOther)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {professions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!profession && (
            <p className="text-xs text-destructive mt-1">Role/Profession is required</p>
          )}
        </div>

        <div>
          <Label htmlFor="background">Your Background *</Label>
          <Textarea
            id="background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="Tell us about your experience and expertise..."
            maxLength={200}
            className="mt-1.5 min-h-[100px]"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            {background.length}/200 characters
          </p>
          {!background.trim() && (
            <p className="text-xs text-destructive mt-1">Background is required</p>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          variant="gradient"
          size="lg"
          disabled={!canProceed}
          onClick={onNext}
          className="gap-2"
        >
          Complete Setup
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};