"use client";

import { useLanguage } from "@/hooks/use-language";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, setLanguage, translations } = useLanguage();

  return (
    <div className="mt-2">
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <SelectValue placeholder="Select language" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{translations.footer.language.english}</SelectItem>
          <SelectItem value="fa">{translations.footer.language.persian}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
