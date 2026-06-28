import { MessageCircle } from "lucide-react";

export function MessengerButton() {
  return (
    <a
      href="https://m.me/MMPropertiesDavao"
      target="_blank"
      rel="noreferrer"
      aria-label="Message MM Properties on Messenger"
      className="fixed bottom-24 right-4 z-[8500] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0084ff] text-white shadow-2xl ring-4 ring-white/80 transition hover:-translate-y-0.5 hover:bg-[#006fd6] sm:bottom-6 sm:right-6"
    >
      <MessageCircle size={28} />
    </a>
  );
}
