import React from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function PWAInstallButton({ className, variant = 'default', size = 'default' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      // Optional: Show success message
      console.log('PWA installed successfully!');
    }
  };

  return (
    <Button
      onClick={handleInstall}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      <Download size={16} />
      <Smartphone size={16} />
      Install App
    </Button>
  );
}