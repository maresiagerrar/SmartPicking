"use client";

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { ModeToggle } from "../mode-toggle";
import { Button } from '../ui/button';

export default function Header() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null);
      });
    }
  };

  return (
    <header className="py-6 px-4 md:px-6 border-b shadow-sm sticky top-0 z-20">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="130" height="20" viewBox="0 0 100 15" fill="none" className="h-10 w-auto">
            <g clipPath="url(#clip0_8246_84949)">
              <path d="M0 11.5891H13.5235L12.7847 12.5947H0V11.5891Z" fill="#D40511"/>
              <path d="M0 9.72431H14.8974L14.1571 10.7279H0V9.72431Z" fill="#D40511"/>
              <path d="M0 13.4559H12.1505L11.4148 14.4544H0V13.4559Z" fill="#D40511"/>
              <path d="M100 12.5947H86.5296L87.2678 11.5901H100V12.5947Z" fill="#D40511"/>
              <path d="M100 14.4544L85.1597 14.4554L85.8949 13.4559H100V14.4544Z" fill="#D40511"/>
              <path d="M88.6403 9.72431H100V10.7289L87.9015 10.7294L88.6403 9.72431Z" fill="#D40511"/>
              <path d="M13.0983 14.4542L19.5156 5.73544H27.4789C28.3591 5.73544 28.3476 6.06962 27.9177 6.65253C27.4809 7.24436 26.7374 8.26207 26.2925 8.86288C26.0667 9.16809 25.6583 9.72416 27.0113 9.72416H37.6797C36.7924 10.9396 33.9144 14.4542 28.7469 14.4542H13.0983Z" fill="#D40511"/>
              <path d="M49.8498 9.72345L46.3702 14.4542H37.1903C37.1903 14.4542 40.6685 9.72416 40.6716 9.72416L49.8498 9.72345Z" fill="#D40511"/>
              <path d="M63.1244 9.72416L59.6429 14.4542H50.4665C50.4665 14.4542 53.9449 9.72416 53.9481 9.72416H63.1244Z" fill="#D40511"/>
              <path d="M66.1096 9.72416C66.1096 9.72416 65.4392 10.6412 65.1133 11.0813C63.9606 12.6392 64.9793 14.4538 68.7413 14.4538H83.4787L86.9596 9.7237L66.1096 9.72416Z" fill="#D40511"/>
              <path d="M17.586 0.313599L14.391 4.65436H31.8037C32.6838 4.65436 32.6723 4.98855 32.2421 5.57146C31.8053 6.16263 31.074 7.19202 30.6292 7.79283C30.4033 8.09737 29.9949 8.6534 31.348 8.6534H38.4686C38.4686 8.6534 39.6165 7.09141 40.5784 5.78574C41.8873 4.00947 40.6919 0.313599 36.0128 0.313599H17.586Z" fill="#D40511"/>
              <path d="M63.9128 8.6534H41.4602L47.6 0.313599H56.7765L53.2582 5.09523H57.3541L60.875 0.313599H70.0505L63.9128 8.6534Z" fill="#D40511"/>
              <path d="M82.7594 0.313599L76.6209 8.6534H66.8968C66.8968 8.6534 73.0373 0.313599 73.0404 0.313599H82.7594Z" fill="#D40511"/>
            </g>
            <defs>
              <clipPath id="clip0_8246_84949">
                <rect width="100" height="14.142" fill="white" transform="translate(0 0.313599)"/>
              </clipPath>
            </defs>
          </svg>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline dark:text-black">
              Smart Picking
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Button onClick={handleInstallClick} variant="outline" size="icon" disabled={!installPrompt}>
            <Download className="h-5 w-5" />
            <span className="sr-only">Instalar Aplicativo</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
