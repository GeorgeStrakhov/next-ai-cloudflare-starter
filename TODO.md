## BIG THINGS:

- [x] update to AI sdk beta v6, including agents
- add toolcalling loop to agents
- [x] add message history and previous chats for user
- add knowledge bases and embeddings (?)

- [x] add markdown rendering support to past messages

- add documents and image uploads to the chat input and rendering them and processing. make sure images (if from mobile upload or what not) are downscaled if they are huge (on the frontend) not to eat too many tokens.

- admin interface to create agents and make them generally avaialble to all users or admins only

- user interface to swtich assistants

- admin interface to add banner to both landing and inside
- subscribers table and admin interface to email them

##  FIXES:
- migrate away from tabler and to lucide react (?)
- make posthog optional (turn off by default)
- telegram notification service
- add admin feature to broadcast messages to all users

## LATER IMPROVEMENTS:

- dashboard home page with unified search across chats (titles + message content) and images (prompts, metadata)

- add logging and alerting (investigate best setup on cloudflare) OR sentry?
- add voice with real-time transcription? or just a normal whisper?
- add waitlist and invites
- add TTS and STT services
- social sign-in?
