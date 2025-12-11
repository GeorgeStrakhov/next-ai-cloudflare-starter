export const dynamic = "force-dynamic";

import {
  getAuthSettings,
  getAllowedEmails,
  getAllowedDomains,
} from "@/lib/access-control";
import { AccessSettings } from "@/components/admin/access-settings";
import { AllowedEmailsTable } from "@/components/admin/allowed-emails-table";
import { AllowedDomainsTable } from "@/components/admin/allowed-domains-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconInfoCircle } from "@tabler/icons-react";

export default async function AdminAccessPage() {
  const [authSettings, allowedEmails, allowedDomains] = await Promise.all([
    getAuthSettings(),
    getAllowedEmails(),
    getAllowedDomains(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Access Control</h1>
        <p className="text-muted-foreground">
          Manage who can sign in to your application
        </p>
      </div>

      <Alert>
        <IconInfoCircle className="h-4 w-4" />
        <AlertDescription>
          Admin users (configured in Users → Make Admin) can always sign in,
          regardless of the access mode or whitelist settings.
        </AlertDescription>
      </Alert>

      <AccessSettings initialSettings={authSettings} />

      {authSettings.mode === "restricted" && (
        <>
          <AllowedEmailsTable initialEmails={allowedEmails} />
          <AllowedDomainsTable initialDomains={allowedDomains} />
        </>
      )}

      {authSettings.mode === "open" && (
        <Alert>
          <IconInfoCircle className="h-4 w-4" />
          <AlertDescription>
            Restricted mode is off. Enable it above to configure email and
            domain whitelists.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
