import { useEffect } from "react";
import { getGoogleFontUrl } from "./profileTheme";

export function useProfileFont(fontFamily: string | undefined) {
  useEffect(() => {
    const url = getGoogleFontUrl(fontFamily);
    if (!url) return;

    // Check if already loaded
    const existingLink = document.querySelector(`link[data-profile-font="${fontFamily}"]`);
    if (existingLink) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.profileFont = fontFamily;
    document.head.appendChild(link);
  }, [fontFamily]);
}
