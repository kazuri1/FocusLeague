import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useMobile() {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        // Initial check
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
        };
        
        checkMobile();

        // Add event listener for window resize
        window.addEventListener('resize', checkMobile);
        
        // Clean up the event listener
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}
