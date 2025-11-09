## URGENT FIXES:

- at the end of the script when we delete files and drizzle dir is created with a migration - we need to add all to the new git and commit?

- do we push to staging and prod automatically at the end? should we?

- cloudflare deployment fails. I guess due to token permissions as it needs to migrate the db?

    ```
    2s
Run pnpm db:migrate:production

> do-one-thing-stupid@1.0.0 db:migrate:production /home/runner/work/do-one-thing-stupid/do-one-thing-stupid
> wrangler d1 migrations apply do-one-thing-stupid-db --remote


 ⛅️ wrangler 4.46.0
───────────────────
Resource location: remote

✘ [ERROR] A request to the Cloudflare API (/accounts/***/d1/database/16f9e4d4-1c0c-4dd0-b9d8-e747efa3867e/query) failed.

  The given account is not valid or is not authorized to access this service [code: 7403]

  If you think this is a bug, please open an issue at: https://github.com/cloudflare/workers-sdk/issues/new/choose


 ELIFECYCLE  Command failed with exit code 1.
    ```



## LATER IMPROVEMENTS:

- add analytics setup with custom events
- add waitlist feature
- add user account with profile pic etc
- add admin interfaces
- add TTS and STT services
- add embeddings via cloudflare
- add optional orgs on top of users
