import React, { useState } from 'react';
import { AlertTriangle, Linkedin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MissingProfileBannerProps {
  onDismiss?: () => void;
  onProfileSaved?: () => void;
}

export const MissingProfileBanner: React.FC<MissingProfileBannerProps> = ({
  onDismiss,
  onProfileSaved,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-foreground">LinkedIn Profile URL Missing</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add your LinkedIn profile URL to enable post scanning and personalized content generation.
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={() => navigate('/linkedin')}
            className="gap-1.5"
          >
            <Linkedin className="w-3.5 h-3.5" />
            Add Profile URL
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground"
          >
            Remind me later
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default MissingProfileBanner;
