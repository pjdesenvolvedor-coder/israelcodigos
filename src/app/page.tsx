import { WebhookDashboard } from "@/components/webhook-dashboard";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <main className="min-h-screen">
      <WebhookDashboard />
      <Toaster />
    </main>
  );
}
