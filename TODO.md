## TODO:

- in the gallery make the sheet larger, or rethink it into a dialog
- images: 1:1 should be square. rethink masonry

- add perplexity tool via https://www.npmjs.com/package/@perplexity-ai/ai-sdk
- add exa tool via https://www.npmjs.com/package/@exalabs/ai-sdk

- add image editing tool to chat via our replicate image gen (nano banana pro)

- implement image search in gallery (through prompts)

- to agents: add colors and profile pics, then display them in chat (?)

- allow users to create their own agents (?) - only scoped to them

- images: add vectorize (svg)

- add knowledge bases and embeddings (?)

- admin panel: add to top level stats the agents created, and conversations had and images generated

- add documents and image uploads to the chat input and rendering them and processing. make sure images (if from mobile upload or what not) are downscaled if they are huge (on the frontend) not to eat too many tokens.

- add analytics events to our chat and images

- admin interface to add banner to both landing and inside
- subscribers table and admin interface to email them

##  FIXES:

- fix masonry so that square images are square and 16:9 is default

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
