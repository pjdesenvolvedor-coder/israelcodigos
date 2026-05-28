
import { WebhookDashboard } from "@/components/webhook-dashboard";
import { Toaster } from "@/components/ui/toaster";
import { AccessGuard } from "@/components/access-guard";

export default function Home() {
  return (
    <main className="min-h-screen">
      <AccessGuard>
        <WebhookDashboard />
      </AccessGuard>
      <Toaster />
    </main>
  );
}
